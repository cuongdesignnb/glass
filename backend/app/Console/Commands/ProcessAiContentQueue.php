<?php

namespace App\Console\Commands;

use App\Models\Setting;
use App\Services\AiContentQueueProcessor;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessAiContentQueue extends Command
{
    protected $signature = 'ai:queue-process
        {--limit= : Maximum number of due items to process (1-20)}
        {--force : Process even when ai_queue_auto_enabled is disabled}';

    protected $description = 'Process due AI article queue items on the server';

    public function handle(AiContentQueueProcessor $processor): int
    {
        $this->line('AI_QUEUE_RUN_STARTED');
        Log::info('AI_QUEUE_RUN_STARTED');

        try {
            Setting::setValue('ai_queue_scheduler_last_seen_at', now()->toIso8601String(), 'ai');

            if (! $this->option('force') && ! $this->autoEnabled()) {
                $stats = $this->emptyStats();
                Setting::setValue('ai_queue_scheduler_last_result', json_encode([
                    'status' => 'disabled',
                    ...$stats,
                ], JSON_UNESCAPED_UNICODE), 'ai');
                $this->line('AUTO_ENABLED=NO');
                $this->printStats($stats);
                $this->line('AI_QUEUE_RUN_FINISHED');
                Log::info('AI_QUEUE_RUN_FINISHED', ['status' => 'disabled', ...$stats]);

                return self::SUCCESS;
            }

            $limitOption = $this->option('limit');
            $limit = $limitOption === null || $limitOption === ''
                ? null
                : max(1, min(20, (int) $limitOption));
            $stats = $processor->processDueBatch($limit);
            $finishedAt = now();

            Setting::setValue('ai_queue_scheduler_last_run_at', $finishedAt->toIso8601String(), 'ai');
            Setting::setValue('ai_queue_scheduler_last_success_at', $finishedAt->toIso8601String(), 'ai');
            Setting::setValue('ai_queue_scheduler_last_result', json_encode($stats, JSON_UNESCAPED_UNICODE), 'ai');

            $this->printStats($stats);
            $this->line('AI_QUEUE_RUN_FINISHED');
            Log::info('AI_QUEUE_RUN_FINISHED', $stats);

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $result = [
                'status' => 'infrastructure_error',
                'error_type' => $exception::class,
                'message' => $this->safeLogMessage($exception->getMessage()),
            ];
            try {
                Setting::setValue('ai_queue_scheduler_last_run_at', now()->toIso8601String(), 'ai');
                Setting::setValue('ai_queue_scheduler_last_result', json_encode($result, JSON_UNESCAPED_UNICODE), 'ai');
            } catch (Throwable) {
                // The original infrastructure exception remains authoritative.
            }
            Log::error('AI_QUEUE_RUN_FINISHED', $result);
            $this->error('AI queue infrastructure failure: '.$result['message']);

            return self::FAILURE;
        }
    }

    private function autoEnabled(): bool
    {
        return in_array(Setting::getValue('ai_queue_auto_enabled', '0'), ['1', 'true'], true);
    }

    /**
     * @return array{claimed:int,success:int,retrying:int,failed:int,skipped:int}
     */
    private function emptyStats(): array
    {
        return ['claimed' => 0, 'success' => 0, 'retrying' => 0, 'failed' => 0, 'skipped' => 0];
    }

    /**
     * @param array<string, mixed> $stats
     */
    private function printStats(array $stats): void
    {
        foreach (['claimed', 'success', 'retrying', 'failed', 'skipped'] as $key) {
            $this->line(strtoupper($key).'='.(int) ($stats[$key] ?? 0));
        }
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
