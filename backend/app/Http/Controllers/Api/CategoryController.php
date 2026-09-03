<?php

namespace App\Http\Controllers\Api;

use App\Helpers\VietnameseSlug;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Services\ProductCatalogCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $tree = $request->boolean('tree', false);
        $cacheKey = ProductCatalogCache::categoryIndexKey($tree);

        $categories = Cache::remember($cacheKey, 3600, function() use ($request) {
            $query = $this->withActiveProductCount(Category::query());

            if ($request->boolean('tree', false)) {
                return $query->whereNull('parent_id')
                    ->with(['children' => fn ($q) => $this->withActiveProductCount($q)->orderBy('order')])
                    ->orderBy('order')
                    ->get();
            } else {
                return $query->orderBy('order')->get();
            }
        });

        return response()->json($categories);
    }

    public function show(string $slugOrId)
    {
        $category = $this->withActiveProductCount(Category::query())
            ->with([
                'parent',
                'children' => fn ($q) => $this->withActiveProductCount($q),
            ])
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

        $baseSlug = VietnameseSlug::make($data['name']);
        $data['slug'] = $baseSlug;
        $suffix = 2;
        while (Category::where('slug', $data['slug'])->exists()) {
            $data['slug'] = $baseSlug . '-' . $suffix;
            $suffix++;
        }

        $category = Category::create($data);
        ProductCatalogCache::bump();

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

        $category->update($data);
        ProductCatalogCache::bump();

        return response()->json($category);
    }

    public function destroy(Category $category)
    {
        $category->delete();
        ProductCatalogCache::bump();
        return response()->json(['message' => 'Xóa danh mục thành công']);
    }

    /**
     * Count active products that belong to a category through either the
     * primary category_id or the category_product pivot, without duplicates.
     */
    private function withActiveProductCount(Builder|Relation $query): Builder
    {
        $builder = $query instanceof Relation ? $query->getQuery() : $query;
        $categoryTable = $query->getModel()->getTable();
        $categoryIdColumn = $categoryTable . '.id';

        $countQuery = Product::query()
            ->selectRaw('COUNT(DISTINCT products.id)')
            ->leftJoin('category_product as category_product_count', 'category_product_count.product_id', '=', 'products.id')
            ->where('products.is_active', true)
            ->where(function (Builder $membership) use ($categoryIdColumn) {
                $membership->whereColumn('products.category_id', $categoryIdColumn)
                    ->orWhereColumn('category_product_count.category_id', $categoryIdColumn);
            });

        return $builder
            ->select($categoryTable . '.*')
            ->selectSub($countQuery, 'products_count');
    }
}
