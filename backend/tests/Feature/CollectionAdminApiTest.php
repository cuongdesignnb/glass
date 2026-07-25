<?php

namespace Tests\Feature;

use App\Models\Collection;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CollectionAdminApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_index_with_all_returns_active_and_inactive_collections(): void
    {
        $active = $this->createCollection('Active Admin Collection', true);
        $inactive = $this->createCollection('Inactive Admin Collection', false);
        Sanctum::actingAs($this->createUser('admin'));

        $this->getJson('/api/collections?all=1')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['id' => $active->id])
            ->assertJsonFragment(['id' => $inactive->id]);
    }

    public function test_customer_cannot_manage_collections(): void
    {
        $collection = $this->createCollection('Customer Forbidden');
        Sanctum::actingAs($this->createUser('customer'));

        $this->postJson('/api/collections', ['name' => 'Denied'])->assertForbidden();
        $this->putJson('/api/collections/'.$collection->id, ['name' => 'Denied'])->assertForbidden();
        $this->deleteJson('/api/collections/'.$collection->id)->assertForbidden();
        $this->putJson('/api/collections-reorder', [
            'items' => [['id' => $collection->id, 'order' => 1]],
        ])->assertForbidden();
    }

    public function test_guest_cannot_manage_collections(): void
    {
        $collection = $this->createCollection('Guest Forbidden');

        $this->postJson('/api/collections', ['name' => 'Denied'])->assertUnauthorized();
        $this->putJson('/api/collections/'.$collection->id, ['name' => 'Denied'])->assertUnauthorized();
        $this->deleteJson('/api/collections/'.$collection->id)->assertUnauthorized();
        $this->putJson('/api/collections-reorder', [
            'items' => [['id' => $collection->id, 'order' => 1]],
        ])->assertUnauthorized();
    }

    public function test_admin_can_create_collection_with_validated_fields_and_ordered_products(): void
    {
        $first = $this->createProduct('Create First');
        $second = $this->createProduct('Create Second');
        Sanctum::actingAs($this->createUser('admin'));

        $response = $this->postJson('/api/collections', [
            'name' => 'Summer Collection',
            'gradient_from' => '#A1B2C3',
            'gradient_to' => '#102030',
            'accent_color' => '#abcdef',
            'order' => 4,
            'is_active' => true,
            'product_ids' => [$second->id, $first->id],
        ])->assertCreated()
            ->assertJsonPath('slug', 'summer-collection')
            ->assertJsonPath('order', 4);

        $collectionId = $response->json('id');
        $this->assertDatabaseHas('collections', [
            'id' => $collectionId,
            'slug' => 'summer-collection',
            'gradient_from' => '#A1B2C3',
        ]);
        $this->assertDatabaseHas('collection_product', [
            'collection_id' => $collectionId,
            'product_id' => $second->id,
            'order' => 0,
        ]);
        $this->assertDatabaseHas('collection_product', [
            'collection_id' => $collectionId,
            'product_id' => $first->id,
            'order' => 1,
        ]);
    }

    public function test_admin_create_rejects_invalid_colors_negative_order_and_duplicate_products(): void
    {
        $product = $this->createProduct('Duplicate Product');
        Sanctum::actingAs($this->createUser('admin'));

        $this->postJson('/api/collections', [
            'name' => 'Invalid Color',
            'gradient_from' => 'red',
        ])->assertUnprocessable()->assertJsonValidationErrors('gradient_from');

        $this->postJson('/api/collections', [
            'name' => 'Invalid Order',
            'order' => -1,
        ])->assertUnprocessable()->assertJsonValidationErrors('order');

        $this->postJson('/api/collections', [
            'name' => 'Duplicate Products',
            'product_ids' => [$product->id, $product->id],
        ])->assertUnprocessable()->assertJsonValidationErrors('product_ids.1');
    }

    public function test_admin_can_update_collection_and_replace_product_assignments_in_order(): void
    {
        $collection = $this->createCollection('Before Update');
        $removed = $this->createProduct('Removed Product');
        $first = $this->createProduct('Updated First');
        $second = $this->createProduct('Updated Second');
        $collection->products()->attach($removed->id, ['order' => 0]);
        Sanctum::actingAs($this->createUser('admin'));

        $this->putJson('/api/collections/'.$collection->id, [
            'name' => 'After Update',
            'is_active' => false,
            'product_ids' => [$second->id, $first->id],
        ])->assertOk()
            ->assertJsonPath('slug', 'after-update')
            ->assertJsonPath('is_active', false);

        $this->assertDatabaseHas('collections', [
            'id' => $collection->id,
            'name' => 'After Update',
            'slug' => 'after-update',
            'is_active' => false,
        ]);
        $this->assertDatabaseMissing('collection_product', [
            'collection_id' => $collection->id,
            'product_id' => $removed->id,
        ]);
        $this->assertDatabaseHas('collection_product', [
            'collection_id' => $collection->id,
            'product_id' => $second->id,
            'order' => 0,
        ]);
        $this->assertDatabaseHas('collection_product', [
            'collection_id' => $collection->id,
            'product_id' => $first->id,
            'order' => 1,
        ]);
    }

    public function test_admin_reorder_validates_ids_and_non_negative_order(): void
    {
        $first = $this->createCollection('Reorder First', true, 0);
        $second = $this->createCollection('Reorder Second', true, 1);
        Sanctum::actingAs($this->createUser('admin'));

        $this->putJson('/api/collections-reorder', [
            'items' => [
                ['id' => $first->id, 'order' => 5],
                ['id' => $second->id, 'order' => 2],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('collections', ['id' => $first->id, 'order' => 5]);
        $this->assertDatabaseHas('collections', ['id' => $second->id, 'order' => 2]);

        $this->putJson('/api/collections-reorder', [
            'items' => [['id' => 999999, 'order' => 0]],
        ])->assertUnprocessable()->assertJsonValidationErrors('items.0.id');

        $this->putJson('/api/collections-reorder', [
            'items' => [['id' => $first->id, 'order' => -1]],
        ])->assertUnprocessable()->assertJsonValidationErrors('items.0.order');
    }

    public function test_admin_delete_detaches_products_without_deleting_them(): void
    {
        $collection = $this->createCollection('Delete Collection');
        $product = $this->createProduct('Keep Product');
        $collection->products()->attach($product->id, ['order' => 0]);
        Sanctum::actingAs($this->createUser('admin'));

        $this->deleteJson('/api/collections/'.$collection->id)->assertOk();

        $this->assertDatabaseMissing('collections', ['id' => $collection->id]);
        $this->assertDatabaseMissing('collection_product', ['collection_id' => $collection->id]);
        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    private function createCollection(string $name, bool $active = true, int $order = 0): Collection
    {
        return Collection::create([
            'name' => $name,
            'slug' => str($name)->slug()->toString(),
            'order' => $order,
            'is_active' => $active,
        ]);
    }

    private function createProduct(string $name): Product
    {
        return Product::create([
            'name' => $name,
            'slug' => str($name)->slug()->toString(),
            'price' => 100000,
            'gender' => ['unisex'],
            'is_active' => true,
        ]);
    }

    private function createUser(string $role): User
    {
        return User::create([
            'name' => ucfirst($role),
            'email' => $role.'-'.str()->random(8).'@example.com',
            'password' => 'password',
            'role' => $role,
        ]);
    }
}
