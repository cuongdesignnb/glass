<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    /**
     * Get menus by position (with children)
     */
    public function index(Request $request)
    {
        $position = $request->get('position', 'header');

        $menus = Menu::byPosition($position)
            ->roots()
            ->with('children.children') // 3 levels
            ->orderBy('order')
            ->get();

        return response()->json($menus);
    }

    /**
     * Get all menus (flat list for admin)
     */
    public function all()
    {
        $menus = Menu::with('children')
            ->orderBy('position')
            ->orderBy('order')
            ->get();

        return response()->json($menus);
    }

    /**
     * Store new menu item
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'url' => 'nullable|string|max:500',
            'target' => 'nullable|string|in:_self,_blank',
            'icon' => 'nullable|string',
            'parent_id' => 'nullable|exists:menus,id',
            'position' => 'nullable|string|in:header,footer',
            'order' => 'nullable|integer',
            'depth' => 'nullable|integer|max:2',
            'is_active' => 'nullable|boolean',
        ]);

        // Auto set order
        if (!isset($data['order'])) {
            $maxOrder = Menu::where('position', $data['position'] ?? 'header')
                ->where('parent_id', $data['parent_id'] ?? null)
                ->max('order');
            $data['order'] = ($maxOrder ?? 0) + 1;
        }

        $menu = Menu::create($data);

        return response()->json($menu->load('children'), 201);
    }

    /**
     * Update menu item
     */
    public function update(Request $request, Menu $menu)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'url' => 'nullable|string|max:500',
            'target' => 'nullable|string|in:_self,_blank',
            'icon' => 'nullable|string',
            'parent_id' => 'nullable|exists:menus,id',
            'position' => 'nullable|string|in:header,footer',
            'order' => 'nullable|integer',
            'depth' => 'nullable|integer|max:2',
            'is_active' => 'nullable|boolean',
        ]);

        $menu->update($data);

        return response()->json($menu->load('children'));
    }

    /**
     * Reorder menus (drag & drop)
     */
    public function reorder(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:menus,id',
            'items.*.order' => 'required|integer',
            'items.*.parent_id' => 'nullable',
            'items.*.depth' => 'nullable|integer',
        ]);

        foreach ($request->items as $item) {
            Menu::where('id', $item['id'])->update([
                'order' => $item['order'],
                'parent_id' => $item['parent_id'] ?? null,
                'depth' => $item['depth'] ?? 0,
            ]);
        }

        return response()->json(['message' => 'Cập nhật thứ tự thành công']);
    }

    /**
     * Delete menu item
     */
    public function destroy(Menu $menu)
    {
        $menu->delete(); // Children cascade delete
        return response()->json(['message' => 'Xóa menu thành công']);
    }
}
