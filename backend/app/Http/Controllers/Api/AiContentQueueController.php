<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiContentQueue;
use App\Models\Setting;
use App\Services\AiContentQueueProcessor;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiContentQueueController extends Controller
{
    public function __construct(private readonly AiContentQueueProcessor $processor) {}

    public function index(Request $request): JsonResponse
    {
        $query = AiContentQueue::with([
            'article:id,title,slug,is_published,published_at,thumbnail',
            'articleCategory:id,name',
        ])->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->paginate(min(100, max(1, $request->integer('per_page', 50)))));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'topics' => 'required|string',
            'start_at' => 'nullable|date',
            'interval' => 'required|integer|min:1|max:10080',
            'auto_publish' => 'required|boolean',
            'article_category_id' => 'nullable|integer|exists:article_categories,id',
            'type' => 'nullable|string|in:article,product_description,seo',
            'tone' => 'nullable|string|in:professional,casual,luxury',
            'length' => 'nullable|string|in:short,medium,long',
            'with_images' => 'nullable|boolean',
            'image_count' => 'nullable|integer|min:0|max:10',
            'keywords' => 'nullable|string',
        ]);

        $topics = array_values(array_filter(array_map('trim', preg_split('/\R/u', $data['topics']) ?: [])));
        if ($topics === []) {
            return response()->json(['message' => 'Danh sách chủ đề không được để trống.'], 422);
        }

        $timezone = (string) config('app.timezone', 'Asia/Ho_Chi_Minh');
        $startAt = isset($data['start_at'])
            ? Carbon::parse($data['start_at'])->timezone($timezone)
            : now($timezone);
        $interval = (int) $data['interval'];
        $created = [];

        foreach ($topics as $index => $topic) {
            $created[] = AiContentQueue::create([
                'topic' => $topic,
                'keywords' => $data['keywords'] ?? '',
                'type' => $data['type'] ?? 'article',
                'tone' => $data['tone'] ?? 'professional',
                'length' => $data['length'] ?? 'medium',
                'with_images' => (bool) ($data['with_images'] ?? false),
                'image_count' => (bool) ($data['with_images'] ?? false)
                    ? (int) ($data['image_count'] ?? 2)
                    : 0,
                'auto_publish' => (bool) $data['auto_publish'],
                'article_category_id' => $data['article_category_id'] ?? null,
                'status' => 'pending',
                'attempts' => 0,
                'max_attempts' => 3,
                'scheduled_at' => $startAt->copy()->addMinutes($interval * $index),
            ]);
        }

        return response()->json([
            'success' => true,
            'count' => count($created),
            'message' => 'Đã thêm '.count($created).' chủ đề vào hàng đợi.',
            'items' => $created,
        ], 201);
    }

    public function destroy(AiContentQueue $aiContentQueue): JsonResponse
    {
        if ($aiContentQueue->status !== 'pending') {
            return response()->json(['message' => 'Chỉ có thể xóa mục đang chờ.'], 422);
        }

        $aiContentQueue->delete();

        return response()->json(['message' => 'Đã xóa mục khỏi hàng đợi.']);
    }

    public function clearPending(): JsonResponse
    {
        $count = AiContentQueue::where('status', 'pending')->delete();

        return response()->json(['message' => "Đã xóa {$count} mục đang chờ."]);
    }

    public function processNext(): JsonResponse
    {
        $stats = $this->processor->processDueBatch(1);
        $result = $stats['results'][0] ?? null;

        return response()->json([
            'processed' => ($result['result'] ?? null) === 'success',
            'message' => $result ? null : 'Không có mục nào đã đến giờ.',
            'result' => $result,
            'stats' => $stats,
        ]);
    }

    public function processBatch(Request $request): JsonResponse
    {
        $data = $request->validate(['limit' => 'nullable|integer|min:1|max:20']);
        $limit = isset($data['limit']) ? (int) $data['limit'] : null;

        return response()->json($this->processor->processDueBatch($limit));
    }

    public function settings(): JsonResponse
    {
        return response()->json([
            'auto_enabled' => $this->autoEnabled(),
            'batch_limit' => $this->batchLimit(),
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'auto_enabled' => 'required|boolean',
            'batch_limit' => 'nullable|integer|min:1|max:20',
        ]);

        Setting::setValue('ai_queue_auto_enabled', $request->boolean('auto_enabled') ? '1' : '0', 'ai');
        if (isset($data['batch_limit'])) {
            Setting::setValue('ai_queue_batch_limit', (string) $data['batch_limit'], 'ai');
        }

        return response()->json([
            'success' => true,
            'auto_enabled' => $this->autoEnabled(),
            'batch_limit' => $this->batchLimit(),
        ]);
    }

    public function status(): JsonResponse
    {
        $now = now();
        $lastSeen = $this->parseSettingDate('ai_queue_scheduler_last_seen_at');
        $lastRun = $this->parseSettingDate('ai_queue_scheduler_last_run_at');
        $lastSuccess = $this->parseSettingDate('ai_queue_scheduler_last_success_at');

        $dueQuery = AiContentQueue::query()
            ->where('status', 'pending')
            ->whereNull('article_id')
            ->where(function (Builder $query) use ($now) {
                $query->whereNull('scheduled_at')->orWhere('scheduled_at', '<=', $now);
            })
            ->where(function (Builder $query) use ($now) {
                $query->whereNull('next_attempt_at')->orWhere('next_attempt_at', '<=', $now);
            });

        $nextScheduled = AiContentQueue::query()
            ->where('status', 'pending')
            ->whereNull('article_id')
            ->whereNotNull('scheduled_at')
            ->orderBy('scheduled_at')
            ->value('scheduled_at');

        return response()->json([
            'auto_enabled' => $this->autoEnabled(),
            'batch_limit' => $this->batchLimit(),
            'scheduler_last_seen_at' => $lastSeen?->toIso8601String(),
            'scheduler_last_run_at' => $lastRun?->toIso8601String(),
            'scheduler_last_success_at' => $lastSuccess?->toIso8601String(),
            'scheduler_last_result' => Setting::getValue('ai_queue_scheduler_last_result'),
            'scheduler_online' => $lastSeen !== null && $lastSeen->greaterThanOrEqualTo($now->copy()->subMinutes(3)),
            'pending_count' => AiContentQueue::where('status', 'pending')->count(),
            'due_count' => $dueQuery->count(),
            'processing_count' => AiContentQueue::where('status', 'processing')->count(),
            'failed_count' => AiContentQueue::where('status', 'failed')->count(),
            'next_scheduled_at' => $nextScheduled ? Carbon::parse($nextScheduled)->toIso8601String() : null,
        ]);
    }

    public function retry(AiContentQueue $aiContentQueue): JsonResponse
    {
        if ($aiContentQueue->status !== 'failed' || $aiContentQueue->article_id) {
            return response()->json(['message' => 'Chỉ có thể thử lại mục lỗi chưa tạo bài viết.'], 422);
        }

        $this->resetForRetry($aiContentQueue);

        return response()->json(['success' => true, 'item' => $aiContentQueue->fresh()]);
    }

    public function retryFailed(): JsonResponse
    {
        $count = 0;
        AiContentQueue::query()
            ->where('status', 'failed')
            ->whereNull('article_id')
            ->orderBy('id')
            ->each(function (AiContentQueue $item) use (&$count) {
                $this->resetForRetry($item);
                $count++;
            });

        return response()->json([
            'success' => true,
            'count' => $count,
            'message' => "Đã đưa {$count} mục lỗi trở lại hàng đợi.",
        ]);
    }

    private function resetForRetry(AiContentQueue $item): void
    {
        $item->update([
            'status' => 'pending',
            'attempts' => 0,
            'error_message' => null,
            'locked_at' => null,
            'next_attempt_at' => now(),
            'processed_at' => null,
            'completed_at' => null,
        ]);
    }

    private function autoEnabled(): bool
    {
        return in_array(Setting::getValue('ai_queue_auto_enabled', '0'), ['1', 'true'], true);
    }

    private function batchLimit(): int
    {
        return max(1, min(20, (int) Setting::getValue('ai_queue_batch_limit', '5')));
    }

    private function parseSettingDate(string $key): ?Carbon
    {
        $value = Setting::getValue($key);
        if (! $value) {
            return null;
        }

        try {
            return Carbon::parse($value)->timezone((string) config('app.timezone'));
        } catch (\Throwable) {
            return null;
        }
    }
}
