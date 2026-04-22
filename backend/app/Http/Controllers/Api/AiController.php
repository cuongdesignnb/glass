<?php

namespace App\Http\Controllers\Api;

use App\Models\Media;

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

        if ($fullArticle) {
            $systemPrompt = "Bạn là content writer chuyên nghiệp cho ngành thời trang kính mắt. Viết bằng tiếng Việt. Giọng văn {$tone}.

Bạn PHẢI trả về KẾT QUẢ DƯỚI DẠNG JSON HỢP LỆ (không markdown, không ```json```) với cấu trúc:
{
  \"title\": \"Tiêu đề bài viết hấp dẫn, chuẩn SEO\",
  \"excerpt\": \"Tóm tắt bài viết 2-3 câu, hấp dẫn, dùng làm mô tả ngắn\",
  \"content\": \"Nội dung HTML đầy đủ dùng h2, h3, p, ul, li, strong, em. Độ dài: {$lengthGuide}\",
  \"meta_title\": \"SEO title (tối đa 60 ký tự)\",
  \"meta_desc\": \"SEO description (tối đa 160 ký tự)\",
  \"meta_keywords\": \"từ khóa 1, từ khóa 2, từ khóa 3\",
  \"tags\": [\"tag1\", \"tag2\", \"tag3\", \"tag4\"]
}";
        } else {
            $systemPrompt = match($type) {
                'product_description' => "Bạn là chuyên gia viết mô tả sản phẩm kính mắt. Viết mô tả hấp dẫn, chuyên nghiệp. Giọng văn {$tone}. Viết bằng tiếng Việt.",
                'seo' => "Bạn là chuyên gia SEO. Viết nội dung chuẩn SEO cho website kính mắt. Viết bằng tiếng Việt.",
                default => "Bạn là content writer chuyên nghiệp cho ngành thời trang kính mắt. Viết bài viết chất lượng cao, hấp dẫn, với giọng văn {$tone}. Độ dài: {$lengthGuide}. Viết bằng tiếng Việt. Sử dụng HTML formatting (h2, h3, p, ul, li, strong, em).",
            };
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

        $imgInstruction = $imageCount > 0
            ? "QUAN TRỌNG: Trong nội dung bài viết (trường content), chèn CHÍNH XÁC {$imageCount} placeholder ảnh với format: [IMG:mô tả chi tiết ảnh bằng tiếng Anh]. Ví dụ: [IMG:A stylish woman wearing trendy cat-eye sunglasses]. Đặt ở vị trí phù hợp."
            : "";

        if ($fullArticle) {
            $systemPrompt = "Bạn là content writer chuyên nghiệp cho ngành thời trang kính mắt. Viết bằng tiếng Việt. Giọng văn {$tone}.

Bạn PHẢI trả về KẾT QUẢ DƯỚI DẠNG JSON HỢP LỆ với cấu trúc:
{
  \"title\": \"Tiêu đề bài viết hấp dẫn, chuẩn SEO\",
  \"excerpt\": \"Tóm tắt bài viết 2-3 câu\",
  \"content\": \"Nội dung HTML dùng h2, h3, p, ul, li, strong, em. Độ dài: {$lengthGuide}. {$imgInstruction}\",
  \"meta_title\": \"SEO title (tối đa 60 ký tự)\",
  \"meta_desc\": \"SEO description (tối đa 160 ký tự)\",
  \"meta_keywords\": \"từ khóa 1, từ khóa 2, từ khóa 3\",
  \"tags\": [\"tag1\", \"tag2\", \"tag3\"]
}";
        } else {
            $systemPrompt = "Bạn là content writer chuyên nghiệp cho ngành thời trang kính mắt. Viết bài viết chất lượng cao, hấp dẫn, với giọng văn {$tone}. Độ dài: {$lengthGuide}. Viết bằng tiếng Việt. Sử dụng HTML formatting (h2, h3, p, ul, li, strong, em). {$imgInstruction}";
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
            if ($fullArticle) {
                $cleaned = trim($rawContent);
                $cleaned = preg_replace('/^```json\s*/i', '', $cleaned);
                $cleaned = preg_replace('/\s*```$/i', '', $cleaned);
                $articleMeta = json_decode($cleaned, true);
                if ($articleMeta && isset($articleMeta['content'])) {
                    $rawContent = $articleMeta['content'];
                }
            }

            // ── Generate images for [IMG:...] placeholders ──
            $generatedImages = [];
            $content = $rawContent;

            if ($imageCount > 0 && preg_match_all('/\[IMG:(.*?)\]/', $content, $matches)) {
                $geminiModel = Setting::getValue('gemini_image_model') ?: 'gemini-2.0-flash-exp';
                $modelsToTry = array_unique([$geminiModel, 'gemini-2.0-flash-exp', 'imagen-3.0-generate-002']);

                foreach ($matches[1] as $idx => $description) {
                    \Log::info("AI Images: Generating image {$idx}: " . substr($description, 0, 80));
                    $imageUrl = $this->generateAndSaveImage($geminiKey, $modelsToTry, $description, $request->topic, $idx);

                    if ($imageUrl) {
                        $generatedImages[] = ['description' => $description, 'url' => $imageUrl];
                        $imgHtml = '<figure style="margin:24px 0;text-align:center"><img src="' . $imageUrl . '" alt="' . htmlspecialchars($description) . '" style="max-width:100%;border-radius:8px" /><figcaption style="font-size:0.85em;color:#666;margin-top:8px">' . htmlspecialchars($description) . '</figcaption></figure>';
                        $content = preg_replace('/\[IMG:' . preg_quote($description, '/') . '\]/', $imgHtml, $content, 1);
                    } else {
                        $content = preg_replace('/\[IMG:' . preg_quote($description, '/') . '\]/', '', $content, 1);
                    }
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
     * Generate image via Gemini and save to Media library.
     * Returns the public URL or null on failure.
     */
    private function generateAndSaveImage(string $apiKey, array $models, string $description, string $topic, int $idx): ?string
    {
        $prompt = "Create a high-quality, professional photograph for a blog article about \"{$topic}\". The image should depict: {$description}. Style: modern, clean, editorial photography. No text or watermarks.";

        $payload = [
            'contents' => [
                ['parts' => [['text' => $prompt]]],
            ],
            'generationConfig' => [
                'responseModalities' => ['TEXT', 'IMAGE'],
            ],
        ];

        foreach ($models as $model) {
            try {
                $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

                $response = Http::timeout(60)->withoutVerifying()
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post($url, $payload);

                if (in_array($response->status(), [429, 400, 404])) {
                    \Log::warning("AI Image: Model {$model} failed HTTP {$response->status()}");
                    continue;
                }

                if ($response->failed()) continue;

                $result = $response->json();
                $imageData = null;
                $imageMime = 'image/png';

                foreach ($result['candidates'] ?? [] as $candidate) {
                    foreach ($candidate['content']['parts'] ?? [] as $part) {
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
                    return $this->saveBase64Image($imageData, $imageMime, $description, $topic, $idx);
                }
            } catch (\Exception $e) {
                \Log::warning("AI Image: Exception with model {$model}: " . $e->getMessage());
                continue;
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
}
