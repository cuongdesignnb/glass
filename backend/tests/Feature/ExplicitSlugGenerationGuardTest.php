<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Collection;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExplicitSlugGenerationGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_normal_save_preserves_slug_for_field_edits(): void
    {
        $product = $this->createProduct('Current Product Name', 'legacy-seo-url-kinh-mat-mitoo');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/products/'.$product->id, [
            'thumbnail_alt' => 'Alt ảnh mới',
            'price' => 250000,
            'description' => 'Mô tả mới',
            'meta_title' => 'Meta title mới',
            'meta_desc' => 'Meta description mới',
        ])->assertOk()
            ->assertJsonPath('slug', 'legacy-seo-url-kinh-mat-mitoo');

        $this->assertSame('legacy-seo-url-kinh-mat-mitoo', $product->fresh()->slug);
    }

    public function test_product_full_admin_payload_and_name_change_preserve_slug(): void
    {
        $product = $this->createProduct('Current Product Name', 'legacy-seo-url-kinh-mat-mitoo');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/products/'.$product->id, [
            'name' => 'Renamed Product Name',
            'slug' => 'untrusted-client-slug',
            'price' => 300000,
            'description' => 'Nội dung chi tiết mới',
            'content' => '<p>Nội dung SEO mới</p>',
            'thumbnail_alt' => 'Alt mới',
            'thumbnail_caption' => 'Chú thích mới',
            'images' => [],
            'image_alts' => [],
            'image_captions' => [],
            'colors' => [],
            'color_names' => [],
            'color_variants' => [],
            'meta_title' => 'Title mới',
            'meta_desc' => 'Description mới',
            'category_ids' => [],
        ])->assertOk()
            ->assertJsonPath('name', 'Renamed Product Name')
            ->assertJsonPath('slug', 'legacy-seo-url-kinh-mat-mitoo');

        $this->assertSame('legacy-seo-url-kinh-mat-mitoo', $product->fresh()->slug);
    }

    public function test_product_explicit_generate_slug_uses_current_name(): void
    {
        $product = $this->createProduct('Current Product Name', 'legacy-seo-url-kinh-mat-mitoo');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/products/'.$product->id, [
            'name' => 'Gọng Kính Nhựa MS0016 Dáng Vuông',
            'regenerate_slug' => true,
            'requested_slug' => 'gong-kinh-nhua-ms0016-dang-vuong',
        ])->assertOk()
            ->assertJsonPath('slug', 'gong-kinh-nhua-ms0016-dang-vuong');

        $this->assertSame('gong-kinh-nhua-ms0016-dang-vuong', $product->fresh()->slug);
    }

    public function test_product_explicit_generate_slug_blocks_collisions_without_mutation(): void
    {
        $target = $this->createProduct('Collision Target', 'collision-target');
        $source = $this->createProduct('Original Product', 'legacy-source');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/products/'.$source->id, [
            'name' => 'Collision Target',
            'regenerate_slug' => true,
            'requested_slug' => 'collision-target',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('slug');

        $this->assertSame('legacy-source', $source->fresh()->slug);
        $this->assertSame('Original Product', $source->fresh()->name);
        $this->assertSame('collision-target', $target->fresh()->slug);
    }

    public function test_article_normal_save_and_title_change_preserve_slug(): void
    {
        $article = $this->createArticle('Bài viết hiện tại', 'legacy-article-url');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/articles/'.$article->id, [
            'title' => 'Tiêu đề bài viết mới',
            'slug' => 'untrusted-article-slug',
            'thumbnail_alt' => 'Alt mới',
            'meta_desc' => 'Mô tả mới',
        ])->assertOk()
            ->assertJsonPath('slug', 'legacy-article-url');

        $this->assertSame('legacy-article-url', $article->fresh()->slug);
    }

    public function test_article_explicit_generate_slug_works(): void
    {
        $article = $this->createArticle('Bài viết hiện tại', 'legacy-article-url');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/articles/'.$article->id, [
            'title' => 'Hướng dẫn chọn kính đúng cách',
            'regenerate_slug' => true,
            'requested_slug' => 'huong-dan-chon-kinh-dung-cach',
        ])->assertOk()
            ->assertJsonPath('slug', 'huong-dan-chon-kinh-dung-cach');

        $this->assertSame('huong-dan-chon-kinh-dung-cach', $article->fresh()->slug);
    }

    public function test_article_explicit_generate_slug_blocks_collisions(): void
    {
        $this->createArticle('Bài viết trùng', 'bai-viet-trung');
        $source = $this->createArticle('Bài viết cũ', 'legacy-article-url');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/articles/'.$source->id, [
            'title' => 'Bài viết trùng',
            'regenerate_slug' => true,
            'requested_slug' => 'bai-viet-trung',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('slug');

        $this->assertSame('legacy-article-url', $source->fresh()->slug);
    }

    public function test_collection_normal_save_and_name_change_preserve_slug(): void
    {
        $collection = $this->createCollection('Bộ sưu tập hiện tại', 'legacy-collection-url');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/collections/'.$collection->id, [
            'name' => 'Bộ sưu tập mới',
            'slug' => 'untrusted-collection-slug',
            'description' => 'Mô tả mới',
        ])->assertOk()
            ->assertJsonPath('slug', 'legacy-collection-url');

        $this->assertSame('legacy-collection-url', $collection->fresh()->slug);
    }

    public function test_collection_explicit_generate_slug_works(): void
    {
        $collection = $this->createCollection('Bộ sưu tập hiện tại', 'legacy-collection-url');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/collections/'.$collection->id, [
            'name' => 'Bộ Sưu Tập Mùa Hè',
            'regenerate_slug' => true,
            'requested_slug' => 'bo-suu-tap-mua-he',
        ])->assertOk()
            ->assertJsonPath('slug', 'bo-suu-tap-mua-he');

        $this->assertSame('bo-suu-tap-mua-he', $collection->fresh()->slug);
    }

    public function test_collection_explicit_generate_slug_blocks_collisions(): void
    {
        $this->createCollection('Bộ sưu tập trùng', 'bo-suu-tap-trung');
        $source = $this->createCollection('Bộ sưu tập cũ', 'legacy-collection-url');
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/collections/'.$source->id, [
            'name' => 'Bộ sưu tập trùng',
            'regenerate_slug' => true,
            'requested_slug' => 'bo-suu-tap-trung',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('slug');

        $this->assertSame('legacy-collection-url', $source->fresh()->slug);
    }

    private function createProduct(string $name, string $slug): Product
    {
        return Product::create([
            'name' => $name,
            'slug' => $slug,
            'price' => 100000,
            'is_active' => true,
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
        ]);
    }

    private function createArticle(string $title, string $slug): Article
    {
        return Article::create([
            'title' => $title,
            'slug' => $slug,
            'content' => '<p>Nội dung</p>',
            'is_published' => true,
        ]);
    }

    private function createCollection(string $name, string $slug): Collection
    {
        return Collection::create([
            'name' => $name,
            'slug' => $slug,
            'is_active' => true,
        ]);
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Slug Guard Admin',
            'email' => 'slug-guard-'.Str::random(8).'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }
}
