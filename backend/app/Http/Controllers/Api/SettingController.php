<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get settings by group or all
     */
    public function index(Request $request)
    {
        if ($request->filled('group')) {
            return response()->json(Setting::getByGroup($request->group));
        }

        return response()->json(Setting::getAllSettings());
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
            Setting::setValue(
                $setting['key'],
                $setting['value'] ?? '',
                $setting['group'] ?? 'general'
            );
        }

        return response()->json([
            'message' => 'Cập nhật cài đặt thành công',
            'data' => Setting::getAllSettings(),
        ]);
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

        return response()->json(['message' => 'Đã xóa font tùy chỉnh']);
    }
}
