<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductAddonGroup;
use Illuminate\Http\Request;

class AddonGroupController extends Controller
{
    /**
     * List all addon groups with options
     */
    public function index()
    {
        $groups = ProductAddonGroup::with('options')
            ->withCount('products')
            ->orderBy('sort_order')
            ->get();

        return response()->json($groups);
    }

    /**
     * Create addon group with options (names only, no prices)
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'is_required' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
            'options' => 'nullable|array',
            'options.*.name' => 'required|string|max:255',
            'options.*.sort_order' => 'nullable|integer',
        ]);

        $group = ProductAddonGroup::create([
            'name' => $data['name'],
            'is_required' => $data['is_required'] ?? false,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        if (!empty($data['options'])) {
            foreach ($data['options'] as $i => $opt) {
                $group->options()->create([
                    'name' => $opt['name'],
                    'sort_order' => $opt['sort_order'] ?? $i,
                ]);
            }
        }

        return response()->json($group->load('options'), 201);
    }

    /**
     * Update addon group with options
     */
    public function update(Request $request, ProductAddonGroup $addonGroup)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'is_required' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
            'options' => 'nullable|array',
            'options.*.name' => 'required|string|max:255',
            'options.*.sort_order' => 'nullable|integer',
        ]);

        $addonGroup->update([
            'name' => $data['name'] ?? $addonGroup->name,
            'is_required' => $data['is_required'] ?? $addonGroup->is_required,
            'sort_order' => $data['sort_order'] ?? $addonGroup->sort_order,
        ]);

        if (isset($data['options'])) {
            $addonGroup->options()->delete();
            foreach ($data['options'] as $i => $opt) {
                $addonGroup->options()->create([
                    'name' => $opt['name'],
                    'sort_order' => $opt['sort_order'] ?? $i,
                ]);
            }
        }

        return response()->json($addonGroup->load('options'));
    }

    /**
     * Delete addon group
     */
    public function destroy(ProductAddonGroup $addonGroup)
    {
        $addonGroup->products()->detach();
        $addonGroup->delete();
        return response()->json(['message' => 'Xóa nhóm tuỳ chọn thành công']);
    }
}
