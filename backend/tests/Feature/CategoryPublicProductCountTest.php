<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CategoryPublicProductCountTest extends TestCase
{
    use RefreshDatabase;

    public function test_category_counts_only_active_effective_products_once(): void
    {
        $category = $this->createCategory('Danh mục đếm sản phẩm');
        $otherCategory = $this->createCategory('Danh mục khác');

        $this->createProduct('Active primary', $category->id, true);
        $this->createProduct('Inactive primary', $category->id, false);

        $activePivot = $this->createProduct('Active pivot', $otherCategory->id, true);
        $activePivot->categories()->attach($category->id);

        $inactivePivot = $this->createProduct('Inactive pivot', $otherCategory->id, false);
        $inactivePivot->categories()->attach($category->id);

        $duplicate = $this->createProduct('Primary and pivot', $category->id, true);
        $duplicate->categories()->attach($category->id);

        $this->getJson('/api/public/categories/'.$category->slug)
            ->assertOk()
            ->assertJsonPath('products_count', 3);
    }

    public function test_category_list_and_show_return_the_same_active_effective_count(): void
    {
        $category = $this->createCategory('Danh mục đồng nhất');
        $primary = $this->createProduct('Active primary list', $category->id, true);
        $pivot = $this->createProduct('Active pivot list', null, true);
        $pivot->categories()->attach($category->id);
        $this->createProduct('Inactive list', $category->id, false);

        $list = $this->getJson('/api/public/categories?tree=false')->assertOk();
        $listedCategory = collect($list->json())->firstWhere('id', $category->id);

        $this->assertNotNull($listedCategory);
        $this->assertSame(2, $listedCategory['products_count']);

        $this->getJson('/api/public/categories/'.$category->slug)
            ->assertOk()
            ->assertJsonPath('products_count', $listedCategory['products_count']);

        $this->assertNotSame($primary->id, $pivot->id);
    }

    public function test_tree_children_use_active_effective_product_count(): void
    {
        $parent = $this->createCategory('Danh mục cha');
        $child = $this->createCategory('Danh mục con', $parent->id);
        $otherCategory = $this->createCategory('Danh mục nguồn');

        $this->createProduct('Active child primary', $child->id, true);

        $activePivot = $this->createProduct('Active child pivot', $otherCategory->id, true);
        $activePivot->categories()->attach($child->id);

        $this->createProduct('Inactive child product', $child->id, false);

        $tree = $this->getJson('/api/public/categories?tree=true')->assertOk();
        $listedParent = collect($tree->json())->firstWhere('id', $parent->id);
        $listedChild = collect($listedParent['children'] ?? [])->firstWhere('id', $child->id);

        $this->assertNotNull($listedChild);
        $this->assertSame(2, $listedChild['products_count']);
    }

    private function createCategory(string $name, ?int $parentId = null): Category
    {
        return Category::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
            'parent_id' => $parentId,
            'is_active' => true,
        ]);
    }

    private function createProduct(string $name, ?int $categoryId, bool $isActive): Product
    {
        return Product::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
            'price' => 100000,
            'category_id' => $categoryId,
            'gender' => ['unisex'],
            'is_active' => $isActive,
        ]);
    }
}
