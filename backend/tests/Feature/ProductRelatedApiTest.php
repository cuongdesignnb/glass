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

    public function test_related_products_rank_shared_catalogue_attributes_above_category_only_matches(): void
    {
        $category = Category::create([
            'name' => 'Gọng kính',
            'slug' => 'gong-kinh',
        ]);

        $current = Product::create([
            'name' => 'Gọng kính Titan dáng vuông',
            'slug' => 'gong-kinh-titan-dang-vuong',
            'price' => 1000000,
            'category_id' => $category->id,
            'brand' => 'MITOO',
            'gender' => ['nu'],
            'face_shapes' => ['tron'],
            'frame_styles' => ['vuong'],
            'materials' => ['titan'],
            'is_active' => true,
        ]);
        $categoryOnly = Product::create([
            'name' => 'Gọng kính nhựa dáng tròn',
            'slug' => 'gong-kinh-nhua-dang-tron',
            'price' => 500000,
            'category_id' => $category->id,
            'brand' => 'BRAND-OTHER',
            'gender' => ['nam'],
            'face_shapes' => ['vuong'],
            'frame_styles' => ['tron'],
            'materials' => ['nhua'],
            'is_active' => true,
        ]);
        $strongMatch = Product::create([
            'name' => 'Gọng kính Titan nữ mặt tròn',
            'slug' => 'gong-kinh-titan-nu-mat-tron',
            'price' => 1050000,
            'category_id' => $category->id,
            'brand' => 'MITOO',
            'gender' => ['nu'],
            'face_shapes' => ['tron'],
            'frame_styles' => ['vuong'],
            'materials' => ['titan'],
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/public/products/'.$current->id.'/related?per_page=2')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $ids = array_column($response->json('data'), 'id');
        $this->assertSame($strongMatch->id, $ids[0]);
        $this->assertContains($categoryOnly->id, $ids);
        $this->assertNotContains($current->id, $ids);
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
