<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\Request;

class BannerController extends Controller
{
    public function index(Request $request)
    {
        $query = Banner::orderBy('order');

        if ($request->filled('position')) {
            $query->byPosition($request->position);
        }

        // Public: only active banners
        if ($request->boolean('active_only', false)) {
            $query->active();
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'subtitle' => 'nullable|string|max:500',
            'image' => 'required|string',
            'image_mobile' => 'nullable|string',
            'url' => 'nullable|string|max:500',
            'position' => 'nullable|string|in:hero,sidebar,popup,footer,category',
            'order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $banner = Banner::create($data);
        return response()->json($banner, 201);
    }

    public function update(Request $request, Banner $banner)
    {
        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'subtitle' => 'nullable|string|max:500',
            'image' => 'sometimes|string',
            'image_mobile' => 'nullable|string',
            'url' => 'nullable|string|max:500',
            'position' => 'nullable|string|in:hero,sidebar,popup,footer,category',
            'order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $banner->update($data);
        return response()->json($banner);
    }

    public function destroy(Banner $banner)
    {
        $banner->delete();
        return response()->json(['message' => 'Xóa banner thành công']);
    }
}
