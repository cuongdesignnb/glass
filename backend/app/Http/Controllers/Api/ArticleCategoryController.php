<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArticleCategory;
use App\Helpers\VietnameseSlug;
use Illuminate\Http\Request;

class ArticleCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = ArticleCategory::withCount('articles')->orderBy('order');

        if ($request->filled('tree') && $request->tree) {
            $categories = $query->get();
            return response()->json($this->buildTree($categories));
        }

        if ($request->filled('active_only')) {
            $query->where('is_active', true);
        }

        return response()->json($query->get());
    }

    public function show(string $slugOrId)
    {
        $category = ArticleCategory::withCount('articles')
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
            'parent_id' => 'nullable|integer|exists:article_categories,id',
            'order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'meta_title' => 'nullable|string',
            'meta_desc' => 'nullable|string',
        ]);

        $data['slug'] = VietnameseSlug::make($data['name']);
        $existing = ArticleCategory::where('slug', $data['slug'])->exists();
        if ($existing) {
            $data['slug'] .= '-' . time();
        }

        $category = ArticleCategory::create($data);
        return response()->json($category->load('children'), 201);
    }

    public function update(Request $request, ArticleCategory $articleCategory)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
            'parent_id' => 'nullable|integer',
            'order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'meta_title' => 'nullable|string',
            'meta_desc' => 'nullable|string',
        ]);

        if (isset($data['name'])) {
            $newSlug = VietnameseSlug::make($data['name']);
            if ($newSlug !== $articleCategory->slug) {
                $exists = ArticleCategory::where('slug', $newSlug)
                    ->where('id', '!=', $articleCategory->id)
                    ->exists();
                $data['slug'] = $exists ? $newSlug . '-' . time() : $newSlug;
            }
        }

        // Prevent self-parenting
        if (isset($data['parent_id']) && $data['parent_id'] == $articleCategory->id) {
            $data['parent_id'] = null;
        }

        $articleCategory->update($data);
        return response()->json($articleCategory->load('children'));
    }

    public function destroy(ArticleCategory $articleCategory)
    {
        $articleCategory->delete();
        return response()->json(['message' => 'Xóa danh mục bài viết thành công']);
    }

    private function buildTree($categories, $parentId = null)
    {
        $tree = [];
        foreach ($categories as $cat) {
            if ($cat->parent_id == $parentId) {
                $children = $this->buildTree($categories, $cat->id);
                $cat->children = $children;
                $tree[] = $cat;
            }
        }
        return $tree;
    }
}
