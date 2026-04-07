<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Helpers\VietnameseSlug;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::withCount('products');

        if ($request->boolean('tree', false)) {
            // Return tree structure
            $categories = $query->whereNull('parent_id')
                ->with(['children' => function ($q) {
                    $q->withCount('products')->orderBy('order');
                }])
                ->orderBy('order')
                ->get();
        } else {
            $categories = $query->orderBy('order')->get();
        }

        return response()->json($categories);
    }

    public function show(string $slugOrId)
    {
        $category = Category::withCount('products')
            ->with('children')
            ->where('slug', $slugOrId)
            ->orWhere('id', is_numeric($slugOrId) ? $slugOrId : 0)
            ->firstOrFail();

        return response()->json($category);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
            'icon' => 'nullable|string',
            'parent_id' => 'nullable|exists:categories,id',
            'order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'meta_title' => 'nullable|string',
            'meta_desc' => 'nullable|string',
        ]);

        $data['slug'] = VietnameseSlug::make($data['name']);

        $existing = Category::where('slug', $data['slug'])->exists();
        if ($existing) {
            $data['slug'] .= '-' . time();
        }

        $category = Category::create($data);

        return response()->json($category, 201);
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
            'icon' => 'nullable|string',
            'parent_id' => 'nullable|exists:categories,id',
            'order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'meta_title' => 'nullable|string',
            'meta_desc' => 'nullable|string',
        ]);

        if (isset($data['name'])) {
            $newSlug = VietnameseSlug::make($data['name']);
            if ($newSlug !== $category->slug) {
                $existing = Category::where('slug', $newSlug)->where('id', '!=', $category->id)->exists();
                $data['slug'] = $existing ? $newSlug . '-' . time() : $newSlug;
            }
        }

        $category->update($data);

        return response()->json($category);
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return response()->json(['message' => 'Xóa danh mục thành công']);
    }
}
