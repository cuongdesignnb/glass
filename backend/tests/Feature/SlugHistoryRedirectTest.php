<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Collection;
use App\Models\Product;
use App\Models\SlugRedirect;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SlugHistoryRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_slug_preview_uses_backend_generator_and_does_not_mutate(): void
    {
        $product = $this->createProduct('Tên hiện tại', 'ten-hien-tai');
        $before = $product->fresh()->toArray();
        Sanctum::actingAs($this->createAdmin());

        $this->postJson('/api/slug-preview', [
            'entity_type' => 'product',
            'entity_id' => $product->id,
            'source_text' => 'Gọng Kính Panto Đen',
        ])->assertOk()
            ->assertJson([
                'current_slug' => 'ten-hien-tai',
                'generated_slug' => 'gong-kinh-panto-den',
                'available' => true,
            ]);

        $this->assertSame($before, $product->fresh()->toArray());
        $this->assertDatabaseCount('slug_redirects', 0);
    }

    public function test_preview_reports_collision_and_save_blocks_a_stale_preview(): void
    {
        $source = $this->createProduct('Nguồn', 'nguon');
        Sanctum::actingAs($this->createAdmin());

        $preview = $this->postJson('/api/slug-preview', [
            'entity_type' => 'product',
            'entity_id' => $source->id,
            'source_text' => 'Slug sẽ bị chiếm',
        ])->assertOk()
            ->assertJsonPath('available', true);

        $this->createProduct('Sản phẩm khác', 'slug-se-bi-chiem');

        $preview->assertJsonPath('generated_slug', 'slug-se-bi-chiem');
        $this->postJson('/api/slug-preview', [
            'entity_type' => 'product',
            'entity_id' => $source->id,
            'source_text' => 'Slug sẽ bị chiếm',
        ])->assertOk()->assertJsonPath('available', false);

        $this->putJson('/api/products/'.$source->id, [
            'name' => 'Slug sẽ bị chiếm',
            'regenerate_slug' => true,
            'requested_slug' => 'slug-se-bi-chiem',
        ])->assertUnprocessable()->assertJsonValidationErrors('slug');

        $this->assertSame('nguon', $source->fresh()->slug);
        $this->assertDatabaseCount('slug_redirects', 0);
    }

    public function test_product_slug_regeneration_requires_a_preview_slug(): void
    {
        $product = $this->createProduct('Sản phẩm A', 'san-pham-a');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/products/'.$product->id, [
            'name' => 'Sản phẩm B',
            'regenerate_slug' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors('requested_slug');

        $this->assertSame('Sản phẩm A', $product->fresh()->name);
        $this->assertSame('san-pham-a', $product->fresh()->slug);
        $this->assertDatabaseCount('slug_redirects', 0);
    }

    public function test_article_slug_regeneration_requires_a_preview_slug(): void
    {
        $article = Article::create([
            'title' => 'Bài viết A',
            'slug' => 'bai-viet-a',
            'content' => '<p>Nội dung</p>',
            'is_published' => true,
        ]);
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/articles/'.$article->id, [
            'title' => 'Bài viết B',
            'regenerate_slug' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors('requested_slug');

        $this->assertSame('Bài viết A', $article->fresh()->title);
        $this->assertSame('bai-viet-a', $article->fresh()->slug);
        $this->assertDatabaseCount('slug_redirects', 0);
    }

    public function test_collection_slug_regeneration_requires_a_preview_slug(): void
    {
        $collection = Collection::create([
            'name' => 'Bộ sưu tập A',
            'slug' => 'bo-suu-tap-a',
            'is_active' => true,
        ]);
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/collections/'.$collection->id, [
            'name' => 'Bộ sưu tập B',
            'regenerate_slug' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors('requested_slug');

        $this->assertSame('Bộ sưu tập A', $collection->fresh()->name);
        $this->assertSame('bo-suu-tap-a', $collection->fresh()->slug);
        $this->assertDatabaseCount('slug_redirects', 0);
    }

    public function test_product_stale_preview_is_rejected_without_mutation(): void
    {
        $product = $this->createProduct('Sản phẩm A', 'san-pham-a');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/products/'.$product->id, [
            'name' => 'Sản phẩm B',
            'regenerate_slug' => true,
            'requested_slug' => 'not-the-generated-slug',
        ])->assertUnprocessable()->assertJsonValidationErrors('slug');

        $this->assertSame('Sản phẩm A', $product->fresh()->name);
        $this->assertSame('san-pham-a', $product->fresh()->slug);
        $this->assertDatabaseCount('slug_redirects', 0);
    }

    public function test_article_stale_preview_is_rejected_without_mutation(): void
    {
        $article = Article::create([
            'title' => 'Bài viết A',
            'slug' => 'bai-viet-a',
            'content' => '<p>Nội dung</p>',
            'is_published' => true,
        ]);
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/articles/'.$article->id, [
            'title' => 'Bài viết B',
            'regenerate_slug' => true,
            'requested_slug' => 'not-the-generated-slug',
        ])->assertUnprocessable()->assertJsonValidationErrors('slug');

        $this->assertSame('Bài viết A', $article->fresh()->title);
        $this->assertSame('bai-viet-a', $article->fresh()->slug);
        $this->assertDatabaseCount('slug_redirects', 0);
    }

    public function test_collection_stale_preview_is_rejected_without_mutation(): void
    {
        $collection = Collection::create([
            'name' => 'Bộ sưu tập A',
            'slug' => 'bo-suu-tap-a',
            'is_active' => true,
        ]);
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/collections/'.$collection->id, [
            'name' => 'Bộ sưu tập B',
            'regenerate_slug' => true,
            'requested_slug' => 'not-the-generated-slug',
        ])->assertUnprocessable()->assertJsonValidationErrors('slug');

        $this->assertSame('Bộ sưu tập A', $collection->fresh()->name);
        $this->assertSame('bo-suu-tap-a', $collection->fresh()->slug);
        $this->assertDatabaseCount('slug_redirects', 0);
    }

    public function test_product_full_save_rolls_back_after_slug_history_step_fails(): void
    {
        $product = $this->createProduct('Sản phẩm A', 'san-pham-a');
        $faq = $product->faqs()->create([
            'question' => 'Câu hỏi cũ',
            'answer' => 'Câu trả lời cũ',
            'order' => 0,
            'is_active' => true,
        ]);
        $eventName = 'eloquent.updated: '.Product::class;
        Event::listen($eventName, function (Product $model): void {
            if ($model->wasChanged('name') && $model->name === 'Sản phẩm B') {
                throw new \RuntimeException('forced product save failure');
            }
        });
        Sanctum::actingAs($this->createAdmin());

        try {
            $this->putJson('/api/products/'.$product->id, [
                'name' => 'Sản phẩm B',
                'regenerate_slug' => true,
                'requested_slug' => 'san-pham-b',
                'faqs' => [[
                    'question' => 'Câu hỏi mới',
                    'answer' => 'Câu trả lời mới',
                ]],
            ])->assertStatus(500);
        } finally {
            Event::forget($eventName);
        }

        $this->assertSame('Sản phẩm A', $product->fresh()->name);
        $this->assertSame('san-pham-a', $product->fresh()->slug);
        $this->assertDatabaseCount('slug_redirects', 0);
        $this->assertDatabaseHas('faqs', [
            'id' => $faq->id,
            'product_id' => $product->id,
            'question' => 'Câu hỏi cũ',
        ]);
    }

    public function test_article_full_save_rolls_back_after_slug_history_step_fails(): void
    {
        $article = Article::create([
            'title' => 'Bài viết A',
            'slug' => 'bai-viet-a',
            'content' => '<p>Nội dung</p>',
            'is_published' => true,
        ]);
        $eventName = 'eloquent.updated: '.Article::class;
        Event::listen($eventName, function (Article $model): void {
            if ($model->wasChanged('title') && $model->title === 'Bài viết B') {
                throw new \RuntimeException('forced article save failure');
            }
        });
        Sanctum::actingAs($this->createAdmin());

        try {
            $this->putJson('/api/articles/'.$article->id, [
                'title' => 'Bài viết B',
                'regenerate_slug' => true,
                'requested_slug' => 'bai-viet-b',
            ])->assertStatus(500);
        } finally {
            Event::forget($eventName);
        }

        $this->assertSame('Bài viết A', $article->fresh()->title);
        $this->assertSame('bai-viet-a', $article->fresh()->slug);
        $this->assertDatabaseCount('slug_redirects', 0);
    }

    public function test_collection_full_save_rolls_back_after_slug_history_step_fails(): void
    {
        $collection = Collection::create([
            'name' => 'Bộ sưu tập A',
            'slug' => 'bo-suu-tap-a',
            'is_active' => true,
        ]);
        $existingProduct = $this->createProduct('Sản phẩm hiện tại', 'san-pham-hien-tai');
        $collection->products()->attach($existingProduct->id, ['order' => 0]);
        $replacementProduct = $this->createProduct('Sản phẩm thay thế', 'san-pham-thay-the');
        $eventName = 'eloquent.updated: '.Collection::class;
        Event::listen($eventName, function (Collection $model): void {
            if ($model->wasChanged('name') && $model->name === 'Bộ sưu tập B') {
                throw new \RuntimeException('forced collection save failure');
            }
        });
        Sanctum::actingAs($this->createAdmin());

        try {
            $this->putJson('/api/collections/'.$collection->id, [
                'name' => 'Bộ sưu tập B',
                'regenerate_slug' => true,
                'requested_slug' => 'bo-suu-tap-b',
                'product_ids' => [$replacementProduct->id],
            ])->assertStatus(500);
        } finally {
            Event::forget($eventName);
        }

        $this->assertSame('Bộ sưu tập A', $collection->fresh()->name);
        $this->assertSame('bo-suu-tap-a', $collection->fresh()->slug);
        $this->assertDatabaseCount('slug_redirects', 0);
        $this->assertDatabaseHas('collection_product', [
            'collection_id' => $collection->id,
            'product_id' => $existingProduct->id,
        ]);
        $this->assertDatabaseMissing('collection_product', [
            'collection_id' => $collection->id,
            'product_id' => $replacementProduct->id,
        ]);
    }

    public function test_product_history_redirect_preserves_query_and_current_url_is_ok(): void
    {
        $product = $this->createProduct('Sản phẩm A', 'san-pham-a');
        Sanctum::actingAs($this->createAdmin());

        $this->renameProduct($product, 'Sản phẩm B', 'san-pham-b');
        Auth::forgetGuards();

        $response = $this->get('/api/public/products/san-pham-a?color=%C4%90en&option_ids=1%2C2&empty=&tag=one&tag=two')
            ->assertStatus(308);

        $location = (string) $response->headers->get('Location');
        $this->assertSame('/san-pham/san-pham-b', parse_url($location, PHP_URL_PATH));
        $this->assertStringContainsString('color=%C4%90en', $location);
        $this->assertStringContainsString('option_ids=1%2C2', $location);
        $this->assertStringContainsString('empty=', $location);
        $this->assertSame(2, substr_count($location, 'tag='));

        $this->getJson('/api/public/products/san-pham-b')
            ->assertOk()
            ->assertJsonPath('slug', 'san-pham-b');
    }

    public function test_multiple_product_history_rows_resolve_directly_to_current_slug(): void
    {
        $product = $this->createProduct('Sản phẩm A', 'san-pham-a');
        Sanctum::actingAs($this->createAdmin());

        $this->renameProduct($product, 'Sản phẩm B', 'san-pham-b');
        $this->renameProduct($product, 'Sản phẩm C', 'san-pham-c');
        Auth::forgetGuards();

        foreach (['san-pham-a', 'san-pham-b'] as $oldSlug) {
            $location = (string) $this->get('/api/public/products/'.$oldSlug)
                ->assertStatus(308)
                ->headers->get('Location');
            $this->assertSame('/san-pham/san-pham-c', parse_url($location, PHP_URL_PATH));
        }

        $this->assertDatabaseHas('slug_redirects', [
            'entity_type' => 'product',
            'entity_id' => $product->id,
            'old_slug' => 'san-pham-a',
        ]);
        $this->assertDatabaseHas('slug_redirects', [
            'entity_type' => 'product',
            'entity_id' => $product->id,
            'old_slug' => 'san-pham-b',
        ]);
    }

    public function test_reverting_to_a_historical_slug_does_not_create_a_loop(): void
    {
        $product = $this->createProduct('Sản phẩm A', 'san-pham-a');
        Sanctum::actingAs($this->createAdmin());

        $this->renameProduct($product, 'Sản phẩm B', 'san-pham-b');
        $this->renameProduct($product, 'Sản phẩm A', 'san-pham-a');
        Auth::forgetGuards();

        $this->getJson('/api/public/products/san-pham-a')
            ->assertOk()
            ->assertJsonPath('slug', 'san-pham-a');

        $location = (string) $this->get('/api/public/products/san-pham-b')
            ->assertStatus(308)
            ->headers->get('Location');
        $this->assertSame('/san-pham/san-pham-a', parse_url($location, PHP_URL_PATH));
        $this->assertDatabaseMissing('slug_redirects', [
            'entity_type' => 'product',
            'entity_id' => $product->id,
            'old_slug' => 'san-pham-a',
        ]);
    }

    public function test_collision_is_rejected_without_partial_history_or_slug_mutation(): void
    {
        $first = $this->createProduct('Sản phẩm A', 'san-pham-a');
        $second = $this->createProduct('Sản phẩm C', 'san-pham-c');
        Sanctum::actingAs($this->createAdmin());

        $this->renameProduct($first, 'Sản phẩm B', 'san-pham-b');

        $this->putJson('/api/products/'.$second->id, [
            'name' => 'Sản phẩm A',
            'regenerate_slug' => true,
            'requested_slug' => 'san-pham-a',
        ])->assertUnprocessable()->assertJsonValidationErrors('slug');

        $this->assertSame('san-pham-c', $second->fresh()->slug);
        $this->assertDatabaseMissing('slug_redirects', [
            'entity_type' => 'product',
            'entity_id' => $second->id,
            'old_slug' => 'san-pham-c',
        ]);
        $this->assertDatabaseHas('slug_redirects', [
            'entity_type' => 'product',
            'entity_id' => $first->id,
            'old_slug' => 'san-pham-a',
        ]);
    }

    public function test_normal_product_save_creates_no_slug_history(): void
    {
        $product = $this->createProduct('Sản phẩm A', 'san-pham-a');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/products/'.$product->id, [
            'name' => 'Sản phẩm B',
            'description' => 'Cập nhật nội dung nhưng giữ URL',
        ])->assertOk()->assertJsonPath('slug', 'san-pham-a');

        $this->assertDatabaseCount('slug_redirects', 0);
    }

    public function test_article_history_redirects_and_unknown_slug_stays_404(): void
    {
        $article = Article::create([
            'title' => 'Bài viết A',
            'slug' => 'bai-viet-a',
            'content' => '<p>Nội dung</p>',
            'is_published' => true,
        ]);
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/articles/'.$article->id, [
            'title' => 'Bài viết B',
            'regenerate_slug' => true,
            'requested_slug' => 'bai-viet-b',
        ])->assertOk()->assertJsonPath('slug', 'bai-viet-b');

        Auth::forgetGuards();
        $articleRedirect = $this->get('/api/public/articles/bai-viet-a?ref=history')
            ->assertStatus(308);
        $this->assertStringContainsString('/bai-viet/bai-viet-b?ref=history', (string) $articleRedirect->headers->get('Location'));
        $this->getJson('/api/public/articles/bai-viet-b')->assertOk();
        $this->getJson('/api/public/articles/not-a-real-article')->assertNotFound();
    }

    public function test_collection_history_redirects_and_current_collection_is_ok(): void
    {
        $collection = Collection::create([
            'name' => 'Bộ sưu tập A',
            'slug' => 'bo-suu-tap-a',
            'is_active' => true,
        ]);
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/collections/'.$collection->id, [
            'name' => 'Bộ sưu tập B',
            'regenerate_slug' => true,
            'requested_slug' => 'bo-suu-tap-b',
        ])->assertOk()->assertJsonPath('slug', 'bo-suu-tap-b');

        Auth::forgetGuards();
        $collectionRedirect = $this->get('/api/public/collections/bo-suu-tap-a?source=history')
            ->assertStatus(308);
        $this->assertStringContainsString('/bo-suu-tap/bo-suu-tap-b?source=history', (string) $collectionRedirect->headers->get('Location'));
        $this->getJson('/api/public/collections/bo-suu-tap-b')->assertOk();
    }

    public function test_hidden_historical_entities_are_not_redirected_to_public_pages(): void
    {
        $product = $this->createProduct('Sản phẩm A', 'san-pham-a');
        Sanctum::actingAs($this->createAdmin());
        $this->renameProduct($product, 'Sản phẩm B', 'san-pham-b');
        $product->update(['is_active' => false]);
        Auth::forgetGuards();

        $this->getJson('/api/public/products/san-pham-a')->assertNotFound();
    }

    private function renameProduct(Product $product, string $name, string $slug): void
    {
        $this->putJson('/api/products/'.$product->id, [
            'name' => $name,
            'regenerate_slug' => true,
            'requested_slug' => $slug,
        ])->assertOk()->assertJsonPath('slug', $slug);
    }

    private function createProduct(string $name, string $slug): Product
    {
        return Product::create([
            'name' => $name,
            'slug' => $slug,
            'price' => 100000,
            'gender' => ['unisex'],
            'colors' => [],
            'color_names' => [],
            'color_variants' => [],
            'images' => [],
            'image_alts' => [],
            'image_captions' => [],
            'face_shapes' => [],
            'frame_styles' => [],
            'materials' => [],
            'prescription' => [],
            'is_active' => true,
        ]);
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Slug History Admin',
            'email' => 'slug-history-'.Str::random(8).'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }
}
