<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\AiContentQueueController;
use App\Models\AiContentQueue;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ProcessAiContentQueue extends Command
{
    protected $signature = 'ai:queue-process {--limit=10 : Max items to process in this run} {--force : Ignore the auto_enabled setting}';

    protected $description = 'Process pending AI content queue items whose scheduled_at has elapsed';

    public function handle(AiContentQueueController $controller): int
    {
        if (!$this->option('force')) {
            $enabled = Setting::getValue('ai_queue_auto_enabled', '0');
            if ($enabled !== '1' && $enabled !== 'true') {
                $this->info('Auto-processing disabled. Set ai_queue_auto_enabled=1 to enable, or use --force.');
                return self::SUCCESS;
            }
        }

        $limit = max(1, (int) $this->option('limit'));
        $now = Carbon::now();

        $items = AiContentQueue::where('status', 'pending')
            ->where(function ($q) use ($now) {
                $q->whereNull('scheduled_at')->orWhere('scheduled_at', '<=', $now);
            })
            ->orderBy('scheduled_at')
            ->orderBy('id')
            ->limit($limit)
            ->get();

        if ($items->isEmpty()) {
            $this->info('No due items.');
            return self::SUCCESS;
        }

        $this->info("Processing {$items->count()} item(s)...");
        $ok = 0;
        $fail = 0;

        foreach ($items as $item) {
            $this->line(" → #{$item->id} {$item->topic}");
            $result = $controller->processItem($item);
            if (($result['processed'] ?? false) === true) {
                $ok++;
                $this->info("    ✓ {$result['title']}");
            } else {
                $fail++;
                $this->warn('    ✗ ' . ($result['error'] ?? 'unknown error'));
            }
        }

        $this->info("Done. Success: {$ok}, Failed: {$fail}");
        return self::SUCCESS;
    }
}
