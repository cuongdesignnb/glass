<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductAttribute;
use Illuminate\Http\Request;

class ProductAttributeController extends Controller
{
    /**
     * Public: Get all active attributes grouped by type
     */
    public function publicIndex()
    {
        $attributes = ProductAttribute::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $grouped = [];
        foreach ($attributes as $attr) {
            $grouped[$attr->type][] = [
                'value' => $attr->value,
                'label' => $attr->label,
                'extra' => $attr->extra,
            ];
        }

        return response()->json($grouped);
    }

    /**
     * Admin: List all attributes (optionally filter by type)
     */
    public function index(Request $request)
    {
        $query = ProductAttribute::orderBy('type')->orderBy('sort_order');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        return response()->json($query->get());
    }

    /**
     * Admin: Create a new attribute
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|string|in:gender,face_shape,frame_style,material,color',
            'value' => 'required|string|max:100',
            'label' => 'required|string|max:100',
            'extra' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        // Check unique type+value
        $exists = ProductAttribute::where('type', $validated['type'])
            ->where('value', $validated['value'])
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Giá trị này đã tồn tại trong nhóm.'], 422);
        }

        $attr = ProductAttribute::create($validated);

        return response()->json([
            'message' => 'Đã thêm thuộc tính.',
            'data' => $attr,
        ], 201);
    }

    /**
     * Admin: Update an attribute
     */
    public function update(Request $request, ProductAttribute $attribute)
    {
        $validated = $request->validate([
            'label' => 'sometimes|string|max:100',
            'value' => 'sometimes|string|max:100',
            'extra' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        // Check unique if value changed
        if (isset($validated['value']) && $validated['value'] !== $attribute->value) {
            $exists = ProductAttribute::where('type', $attribute->type)
                ->where('value', $validated['value'])
                ->where('id', '!=', $attribute->id)
                ->exists();
            if ($exists) {
                return response()->json(['message' => 'Giá trị này đã tồn tại.'], 422);
            }
        }

        $attribute->update($validated);

        return response()->json([
            'message' => 'Đã cập nhật thuộc tính.',
            'data' => $attribute,
        ]);
    }

    /**
     * Admin: Delete an attribute
     */
    public function destroy(ProductAttribute $attribute)
    {
        $attribute->delete();

        return response()->json(['message' => 'Đã xóa thuộc tính.']);
    }

    /**
     * Admin: Reorder attributes
     */
    public function reorder(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:product_attributes,id',
            'items.*.sort_order' => 'required|integer',
        ]);

        foreach ($request->items as $item) {
            ProductAttribute::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json(['message' => 'Đã sắp xếp lại.']);
    }
}
