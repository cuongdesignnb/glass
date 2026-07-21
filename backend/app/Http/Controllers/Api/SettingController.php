<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class SettingController extends Controller
{
    public function index(Request $request)
    {
        if ($request->filled('group')) {
            $group = $request->group;
            $settings = Cache::remember("glass_settings_group_{$group}", 3600, function() use ($group) {
                return Setting::getByGroup($group);
            });
        } else {
            $settings = Cache::remember("glass_settings_all", 3600, function() {
                return Setting::getAllSettings();
            });
        }

        if ($request->is('*public*')) {
            $settings = $this->filterSensitiveSettings($settings);
        }

        return response()->json($settings);
    }

    /**
     * Filter out sensitive settings for public endpoints
     */
    private function filterSensitiveSettings(array $settings): array
    {
        $sensitiveKeys = [
            'openai_api_key',
            'vpost_token',
            'vpost_password',
            'vpost_user',
            'sepay_api_key',
        ];

        $isGrouped = false;
        foreach ($settings as $key => $value) {
            if (is_array($value)) {
                $isGrouped = true;
                break;
            }
        }

        if ($isGrouped) {
            foreach ($settings as $group => $items) {
                if (is_array($items)) {
                    foreach ($items as $key => $value) {
                        if ($this->isSensitiveKey($key, $sensitiveKeys)) {
                            unset($settings[$group][$key]);
                        }
                    }
                }
            }
        } else {
            foreach ($settings as $key => $value) {
                if ($this->isSensitiveKey($key, $sensitiveKeys)) {
                    unset($settings[$key]);
                }
            }
        }

        return $settings;
    }

    /**
     * Determine if a setting key is sensitive
     */
    private function isSensitiveKey(string $key, array $sensitiveKeys): bool
    {
        $keyLower = strtolower($key);
        
        if (in_array($keyLower, $sensitiveKeys)) {
            return true;
        }
        
        $keywords = ['api_key', 'secret', 'password', 'token'];
        foreach ($keywords as $kw) {
            if (str_contains($keyLower, $kw)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Bulk update settings
     */
    public function update(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'nullable|string',
            'settings.*.group' => 'nullable|string',
        ]);

        foreach ($request->settings as $setting) {
            $this->validateOpenAiSetting($setting['key'], $setting['value'] ?? '');

            Setting::setValue(
                $setting['key'],
                $setting['value'] ?? '',
                $setting['group'] ?? 'general'
            );
        }

        Cache::flush();

        return response()->json([
            'message' => 'Cập nhật cài đặt thành công',
            'data' => Setting::getAllSettings(),
        ]);
    }

    private function validateOpenAiSetting(string $key, string $value): void
    {
        $value = trim($value);

        if ($value === '') {
            return;
        }

        if (in_array($key, ['openai_base_url', 'openai_image_base_url'], true)) {
            $scheme = strtolower((string) parse_url($value, PHP_URL_SCHEME));
            $host = parse_url($value, PHP_URL_HOST);

            if (!filter_var($value, FILTER_VALIDATE_URL) || $scheme !== 'https' || !$host) {
                throw ValidationException::withMessages([
                    'settings' => ['OpenAI Base URL phai la dia chi HTTPS hop le.'],
                ]);
            }
        }

        if ($key === 'openai_reasoning_effort'
            && !in_array($value, ['none', 'low', 'medium', 'high', 'xhigh', 'max'], true)
        ) {
            throw ValidationException::withMessages([
                'settings' => ['Reasoning effort khong hop le.'],
            ]);
        }

        if ($key === 'openai_wire_api'
            && !in_array($value, ['chat_completions', 'responses'], true)
        ) {
            throw ValidationException::withMessages([
                'settings' => ['Wire API phai la chat_completions hoac responses.'],
            ]);
        }

        if ($key === 'openai_max_tokens'
            && (!ctype_digit($value) || (int) $value < 1 || (int) $value > 128000)
        ) {
            throw ValidationException::withMessages([
                'settings' => ['Max output tokens phai nam trong khoang 1-128000.'],
            ]);
        }

        if ($key === 'openai_image_quality'
            && !in_array($value, ['low', 'medium', 'high', 'auto'], true)
        ) {
            throw ValidationException::withMessages([
                'settings' => ['OpenAI image quality khong hop le.'],
            ]);
        }
    }

    /**
     * Upload custom font file
     */
    public function uploadFont(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:5120',
        ]);

        $ext = strtolower($request->file('file')->getClientOriginalExtension());
        if (!in_array($ext, ['ttf', 'otf', 'woff', 'woff2'])) {
            return response()->json(['message' => 'File phải có định dạng: ttf, otf, woff, woff2'], 422);
        }

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        $filename = 'custom-font-' . time() . '.' . $extension;

        // Lưu vào public/fonts
        $file->move(public_path('fonts'), $filename);

        $fontUrl = '/fonts/' . $filename;

        // Lưu setting
        Setting::setValue('custom_font_name', pathinfo($originalName, PATHINFO_FILENAME), 'font');
        Setting::setValue('custom_font_url', $fontUrl, 'font');
        Setting::setValue('custom_font_format', $extension, 'font');
        Setting::setValue('custom_font_enabled', '1', 'font');

        Cache::flush();

        return response()->json([
            'message' => 'Upload font thành công',
            'font_name' => pathinfo($originalName, PATHINFO_FILENAME),
            'font_url' => $fontUrl,
        ]);
    }

    /**
     * Delete custom font
     */
    public function deleteFont()
    {
        $fontUrl = Setting::getValue('custom_font_url');

        if ($fontUrl) {
            $filePath = public_path(ltrim($fontUrl, '/'));
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }

        Setting::setValue('custom_font_name', '', 'font');
        Setting::setValue('custom_font_url', '', 'font');
        Setting::setValue('custom_font_format', '', 'font');
        Setting::setValue('custom_font_enabled', '0', 'font');

        Cache::flush();

        return response()->json(['message' => 'Đã xóa font tùy chỉnh']);
    }

    /**
     * Serve custom font file with CORS headers.
     * Routed via /api so it survives nginx "/" -> Next.js proxy.
     */
    public function serveFont()
    {
        $fontUrl = Setting::getValue('custom_font_url');
        if (!$fontUrl) {
            return response('', 404);
        }

        $filePath = public_path(ltrim(parse_url($fontUrl, PHP_URL_PATH) ?: $fontUrl, '/'));
        if (!file_exists($filePath)) {
            return response('', 404);
        }

        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimeMap = [
            'ttf'   => 'font/ttf',
            'otf'   => 'font/otf',
            'woff'  => 'font/woff',
            'woff2' => 'font/woff2',
        ];
        $mime = $mimeMap[$ext] ?? 'application/octet-stream';

        return response()->file($filePath, [
            'Content-Type'                => $mime,
            'Access-Control-Allow-Origin' => '*',
            'Cache-Control'               => 'public, max-age=2592000',
        ]);
    }
}
