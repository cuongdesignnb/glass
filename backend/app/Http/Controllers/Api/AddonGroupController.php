<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductAddonGroup;
use App\Models\AddonOptionConstraint;
use Illuminate\Http\Request;

class AddonGroupController extends Controller
{
    /**
     * List all addon groups with options and constraints
     */
    public function index()
    {
        try {
            $groups = ProductAddonGroup::with(['options' => function ($q) {
                $q->orderBy('sort_order');
            }])
                ->withCount('products')
                ->orderBy('sort_order')
                ->get();

            // Load all constraints
            $constraints = [];
            try {
                $constraints = AddonOptionConstraint::all()
                    ->map(fn($c) => [
                        'option_id' => $c->option_id,
                        'blocked_option_id' => $c->blocked_option_id,
                    ])
                    ->values()
                    ->toArray();
            } catch (\Exception $e) {
                // Table may not exist yet
            }

            return response()->json([
                'groups' => $groups,
                'constraints' => $constraints,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'groups' => [],
                'constraints' => [],
            ]);
        }
    }

    /**
     * Create addon group with options
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

    /**
     * Save constraints (bulk update)
     * Expected: { constraints: [{ option_id: 1, blocked_option_id: 5 }, ...] }
     */
    public function saveConstraints(Request $request)
    {
        $data = $request->validate([
            'constraints' => 'required|array',
            'constraints.*.option_id' => 'required|integer',
            'constraints.*.blocked_option_id' => 'required|integer',
        ]);

        try {
            // Replace all constraints
            AddonOptionConstraint::truncate();

            foreach ($data['constraints'] as $constraint) {
                // Don't allow self-referencing
                if ($constraint['option_id'] == $constraint['blocked_option_id']) continue;

                AddonOptionConstraint::create([
                    'option_id' => $constraint['option_id'],
                    'blocked_option_id' => $constraint['blocked_option_id'],
                ]);
            }

            return response()->json(['message' => 'Đã lưu ràng buộc']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
