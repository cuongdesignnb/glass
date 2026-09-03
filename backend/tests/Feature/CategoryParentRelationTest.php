<?php

namespace Tests\Feature;

use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryParentRelationTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_child_category_includes_its_parent(): void
    {
        $parent = $this->createCategory('Gọng Kính', 'gong-kinh');
        $child = $this->createCategory('Gọng Kính Panto', 'gong-kinh-panto', $parent->id);

        $this->getJson('/api/public/categories/'.$child->slug)
            ->assertOk()
            ->assertJsonPath('id', $child->id)
            ->assertJsonPath('parent.id', $parent->id)
            ->assertJsonPath('parent.name', $parent->name)
            ->assertJsonPath('parent.slug', $parent->slug)
            ->assertJsonPath('parent.is_active', true);
    }

    public function test_public_top_level_category_has_no_parent_object(): void
    {
        $category = $this->createCategory('Gọng Kính', 'gong-kinh');

        $this->getJson('/api/public/categories/'.$category->slug)
            ->assertOk()
            ->assertJsonPath('parent', null);
    }

    private function createCategory(string $name, string $slug, ?int $parentId = null): Category
    {
        return Category::create([
            'name' => $name,
            'slug' => $slug,
            'parent_id' => $parentId,
            'is_active' => true,
        ]);
    }
}
