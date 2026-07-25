<?php

namespace Tests\Feature;

use App\Models\Collection;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CollectionPublicApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_index_only_returns_active_collections_and_counts_active_products(): void
    {
        $active = $this->createCollection('Active Collection', true, 1);
        $inactive = $this->createCollection('Inactive Collection', false, 2);
        $activeProduct = $this->createProduct('Active Product', true);
        $inactiveProduct = $this->createProduct('Inactive Product', false);

        $active->products()->attach([
            $activeProduct->id => ['order' => 0],
            $inactiveProduct->id => ['order' => 1],
        ]);

        $this->getJson('/api/public/collections?all=1')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $active->id)
            ->assertJsonPath('0.products_count', 1)
            ->assertJsonMissing(['id' => $inactive->id]);

        Sanctum::actingAs($this->createUser('customer'));

        $this->getJson('/api/public/collections?all=1')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $active->id)
            ->assertJsonPath('0.products_count', 1)
            ->assertJsonMissing(['id' => $inactive->id]);
    }

    public function test_public_detail_hides_inactive_collections_and_products_and_preserves_pivot_order(): void
    {
        $active = $this->createCollection('Visible Collection', true);
        $inactive = $this->createCollection('Hidden Collection', false);
        $first = $this->createProduct('First Product', true);
        $second = $this->createProduct('Second Product', true);
        $hidden = $this->createProduct('Hidden Product', false);

        $active->products()->attach([
            $second->id => ['order' => 20],
            $hidden->id => ['order' => 0],
            $first->id => ['order' => 10],
        ]);

        $this->getJson('/api/public/collections/'.$inactive->slug)
            ->assertNotFound();

        $response = $this->getJson('/api/public/collections/'.$active->slug)
            ->assertOk()
            ->assertJsonPath('products_count', 2)
            ->assertJsonMissing(['id' => $hidden->id]);

        $this->assertSame(
            [$first->id, $second->id],
            array_column($response->json('products'), 'id')
        );
    }

    private function createCollection(string $name, bool $active, int $order = 0): Collection
    {
        return Collection::create([
            'name' => $name,
            'slug' => str($name)->slug()->toString(),
            'order' => $order,
            'is_active' => $active,
        ]);
    }

    private function createProduct(string $name, bool $active): Product
    {
        return Product::create([
            'name' => $name,
            'slug' => str($name)->slug()->toString(),
            'price' => 100000,
            'gender' => ['unisex'],
            'is_active' => $active,
        ]);
    }

    private function createUser(string $role): User
    {
        return User::create([
            'name' => ucfirst($role),
            'email' => $role.'-public@example.com',
            'password' => 'password',
            'role' => $role,
        ]);
    }
}
