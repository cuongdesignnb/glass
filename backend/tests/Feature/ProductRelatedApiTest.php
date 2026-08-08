<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductRelatedApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_related_products_share_the_current_products_category_and_exclude_unrelated_items(): void
    {
        $category = Category::create([
            'name' => 'Gọng kính',
            'slug' => 'gong-kinh',
        ]);
        $otherCategory = Category::create([
            'name' => 'Kính râm',
            'slug' => 'kinh-ram',
        ]);

        $current = $this->createProduct('Current Product', $category->id);
        $samePrimaryCategory = $this->createProduct('Same Primary Category', $category->id);
        $samePivotCategory = $this->createProduct('Same Secondary Category', null);
        $samePivotCategory->categories()->attach($category->id);
        $unrelated = $this->createProduct('Unrelated Product', $otherCategory->id);

        $response = $this->getJson('/api/public/products/'.$current->id.'/related?per_page=10')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $ids = array_column($response->json('data'), 'id');

        $this->assertContains($samePrimaryCategory->id, $ids);
        $this->assertContains($samePivotCategory->id, $ids);
        $this->assertNotContains($current->id, $ids);
        $this->assertNotContains($unrelated->id, $ids);
        $this->assertSame($samePrimaryCategory->id, $ids[0]);
    }

    private function createProduct(string $name, ?int $categoryId): Product
    {
        return Product::create([
            'name' => $name,
            'slug' => str($name)->slug()->toString(),
            'price' => 100000,
            'category_id' => $categoryId,
            'gender' => ['unisex'],
            'is_active' => true,
        ]);
    }
}
