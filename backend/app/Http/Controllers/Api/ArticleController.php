<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Helpers\VietnameseSlug;
use App\Services\SlugHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ArticleController extends Controller
{
    public function index(Request $request)
    {
        $query = Article::with('category')->orderBy('created_at', 'desc');

        if ($request->filled('published_only')) {
            $query->published();
        }

        if ($request->filled('featured')) {
            $query->where('is_featured', true);
        }

        if ($request->filled('article_category_id')) {
            $query->where('article_category_id', $request->article_category_id);
        }

        if ($request->filled('tag')) {
            $tag = $request->tag;
            $query->where(function ($q) use ($tag) {
                $q->whereJsonContains('tags', $tag)
                  ->orWhereHas('category', function ($catQuery) use ($tag) {
                      $catQuery->where('slug', $tag);
                  });
            });
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

    public function show(Request $request, string $slugOrId)
    {
        $redirect = SlugHistory::publicRedirect('article', $slugOrId, $request, '/bai-viet');
        if ($redirect) {
            return $redirect;
        }

        $article = Article::with('category')
            ->where(function ($query) use ($slugOrId) {
                $query->where('slug', $slugOrId)
                    ->orWhere('id', is_numeric($slugOrId) ? $slugOrId : 0);
            })
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
            'thumbnail_alt' => 'nullable|string|max:255',
            'thumbnail_caption' => 'nullable|string|max:1000',
            'author' => 'nullable|string',
            'author_role' => 'nullable|string|max:255',
            'tags' => 'nullable|array',
            'is_published' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'meta_title' => 'nullable|string',
            'meta_desc' => 'nullable|string',
            'meta_keywords' => 'nullable|string',
            'og_image' => 'nullable|string',
            'published_at' => 'nullable|date',
            'article_category_id' => 'nullable|integer|exists:article_categories,id',
        ]);

        $data['slug'] = VietnameseSlug::make($data['title']);
        $existing = Article::where('slug', $data['slug'])->exists();
        if ($existing) {
            $data['slug'] .= '-' . time();
        }

        if (!empty($data['is_published']) && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        if (! empty($data['thumbnail']) && empty(trim((string) ($data['thumbnail_alt'] ?? '')))) {
            $data['thumbnail_alt'] = $data['title'];
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
            'thumbnail_alt' => 'nullable|string|max:255',
            'thumbnail_caption' => 'nullable|string|max:1000',
            'author' => 'nullable|string',
            'author_role' => 'nullable|string|max:255',
            'tags' => 'nullable|array',
            'is_published' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'regenerate_slug' => 'sometimes|boolean',
            'requested_slug' => [
                Rule::requiredIf(fn () => $request->boolean('regenerate_slug')),
                'string',
                'max:255',
            ],
            'meta_title' => 'nullable|string',
            'meta_desc' => 'nullable|string',
            'meta_keywords' => 'nullable|string',
            'og_image' => 'nullable|string',
            'published_at' => 'nullable|date',
            'article_category_id' => 'nullable|integer|exists:article_categories,id',
        ]);

        // Keep the existing URL for normal edits. Regeneration is available
        // only after an explicit, confirmed admin action.
        $regenerateSlug = (bool) ($data['regenerate_slug'] ?? false);
        $requestedSlug = $data['requested_slug'] ?? null;
        unset($data['regenerate_slug']);
        unset($data['requested_slug']);

        // Auto set published_at
        if (!empty($data['is_published']) && !$article->published_at) {
            $data['published_at'] = now();
        }

        $resultingThumbnail = $data['thumbnail'] ?? $article->thumbnail;
        $resultingAlt = array_key_exists('thumbnail_alt', $data)
            ? $data['thumbnail_alt']
            : $article->thumbnail_alt;
        if (! empty($resultingThumbnail) && empty(trim((string) $resultingAlt))) {
            $data['thumbnail_alt'] = $data['title'] ?? $article->title;
        }

        $article = DB::transaction(function () use (
            &$article,
            $data,
            $regenerateSlug,
            $requestedSlug
        ) {
            if ($regenerateSlug) {
                $newSlug = VietnameseSlug::make($data['title'] ?? $article->title);
                if ($requestedSlug !== $newSlug) {
                    throw ValidationException::withMessages([
                        'slug' => 'Slug xem trước đã cũ. Vui lòng tạo và xác nhận lại slug.',
                    ]);
                }

                if ($newSlug !== $article->slug) {
                    $article = SlugHistory::change($article, SlugHistory::ARTICLE, $newSlug);
                    $data['slug'] = $newSlug;
                }
            }

            $article->update($data);

            return $article;
        });
        return response()->json($article);
    }

    public function destroy(Article $article)
    {
        $article->delete();
        return response()->json(['message' => 'Xóa bài viết thành công']);
    }
}
