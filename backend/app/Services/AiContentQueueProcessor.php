<?php

namespace App\Services;

use App\Contracts\AiArticleGenerator;
use App\Models\AiContentQueue;
use App\Models\Article;
use App\Models\Setting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class AiContentQueueProcessor
{
    private const AI_ARTICLE_AUTHOR = 'Mitoo';

    private const RETRY_BACKOFF_MINUTES = [1 => 2, 2 => 5];

    public function __construct(private readonly AiArticleGenerator $generator) {}

    /**
     * @return array{claimed:int,success:int,retrying:int,failed:int,skipped:int,results:array<int,array<string,mixed>>}
     */
    public function processDueBatch(?int $limit = null): array
    {
        $limit ??= (int) Setting::getValue('ai_queue_batch_limit', '5');
        $limit = max(1, min(20, $limit));

        $this->recoverStaleItems();

        $stats = [
            'claimed' => 0,
            'success' => 0,
            'retrying' => 0,
            'failed' => 0,
            'skipped' => 0,
            'results' => [],
        ];

        $candidateIds = $this->dueQuery()
            ->orderByRaw('CASE WHEN scheduled_at IS NULL THEN 0 ELSE 1 END')
            ->orderBy('scheduled_at')
            ->orderBy('id')
            ->limit($limit)
            ->pluck('id');

        foreach ($candidateIds as $itemId) {
            $result = $this->processItem((int) $itemId);
            $stats['results'][] = $result;
            $resultName = (string) ($result['result'] ?? 'skipped');
            if ($resultName !== 'skipped') {
                $stats['claimed']++;
            }
            if (array_key_exists($resultName, $stats)) {
                $stats[$resultName]++;
            } else {
                $stats['skipped']++;
            }
        }

        return $stats;
    }

    /**
     * @return array<string, mixed>
     */
    public function processItem(AiContentQueue|int $item): array
    {
        $itemId = $item instanceof AiContentQueue ? (int) $item->getKey() : $item;
        $claimed = $this->claimItem($itemId);
        if (! $claimed) {
            return ['item_id' => $itemId, 'result' => 'skipped'];
        }

        $started = hrtime(true);
        $this->logItem('AI_QUEUE_ITEM_CLAIMED', $claimed, 'claimed', $started);

        try {
            $payload = $this->generator->generate($claimed);
            $article = $this->createArticle($claimed, $payload);
            $claimed->refresh();
            $this->logItem('AI_QUEUE_ITEM_DONE', $claimed, 'success', $started, $article->id);

            return [
                'item_id' => $claimed->id,
                'article_id' => $article->id,
                'title' => $article->title,
                'result' => 'success',
                'processed' => true,
            ];
        } catch (Throwable $exception) {
            $claimed->refresh();
            $result = $this->scheduleRetry($claimed, $exception);
            $claimed->refresh();
            $prefix = $result === 'retrying' ? 'AI_QUEUE_ITEM_RETRY' : 'AI_QUEUE_ITEM_FAILED';
            $this->logItem($prefix, $claimed, $result, $started, $claimed->article_id, $exception);

            return [
                'item_id' => $claimed->id,
                'result' => $result,
                'processed' => false,
                'error' => $exception->getMessage(),
                'next_attempt_at' => $claimed->next_attempt_at?->toIso8601String(),
            ];
        }
    }

    public function claimItem(AiContentQueue|int $item): ?AiContentQueue
    {
        $itemId = $item instanceof AiContentQueue ? (int) $item->getKey() : $item;
        $now = now();

        $affected = AiContentQueue::query()
            ->whereKey($itemId)
            ->where('status', 'pending')
            ->whereNull('article_id')
            ->where(function (Builder $query) use ($now) {
                $query->whereNull('scheduled_at')->orWhere('scheduled_at', '<=', $now);
            })
            ->where(function (Builder $query) use ($now) {
                $query->whereNull('next_attempt_at')->orWhere('next_attempt_at', '<=', $now);
            })
            ->update([
                'status' => 'processing',
                'locked_at' => $now,
                'started_at' => $now,
                'last_attempt_at' => $now,
                'next_attempt_at' => null,
                'attempts' => DB::raw('attempts + 1'),
                'updated_at' => $now,
            ]);

        return $affected === 1 ? AiContentQueue::find($itemId) : null;
    }

    public function recoverStaleItems(): int
    {
        $staleBefore = now()->subMinutes(30);
        $items = AiContentQueue::query()
            ->where('status', 'processing')
            ->whereNull('article_id')
            ->whereNotNull('locked_at')
            ->where('locked_at', '<', $staleBefore)
            ->orderBy('id')
            ->get();

        $recovered = 0;
        foreach ($items as $item) {
            $affected = AiContentQueue::query()
                ->whereKey($item->id)
                ->where('status', 'processing')
                ->whereNull('article_id')
                ->where('locked_at', '<', $staleBefore)
                ->update([
                    'status' => 'pending',
                    'locked_at' => null,
                    'next_attempt_at' => now(),
                    'updated_at' => now(),
                ]);

            if ($affected === 1) {
                $recovered++;
                Log::warning('AI_QUEUE_STALE_ITEM_RECOVERED', $this->logContext($item, 'recovered'));
            }
        }

        return $recovered;
    }

    public function scheduleRetry(AiContentQueue $item, Throwable $exception): string
    {
        if ((int) $item->attempts >= (int) $item->max_attempts) {
            $this->markFailed($item, $exception);

            return 'failed';
        }

        $minutes = self::RETRY_BACKOFF_MINUTES[(int) $item->attempts] ?? 5;
        $item->update([
            'status' => 'pending',
            'next_attempt_at' => now()->addMinutes($minutes),
            'locked_at' => null,
            'error_message' => mb_substr($exception->getMessage(), 0, 1000),
        ]);

        return 'retrying';
    }

    public function markFailed(AiContentQueue $item, Throwable|string $error): void
    {
        $message = $error instanceof Throwable ? $error->getMessage() : $error;
        $now = now();
        $item->update([
            'status' => 'failed',
            'error_message' => mb_substr($message, 0, 1000),
            'processed_at' => $now,
            'completed_at' => $now,
            'locked_at' => null,
            'next_attempt_at' => null,
        ]);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function createArticle(AiContentQueue $item, array $payload): Article
    {
        return DB::transaction(function () use ($item, $payload) {
            $queueItem = AiContentQueue::query()->lockForUpdate()->findOrFail($item->id);

            if ($queueItem->article_id) {
                return Article::findOrFail($queueItem->article_id);
            }
            if ($queueItem->status !== 'processing') {
                throw new \RuntimeException('Queue item is no longer claimed for processing.');
            }

            $title = trim((string) ($payload['title'] ?? $queueItem->topic));
            $baseSlug = Str::slug($title) ?: 'ai-article';
            $slug = $baseSlug.'-'.$queueItem->id;
            $suffix = 1;
            while (Article::query()->where('slug', $slug)->exists()) {
                $slug = $baseSlug.'-'.$queueItem->id.'-'.$suffix++;
            }

            $tags = $payload['tags'] ?? [];
            if (is_string($tags)) {
                $tags = array_values(array_filter(array_map('trim', explode(',', $tags))));
            }
            if (! is_array($tags)) {
                $tags = [];
            }

            $thumbnail = $payload['thumbnail'] ?? $payload['og_image'] ?? null;
            if (! $thumbnail && isset($payload['images'][0]['url'])) {
                $thumbnail = $payload['images'][0]['url'];
            }
            $publishedAt = $queueItem->auto_publish ? now() : null;
            $warnings = $payload['warnings'] ?? [];
            if (is_string($warnings)) {
                $warnings = [$warnings];
            }
            if (! is_array($warnings)) {
                $warnings = [];
            }
            $warningMessage = trim(implode(' | ', array_filter(array_map(
                static fn ($warning) => trim((string) $warning),
                $warnings
            ))));

            $article = Article::create([
                'title' => $title ?: $queueItem->topic,
                'slug' => $slug,
                'author' => self::AI_ARTICLE_AUTHOR,
                'content' => (string) ($payload['content'] ?? ''),
                'excerpt' => (string) ($payload['excerpt'] ?? ''),
                'meta_title' => (string) ($payload['meta_title'] ?? ''),
                'meta_desc' => (string) ($payload['meta_desc'] ?? ''),
                'meta_keywords' => (string) ($payload['meta_keywords'] ?? ''),
                'tags' => $tags,
                'thumbnail' => $thumbnail,
                'thumbnail_alt' => $payload['thumbnail_alt'] ?? ($thumbnail ? ($title ?: $queueItem->topic) : null),
                'thumbnail_caption' => $payload['thumbnail_caption'] ?? null,
                'og_image' => $payload['og_image'] ?? $thumbnail,
                'article_category_id' => $queueItem->article_category_id,
                'is_published' => $queueItem->auto_publish,
                'published_at' => $publishedAt,
            ]);

            $now = now();
            $queueItem->update([
                'status' => 'done',
                'article_id' => $article->id,
                'processed_at' => $now,
                'completed_at' => $now,
                'locked_at' => null,
                'next_attempt_at' => null,
                'error_message' => $warningMessage !== ''
                    ? mb_substr('Cảnh báo sinh ảnh: '.$warningMessage, 0, 1000)
                    : null,
            ]);

            if ($warningMessage !== '') {
                Log::warning('AI_QUEUE_IMAGE_WARNING', [
                    'queue_id' => $queueItem->id,
                    'article_id' => $article->id,
                    'with_images' => $queueItem->with_images,
                    'image_count' => $queueItem->image_count,
                    'warning' => mb_substr($warningMessage, 0, 1000),
                ]);
            }

            return $article;
        }, 3);
    }

    private function dueQuery(): Builder
    {
        $now = now();

        return AiContentQueue::query()
            ->where('status', 'pending')
            ->whereNull('article_id')
            ->where(function (Builder $query) use ($now) {
                $query->whereNull('scheduled_at')->orWhere('scheduled_at', '<=', $now);
            })
            ->where(function (Builder $query) use ($now) {
                $query->whereNull('next_attempt_at')->orWhere('next_attempt_at', '<=', $now);
            });
    }

    private function logItem(
        string $message,
        AiContentQueue $item,
        string $result,
        int $started,
        ?int $articleId = null,
        ?Throwable $exception = null
    ): void {
        $context = $this->logContext($item, $result, $articleId);
        $context['duration_ms'] = (int) round((hrtime(true) - $started) / 1_000_000);
        if ($exception) {
            $context['error_type'] = $exception::class;
            $context['error'] = $this->safeLogMessage($exception->getMessage());
        }
        Log::info($message, $context);
    }

    /**
     * @return array<string, mixed>
     */
    private function logContext(AiContentQueue $item, string $result, ?int $articleId = null): array
    {
        return [
            'queue_item_id' => $item->id,
            'topic' => $item->topic,
            'attempt' => $item->attempts,
            'scheduled_at' => $item->scheduled_at?->toIso8601String(),
            'article_id' => $articleId ?? $item->article_id,
            'auto_publish' => (bool) $item->auto_publish,
            'result' => $result,
        ];
    }

    private function safeLogMessage(string $message): string
    {
        $redacted = preg_replace([
            '/Bearer\s+[^\s]+/i',
            '/\bsk-[A-Za-z0-9_-]{8,}\b/',
            '/((?:api[_-]?key|authorization)\s*[=:]\s*)[^\s,;]+/i',
        ], ['$1[REDACTED]', '[REDACTED]', '$1[REDACTED]'], $message);

        return mb_substr($redacted ?? 'Sensitive error details were redacted.', 0, 500);
    }
}
