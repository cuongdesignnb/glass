<?php

namespace Tests\Feature;

use App\Contracts\AiArticleGenerator;
use App\Models\AiContentQueue;
use App\Models\Article;
use App\Models\ArticleCategory;
use App\Models\Setting;
use App\Models\User;
use App\Services\AiContentQueueProcessor;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class AiContentQueueAutomationTest extends TestCase
{
    use RefreshDatabase;

    private FakeAiArticleGenerator $generator;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-07-28 08:00:00', 'Asia/Ho_Chi_Minh'));
        $this->generator = new FakeAiArticleGenerator;
        $this->app->instance(AiArticleGenerator::class, $this->generator);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_future_item_is_not_processed_but_due_item_is(): void
    {
        $future = $this->queue(['topic' => 'Future', 'scheduled_at' => now()->addMinute()]);
        $due = $this->queue(['topic' => 'Due', 'scheduled_at' => now()]);

        $stats = $this->processor()->processDueBatch(5);

        $this->assertSame(1, $stats['success']);
        $this->assertSame('pending', $future->fresh()->status);
        $this->assertSame('done', $due->fresh()->status);
    }

    public function test_multiple_due_items_are_processed_in_schedule_order(): void
    {
        $second = $this->queue(['topic' => 'Second', 'scheduled_at' => now()->subMinute()]);
        $first = $this->queue(['topic' => 'First', 'scheduled_at' => now()->subMinutes(2)]);

        $stats = $this->processor()->processDueBatch(20);

        $this->assertSame(2, $stats['claimed']);
        $this->assertSame(2, $stats['success']);
        $this->assertSame([$first->id, $second->id], array_column($stats['results'], 'item_id'));
    }

    public function test_one_failed_item_does_not_stop_the_rest_of_the_batch(): void
    {
        $this->generator->failTopics = ['Broken'];
        $broken = $this->queue(['topic' => 'Broken']);
        $healthy = $this->queue(['topic' => 'Healthy']);

        $stats = $this->processor()->processDueBatch(5);

        $this->assertSame(1, $stats['retrying']);
        $this->assertSame(1, $stats['success']);
        $this->assertSame('pending', $broken->fresh()->status);
        $this->assertSame('done', $healthy->fresh()->status);
    }

    public function test_auto_publish_creates_published_article_with_category_and_date(): void
    {
        $category = ArticleCategory::create(['name' => 'Kiến thức', 'slug' => 'kien-thuc']);
        $item = $this->queue(['auto_publish' => true, 'article_category_id' => $category->id]);

        $result = $this->processor()->processItem($item);
        $article = Article::findOrFail($result['article_id']);

        $this->assertTrue($article->is_published);
        $this->assertNotNull($article->published_at);
        $this->assertSame($category->id, $article->article_category_id);
    }

    public function test_auto_publish_false_creates_draft_without_published_date(): void
    {
        $item = $this->queue(['auto_publish' => false]);

        $result = $this->processor()->processItem($item);
        $article = Article::findOrFail($result['article_id']);

        $this->assertFalse($article->is_published);
        $this->assertNull($article->published_at);
    }

    public function test_atomic_claim_and_article_transaction_prevent_duplicates(): void
    {
        $item = $this->queue();
        $firstClaim = $this->processor()->claimItem($item->id);
        $secondClaim = $this->processor()->claimItem($item->id);

        $this->assertNotNull($firstClaim);
        $this->assertNull($secondClaim);

        $article = $this->processor()->createArticle($firstClaim, $this->generator->payloadFor($firstClaim));
        $repeat = $this->processor()->processItem($item->id);

        $this->assertSame('skipped', $repeat['result']);
        $this->assertSame($article->id, $item->fresh()->article_id);
        $this->assertSame(1, Article::count());
    }

    public function test_retry_backoff_then_final_failure_after_three_attempts(): void
    {
        $this->generator->failTopics = ['Always broken'];
        $item = $this->queue(['topic' => 'Always broken']);

        $first = $this->processor()->processItem($item);
        $this->assertSame('retrying', $first['result']);
        $this->assertSame(now()->addMinutes(2)->timestamp, $item->fresh()->next_attempt_at->timestamp);

        Carbon::setTestNow(now()->addMinutes(2));
        $second = $this->processor()->processItem($item->id);
        $this->assertSame('retrying', $second['result']);
        $this->assertSame(now()->addMinutes(5)->timestamp, $item->fresh()->next_attempt_at->timestamp);

        Carbon::setTestNow(now()->addMinutes(5));
        $third = $this->processor()->processItem($item->id);
        $this->assertSame('failed', $third['result']);
        $this->assertSame('failed', $item->fresh()->status);
        $this->assertNotNull($item->fresh()->completed_at);
    }

    public function test_stale_processing_item_is_recovered_but_completed_item_is_not(): void
    {
        $stale = $this->queue([
            'status' => 'processing',
            'locked_at' => now()->subMinutes(31),
            'attempts' => 1,
        ]);
        $article = Article::create(['title' => 'Existing', 'slug' => 'existing']);
        $completed = $this->queue([
            'status' => 'processing',
            'locked_at' => now()->subMinutes(31),
            'article_id' => $article->id,
        ]);

        $count = $this->processor()->recoverStaleItems();

        $this->assertSame(1, $count);
        $this->assertSame('pending', $stale->fresh()->status);
        $this->assertNull($stale->fresh()->locked_at);
        $this->assertSame('processing', $completed->fresh()->status);
    }

    public function test_disabled_scheduler_skips_queue_but_writes_heartbeat(): void
    {
        Setting::setValue('ai_queue_auto_enabled', '0', 'ai');
        $item = $this->queue();

        $this->artisan('ai:queue-process')
            ->expectsOutput('AI_QUEUE_RUN_STARTED')
            ->expectsOutput('AUTO_ENABLED=NO')
            ->assertSuccessful();

        $this->assertSame('pending', $item->fresh()->status);
        $this->assertNotNull(Setting::getValue('ai_queue_scheduler_last_seen_at'));
        $this->assertSame(0, $this->generator->calls);
    }

    public function test_enabled_scheduler_records_run_success_and_batch_statistics(): void
    {
        Setting::setValue('ai_queue_auto_enabled', '1', 'ai');
        Setting::setValue('ai_queue_batch_limit', '5', 'ai');
        $this->queue();

        $this->artisan('ai:queue-process')->assertSuccessful();

        $this->assertNotNull(Setting::getValue('ai_queue_scheduler_last_run_at'));
        $this->assertNotNull(Setting::getValue('ai_queue_scheduler_last_success_at'));
        $result = json_decode((string) Setting::getValue('ai_queue_scheduler_last_result'), true);
        $this->assertSame(1, $result['success']);
    }

    public function test_status_api_returns_scheduler_health_and_queue_counts(): void
    {
        Sanctum::actingAs($this->admin());
        Setting::setValue('ai_queue_auto_enabled', '1', 'ai');
        Setting::setValue('ai_queue_scheduler_last_seen_at', now()->subMinutes(2)->toIso8601String(), 'ai');
        $this->queue(['scheduled_at' => now()->subMinute()]);
        $this->queue(['scheduled_at' => now()->addHour()]);
        $this->queue(['status' => 'processing', 'locked_at' => now()]);
        $this->queue(['status' => 'failed', 'completed_at' => now()]);

        $this->getJson('/api/ai/queue-status')
            ->assertOk()
            ->assertJsonPath('scheduler_online', true)
            ->assertJsonPath('pending_count', 2)
            ->assertJsonPath('due_count', 1)
            ->assertJsonPath('processing_count', 1)
            ->assertJsonPath('failed_count', 1);
    }

    public function test_retry_one_and_retry_all_failed_items(): void
    {
        Sanctum::actingAs($this->admin());
        $first = $this->queue(['status' => 'failed', 'attempts' => 3, 'completed_at' => now()]);
        $second = $this->queue(['status' => 'failed', 'attempts' => 3, 'completed_at' => now()]);

        $this->postJson("/api/ai/queue/{$first->id}/retry")
            ->assertOk()
            ->assertJsonPath('item.status', 'pending');
        $this->postJson('/api/ai/queue-retry-failed')
            ->assertOk()
            ->assertJsonPath('count', 1);

        $this->assertSame(0, $first->fresh()->attempts);
        $this->assertSame('pending', $second->fresh()->status);
    }

    public function test_clear_queue_deletes_every_status_including_stuck_processing_items(): void
    {
        Sanctum::actingAs($this->admin());
        $pending = $this->queue(['status' => 'pending']);
        $failed = $this->queue(['status' => 'failed', 'completed_at' => now()]);
        $done = $this->queue(['status' => 'done', 'completed_at' => now()]);
        $stale = $this->queue([
            'status' => 'processing',
            'locked_at' => now()->subMinutes(31),
        ]);
        $active = $this->queue([
            'status' => 'processing',
            'locked_at' => now(),
        ]);

        $this->deleteJson('/api/ai/queue-clear')
            ->assertOk()
            ->assertJsonPath('deleted_count', 5);

        foreach ([$pending, $failed, $done, $stale, $active] as $deleted) {
            $this->assertDatabaseMissing('ai_content_queue', ['id' => $deleted->id]);
        }
    }

    public function test_individual_delete_allows_finished_items_but_protects_processing_items(): void
    {
        Sanctum::actingAs($this->admin());
        $failed = $this->queue(['status' => 'failed']);
        $processing = $this->queue(['status' => 'processing', 'locked_at' => now()]);

        $this->deleteJson("/api/ai/queue/{$failed->id}")->assertOk();
        $this->assertDatabaseMissing('ai_content_queue', ['id' => $failed->id]);

        $this->deleteJson("/api/ai/queue/{$processing->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Không thể xóa mục đang được xử lý. Vui lòng chờ tác vụ hoàn tất.');
        $this->assertDatabaseHas('ai_content_queue', ['id' => $processing->id]);
    }

    public function test_queue_routes_require_authentication(): void
    {
        $item = $this->queue(['status' => 'failed']);

        $this->getJson('/api/ai/queue')->assertUnauthorized();
        $this->postJson('/api/ai/queue', [])->assertUnauthorized();
        $this->postJson('/api/ai/queue-process')->assertUnauthorized();
        $this->getJson('/api/ai/queue-status')->assertUnauthorized();
        $this->postJson("/api/ai/queue/{$item->id}/retry")->assertUnauthorized();
        $this->postJson('/api/ai/queue-retry-failed')->assertUnauthorized();
    }

    public function test_queue_creation_validates_start_interval_and_category(): void
    {
        Sanctum::actingAs($this->admin());
        $base = [
            'topics' => 'Topic',
            'interval' => 60,
            'auto_publish' => true,
        ];

        $this->postJson('/api/ai/queue', [...$base, 'start_at' => 'not-a-date'])
            ->assertUnprocessable()->assertJsonValidationErrors('start_at');
        $this->postJson('/api/ai/queue', [...$base, 'interval' => 0])
            ->assertUnprocessable()->assertJsonValidationErrors('interval');
        $this->postJson('/api/ai/queue', [...$base, 'interval' => 10081])
            ->assertUnprocessable()->assertJsonValidationErrors('interval');
        $this->postJson('/api/ai/queue', [...$base, 'article_category_id' => 999])
            ->assertUnprocessable()->assertJsonValidationErrors('article_category_id');
    }

    public function test_multiple_topics_create_the_expected_timezone_schedule(): void
    {
        Sanctum::actingAs($this->admin());
        $category = ArticleCategory::create(['name' => 'Lịch', 'slug' => 'lich']);

        $this->postJson('/api/ai/queue', [
            'topics' => "Bài một\nBài hai\nBài ba",
            'start_at' => '2026-07-28T08:00:00+07:00',
            'interval' => 60,
            'auto_publish' => true,
            'article_category_id' => $category->id,
            'tone' => 'professional',
            'length' => 'medium',
            'with_images' => true,
            'image_count' => 2,
        ])->assertCreated()->assertJsonPath('count', 3);

        $items = AiContentQueue::orderBy('id')->get();
        $this->assertSame('08:00', $items[0]->scheduled_at->timezone('Asia/Ho_Chi_Minh')->format('H:i'));
        $this->assertSame('09:00', $items[1]->scheduled_at->timezone('Asia/Ho_Chi_Minh')->format('H:i'));
        $this->assertSame('10:00', $items[2]->scheduled_at->timezone('Asia/Ho_Chi_Minh')->format('H:i'));
        $this->assertTrue($items[0]->auto_publish);
        $this->assertSame($category->id, $items[0]->article_category_id);
    }

    public function test_new_queue_items_only_enable_images_when_explicitly_requested(): void
    {
        Sanctum::actingAs($this->admin());
        $base = [
            'topics' => 'Default image topic',
            'interval' => 60,
            'auto_publish' => false,
        ];

        $this->postJson('/api/ai/queue', $base)->assertCreated();
        $defaultItem = AiContentQueue::where('topic', 'Default image topic')->firstOrFail();
        $this->assertFalse($defaultItem->with_images);
        $this->assertSame(0, $defaultItem->image_count);

        $this->postJson('/api/ai/queue', [
            ...$base,
            'topics' => 'Image topic',
            'with_images' => true,
            'image_count' => 3,
        ])->assertCreated();
        $imageItem = AiContentQueue::where('topic', 'Image topic')->firstOrFail();
        $this->assertTrue($imageItem->with_images);
        $this->assertSame(3, $imageItem->image_count);
    }

    public function test_image_generation_warning_is_visible_without_failing_the_article(): void
    {
        $item = $this->queue([
            'topic' => 'Article with an image warning',
            'with_images' => true,
            'image_count' => 2,
        ]);
        $this->generator->warningsByTopic[$item->topic] = [
            'OpenAI image model gpt-image-2 loi HTTP 403: organization verification required',
        ];

        $result = $this->processor()->processItem($item);

        $this->assertSame('success', $result['result']);
        $this->assertDatabaseHas('articles', [
            'id' => $result['article_id'],
            'author' => 'Mitoo',
        ]);
        $this->assertSame('done', $item->fresh()->status);
        $this->assertStringContainsString('Cảnh báo sinh ảnh:', (string) $item->fresh()->error_message);
        $this->assertStringContainsString('HTTP 403', (string) $item->fresh()->error_message);
    }

    public function test_batch_limit_is_constrained_to_one_through_twenty(): void
    {
        Sanctum::actingAs($this->admin());
        $this->postJson('/api/ai/queue-process-batch', ['limit' => 0])
            ->assertUnprocessable()->assertJsonValidationErrors('limit');
        $this->postJson('/api/ai/queue-process-batch', ['limit' => 21])
            ->assertUnprocessable()->assertJsonValidationErrors('limit');

        foreach (range(1, 21) as $number) {
            $this->queue(['topic' => "Topic {$number}"]);
        }
        $stats = $this->processor()->processDueBatch(100);
        $this->assertSame(20, $stats['claimed']);
        $this->assertSame(1, AiContentQueue::where('status', 'pending')->count());
    }

    private function processor(): AiContentQueueProcessor
    {
        return $this->app->make(AiContentQueueProcessor::class);
    }

    /**
     * @param array<string, mixed> $overrides
     */
    private function queue(array $overrides = []): AiContentQueue
    {
        return AiContentQueue::create(array_merge([
            'topic' => 'Kính mắt phù hợp khuôn mặt',
            'keywords' => 'kính mắt',
            'type' => 'article',
            'tone' => 'professional',
            'length' => 'medium',
            'with_images' => false,
            'image_count' => 0,
            'auto_publish' => true,
            'status' => 'pending',
            'attempts' => 0,
            'max_attempts' => 3,
            'scheduled_at' => now()->subMinute(),
        ], $overrides));
    }

    private function admin(): User
    {
        return User::create([
            'name' => 'Queue Admin',
            'email' => 'queue-admin-'.uniqid().'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }
}

class FakeAiArticleGenerator implements AiArticleGenerator
{
    /** @var array<int, string> */
    public array $failTopics = [];

    /** @var array<string, array<int, string>> */
    public array $warningsByTopic = [];

    public int $calls = 0;

    public function generate(AiContentQueue $item): array
    {
        $this->calls++;
        if (in_array($item->topic, $this->failTopics, true)) {
            throw new RuntimeException('Synthetic generator failure');
        }

        return $this->payloadFor($item);
    }

    /**
     * @return array<string, mixed>
     */
    public function payloadFor(AiContentQueue $item): array
    {
        $payload = [
            'success' => true,
            'title' => 'Bài viết '.$item->topic,
            'content' => '<h2>Nội dung</h2><p>Đã kiểm thử.</p>',
            'excerpt' => 'Tóm tắt',
            'meta_title' => 'SEO title',
            'meta_desc' => 'SEO description',
            'meta_keywords' => 'kính mắt, thời trang',
            'tags' => ['kính mắt', 'thời trang'],
            'thumbnail' => '/storage/test.webp',
            'og_image' => '/storage/test.webp',
        ];

        if (isset($this->warningsByTopic[$item->topic])) {
            $payload['warnings'] = $this->warningsByTopic[$item->topic];
        }

        return $payload;
    }
}
