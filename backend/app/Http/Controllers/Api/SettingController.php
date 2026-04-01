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
}
