<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductAddonGroup;
use App\Models\ProductAddonOption;
use App\Models\ProductAddonPrice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderServerSidePricingTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $overrides = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Gong test',
            'slug' => 'gong-test-'.uniqid(),
            'price' => 500000,
            'gender' => ['unisex'],
            'is_active' => true,
        ], $overrides));
    }

    private function payload(array $items): array
    {
        return [
            'customer_name' => 'Khach Test',
            'customer_phone' => '0900000000',
            'address' => '1 Duong Test',
            'payment_method' => 'cod',
            'items' => $items,
        ];
    }

    public function test_client_supplied_price_is_ignored_and_catalogue_price_is_used(): void
    {
        $product = $this->product();

        $response = $this->postJson('/api/public/orders', $this->payload([[
            'product_id' => $product->id,
            'name' => 'Ten gia',
            'slug' => 'slug-gia',
            'price' => 1,
            'quantity' => 2,
        ]]));

        $response->assertCreated();
        $this->assertSame(1000000.0, (float) $response->json('subtotal'));
        $this->assertDatabaseHas('order_items', [
            'product_id' => $product->id,
            'name' => 'Gong test',
            'price' => 500000,
            'quantity' => 2,
        ]);
    }

    public function test_sale_price_is_used_when_set(): void
    {
        $product = $this->product(['sale_price' => 400000]);

        $response = $this->postJson('/api/public/orders', $this->payload([[
            'product_id' => $product->id,
            'name' => 'x', 'slug' => 'x', 'price' => 0, 'quantity' => 1,
        ]]));

        $response->assertCreated();
        $this->assertSame(400000.0, (float) $response->json('subtotal'));
    }

    public function test_addon_price_comes_from_catalogue_and_forged_addon_total_is_ignored(): void
    {
        $product = $this->product();
        $group = ProductAddonGroup::create(['name' => 'Trong kinh']);
        $option = ProductAddonOption::create(['group_id' => $group->id, 'name' => 'Chong anh sang xanh']);
        $product->addonGroups()->attach($group->id);
        ProductAddonPrice::create([
            'product_id' => $product->id,
            'option_id' => $option->id,
            'additional_price' => 150000,
            'is_available' => true,
        ]);

        $response = $this->postJson('/api/public/orders', $this->payload([[
            'product_id' => $product->id,
            'name' => 'x', 'slug' => 'x', 'price' => 1, 'quantity' => 1,
            'addon_total' => 0,
            'addons' => [['groupName' => 'Trong kinh', 'optionName' => 'Chong anh sang xanh', 'price' => 0]],
        ]]));

        $response->assertCreated();
        $this->assertSame(650000.0, (float) $response->json('subtotal'));
        $this->assertDatabaseHas('order_items', ['product_id' => $product->id, 'price' => 650000, 'addon_total' => 150000]);
    }

    public function test_unknown_or_unavailable_addon_is_rejected(): void
    {
        $product = $this->product();
        $group = ProductAddonGroup::create(['name' => 'Trong kinh']);
        $option = ProductAddonOption::create(['group_id' => $group->id, 'name' => 'Doi mau']);
        $product->addonGroups()->attach($group->id);
        ProductAddonPrice::create([
            'product_id' => $product->id,
            'option_id' => $option->id,
            'additional_price' => 100000,
            'is_available' => false,
        ]);

        $this->postJson('/api/public/orders', $this->payload([[
            'product_id' => $product->id, 'quantity' => 1,
            'addons' => [['groupName' => 'Trong kinh', 'optionName' => 'Doi mau']],
        ]]))->assertStatus(422);

        $this->postJson('/api/public/orders', $this->payload([[
            'product_id' => $product->id, 'quantity' => 1,
            'addons' => [['groupName' => 'Khong ton tai', 'optionName' => 'Doi mau']],
        ]]))->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_inactive_product_and_missing_product_id_are_rejected(): void
    {
        $inactive = $this->product(['is_active' => false]);

        $this->postJson('/api/public/orders', $this->payload([[
            'product_id' => $inactive->id, 'quantity' => 1,
        ]]))->assertStatus(422);

        $this->postJson('/api/public/orders', $this->payload([[
            'name' => 'Khong co id', 'slug' => 'x', 'price' => 1, 'quantity' => 1,
        ]]))->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_absurd_quantity_is_rejected(): void
    {
        $product = $this->product();

        $this->postJson('/api/public/orders', $this->payload([[
            'product_id' => $product->id, 'quantity' => 100000,
        ]]))->assertStatus(422);
    }
}
