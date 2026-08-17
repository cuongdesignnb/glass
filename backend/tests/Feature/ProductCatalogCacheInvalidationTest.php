<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductCatalogCacheInvalidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_attaching_a_product_to_a_category_invalidates_a_cached_empty_listing(): void
    {
        $category = $this->createCategory('Gọng Kính Panto');
        $product = $this->createProduct('Kính Panto Mới');

        $this->getJson($this->categoryListingUrl($category))
            ->assertOk()
            ->assertJsonPath('total', 0);

        Sanctum::actingAs($this->createAdmin());
        $this->putJson("/api/products/{$product->id}", [
            'category_id' => $category->id,
            'category_ids' => [$category->id],
        ])->assertOk();

        $freshListing = $this->getJson($this->categoryListingUrl($category))
            ->assertOk()
            ->assertJsonPath('total', 1);

        $this->assertSame($product->id, $freshListing->json('data.0.id'));
    }

    public function test_removing_a_product_from_a_category_invalidates_a_cached_listing(): void
    {
        $category = $this->createCategory('Gọng Kính Tròn');
        $product = $this->createProduct('Kính Tròn', $category->id);

        $this->getJson($this->categoryListingUrl($category))
            ->assertOk()
            ->assertJsonPath('total', 1);

        Sanctum::actingAs($this->createAdmin());
        $this->putJson("/api/products/{$product->id}", [
            'category_id' => null,
            'category_ids' => [],
        ])->assertOk();

        $this->getJson($this->categoryListingUrl($category))
            ->assertOk()
            ->assertJsonPath('total', 0);
    }

    public function test_updating_product_data_invalidates_a_cached_listing(): void
    {
        $category = $this->createCategory('Kính Cận');
        $product = $this->createProduct('Tên cũ', $category->id);

        $this->getJson($this->categoryListingUrl($category))
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Tên cũ');

        Sanctum::actingAs($this->createAdmin());
        $this->putJson("/api/products/{$product->id}", [
            'name' => 'Tên mới',
        ])->assertOk();

        $this->getJson($this->categoryListingUrl($category))
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Tên mới');
    }

    private function categoryListingUrl(Category $category): string
    {
        return '/api/public/products?per_page=12&page=1&sort=newest&category_slug='.$category->slug;
    }

    private function createCategory(string $name): Category
    {
        return Category::create([
            'name' => $name,
            'slug' => Str::slug($name),
            'is_active' => true,
        ]);
    }

    private function createProduct(string $name, ?int $categoryId = null): Product
    {
        return Product::create([
            'name' => $name,
            'slug' => Str::slug($name),
            'price' => 100000,
            'category_id' => $categoryId,
            'gender' => ['unisex'],
            'is_active' => true,
        ]);
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Catalog Admin',
            'email' => 'catalog-admin-'.Str::random(8).'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }
}
