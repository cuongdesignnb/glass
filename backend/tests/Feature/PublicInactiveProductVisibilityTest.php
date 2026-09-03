<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\ProductCatalogCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicInactiveProductVisibilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_public_active_detail_remains_available_and_increments_views(): void
    {
        $product = $this->createProduct('Active product', true, 4);

        $this->getJson('/api/public/products/'.$product->slug)
            ->assertOk()
            ->assertJsonPath('id', $product->id)
            ->assertJsonPath('is_active', true);

        $this->assertSame(5, Product::findOrFail($product->id)->views);
    }

    public function test_public_inactive_slug_returns_404_without_payload(): void
    {
        $product = $this->createProduct('Inactive product by slug', false);

        $this->getJson('/api/public/products/'.$product->slug)
            ->assertNotFound();
    }

    public function test_public_inactive_id_returns_404_without_payload(): void
    {
        $product = $this->createProduct('Inactive product by id', false);

        $this->getJson('/api/public/products/'.$product->id)
            ->assertNotFound();
    }

    public function test_public_inactive_related_returns_404(): void
    {
        $product = $this->createProduct('Inactive related source', false);

        $this->getJson('/api/public/products/'.$product->slug.'/related')
            ->assertNotFound();
    }

    public function test_authenticated_admin_can_view_inactive_detail(): void
    {
        $product = $this->createProduct('Admin-only inactive product', false, 7);

        Sanctum::actingAs($this->createAdmin());

        $this->getJson('/api/public/products/'.$product->slug)
            ->assertOk()
            ->assertJsonPath('id', $product->id)
            ->assertJsonPath('is_active', false);

        $this->assertSame(7, Product::findOrFail($product->id)->views);
    }

    public function test_public_active_related_products_remain_available(): void
    {
        $category = Category::create([
            'name' => 'Related frames',
            'slug' => 'related-frames',
            'is_active' => true,
        ]);
        $source = $this->createProduct('Active related source', true, 0, $category->id);
        $candidate = $this->createProduct('Active related candidate', true, 0, $category->id);

        $response = $this->getJson('/api/public/products/'.$source->slug.'/related?per_page=10')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->assertSame([$candidate->id], array_column($response->json('data'), 'id'));
    }

    public function test_stale_inactive_public_cache_is_blocked_and_forgotten(): void
    {
        $product = $this->createProduct('Stale inactive product', false, 11);
        $cacheKey = ProductCatalogCache::showKey($product->slug);

        Cache::put($cacheKey, $product->toArray(), 3600);

        $this->getJson('/api/public/products/'.$product->slug)
            ->assertNotFound();

        $this->assertFalse(Cache::has($cacheKey));
        $this->assertSame(11, Product::findOrFail($product->id)->views);
    }

    private function createProduct(
        string $name,
        bool $isActive,
        int $views = 0,
        ?int $categoryId = null
    ): Product {
        return Product::create([
            'name' => $name,
            'slug' => Str::slug($name),
            'price' => 100000,
            'category_id' => $categoryId,
            'gender' => ['unisex'],
            'is_active' => $isActive,
            'views' => $views,
        ]);
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Product Visibility Admin',
            'email' => 'product-visibility-admin-'.Str::random(8).'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }
}
