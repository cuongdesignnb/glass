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
        // products_count = distinct products attached either via primary category_id
        // OR via pivot `category_product` (many-to-many). Must match the filter
        // behaviour in ProductController@index to keep "Kính Thời Trang (2)"
        // and the listing result in sync.
        $countSubquery = "(
            SELECT COUNT(DISTINCT p.id)
              FROM products p
         LEFT JOIN category_product cp ON cp.product_id = p.id
             WHERE p.category_id = categories.id OR cp.category_id = categories.id
        ) AS products_count";

        $query = Category::select('categories.*')
            ->selectRaw($countSubquery);

        if ($request->boolean('tree', false)) {
            $categories = $query->whereNull('parent_id')
                ->with(['children' => function ($q) use ($countSubquery) {
                    $q->select('categories.*')
                      ->selectRaw($countSubquery)
                      ->orderBy('order');
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
