<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Helpers\VietnameseSlug;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    public function index(Request $request)
    {
        $query = Article::orderBy('created_at', 'desc');

        if ($request->filled('published_only')) {
            $query->published();
        }

        if ($request->filled('featured')) {
            $query->where('is_featured', true);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('excerpt', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 12);
        return response()->json($query->paginate($perPage));
    }

    public function show(string $slugOrId)
    {
        $article = Article::where('slug', $slugOrId)
            ->orWhere('id', is_numeric($slugOrId) ? $slugOrId : 0)
            ->firstOrFail();

        $article->increment('views');

        return response()->json($article);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'excerpt' => 'nullable|string',
            'content' => 'nullable|string',
            'thumbnail' => 'nullable|string',
            'author' => 'nullable|string',
            'tags' => 'nullable|array',
            'is_published' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'meta_title' => 'nullable|string',
            'meta_desc' => 'nullable|string',
            'meta_keywords' => 'nullable|string',
            'og_image' => 'nullable|string',
            'published_at' => 'nullable|date',
        ]);

        $data['slug'] = VietnameseSlug::make($data['title']);
        $existing = Article::where('slug', $data['slug'])->exists();
        if ($existing) {
            $data['slug'] .= '-' . time();
        }

        if (!empty($data['is_published']) && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $article = Article::create($data);
        return response()->json($article, 201);
    }

    public function update(Request $request, Article $article)
    {
        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'excerpt' => 'nullable|string',
            'content' => 'nullable|string',
            'thumbnail' => 'nullable|string',
            'author' => 'nullable|string',
            'tags' => 'nullable|array',
            'is_published' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'meta_title' => 'nullable|string',
            'meta_desc' => 'nullable|string',
            'meta_keywords' => 'nullable|string',
            'og_image' => 'nullable|string',
            'published_at' => 'nullable|date',
        ]);

        if (isset($data['title'])) {
            $newSlug = VietnameseSlug::make($data['title']);
            if ($newSlug !== $article->slug) {
                $existing = Article::where('slug', $newSlug)->where('id', '!=', $article->id)->exists();
                $data['slug'] = $existing ? $newSlug . '-' . time() : $newSlug;
            }
        }

        // Auto set published_at
        if (!empty($data['is_published']) && !$article->published_at) {
            $data['published_at'] = now();
        }

        $article->update($data);
        return response()->json($article);
    }

    public function destroy(Article $article)
    {
        $article->delete();
        return response()->json(['message' => 'Xóa bài viết thành công']);
    }
}
