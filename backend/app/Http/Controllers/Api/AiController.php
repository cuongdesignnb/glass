<?php

namespace App\Http\Controllers\Api;

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
     * Auto generate article content using OpenAI / ChatGPT
     */
    public function generateContent(Request $request)
    {
        // OpenAI có thể mất 60-90s cho bài viết dài
        set_time_limit(120);
        ini_set('memory_limit', '256M');

        $request->validate([
            'topic' => 'required|string|max:500',
            'type' => 'nullable|string|in:article,product_description,seo',
            'keywords' => 'nullable|string',
            'tone' => 'nullable|string|in:professional,casual,luxury',
            'length' => 'nullable|string|in:short,medium,long',
        ]);

        // Đọc API key: DB Settings → .env
        $apiKey = Setting::getValue('openai_api_key');
        if (!$apiKey || trim($apiKey) === '') {
            $apiKey = env('OPENAI_API_KEY');
        }

        $model = Setting::getValue('openai_model');
        if (!$model || trim($model) === '') {
            $model = 'gpt-4o-mini';
        }

        $maxTokens = (int)(Setting::getValue('openai_max_tokens') ?: 4096);

        \Log::info('OpenAI Content: API key = ' . ($apiKey ? 'found (' . substr($apiKey, 0, 10) . '...)' : 'MISSING') . ', model=' . $model);

        if (!$apiKey || trim($apiKey) === '') {
            return response()->json([
                'error' => 'OpenAI API key chưa được cấu hình. Vui lòng nhập trong Cài đặt Admin → API & Tích hợp.',
            ], 500);
        }

        $type = $request->get('type', 'article');
        $tone = $request->get('tone', 'professional');
        $length = $request->get('length', 'medium');
        $keywords = $request->get('keywords', '');

        $lengthGuide = match($length) {
            'short' => '500-800 từ',
            'long' => '2000-3000 từ',
            default => '1000-1500 từ',
        };

        $systemPrompt = match($type) {
            'product_description' => "Bạn là chuyên gia viết mô tả sản phẩm kính mắt. Viết mô tả hấp dẫn, chuyên nghiệp, nhấn mạnh chất liệu, thiết kế, và lợi ích. Sử dụng giọng văn {$tone}. Viết bằng tiếng Việt.",
            'seo' => "Bạn là chuyên gia SEO. Viết nội dung chuẩn SEO cho website kính mắt. Tích hợp từ khóa tự nhiên, viết meta description, heading structure. Viết bằng tiếng Việt.",
            default => "Bạn là content writer chuyên nghiệp cho ngành thời trang kính mắt. Viết bài viết chất lượng cao, hấp dẫn, với giọng văn {$tone}. Độ dài: {$lengthGuide}. Viết bằng tiếng Việt. Sử dụng HTML formatting (h2, h3, p, ul, li, strong, em).",
        };

        $userPrompt = "Viết nội dung về chủ đề: {$request->topic}";
        if ($keywords) {
            $userPrompt .= "\nTừ khóa cần tích hợp: {$keywords}";
        }

        try {
            $requestBody = [
                'model'    => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user',   'content' => $userPrompt],
                ],
                'max_completion_tokens' => $maxTokens,
            ];

            \Log::info('OpenAI Content: Sending request with model=' . $model);

            $response = Http::timeout(90)
                ->withoutVerifying()
                ->withHeaders([
                    'Authorization' => "Bearer {$apiKey}",
                    'Content-Type' => 'application/json',
                ])->post('https://api.openai.com/v1/chat/completions', $requestBody);

            $result = $response->json();

            // Nếu lỗi unsupported max_completion_tokens → thử lại với max_tokens (model cũ)
            if ($response->status() === 400
                && str_contains($result['error']['message'] ?? '', 'max_completion_tokens')
            ) {
                \Log::info('OpenAI Content: Retrying with max_tokens (legacy model)');
                unset($requestBody['max_completion_tokens']);
                $requestBody['max_tokens'] = $maxTokens;

                $response = Http::timeout(90)
                    ->withoutVerifying()
                    ->withHeaders([
                        'Authorization' => "Bearer {$apiKey}",
                        'Content-Type' => 'application/json',
                    ])->post('https://api.openai.com/v1/chat/completions', $requestBody);

                $result = $response->json();
            }

            \Log::info('OpenAI Content: Response status=' . $response->status());

            if ($response->failed()) {
                $errorMsg = $result['error']['message'] ?? 'OpenAI API error';
                \Log::error('OpenAI Content Error: ' . json_encode($result));
                return response()->json([
                    'error' => $errorMsg,
                    'message' => $errorMsg, // frontend fetchApi reads .message
                ], $response->status());
            }

            return response()->json([
                'success' => true,
                'content' => $result['choices'][0]['message']['content'] ?? '',
                'usage' => $result['usage'] ?? null,
            ]);
        } catch (\Exception $e) {
            \Log::error('OpenAI Content Exception: ' . $e->getMessage());
            return response()->json([
                'error' => 'Lỗi tạo nội dung: ' . $e->getMessage(),
            ], 500);
        }
    }
}
