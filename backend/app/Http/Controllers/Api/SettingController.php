<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class SettingController extends Controller
{
    private const PUBLIC_SETTING_KEYS = [
        'site_name', 'site_description', 'site_logo', 'site_favicon', 'site_url',
        'contact_phone', 'contact_email', 'contact_address',
        'seo_title', 'seo_description', 'seo_keywords',
        'social_facebook', 'social_instagram', 'social_youtube', 'social_tiktok',
        'zalo_oa_id', 'zalo_phone', 'zalo_welcome', 'chat_zalo_icon',
        'chat_messenger_icon', 'messenger_page_id',
        'hero_image', 'hero_image_mobile', 'hero_title', 'hero_subtitle',
        'hero_cta_text', 'hero_tag', 'hero_overlay', 'hero_text_color', 'hero_desc_color',
        'homepage_testimonial_1_image', 'homepage_testimonial_2_image', 'homepage_testimonial_3_image',
        'homepage_style_collection', 'homepage_collections_eyebrow',
        'homepage_collections_title', 'homepage_collections_description', 'homepage_collections_cta',
        'stat_customers', 'stat_products', 'stat_brands', 'stat_rating',
        'brand_color',
        'custom_font_name', 'custom_font_url', 'custom_font_format', 'custom_font_enabled',
        'footer_menus', 'footer_bottom_links', 'footer_privacy_url', 'footer_terms_url',
        'footer_show_social', 'footer_show_menus', 'footer_show_contact',
        'footer_opening_hours', 'footer_description', 'footer_copyright',
        'about_seo_title', 'about_seo_description', 'about_seo_keywords',
        'about_banner', 'about_title', 'about_content', 'about_faqs',
        'payment_free_shipping_threshold', 'payment_shipping_fee',
    ];

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

        return response()->json($settings, 200, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
        ]);
    }

    private function filterSensitiveSettings(array $settings): array
    {
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
                        if (!$this->isPublicSetting($key, $value)) {
                            unset($settings[$group][$key]);
                        }
                    }
                }
            }
        } else {
            foreach ($settings as $key => $value) {
                if (!$this->isPublicSetting($key, $value)) {
                    unset($settings[$key]);
                }
            }
        }

        return $settings;
    }

    private function isPublicSetting(string $key, mixed $value): bool
    {
        if (!in_array($key, self::PUBLIC_SETTING_KEYS, true)) {
            return false;
        }

        if (is_array($value)) {
            foreach ($value as $item) {
                if (!$this->isPublicSetting($key, $item)) return false;
            }
            return true;
        }

        if (!is_string($value)) return true;

        return !preg_match(
            '/-----BEGIN\s+(?:[A-Z0-9 ]+\s+)?PRIVATE KEY-----|["\']private_key["\']\s*[:=]|["\']type["\']\s*:\s*["\']service_account["\']/i',
            $value
        );
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
