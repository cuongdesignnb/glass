<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategorySlugStabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_category_slug_is_generated_on_create_and_stays_stable_after_rename(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $created = $this->postJson('/api/categories', [
            'name' => 'Gọng Kính',
            'is_active' => true,
        ])->assertCreated();

        $categoryId = $created->json('id');
        $created->assertJsonPath('slug', 'gong-kinh');

        $this->putJson("/api/categories/{$categoryId}", [
            'name' => 'Gọng Kính Cao Cấp',
        ])->assertOk()->assertJsonPath('slug', 'gong-kinh');

        $this->assertSame('gong-kinh', Category::findOrFail($categoryId)->slug);
    }

    public function test_duplicate_category_names_receive_a_deterministic_unique_slug(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $this->postJson('/api/categories', ['name' => 'Gọng Kính'])
            ->assertCreated()
            ->assertJsonPath('slug', 'gong-kinh');

        $this->postJson('/api/categories', ['name' => 'Gọng Kính'])
            ->assertCreated()
            ->assertJsonPath('slug', 'gong-kinh-2');
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Category Admin',
            'email' => 'category-admin-'.str()->random(8).'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }
}
