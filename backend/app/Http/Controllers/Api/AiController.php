<?php

namespace App\Http\Controllers\Api;

use App\Models\Media;
use App\Models\Article;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class AiController extends Controller
{
    /**
     * Virtual try-on using Gemini AI (Image Generation)
     * Rate limited: 5 tries per IP per day
     */
    public function tryOn(Request $request)
    {
        // ── Rate Limit: 5 tries / IP / day ──
        $ip = $request->ip();
        $cacheKey = 'tryon_limit_' . md5($ip);
        $today = now()->format('Y-m-d');
        $limitData = Cache::get($cacheKey, ['date' => $today, 'count' => 0]);

        // Reset counter if new day
        if (($limitData['date'] ?? '') !== $today) {
            $limitData = ['date' => $today, 'count' => 0];
        }

        $maxTries = 5;
        if ($limitData['count'] >= $maxTries) {
            return response()->json([
                'error' => 'Bạn đã sử dụng hết ' . $maxTries . ' lượt thử kính hôm nay. Vui lòng quay lại vào ngày mai!',
                'remaining' => 0,
            ], 429);
        }

        // Increment counter
        $limitData['count']++;
        Cache::put($cacheKey, $limitData, now()->endOfDay());

        $request->validate([
            'face_image' => 'required|string',
            'glasses_image' => 'required|string',
            'product_name' => 'nullable|string',
        ]);

        ini_set('memory_limit', '512M');
        set_time_limit(120);

        // Đọc API key: DB Settings → .env
        $apiKey = Setting::getValue('gemini_api_key');
        if (!$apiKey || trim($apiKey) === '') {
            $apiKey = env('GEMINI_API_KEY');
        }

        \Log::info('Gemini Try-On: API key source = ' . ($apiKey ? 'found (' . substr($apiKey, 0, 10) . '...)' : 'MISSING'));

        if (!$apiKey || trim($apiKey) === '') {
            return response()->json([
                'error' => 'Gemini API key chưa được cấu hình. Vui lòng nhập trong Cài đặt Admin → API & Tích hợp.',
            ], 500);
        }

        try {
            // === Xử lý face image ===
            $faceBase64 = $request->face_image;
            $faceMime = 'image/jpeg';
            if (str_contains($faceBase64, ',')) {
                $parts = explode(',', $faceBase64, 2);
                if (preg_match('/data:(image\/[\w+]+);/', $parts[0], $matches)) {
                    $faceMime = $matches[1];
                }
                $faceBase64 = $parts[1];
            }

            // === Xử lý glasses image ===
            $glassesBase64 = $request->glasses_image;
            $glassesMime = 'image/png';

            if (str_starts_with($glassesBase64, 'http://') || str_starts_with($glassesBase64, 'https://')) {
                if (str_contains($glassesBase64, '/storage/')) {
                    $storagePath = preg_replace('#^.*?/storage/#', '', $glassesBase64);
                    $localPath = storage_path('app/public/' . urldecode($storagePath));
                    if (file_exists($localPath)) {
                        $glassesMime = mime_content_type($localPath) ?: 'image/png';
                        $glassesBase64 = base64_encode(file_get_contents($localPath));
                        \Log::info("Glasses image loaded from local: {$localPath}");
                    } else {
                        \Log::warning("Glasses image not found locally: {$localPath}");
                    }
                } else {
                    $ctx = stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
                    $imgContent = @file_get_contents($glassesBase64, false, $ctx);
                    if ($imgContent) {
                        $finfo = new \finfo(FILEINFO_MIME_TYPE);
                        $glassesMime = $finfo->buffer($imgContent) ?: 'image/png';
                        $glassesBase64 = base64_encode($imgContent);
                    }
                }
            } elseif (str_starts_with($glassesBase64, '/storage/') || str_starts_with($glassesBase64, '/uploads/')) {
                $localPath = storage_path('app/public/' . ltrim(str_replace('/storage/', '', $glassesBase64), '/'));
                if (file_exists($localPath)) {
                    $glassesMime = mime_content_type($localPath) ?: 'image/png';
                    $glassesBase64 = base64_encode(file_get_contents($localPath));
                }
            } elseif (str_contains($glassesBase64, ',')) {
                $parts = explode(',', $glassesBase64, 2);
                if (preg_match('/data:(image\/[\w+]+);/', $parts[0], $matches)) {
                    $glassesMime = $matches[1];
                }
                $glassesBase64 = $parts[1];
            }

            $productName = $request->get('product_name', 'kính');

            // Model ưu tiên: DB Settings → default list
            $dbModel = Setting::getValue('gemini_model');
            $primaryModel = ($dbModel && trim($dbModel) !== '') ? trim($dbModel) : 'gemini-2.5-flash-image';

            // Danh sách model fallback (thử lần lượt nếu bị quota/404)
            $modelsToTry = array_unique([
                $primaryModel,
                'gemini-2.5-flash-image',
                'gemini-3.1-flash-image-preview',
                'gemini-3-pro-image-preview',
            ]);

            $prompt = "You are a virtual try-on expert. I'm providing two images:
1. A person's face photo
2. A pair of glasses: {$productName}

Generate ONE realistic photo of this person wearing these exact glasses.
- Align glasses naturally on the face (eyes and nose bridge)
- Keep the exact glasses style, color, and design
- Preserve the person's face, expression, and background
- Add natural shadows and reflections
- Output ONLY the image, no text";

            $payload = [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                            [
                                'inline_data' => [
                                    'mime_type' => $faceMime,
                                    'data' => $faceBase64,
                                ],
                            ],
                            [
                                'inline_data' => [
                                    'mime_type' => $glassesMime,
                                    'data' => $glassesBase64,
                                ],
                            ],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'responseModalities' => ['TEXT', 'IMAGE'],
                ],
            ];

            // Thử từng model, nếu bị 429/400 thì thử model tiếp theo
            $response = null;
            $usedModel = '';

            foreach ($modelsToTry as $model) {
                $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
                \Log::info("Gemini Try-On: Trying model={$model}");

                $response = Http::timeout(60)
                    ->withoutVerifying()
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post($url, $payload);

                $usedModel = $model;

                // Nếu thành công hoặc lỗi khác 429/400/404 → dừng
                if (!in_array($response->status(), [429, 400, 404])) {
                    break;
                }

                $errData = $response->json();
                $errMsg = $errData['error']['message'] ?? '';
                \Log::warning("Gemini Try-On: Model {$model} failed (HTTP {$response->status()}): " . substr($errMsg, 0, 150));

                // 404 = model không tồn tại → thử model khác
                // 429 = quota → thử model khác
                // 400 "does not support" → thử model khác
                // 400 lỗi khác → dừng
                if ($response->status() === 400 && !str_contains($errMsg, 'does not support')) {
                    break;
                }
            }

            \Log::info("Gemini Try-On: Final model={$usedModel}");

            $result = $response->json();
            \Log::info('Gemini Try-On: Response status=' . $response->status());

            if ($response->failed()) {
                $errorMsg = $result['error']['message'] ?? 'Gemini API error';
                \Log::error('Gemini Try-On Error: ' . json_encode($result));

                if ($response->status() === 429) {
                    return response()->json([
                        'error' => 'Hệ thống AI đang quá tải. Vui lòng đợi 30 giây rồi thử lại.',
                    ], 429);
                }

                return response()->json(['error' => $errorMsg], $response->status());
            }

            // Tìm image trong response
            $candidates = $result['candidates'] ?? [];
            $imageData = null;
            $imageMime = 'image/png';

            foreach ($candidates as $candidate) {
                $parts = $candidate['content']['parts'] ?? [];
                foreach ($parts as $part) {
                    if (isset($part['inlineData'])) {
                        $imageData = $part['inlineData']['data'] ?? null;
                        $imageMime = $part['inlineData']['mimeType'] ?? 'image/png';
                        break 2;
                    }
                    if (isset($part['inline_data'])) {
                        $imageData = $part['inline_data']['data'] ?? null;
                        $imageMime = $part['inline_data']['mime_type'] ?? 'image/png';
                        break 2;
                    }
                }
            }

            if ($imageData) {
                \Log::info('Gemini Try-On: SUCCESS - image generated');
                return response()->json([
                    'success' => true,
                    'image' => "data:{$imageMime};base64,{$imageData}",
                    'remaining' => $maxTries - $limitData['count'],
                ]);
            }

            // Không có ảnh
            $textParts = [];
            foreach ($candidates as $candidate) {
                foreach ($candidate['content']['parts'] ?? [] as $part) {
                    if (isset($part['text'])) {
                        $textParts[] = $part['text'];
                    }
                }
            }

            \Log::warning('Gemini Try-On: No image in response. Text: ' . implode("\n", $textParts));

            return response()->json([
                'error' => 'AI không thể tạo ảnh thử kính. Vui lòng thử ảnh khác.',
                'debug' => implode("\n", $textParts),
            ], 422);

        } catch (\Exception $e) {
            \Log::error('Gemini Try-On Exception: ' . $e->getMessage());
            return response()->json([
                'error' => 'Lỗi xử lý AI: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Auto generate article content using OpenAI / ChatGPT.
     * If full_article=true, returns JSON with title, excerpt, content, SEO fields, tags.
     */
    public function generateContent(Request $request)
    {
        set_time_limit(120);
        ini_set('memory_limit', '256M');

        $request->validate([
            'topic' => 'required|string|max:500',
            'type' => 'nullable|string|in:article,product_description,seo',
            'keywords' => 'nullable|string',
            'tone' => 'nullable|string|in:professional,casual,luxury',
            'length' => 'nullable|string|in:short,medium,long',
            'full_article' => 'nullable|boolean',
        ]);

        $apiKey = Setting::getValue('openai_api_key') ?: env('OPENAI_API_KEY');
        if (!$apiKey || trim($apiKey) === '') {
            return response()->json(['error' => 'OpenAI API key chưa được cấu hình.'], 500);
        }

        $model = Setting::getValue('openai_model') ?: 'gpt-4o-mini';
        $maxTokens = (int)(Setting::getValue('openai_max_tokens') ?: 4096);
        $fullArticle = $request->boolean('full_article', false);

        $type = $request->get('type', 'article');
        $tone = $request->get('tone', 'professional');
        $length = $request->get('length', 'medium');
        $keywords = $request->get('keywords', '');

        $lengthGuide = match($length) {
            'short' => '500-800 từ',
            'long' => '2000-3000 từ',
            default => '1000-1500 từ',
        };

        // ── Query related articles for internal linking ──
        $categoryId = $request->get('category_id');
        $relatedArticles = $this->getRelatedArticlesForLinking($categoryId);
        $linkInstruction = '';
        if (!empty($relatedArticles)) {
            $linkInstruction = "\nLIÊN KẾT NỘI BỘ (Internal Linking):\nTrong bài viết, hãy chèn LINK đến các bài viết liên quan bên dưới một cách TỰ NHIÊN, XUÔI CÂU. Dùng thẻ <a href=\"URL\">anchor text</a>.\n- Anchor text phải là từ khóa/cụm từ PHÙ HỢP với ngữ cảnh câu văn, KHÔNG phải tiêu đề nguyên văn.\n- Chèn tối đa 2-3 link, rải đều trong bài, không tập trung 1 chỗ.\n- Viết câu có chứa link sao cho đọc lên hoàn toàn tự nhiên, như thể tác giả đang giới thiệu chủ đề liên quan.\n- KHÔNG dùng các mẫu \"Xem thêm:\", \"Đọc thêm:\" — hãy viết xuôi câu.\n\nDanh sách bài liên quan:\n";
            foreach ($relatedArticles as $ra) {
                $linkInstruction .= "- \"{$ra['title']}\" → URL: /bai-viet/{$ra['slug']}" . ($ra['keywords'] ? " (từ khóa: {$ra['keywords']})" : "") . "\n";
            }
        }

        if ($fullArticle) {
            $systemPrompt = "Bạn là content writer chuyên nghiệp cho ngành thời trang kính mắt. Viết bằng tiếng Việt. Giọng văn {$tone}.

QUY TẮC CẤU TRÚC BÀI VIẾT:
- Dùng các thẻ <h2> cho mỗi phần chính, <h3> cho phần phụ
- Nội dung trong <p>, danh sách dùng <ul><li>
- Dùng <strong>, <em> để nhấn mạnh từ khóa quan trọng
- Độ dài: {$lengthGuide}
{$linkInstruction}

Bạn PHẢI trả về KẾT QUẢ DƯỚI DẠNG JSON HỢP LỆ (không markdown, không ```json```) với cấu trúc:
{
  \"title\": \"Tiêu đề bài viết hấp dẫn, chuẩn SEO\",
  \"excerpt\": \"Tóm tắt bài viết 2-3 câu, hấp dẫn, dùng làm mô tả ngắn\",
  \"content\": \"Nội dung HTML đầy đủ theo quy tắc trên\",
  \"meta_title\": \"SEO title (tối đa 60 ký tự)\",
  \"meta_desc\": \"SEO description (tối đa 160 ký tự)\",
  \"meta_keywords\": \"từ khóa 1, từ khóa 2, từ khóa 3\",
  \"tags\": [\"tag1\", \"tag2\", \"tag3\", \"tag4\"]
}";
        } else {
            $basePrompt = match($type) {
                'product_description' => "Bạn là chuyên gia viết mô tả sản phẩm kính mắt. Viết mô tả hấp dẫn, chuyên nghiệp. Giọng văn {$tone}. Viết bằng tiếng Việt.",
                'seo' => "Bạn là chuyên gia SEO. Viết nội dung chuẩn SEO cho website kính mắt. Viết bằng tiếng Việt.",
                default => "Bạn là content writer chuyên nghiệp cho ngành thời trang kính mắt. Viết bài viết chất lượng cao, hấp dẫn, với giọng văn {$tone}. Độ dài: {$lengthGuide}. Viết bằng tiếng Việt. Sử dụng HTML formatting (h2, h3, p, ul, li, strong, em).",
            };
            $systemPrompt = $basePrompt . $linkInstruction;
        }

        $userPrompt = $fullArticle
            ? "Viết bài viết hoàn chỉnh về chủ đề: {$request->topic}" . ($keywords ? "\nTừ khóa SEO: {$keywords}" : "")
            : "Viết nội dung về chủ đề: {$request->topic}" . ($keywords ? "\nTừ khóa cần tích hợp: {$keywords}" : "");

        try {
            $requestBody = [
                'model'    => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user',   'content' => $userPrompt],
                ],
                'max_completion_tokens' => $maxTokens,
            ];

            if ($fullArticle) {
                $requestBody['response_format'] = ['type' => 'json_object'];
            }

            $response = Http::timeout(90)->withoutVerifying()
                ->withHeaders([
                    'Authorization' => "Bearer {$apiKey}",
                    'Content-Type' => 'application/json',
                ])->post('https://api.openai.com/v1/chat/completions', $requestBody);

            $result = $response->json();

            if ($response->status() === 400
                && str_contains($result['error']['message'] ?? '', 'max_completion_tokens')
            ) {
                unset($requestBody['max_completion_tokens']);
                $requestBody['max_tokens'] = $maxTokens;
                $response = Http::timeout(90)->withoutVerifying()
                    ->withHeaders([
                        'Authorization' => "Bearer {$apiKey}",
                        'Content-Type' => 'application/json',
                    ])->post('https://api.openai.com/v1/chat/completions', $requestBody);
                $result = $response->json();
            }

            if ($response->failed()) {
                $errorMsg = $result['error']['message'] ?? 'OpenAI API error';
                return response()->json(['error' => $errorMsg, 'message' => $errorMsg], $response->status());
            }

            $rawContent = $result['choices'][0]['message']['content'] ?? '';

            if ($fullArticle) {
                // Parse JSON response
                $cleaned = trim($rawContent);
                // Remove markdown code fences if present
                $cleaned = preg_replace('/^```json\s*/i', '', $cleaned);
                $cleaned = preg_replace('/\s*```$/i', '', $cleaned);
                $articleData = json_decode($cleaned, true);

                if (!$articleData || !isset($articleData['content'])) {
                    return response()->json([
                        'success' => true,
                        'content' => $rawContent,
                        'usage' => $result['usage'] ?? null,
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'full_article' => true,
                    'title' => $articleData['title'] ?? $request->topic,
                    'excerpt' => $articleData['excerpt'] ?? '',
                    'content' => $articleData['content'] ?? '',
                    'meta_title' => $articleData['meta_title'] ?? '',
                    'meta_desc' => $articleData['meta_desc'] ?? '',
                    'meta_keywords' => $articleData['meta_keywords'] ?? '',
                    'tags' => $articleData['tags'] ?? [],
                    'usage' => $result['usage'] ?? null,
                ]);
            }

            return response()->json([
                'success' => true,
                'content' => $rawContent,
                'usage' => $result['usage'] ?? null,
            ]);
        } catch (\Exception $e) {
            \Log::error('OpenAI Content Exception: ' . $e->getMessage());
            return response()->json(['error' => 'Lỗi tạo nội dung: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Generate article content with AI-generated images.
     * Step 1: ChatGPT writes HTML with [IMG:description] placeholders.
     * Step 2: Gemini generates an image for each placeholder.
     * Step 3: Images are saved to Media library and URLs inserted.
     */
    public function generateContentWithImages(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '512M');

        $request->validate([
            'topic'       => 'required|string|max:500',
            'type'        => 'nullable|string|in:article,product_description,seo',
            'keywords'    => 'nullable|string',
            'tone'        => 'nullable|string|in:professional,casual,luxury',
            'length'      => 'nullable|string|in:short,medium,long',
            'image_count' => 'nullable|integer|min:0|max:5',
            'full_article' => 'nullable|boolean',
            'category_id' => 'nullable|integer|exists:article_categories,id',
        ]);

        $openaiKey = Setting::getValue('openai_api_key') ?: env('OPENAI_API_KEY');
        if (!$openaiKey || trim($openaiKey) === '') {
            return response()->json(['error' => 'OpenAI API key chưa được cấu hình.'], 500);
        }

        $geminiKey = Setting::getValue('gemini_api_key') ?: env('GEMINI_API_KEY');
        if (!$geminiKey || trim($geminiKey) === '') {
            return response()->json(['error' => 'Gemini API key chưa được cấu hình. Cần để sinh ảnh.'], 500);
        }

        $model = Setting::getValue('openai_model') ?: 'gpt-4o-mini';
        $maxTokens = (int)(Setting::getValue('openai_max_tokens') ?: 4096);
        $imageCount = $request->get('image_count', 2);
        $fullArticle = $request->boolean('full_article', false);

        $type = $request->get('type', 'article');
        $tone = $request->get('tone', 'professional');
        $length = $request->get('length', 'medium');
        $keywords = $request->get('keywords', '');

        $lengthGuide = match ($length) {
            'short'  => '500-800 từ',
            'long'   => '2000-3000 từ',
            default  => '1000-1500 từ',
        };

        $imgInstruction = "";

        // ── Query related articles for internal linking ──
        $categoryId = $request->get('category_id');
        $relatedArticles = $this->getRelatedArticlesForLinking($categoryId);
        $linkInstruction = '';
        if (!empty($relatedArticles)) {
            $linkInstruction = "\nLIÊN KẾT NỘI BỘ (Internal Linking):\nTrong bài viết, hãy chèn LINK đến các bài viết liên quan bên dưới một cách TỰ NHIÊN, XUÔI CÂU. Dùng thẻ <a href=\"URL\">anchor text</a>.\n- Anchor text phải là từ khóa/cụm từ PHÙ HỢP với ngữ cảnh câu văn, KHÔNG phải tiêu đề nguyên văn.\n- Chèn tối đa 2-3 link, rải đều trong bài, không tập trung 1 chỗ.\n- Viết câu có chứa link sao cho đọc lên hoàn toàn tự nhiên, như thể tác giả đang giới thiệu chủ đề liên quan.\n- KHÔNG dùng các mẫu \"Xem thêm:\", \"Đọc thêm:\" — hãy viết xuôi câu.\n\nDanh sách bài liên quan:\n";
            foreach ($relatedArticles as $ra) {
                $linkInstruction .= "- \"{$ra['title']}\" → URL: /bai-viet/{$ra['slug']}" . ($ra['keywords'] ? " (từ khóa: {$ra['keywords']})" : "") . "\n";
            }
        }

        if ($fullArticle) {
            $systemPrompt = "Bạn là content writer chuyên nghiệp cho ngành thời trang kính mắt. Viết bằng tiếng Việt. Giọng văn {$tone}.

QUY TẮC CẤU TRÚC BÀI VIẾT:
- Dùng các thẻ <h2> cho mỗi phần chính, <h3> cho phần phụ
- Nội dung trong <p>, danh sách dùng <ul><li>
- Dùng <strong>, <em> để nhấn mạnh từ khóa quan trọng
- Độ dài: {$lengthGuide}
{$imgInstruction}
{$linkInstruction}

Bạn PHẢI trả về KẾT QUẢ DƯỚI DẠNG JSON HỢP LỆ với cấu trúc:
{
  \"title\": \"Tiêu đề bài viết hấp dẫn, chuẩn SEO\",
  \"excerpt\": \"Tóm tắt bài viết 2-3 câu\",
  \"content\": \"Nội dung HTML theo quy tắc trên\",
  \"meta_title\": \"SEO title (tối đa 60 ký tự)\",
  \"meta_desc\": \"SEO description (tối đa 160 ký tự)\",
  \"meta_keywords\": \"từ khóa 1, từ khóa 2, từ khóa 3\",
  \"tags\": [\"tag1\", \"tag2\", \"tag3\"]
}";
        } else {
            $systemPrompt = "Bạn là content writer chuyên nghiệp cho ngành thời trang kính mắt. Viết bài viết chất lượng cao, hấp dẫn, với giọng văn {$tone}. Độ dài: {$lengthGuide}. Viết bằng tiếng Việt. Cấu trúc: dùng <h2> cho phần chính, <h3> cho phần phụ, nội dung trong <p>, danh sách <ul><li>, nhấn mạnh bằng <strong>, <em>. {$imgInstruction}{$linkInstruction}";
        }

        $userPrompt = $fullArticle
            ? "Viết bài viết hoàn chỉnh về chủ đề: {$request->topic}" . ($keywords ? "\nTừ khóa SEO: {$keywords}" : "")
            : "Viết nội dung về chủ đề: {$request->topic}" . ($keywords ? "\nTừ khóa cần tích hợp: {$keywords}" : "");

        try {
            $requestBody = [
                'model'    => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user',   'content' => $userPrompt],
                ],
                'max_completion_tokens' => $maxTokens,
            ];

            if ($fullArticle) {
                $requestBody['response_format'] = ['type' => 'json_object'];
            }

            $response = Http::timeout(90)->withoutVerifying()
                ->withHeaders([
                    'Authorization' => "Bearer {$openaiKey}",
                    'Content-Type'  => 'application/json',
                ])->post('https://api.openai.com/v1/chat/completions', $requestBody);

            $result = $response->json();

            if ($response->status() === 400
                && str_contains($result['error']['message'] ?? '', 'max_completion_tokens')
            ) {
                unset($requestBody['max_completion_tokens']);
                $requestBody['max_tokens'] = $maxTokens;
                $response = Http::timeout(90)->withoutVerifying()
                    ->withHeaders([
                        'Authorization' => "Bearer {$openaiKey}",
                        'Content-Type'  => 'application/json',
                    ])->post('https://api.openai.com/v1/chat/completions', $requestBody);
                $result = $response->json();
            }

            if ($response->failed()) {
                $errorMsg = $result['error']['message'] ?? 'OpenAI API error';
                return response()->json(['error' => $errorMsg, 'message' => $errorMsg], $response->status());
            }

            $rawContent = $result['choices'][0]['message']['content'] ?? '';

            // Parse full_article JSON if needed
            $articleMeta = null;
            $categoryId = $request->get('category_id');
            if ($fullArticle) {
                $cleaned = trim($rawContent);
                $cleaned = preg_replace('/^```json\s*/i', '', $cleaned);
                $cleaned = preg_replace('/\s*```$/i', '', $cleaned);
                $articleMeta = json_decode($cleaned, true);
                if ($articleMeta && isset($articleMeta['content'])) {
                    $rawContent = $articleMeta['content'];
                }
            }

            // ── Auto-generate images based on H2 headings ──
            $generatedImages = [];
            $content = $rawContent;

            if ($imageCount > 0) {
                // Remove any [IMG:...] placeholders ChatGPT might have added
                $content = preg_replace('/\[IMG:[^\]]*\]/', '', $content);

                // Parse H2 headings from content
                if (preg_match_all('/<h2[^>]*>(.*?)<\/h2>/i', $content, $h2Matches)) {
                    $geminiModel = Setting::getValue('gemini_image_model') ?: 'gemini-2.0-flash-preview-image-generation';
                    $modelsToTry = array_unique([
                        $geminiModel,
                        'gemini-2.0-flash-preview-image-generation',
                        'gemini-2.0-flash-exp-image-generation',
                        'gemini-2.0-flash-exp',
                    ]);

                    $headingsToProcess = array_slice($h2Matches[0], 0, $imageCount);
                    $headingTexts = array_slice($h2Matches[1], 0, $imageCount);

                    foreach ($headingTexts as $idx => $headingHtml) {
                        $headingText = strip_tags($headingHtml);
                        $headingSlug = \Illuminate\Support\Str::slug($headingText) ?: 'ai-image';
                        $imgPrompt = "Professional editorial photo about: {$headingText}. For a Vietnamese eyewear fashion blog.";

                        \Log::info("AI Image #{$idx}: heading='{$headingText}' slug={$headingSlug}");

                        $imageUrl = $this->generateAndSaveImage($geminiKey, $modelsToTry, $imgPrompt, $headingSlug, $idx);

                        if ($imageUrl) {
                            $altText = $headingText;
                            $generatedImages[] = ['heading' => $headingText, 'url' => $imageUrl];
                            $figureHtml = '<figure style="margin:24px 0;text-align:center">'
                                . '<img src="' . $imageUrl . '" alt="' . htmlspecialchars($altText) . '" style="max-width:100%;border-radius:8px" loading="lazy" />'
                                . '<figcaption style="font-size:0.85em;color:#666;margin-top:8px">' . htmlspecialchars($altText) . '</figcaption>'
                                . '</figure>';
                            // Insert figure right after the H2 tag
                            $h2Tag = $headingsToProcess[$idx];
                            $content = preg_replace('/' . preg_quote($h2Tag, '/') . '/', $h2Tag . "\n" . $figureHtml, $content, 1);
                        }
                    }
                } else {
                    \Log::warning("AI Images: No H2 headings found in content to attach images to");
                }
            }


            $responseData = [
                'success' => true,
                'content' => $content,
                'images'  => $generatedImages,
                'usage'   => $result['usage'] ?? null,
            ];

            if ($fullArticle && $articleMeta) {
                $responseData['full_article'] = true;
                $responseData['title'] = $articleMeta['title'] ?? $request->topic;
                $responseData['excerpt'] = $articleMeta['excerpt'] ?? '';
                $responseData['meta_title'] = $articleMeta['meta_title'] ?? '';
                $responseData['meta_desc'] = $articleMeta['meta_desc'] ?? '';
                $responseData['meta_keywords'] = $articleMeta['meta_keywords'] ?? '';
                $responseData['tags'] = $articleMeta['tags'] ?? [];
            }

            return response()->json($responseData);
        } catch (\Exception $e) {
            \Log::error('AI Content+Images Exception: ' . $e->getMessage());
            return response()->json(['error' => 'Lỗi tạo nội dung: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Generate image via Gemini/Imagen and save to Media library.
     */
    private function generateAndSaveImage(string $apiKey, array $models, string $description, string $slug, int $idx): ?string
    {
        // Try Gemini generateContent with image modality
        $payload = [
            'contents' => [
                ['parts' => [['text' => $description . ' Style: modern, clean, editorial photography. No text or watermarks.']]],
            ],
            'generationConfig' => [
                'responseModalities' => ['IMAGE'],
            ],
        ];

        foreach ($models as $model) {
            try {
                // Skip imagen models here (handled below)
                if (str_contains($model, 'imagen')) continue;

                $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
                \Log::info("AI Image: Trying {$model}");

                $response = Http::timeout(60)->withoutVerifying()
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post($url, $payload);

                if ($response->failed()) {
                    \Log::warning("AI Image: {$model} HTTP {$response->status()}: " . substr($response->body(), 0, 200));
                    continue;
                }

                $result = $response->json();
                $imageData = $this->extractImageFromGeminiResponse($result);

                if ($imageData) {
                    \Log::info("AI Image: SUCCESS with {$model}");
                    return $this->saveBase64Image($imageData['data'], $imageData['mime'], $description, $slug, $idx);
                }

                \Log::warning("AI Image: {$model} no image in response");
            } catch (\Exception $e) {
                \Log::warning("AI Image: {$model} exception: " . $e->getMessage());
            }
        }

        // Fallback: try Imagen 3 with predict endpoint
        try {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={$apiKey}";
            \Log::info("AI Image: Trying imagen-3.0 predict endpoint");

            $response = Http::timeout(60)->withoutVerifying()
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($url, [
                    'instances' => [['prompt' => $description]],
                    'parameters' => ['sampleCount' => 1],
                ]);

            if ($response->successful()) {
                $result = $response->json();
                $prediction = $result['predictions'][0] ?? null;
                if ($prediction && isset($prediction['bytesBase64Encoded'])) {
                    \Log::info("AI Image: SUCCESS with imagen-3.0 predict");
                    return $this->saveBase64Image(
                        $prediction['bytesBase64Encoded'],
                        $prediction['mimeType'] ?? 'image/png',
                        $description, $slug, $idx
                    );
                }
            }
            \Log::warning("AI Image: imagen predict HTTP {$response->status()}: " . substr($response->body(), 0, 200));
        } catch (\Exception $e) {
            \Log::warning("AI Image: imagen predict exception: " . $e->getMessage());
        }

        \Log::error("AI Image: ALL models failed for: " . substr($description, 0, 80));
        return null;
    }

    /**
     * Extract base64 image data from Gemini generateContent response.
     */
    private function extractImageFromGeminiResponse(array $result): ?array
    {
        foreach ($result['candidates'] ?? [] as $candidate) {
            foreach ($candidate['content']['parts'] ?? [] as $part) {
                if (isset($part['inlineData']['data'])) {
                    return ['data' => $part['inlineData']['data'], 'mime' => $part['inlineData']['mimeType'] ?? 'image/png'];
                }
                if (isset($part['inline_data']['data'])) {
                    return ['data' => $part['inline_data']['data'], 'mime' => $part['inline_data']['mime_type'] ?? 'image/png'];
                }
            }
        }
        return null;
    }

    /**
     * Save base64 image data to storage and Media table.
     * Generates SEO-friendly filename from topic slug.
     */
    private function saveBase64Image(string $base64Data, string $mimeType, string $altText, string $topic, int $idx): string
    {
        $binary = base64_decode($base64Data);
        $month = date('Y-m');

        // Generate SEO-friendly slug from topic
        $slug = \Illuminate\Support\Str::slug($topic);
        $slug = $slug ?: 'ai-image';
        // Limit slug length to avoid overly long filenames
        $slug = mb_substr($slug, 0, 60);
        // Add index suffix for multiple images
        $suffix = $idx > 0 ? '-' . ($idx + 1) : '';
        // Use webp for best SEO/performance
        $filename = "{$slug}{$suffix}.webp";

        $dir = storage_path("app/public/uploads/{$month}");
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        // Ensure unique filename
        $relativePath = "uploads/{$month}/{$filename}";
        $fullPath = storage_path("app/public/{$relativePath}");
        if (file_exists($fullPath)) {
            $filename = "{$slug}{$suffix}-" . time() . '.webp';
            $relativePath = "uploads/{$month}/{$filename}";
            $fullPath = storage_path("app/public/{$relativePath}");
        }

        // Convert to WebP if possible, otherwise save as-is
        try {
            $image = \Intervention\Image\Laravel\Facades\Image::read($binary);
            if ($image->width() > 1200) {
                $image->scaleDown(width: 1200);
            }
            $image->toWebp(85)->save($fullPath);
            $mimeType = 'image/webp';
        } catch (\Throwable $e) {
            // Fallback: save raw binary
            file_put_contents($fullPath, $binary);
        }

        $width = null;
        $height = null;
        if (function_exists('getimagesize')) {
            $info = @getimagesize($fullPath);
            if ($info) { $width = $info[0]; $height = $info[1]; }
        }

        // SEO alt text in Vietnamese
        $seoAlt = mb_substr($altText, 0, 255);

        Media::create([
            'filename'      => $filename,
            'original_name' => $filename,
            'path'          => $relativePath,
            'url'           => "/storage/{$relativePath}",
            'mime_type'     => $mimeType,
            'size'          => filesize($fullPath),
            'width'         => $width,
            'height'        => $height,
            'alt'           => $seoAlt,
            'folder'        => 'ai-generated',
        ]);

        return "/storage/{$relativePath}";
    }

    /**
     * Get related published articles for internal linking.
     * Returns array of [title, slug, keywords] for the prompt.
     */
    private function getRelatedArticlesForLinking(?int $categoryId = null): array
    {
        $query = Article::where('is_published', true)
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->orderByDesc('created_at');

        if ($categoryId) {
            $query->where('article_category_id', $categoryId);
        }

        $articles = $query->limit(8)->get(['title', 'slug', 'meta_keywords']);

        if ($articles->isEmpty() && $categoryId) {
            // Fallback: get any published articles if none in this category
            $articles = Article::where('is_published', true)
                ->whereNotNull('slug')
                ->where('slug', '!=', '')
                ->orderByDesc('created_at')
                ->limit(5)
                ->get(['title', 'slug', 'meta_keywords']);
        }

        return $articles->map(fn($a) => [
            'title' => $a->title,
            'slug' => $a->slug,
            'keywords' => $a->meta_keywords ?: '',
        ])->toArray();
    }
}
