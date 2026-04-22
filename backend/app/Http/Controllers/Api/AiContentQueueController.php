<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiContentQueue;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AiContentQueueController extends Controller
{
    /**
     * List all queue items
     */
    public function index(Request $request)
    {
        $query = AiContentQueue::with('article:id,title,slug,status')
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate($request->get('per_page', 50)));
    }

    /**
     * Add multiple topics to the queue.
     * Accepts a list of topics + interval in minutes.
     */
    public function store(Request $request)
    {
        $request->validate([
            'topics'       => 'required|string',
            'interval'     => 'required|integer|min:1|max:1440',
            'type'         => 'nullable|string|in:article,product_description,seo',
            'tone'         => 'nullable|string|in:professional,casual,luxury',
            'length'       => 'nullable|string|in:short,medium,long',
            'with_images'  => 'nullable|boolean',
            'image_count'  => 'nullable|integer|min:0|max:5',
            'keywords'     => 'nullable|string',
        ]);

        $lines = array_filter(array_map('trim', explode("\n", $request->topics)));
        if (empty($lines)) {
            return response()->json(['error' => 'Danh sách chủ đề trống'], 422);
        }

        $interval = (int) $request->interval;
        $now = Carbon::now();
        $created = [];

        foreach ($lines as $i => $topic) {
            if (empty($topic)) continue;

            $item = AiContentQueue::create([
                'topic'       => $topic,
                'keywords'    => $request->get('keywords', ''),
                'type'        => $request->get('type', 'article'),
                'tone'        => $request->get('tone', 'professional'),
                'length'      => $request->get('length', 'medium'),
                'with_images' => $request->boolean('with_images', false),
                'image_count' => $request->get('image_count', 2),
                'status'      => 'pending',
                'scheduled_at' => $now->copy()->addMinutes($interval * $i),
            ]);
            $created[] = $item;
        }

        return response()->json([
            'success' => true,
            'count' => count($created),
            'message' => 'Đã thêm ' . count($created) . ' chủ đề vào hàng đợi',
            'items' => $created,
        ], 201);
    }

    /**
     * Delete a queue item
     */
    public function destroy(AiContentQueue $aiContentQueue)
    {
        $aiContentQueue->delete();
        return response()->json(['message' => 'Đã xóa']);
    }

    /**
     * Clear all pending items
     */
    public function clearPending()
    {
        $count = AiContentQueue::where('status', 'pending')->delete();
        return response()->json(['message' => "Đã xóa {$count} mục đang chờ"]);
    }

    /**
     * Process the next pending item in queue.
     * Called by cron or manually from admin.
     */
    public function processNext()
    {
        $item = AiContentQueue::where('status', 'pending')
            ->where(function ($q) {
                $q->whereNull('scheduled_at')
                  ->orWhere('scheduled_at', '<=', Carbon::now());
            })
            ->orderBy('scheduled_at')
            ->orderBy('id')
            ->first();

        if (!$item) {
            return response()->json(['message' => 'Không có mục nào cần xử lý', 'processed' => false]);
        }

        $item->update(['status' => 'processing']);

        try {
            // Use AiController logic to generate content
            $aiController = app(AiController::class);
            $fakeRequest = Request::create('/ai/content', 'POST', [
                'topic'        => $item->topic,
                'type'         => $item->type,
                'keywords'     => $item->keywords,
                'tone'         => $item->tone,
                'length'       => $item->length,
                'full_article' => true,
            ]);

            if ($item->with_images) {
                $fakeRequest = Request::create('/ai/content-with-images', 'POST', [
                    'topic'        => $item->topic,
                    'type'         => $item->type,
                    'keywords'     => $item->keywords,
                    'tone'         => $item->tone,
                    'length'       => $item->length,
                    'full_article' => true,
                    'image_count'  => $item->image_count,
                ]);
                $response = $aiController->generateContentWithImages($fakeRequest);
            } else {
                $response = $aiController->generateContent($fakeRequest);
            }

            $data = json_decode($response->getContent(), true);

            if (!isset($data['success']) || !$data['success']) {
                throw new \Exception($data['error'] ?? 'AI generation failed');
            }

            // Create draft article
            $slug = \Illuminate\Support\Str::slug($data['title'] ?? $item->topic);
            $slug = $slug ?: 'ai-' . time();

            // Ensure unique slug
            $baseSlug = $slug;
            $counter = 1;
            while (\App\Models\Article::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $counter++;
            }

            $article = \App\Models\Article::create([
                'title'         => $data['title'] ?? $item->topic,
                'slug'          => $slug,
                'content'       => $data['content'] ?? '',
                'excerpt'       => $data['excerpt'] ?? '',
                'meta_title'    => $data['meta_title'] ?? '',
                'meta_desc'     => $data['meta_desc'] ?? '',
                'meta_keywords' => $data['meta_keywords'] ?? '',
                'tags'          => isset($data['tags']) ? implode(',', $data['tags']) : '',
                'status'        => 'draft',
            ]);

            $item->update([
                'status'       => 'done',
                'article_id'   => $article->id,
                'processed_at' => Carbon::now(),
            ]);

            return response()->json([
                'processed' => true,
                'article_id' => $article->id,
                'title' => $article->title,
            ]);

        } catch (\Exception $e) {
            \Log::error('AI Queue Error: ' . $e->getMessage());
            $item->update([
                'status'        => 'failed',
                'error_message' => mb_substr($e->getMessage(), 0, 1000),
                'processed_at'  => Carbon::now(),
            ]);
            return response()->json([
                'processed' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
