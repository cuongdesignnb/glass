<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiContentQueue;
use App\Models\Setting;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AiContentQueueController extends Controller
{
    /**
     * List all queue items
     */
    public function index(Request $request)
    {
        $query = AiContentQueue::with('article:id,title,slug,is_published,thumbnail')
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
     * Process the next pending item in queue (manual trigger from admin).
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

        $result = $this->processItem($item);
        $status = ($result['processed'] ?? false) ? 200 : 500;
        return response()->json($result, $status);
    }

    /**
     * Process up to N due items in one call (browser-driven auto mode).
     * Does NOT require auto_enabled flag — caller (UI) controls when to call.
     */
    public function processBatch(Request $request)
    {
        $limit = max(1, min(20, (int) $request->get('limit', Setting::getValue('ai_queue_batch_limit', '5'))));

        $items = AiContentQueue::where('status', 'pending')
            ->where(function ($q) {
                $q->whereNull('scheduled_at')
                  ->orWhere('scheduled_at', '<=', Carbon::now());
            })
            ->orderBy('scheduled_at')
            ->orderBy('id')
            ->limit($limit)
            ->get();

        if ($items->isEmpty()) {
            return response()->json([
                'processed_count' => 0,
                'message' => 'Không có mục nào đến giờ',
                'results' => [],
            ]);
        }

        $results = [];
        $ok = 0; $fail = 0;
        foreach ($items as $item) {
            $r = $this->processItem($item);
            $r['item_id'] = $item->id;
            $r['topic']   = $item->topic;
            $results[] = $r;
            if (($r['processed'] ?? false) === true) $ok++; else $fail++;
        }

        return response()->json([
            'processed_count' => $ok,
            'failed_count'    => $fail,
            'message'         => "Xử lý {$items->count()} mục: {$ok} thành công, {$fail} lỗi",
            'results'         => $results,
        ]);
    }

    /**
     * Get / update auto-scheduler settings
     */
    public function settings()
    {
        return response()->json([
            'auto_enabled' => Setting::getValue('ai_queue_auto_enabled', '0') === '1',
            'batch_limit'  => (int) (Setting::getValue('ai_queue_batch_limit', '5')),
        ]);
    }

    public function updateSettings(Request $request)
    {
        $request->validate([
            'auto_enabled' => 'required|boolean',
            'batch_limit'  => 'nullable|integer|min:1|max:20',
        ]);

        Setting::setValue('ai_queue_auto_enabled', $request->boolean('auto_enabled') ? '1' : '0', 'ai');
        if ($request->filled('batch_limit')) {
            Setting::setValue('ai_queue_batch_limit', (string) $request->integer('batch_limit'), 'ai');
        }

        return response()->json([
            'success' => true,
            'auto_enabled' => $request->boolean('auto_enabled'),
            'batch_limit'  => (int) (Setting::getValue('ai_queue_batch_limit', '5')),
        ]);
    }

    /**
     * Process a single queue item.
     * Public so the artisan command can call it directly.
     * Returns ['processed' => bool, 'title' => string?, 'article_id' => int?, 'error' => string?]
     */
    public function processItem(AiContentQueue $item): array
    {
        $item->update(['status' => 'processing']);

        try {
            $aiController = app(AiController::class);

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
                $fakeRequest = Request::create('/ai/content', 'POST', [
                    'topic'        => $item->topic,
                    'type'         => $item->type,
                    'keywords'     => $item->keywords,
                    'tone'         => $item->tone,
                    'length'       => $item->length,
                    'full_article' => true,
                ]);
                $response = $aiController->generateContent($fakeRequest);
            }

            $data = json_decode($response->getContent(), true);

            if (!isset($data['success']) || !$data['success']) {
                throw new \Exception($data['error'] ?? 'AI generation failed');
            }

            // Build a unique slug
            $slug = \Illuminate\Support\Str::slug($data['title'] ?? $item->topic) ?: ('ai-' . time());
            $baseSlug = $slug;
            $counter = 1;
            while (\App\Models\Article::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $counter++;
            }

            // Pick the first generated image as thumbnail / og_image
            $thumbnail = null;
            if (!empty($data['images']) && is_array($data['images'])) {
                $thumbnail = $data['images'][0]['url'] ?? null;
            }

            $tags = $data['tags'] ?? [];
            if (is_string($tags)) {
                $tags = array_filter(array_map('trim', explode(',', $tags)));
            }

            $article = \App\Models\Article::create([
                'title'         => $data['title'] ?? $item->topic,
                'slug'          => $slug,
                'content'       => $data['content'] ?? '',
                'excerpt'       => $data['excerpt'] ?? '',
                'meta_title'    => $data['meta_title'] ?? '',
                'meta_desc'     => $data['meta_desc'] ?? '',
                'meta_keywords' => $data['meta_keywords'] ?? '',
                'tags'          => $tags,
                'thumbnail'     => $thumbnail,
                'og_image'      => $thumbnail,
                'is_published'  => false,
            ]);

            $item->update([
                'status'       => 'done',
                'article_id'   => $article->id,
                'processed_at' => Carbon::now(),
            ]);

            return [
                'processed'  => true,
                'article_id' => $article->id,
                'title'      => $article->title,
            ];

        } catch (\Exception $e) {
            \Log::error('AI Queue Error: ' . $e->getMessage());
            $item->update([
                'status'        => 'failed',
                'error_message' => mb_substr($e->getMessage(), 0, 1000),
                'processed_at'  => Carbon::now(),
            ]);

            return [
                'processed' => false,
                'error'     => $e->getMessage(),
            ];
        }
    }
}
