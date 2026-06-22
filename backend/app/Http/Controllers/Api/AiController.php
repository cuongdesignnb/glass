<?php

namespace App\Http\Controllers\Api;

use App\Models\Media;
use App\Models\Article;
use App\Models\Product;

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

        // Build random SEO anchor opportunities from articles and products.
        $categoryId = $request->get('category_id');
        $linkInstruction = $this->buildSeoAnchorInstruction($categoryId, $length, $request->topic, $keywords);

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
     * Generate article content, thumbnail, and inline images with OpenAI.
     * Gemini is reserved for product virtual try-on only.
     */
    public function generateContentWithImages(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '512M');
        $warnings = [];

        $request->validate([
            'topic' => 'required|string|max:500',
            'type' => 'nullable|string|in:article,product_description,seo',
            'keywords' => 'nullable|string',
            'tone' => 'nullable|string|in:professional,casual,luxury',
            'length' => 'nullable|string|in:short,medium,long',
            'image_count' => 'nullable|integer|min:0|max:10',
            'full_article' => 'nullable|boolean',
            'category_id' => 'nullable|integer|exists:article_categories,id',
        ]);

        $openaiKey = Setting::getValue('openai_api_key') ?: env('OPENAI_API_KEY');
        if (!$openaiKey || trim($openaiKey) === '') {
            return response()->json([
                'error' => 'OpenAI API key chua duoc cau hinh. AI dang bai can OpenAI de sinh noi dung va hinh anh.'
            ], 500);
        }

        $openaiImageModel = Setting::getValue('openai_image_model') ?: env('OPENAI_IMAGE_MODEL', 'gpt-image-2');
        $openaiImageQuality = Setting::getValue('openai_image_quality') ?: env('OPENAI_IMAGE_QUALITY', 'medium');
        $imageCount = max(0, min((int) $request->get('image_count', 2), 10));

        \Log::info('AI Article Image Config', [
            'provider' => 'openai',
            'image_model' => $openaiImageModel,
            'image_quality' => $openaiImageQuality,
            'image_count' => $imageCount,
            'has_openai_key' => !empty($openaiKey),
        ]);

        $model = Setting::getValue('openai_model') ?: env('OPENAI_MODEL', 'gpt-4o-mini');
        $maxTokens = (int) (Setting::getValue('openai_max_tokens') ?: env('OPENAI_MAX_TOKENS', 4096));
        $fullArticle = $request->boolean('full_article', false);

        $type = $request->get('type', 'article');
        $tone = $request->get('tone', 'professional');
        $length = $request->get('length', 'medium');
        $keywords = $request->get('keywords', '');

        $lengthGuide = match ($length) {
            'short' => '500-800 tu',
            'long' => '2000-3000 tu',
            default => '1000-1500 tu',
        };

        $categoryId = $request->get('category_id');
        $linkInstruction = $this->buildSeoAnchorInstruction($categoryId, $length, $request->topic, $keywords);

        if ($fullArticle) {
            $systemPrompt = "Ban la content writer chuyen nghiep cho nganh thoi trang kinh mat. Viet bang tieng Viet. Giong van {$tone}.\n\n"
                . "QUY TAC CAU TRUC BAI VIET:\n"
                . "- Dung cac the <h2> cho moi phan chinh, <h3> cho phan phu\n"
                . "- Noi dung trong <p>, danh sach dung <ul><li>\n"
                . "- Dung <strong>, <em> de nhan manh tu khoa quan trong\n"
                . "- Do dai: {$lengthGuide}\n"
                . $linkInstruction
                . "\nBan PHAI tra ve KET QUA DUOI DANG JSON HOP LE, khong markdown, voi cau truc:\n"
                . "{\n"
                . "  \"title\": \"Tieu de bai viet hap dan, chuan SEO\",\n"
                . "  \"excerpt\": \"Tom tat bai viet 2-3 cau\",\n"
                . "  \"content\": \"Noi dung HTML theo quy tac tren\",\n"
                . "  \"meta_title\": \"SEO title toi da 60 ky tu\",\n"
                . "  \"meta_desc\": \"SEO description toi da 160 ky tu\",\n"
                . "  \"meta_keywords\": \"tu khoa 1, tu khoa 2, tu khoa 3\",\n"
                . "  \"tags\": [\"tag1\", \"tag2\", \"tag3\"]\n"
                . "}";
        } else {
            $systemPrompt = "Ban la content writer chuyen nghiep cho nganh thoi trang kinh mat. "
                . "Viet bai viet chat luong cao, hap dan, voi giong van {$tone}. Do dai: {$lengthGuide}. "
                . "Viet bang tieng Viet. Cau truc: dung <h2> cho phan chinh, <h3> cho phan phu, "
                . "noi dung trong <p>, danh sach <ul><li>, nhan manh bang <strong>, <em>. "
                . $linkInstruction;
        }

        $userPrompt = $fullArticle
            ? "Viet bai viet hoan chinh ve chu de: {$request->topic}" . ($keywords ? "\nTu khoa SEO: {$keywords}" : '')
            : "Viet noi dung ve chu de: {$request->topic}" . ($keywords ? "\nTu khoa can tich hop: {$keywords}" : '');

        try {
            $requestBody = [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
                'max_completion_tokens' => $maxTokens,
            ];

            if ($fullArticle) {
                $requestBody['response_format'] = ['type' => 'json_object'];
            }

            $response = Http::timeout(90)->withoutVerifying()
                ->withHeaders([
                    'Authorization' => "Bearer {$openaiKey}",
                    'Content-Type' => 'application/json',
                ])->post('https://api.openai.com/v1/chat/completions', $requestBody);

            $result = $response->json();

            if ($response->status() === 400 && str_contains($result['error']['message'] ?? '', 'max_completion_tokens')) {
                unset($requestBody['max_completion_tokens']);
                $requestBody['max_tokens'] = $maxTokens;
                $response = Http::timeout(90)->withoutVerifying()
                    ->withHeaders([
                        'Authorization' => "Bearer {$openaiKey}",
                        'Content-Type' => 'application/json',
                    ])->post('https://api.openai.com/v1/chat/completions', $requestBody);
                $result = $response->json();
            }

            if ($response->failed()) {
                $errorMsg = $result['error']['message'] ?? 'OpenAI API error';
                return response()->json(['error' => $errorMsg, 'message' => $errorMsg], $response->status());
            }

            $rawContent = $result['choices'][0]['message']['content'] ?? '';
            $articleMeta = null;

            if ($fullArticle) {
                $cleaned = trim($rawContent);
                $cleaned = preg_replace('/^```json\s*/i', '', $cleaned);
                $cleaned = preg_replace('/\s*```$/i', '', $cleaned);
                $articleMeta = json_decode($cleaned, true);
                if ($articleMeta && isset($articleMeta['content'])) {
                    $rawContent = $articleMeta['content'];
                }
            }

            $content = $rawContent;
            $content = preg_replace('/^```html\s*/i', '', $content);
            $content = preg_replace('/\s*```$/i', '', $content);
            $content = $this->normalizeMarkdownToHtml($content);
            $content = preg_replace('/\[IMG:[^\]]*\]/', '', $content);

            $headings = $this->extractArticleHeadings($content, $articleMeta['title'] ?? $request->topic);
            $h1Heading = null;
            foreach ($headings as $heading) {
                if (($heading['tag'] ?? '') === 'h1') {
                    $h1Heading = $heading;
                    break;
                }
            }

            $titleForImage = $h1Heading['text'] ?? $articleMeta['title'] ?? $request->topic;
            $thumbnailUrl = $this->generateAndSaveImageOpenAI(
                apiKey: $openaiKey,
                preferredModel: $openaiImageModel,
                description: $this->buildArticleImagePrompt($titleForImage, $titleForImage, 'thumbnail', 'h1'),
                slug: \Illuminate\Support\Str::slug($titleForImage . '-thumbnail') ?: 'ai-thumbnail',
                idx: 0,
                warnings: $warnings
            );

            $generatedImages = [];
            $selectedHeadings = $this->selectHeadingsForImages($headings, $imageCount);

            if ($imageCount > 0 && empty($selectedHeadings)) {
                $warnings[] = 'Khong tim thay H1/H2/H3 phu hop de chen hinh anh inline.';
                \Log::warning('AI Images: No H1/H2/H3 headings found for inline images');
            }

            foreach ($selectedHeadings as $idx => $heading) {
                $headingText = $heading['text'];
                $headingTag = $heading['tag'];
                $imageUrl = $this->generateAndSaveImageOpenAI(
                    apiKey: $openaiKey,
                    preferredModel: $openaiImageModel,
                    description: $this->buildArticleImagePrompt($headingText, $titleForImage, 'inline', $headingTag),
                    slug: \Illuminate\Support\Str::slug($headingText) ?: 'ai-image',
                    idx: $idx + 1,
                    warnings: $warnings
                );

                if (!$imageUrl) {
                    continue;
                }

                $safeHeading = htmlspecialchars($headingText, ENT_QUOTES, 'UTF-8');
                $figureHtml = '<figure class="ai-article-image" style="margin:24px 0;text-align:center">'
                    . '<img src="' . $imageUrl . '" alt="' . $safeHeading . '" style="max-width:100%;height:auto;border-radius:12px" loading="lazy" />'
                    . '<figcaption style="font-size:0.85em;color:#666;margin-top:8px">' . $safeHeading . '</figcaption>'
                    . '</figure>';

                $content = $this->insertFigureAfterHeading($content, $heading, $figureHtml);

                $generatedImages[] = [
                    'type' => 'inline',
                    'heading_tag' => $headingTag,
                    'heading' => $headingText,
                    'url' => $imageUrl,
                    'position' => $idx + 1,
                ];
            }

            if (!$thumbnailUrl && !empty($generatedImages[0]['url'])) {
                $thumbnailUrl = $generatedImages[0]['url'];
            }

            $responseData = [
                'success' => true,
                'content' => $content,
                'thumbnail' => $thumbnailUrl,
                'og_image' => $thumbnailUrl,
                'images' => $generatedImages,
                'warnings' => $warnings,
                'usage' => $result['usage'] ?? null,
            ];

            if ($fullArticle && $articleMeta) {
                $responseData['full_article'] = true;
                $responseData['title'] = $articleMeta['title'] ?? $request->topic;
                $responseData['excerpt'] = isset($articleMeta['excerpt']) ? strip_tags($articleMeta['excerpt']) : '';
                $responseData['meta_title'] = $articleMeta['meta_title'] ?? '';
                $responseData['meta_desc'] = $articleMeta['meta_desc'] ?? '';
                $responseData['meta_keywords'] = $articleMeta['meta_keywords'] ?? '';
                $responseData['tags'] = $articleMeta['tags'] ?? [];
            }

            return response()->json($responseData);
        } catch (\Exception $e) {
            \Log::error('AI Content+Images Exception: ' . $e->getMessage());
            return response()->json(['error' => 'Loi tao noi dung: ' . $e->getMessage()], 500);
        }
    }

    private function extractArticleHeadings(string $html, ?string $fallbackTitle = null): array
    {
        $headings = [];

        preg_match_all('/<(h1|h2|h3)[^>]*>(.*?)<\/\1>/is', $html, $matches, PREG_SET_ORDER);

        foreach ($matches as $index => $match) {
            $tag = strtolower($match[1]);
            $text = trim(strip_tags($match[2]));

            if ($text === '') {
                continue;
            }

            $headings[] = [
                'tag' => $tag,
                'text' => $text,
                'html' => $match[0],
                'index' => $index,
            ];
        }

        if (!$this->articleHasH1($headings) && $fallbackTitle) {
            array_unshift($headings, [
                'tag' => 'h1',
                'text' => $fallbackTitle,
                'html' => '',
                'index' => -1,
            ]);
        }

        return $headings;
    }

    private function articleHasH1(array $headings): bool
    {
        foreach ($headings as $heading) {
            if (($heading['tag'] ?? '') === 'h1') {
                return true;
            }
        }

        return false;
    }

    private function selectHeadingsForImages(array $headings, int $imageCount): array
    {
        if ($imageCount <= 0) {
            return [];
        }

        $candidates = array_values(array_filter($headings, function ($heading) {
            return in_array($heading['tag'], ['h2', 'h3'], true);
        }));

        if (empty($candidates)) {
            $candidates = array_values(array_filter($headings, function ($heading) {
                return $heading['tag'] === 'h1';
            }));
        }

        if (empty($candidates)) {
            return [];
        }

        $max = min($imageCount, count($candidates));

        if ($max >= count($candidates)) {
            return $candidates;
        }

        $selected = [];
        $step = count($candidates) / $max;

        for ($i = 0; $i < $max; $i++) {
            $rangeStart = (int) floor($i * $step);
            $rangeEnd = min(count($candidates) - 1, (int) floor(($i + 1) * $step) - 1);

            if ($rangeEnd < $rangeStart) {
                $rangeEnd = $rangeStart;
            }

            $selected[] = $candidates[random_int($rangeStart, $rangeEnd)];
        }

        $unique = [];
        $seen = [];

        foreach ($selected as $item) {
            $key = $item['tag'] . ':' . $item['text'];
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $unique[] = $item;
            }
        }

        return array_values($unique);
    }

    private function buildArticleImagePrompt(string $headingText, string $articleTitle, string $imageType = 'inline', string $headingTag = 'h2'): string
    {
        if ($imageType === 'thumbnail') {
            return "Tao anh thumbnail ngang 16:9 cho bai viet nganh kinh mat Viet Nam. "
                . "Anh phai the hien dung noi dung H1/tieu de chinh: '{$headingText}'. "
                . "Phong cach editorial cao cap, hien dai, thuong mai dien tu, anh sang dep, bo cuc sach, chuyen nghiep. "
                . "Khong chu, khong logo, khong watermark, khong mockup chu, khong typography.";
        }

        return "Tao anh minh hoa trong bai viet nganh kinh mat Viet Nam. "
            . "Anh phai bam sat noi dung the {$headingTag}: '{$headingText}'. "
            . "Boi canh tong the cua bai viet: '{$articleTitle}'. "
            . "Phong cach editorial hien dai, tu nhien, cao cap, phu hop blog thuong mai dien tu. "
            . "Khong chu, khong logo, khong watermark, khong typography. "
            . "Anh nen co bo cuc ro rang, dung duoc trong noi dung bai viet.";
    }

    private function insertFigureAfterHeading(string $content, array $heading, string $figureHtml): string
    {
        if (!empty($heading['html']) && str_contains($content, $heading['html'])) {
            return preg_replace(
                '/' . preg_quote($heading['html'], '/') . '/i',
                $heading['html'] . "\n" . $figureHtml,
                $content,
                1
            );
        }

        return $content . "\n" . $figureHtml;
    }

    /**
     * Generate image via OpenAI ChatGPT Image 2 (gpt-image-2) and save to Media library.
     */
    private function generateAndSaveImageOpenAI(string $apiKey, string $preferredModel, string $description, string $slug, int $idx, array &$warnings = []): ?string
    {
        $modelsToTry = array_values(array_unique(array_filter([
            $preferredModel,
            'gpt-image-2',
            'gpt-image-1',
            'dall-e-3',
        ])));

        foreach ($modelsToTry as $model) {
            try {
                $payload = [
                    'model' => $model,
                    'prompt' => $description,
                    'n' => 1,
                ];

                if (str_starts_with($model, 'gpt-image')) {
                    $payload['size'] = '1536x1024';
                    $payload['quality'] = Setting::getValue('openai_image_quality') ?: env('OPENAI_IMAGE_QUALITY', 'medium');
                    $payload['output_format'] = 'png';
                } elseif ($model === 'dall-e-3') {
                    $payload['size'] = '1792x1024';
                    $payload['response_format'] = 'b64_json';
                } else {
                    $payload['size'] = '1024x1024';
                    $payload['response_format'] = 'b64_json';
                }

                \Log::info('OpenAI article image request', [
                    'model' => $model,
                    'size' => $payload['size'] ?? null,
                    'slug' => $slug,
                    'idx' => $idx,
                ]);

                $response = Http::timeout(120)
                    ->withoutVerifying()
                    ->withHeaders([
                        'Authorization' => "Bearer {$apiKey}",
                        'Content-Type' => 'application/json',
                    ])
                    ->post('https://api.openai.com/v1/images/generations', $payload);

                $result = $response->json();

                if ($response->failed()) {
                    $message = $result['error']['message'] ?? $response->body();
                    $warnings[] = "OpenAI image model {$model} loi HTTP {$response->status()}: {$message}";

                    \Log::warning('OpenAI article image failed', [
                        'model' => $model,
                        'status' => $response->status(),
                        'body' => mb_substr($response->body(), 0, 1000),
                    ]);

                    continue;
                }

                $base64Data = $result['data'][0]['b64_json'] ?? null;

                if (!$base64Data && !empty($result['data'][0]['url'])) {
                    $imageResponse = Http::timeout(60)->withoutVerifying()->get($result['data'][0]['url']);
                    if ($imageResponse->successful()) {
                        $base64Data = base64_encode($imageResponse->body());
                    }
                }

                if ($base64Data) {
                    return $this->saveBase64ImageAsWebpToLibrary(
                        base64Data: $base64Data,
                        originalMimeType: 'image/png',
                        altText: $description,
                        topic: $slug,
                        idx: $idx
                    );
                }

                $warnings[] = "OpenAI image model {$model} khong tra ve b64_json hoac url.";
            } catch (\Throwable $e) {
                $warnings[] = "Loi sinh anh OpenAI model {$model}: {$e->getMessage()}";

                \Log::error('OpenAI article image exception', [
                    'model' => $model,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        return null;
    }

    private function saveBase64ImageAsWebpToLibrary(string $base64Data, string $originalMimeType, string $altText, string $topic, int $idx): string
    {
        $binary = base64_decode($base64Data);

        if (!$binary) {
            throw new \RuntimeException('Khong decode duoc base64 image.');
        }

        $month = date('Y-m');
        $slug = \Illuminate\Support\Str::slug($topic) ?: 'ai-image';
        $slug = mb_substr($slug, 0, 70);

        $suffix = $idx > 0 ? '-' . ($idx + 1) : '';
        $filename = "{$slug}{$suffix}.webp";

        $dir = storage_path("app/public/uploads/{$month}");
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $relativePath = "uploads/{$month}/{$filename}";
        $fullPath = storage_path("app/public/{$relativePath}");

        if (file_exists($fullPath)) {
            $filename = "{$slug}{$suffix}-" . time() . '-' . random_int(1000, 9999) . '.webp';
            $relativePath = "uploads/{$month}/{$filename}";
            $fullPath = storage_path("app/public/{$relativePath}");
        }

        try {
            $image = \Intervention\Image\Laravel\Facades\Image::read($binary);

            if ($image->width() > 1600) {
                $image->scaleDown(width: 1600);
            }

            $image->toWebp(85)->save($fullPath);
        } catch (\Throwable $e) {
            \Log::error('Convert AI image to WebP failed', [
                'message' => $e->getMessage(),
                'path' => $relativePath,
                'original_mime_type' => $originalMimeType,
            ]);

            throw $e;
        }

        $width = null;
        $height = null;

        if (function_exists('getimagesize')) {
            $info = @getimagesize($fullPath);
            if ($info) {
                $width = $info[0] ?? null;
                $height = $info[1] ?? null;
            }
        }

        Media::create([
            'filename' => $filename,
            'original_name' => $filename,
            'path' => $relativePath,
            'url' => "/storage/{$relativePath}",
            'mime_type' => 'image/webp',
            'size' => filesize($fullPath),
            'width' => $width,
            'height' => $height,
            'alt' => mb_substr(strip_tags($altText), 0, 255),
            'folder' => 'ai-generated',
        ]);

        return "/storage/{$relativePath}";
    }
    private function buildSeoAnchorInstruction(?int $categoryId, string $length, string $topic, string $keywords = ''): string
    {
        $targetCount = match ($length) {
            'short' => 2,
            'long' => 4,
            default => 3,
        };

        $anchors = $this->getSeoAnchorOpportunities($categoryId, $targetCount, $topic, $keywords);

        if (empty($anchors)) {
            return '';
        }

        $instruction = "\nSEO INTERNAL LINKS / ANCHOR TEXT TU NHIEN:\n";
        $instruction .= "- Chen dung {$targetCount} anchor text neu ngu canh phu hop; toi thieu 2 anchor, toi da 4 anchor trong mot bai.\n";
        $instruction .= "- Phan bo deu trong than bai, khong dat lien tiep trong cung mot doan.\n";
        $instruction .= "- Moi URL chi dung mot lan. Khong nhai lai mot anchor text.\n";
        $instruction .= "- Viet cau van tu nhien truoc, sau do gan link vao cum tu phu hop. Khong viet kieu danh sach link, khong dung 'xem them', 'doc them', 'tai day'.\n";
        $instruction .= "- Anchor text nen la cum 2-6 tu, co lien quan ngu canh, uu tien tu khoa/bien the tu khoa tu database, khong bat buoc dung nguyen ten san pham/tieu de.\n";
        $instruction .= "- Neu anchor la san pham, chi chen khi cau van dang noi ve nhu cau, phong cach, chat lieu, kieu dang hoac lua chon kinh phu hop.\n";
        $instruction .= "- Bat buoc tra ve link HTML dang <a href=\"URL\">anchor text</a>.\n";
        $instruction .= "\nDanh sach anchor duoc phep chon random cho bai nay:\n";

        foreach ($anchors as $anchor) {
            $phrases = implode(' | ', array_slice($anchor['anchor_texts'], 0, 5));
            $instruction .= "- {$anchor['type']}: {$anchor['title']} -> {$anchor['url']} | anchor goi y: {$phrases}\n";
        }

        return $instruction;
    }

    private function getSeoAnchorOpportunities(?int $categoryId, int $limit, string $topic, string $keywords = ''): array
    {
        $articleLimit = max(1, (int) ceil($limit / 2));
        $productLimit = max(1, $limit - $articleLimit + 1);

        $articleQuery = Article::where('is_published', true)
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->select(['title', 'slug', 'meta_keywords']);

        if ($categoryId) {
            $articleQuery->where('article_category_id', $categoryId);
        }

        $articles = $articleQuery->inRandomOrder()->limit($articleLimit + 2)->get();

        if ($articles->isEmpty() && $categoryId) {
            $articles = Article::where('is_published', true)
                ->whereNotNull('slug')
                ->where('slug', '!=', '')
                ->inRandomOrder()
                ->limit($articleLimit + 2)
                ->get(['title', 'slug', 'meta_keywords']);
        }

        $products = Product::where('is_active', true)
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->inRandomOrder()
            ->limit($productLimit + 2)
            ->get(['name', 'slug', 'brand', 'meta_keywords', 'frame_styles', 'materials', 'gender']);

        $items = [];

        foreach ($articles as $article) {
            $items[] = [
                'type' => 'article',
                'title' => $article->title,
                'url' => '/bai-viet/' . $article->slug,
                'anchor_texts' => $this->buildAnchorTextCandidates($article->title, $article->meta_keywords, $topic, $keywords),
            ];
        }

        foreach ($products as $product) {
            $descriptorParts = array_filter([
                $product->brand,
                is_array($product->frame_styles) ? implode(', ', $product->frame_styles) : $product->frame_styles,
                is_array($product->materials) ? implode(', ', $product->materials) : $product->materials,
                is_array($product->gender) ? implode(', ', $product->gender) : $product->gender,
            ]);

            $items[] = [
                'type' => 'product',
                'title' => $product->name,
                'url' => '/san-pham/' . $product->slug,
                'anchor_texts' => $this->buildAnchorTextCandidates(
                    $product->name,
                    trim(($product->meta_keywords ?: '') . ', ' . implode(', ', $descriptorParts), ', '),
                    $topic,
                    $keywords
                ),
            ];
        }

        shuffle($items);

        return array_slice($items, 0, min($limit, count($items)));
    }

    private function buildAnchorTextCandidates(string $title, ?string $sourceKeywords = null, string $topic = '', string $requestKeywords = ''): array
    {
        $candidates = [];
        $keywordSource = implode(',', array_filter([$sourceKeywords, $requestKeywords]));

        foreach (explode(',', $keywordSource) as $keyword) {
            $keyword = trim(strip_tags($keyword));
            if ($keyword !== '' && mb_strlen($keyword) >= 3 && mb_strlen($keyword) <= 60) {
                $candidates[] = $keyword;
            }
        }

        $cleanTitle = trim(strip_tags($title));
        if ($cleanTitle !== '') {
            $candidates[] = $cleanTitle;
        }

        $topic = trim(strip_tags($topic));
        if ($topic !== '') {
            $candidates[] = 'lua chon phu hop voi ' . mb_strtolower($topic);
            $candidates[] = 'goi y lien quan den ' . mb_strtolower($topic);
        }

        $generic = [
            'mau kinh phu hop',
            'gong kinh thoi trang',
            'kinh mat cao cap',
            'lua chon kinh hien dai',
            'phong cach kinh mat',
        ];

        $candidates = array_merge($candidates, $generic);
        $candidates = array_values(array_unique(array_filter($candidates)));
        shuffle($candidates);

        return array_slice($candidates, 0, 6);
    }
    /**
     * Convert basic markdown elements (headings, bold, italic) to HTML.
     */
    private function normalizeMarkdownToHtml(string $content): string
    {
        // Convert markdown headings to HTML (ensuring they start on a new line or at the beginning of text)
        $content = preg_replace('/^##\s+(.*?)$/m', '<h2>$1</h2>', $content);
        $content = preg_replace('/^###\s+(.*?)$/m', '<h3>$1</h3>', $content);
        $content = preg_replace('/^####\s+(.*?)$/m', '<h4>$1</h4>', $content);
        $content = preg_replace('/^#\s+(.*?)$/m', '<h1>$1</h1>', $content);

        // Convert bold/italic
        $content = preg_replace('/\*\*(.*?)\*\*/', '<strong>$1</strong>', $content);
        $content = preg_replace('/\*(.*?)\*/', '<em>$1</em>', $content);

        return $content;
    }
}
