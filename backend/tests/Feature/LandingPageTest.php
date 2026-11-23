<?php

namespace Tests\Feature;

use App\Models\LandingPage;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LandingPageTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'lp-admin-'.uniqid().'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }

    private function product(array $o = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Gong LP',
            'slug' => 'gong-lp-'.uniqid(),
            'price' => 500000,
            'gender' => ['unisex'],
            'is_active' => true,
        ], $o));
    }

    public function test_admin_endpoints_require_admin(): void
    {
        $this->getJson('/api/landing-pages')->assertUnauthorized();

        Sanctum::actingAs(User::create([
            'name' => 'Khach', 'email' => 'k'.uniqid().'@example.com', 'password' => 'password',
        ]));
        $this->getJson('/api/landing-pages')->assertForbidden();
        $this->postJson('/api/landing-pages', ['title' => 'X'])->assertForbidden();
    }

    public function test_admin_creates_page_with_ordered_products_and_slug(): void
    {
        Sanctum::actingAs($this->admin());
        $a = $this->product();
        $b = $this->product();

        $res = $this->postJson('/api/landing-pages', [
            'title' => 'Kính Mát Mùa Hè',
            'product_ids' => [$b->id, $a->id],
            'fb_pixel_id' => '1234567890',
        ])->assertCreated();

        $this->assertSame('kinh-mat-mua-he', $res->json('slug'));
        $this->assertSame([$b->id, $a->id], array_column($res->json('products'), 'id'));

        // Same title gets a unique slug instead of an error.
        $res2 = $this->postJson('/api/landing-pages', ['title' => 'Kính Mát Mùa Hè'])->assertCreated();
        $this->assertSame('kinh-mat-mua-he-2', $res2->json('slug'));
    }

    public function test_testimonials_keep_variant_and_images_and_cap_images(): void
    {
        Sanctum::actingAs($this->admin());

        $ok = $this->postJson('/api/landing-pages', [
            'title' => 'Reviews',
            'testimonials' => [[
                'name' => 'Khach A', 'text' => 'Dep', 'rating' => 5,
                'variant' => 'Gong TR1264', 'images' => ['/storage/a.jpg', '/storage/b.jpg'],
            ]],
        ])->assertCreated();
        $this->assertSame('Gong TR1264', $ok->json('testimonials.0.variant'));
        $this->assertCount(2, $ok->json('testimonials.0.images'));

        $this->postJson('/api/landing-pages', [
            'title' => 'Too many',
            'testimonials' => [[
                'name' => 'B', 'text' => 'x',
                'images' => ['1', '2', '3', '4', '5'],
            ]],
        ])->assertStatus(422)->assertJsonValidationErrors('testimonials.0.images');
    }

    public function test_pixel_ids_reject_script_injection(): void
    {
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/landing-pages', [
            'title' => 'Bad', 'fb_pixel_id' => '1");alert(1);//',
        ])->assertStatus(422)->assertJsonValidationErrors('fb_pixel_id');

        $this->postJson('/api/landing-pages', [
            'title' => 'Bad', 'google_ads_id' => 'AW-1"><script>',
        ])->assertStatus(422)->assertJsonValidationErrors('google_ads_id');
    }

    public function test_public_shows_only_active_pages_with_live_catalogue_prices(): void
    {
        $page = LandingPage::create(['title' => 'Hè', 'slug' => 'he', 'is_active' => true]);
        $live = $this->product(['price' => 500000, 'sale_price' => 400000]);
        $hidden = $this->product(['is_active' => false]);
        $page->products()->sync([$live->id => ['order' => 0], $hidden->id => ['order' => 1]]);

        $res = $this->getJson('/api/public/landing-pages/he')->assertOk();
        $this->assertSame([$live->id], array_column($res->json('products'), 'id'));
        $this->assertEquals(400000, $res->json('products.0.sale_price'));

        // Price change on the product shows up immediately: the page stores no prices.
        $live->update(['sale_price' => 350000]);
        $this->assertEquals(350000, $this->getJson('/api/public/landing-pages/he')->json('products.0.sale_price'));

        $page->update(['is_active' => false]);
        $this->getJson('/api/public/landing-pages/he')->assertNotFound();
    }

    public function test_order_records_landing_source_and_rejects_odd_source(): void
    {
        $p = $this->product();
        $payload = [
            'customer_name' => 'K', 'customer_phone' => '0900000000', 'address' => 'x',
            'payment_method' => 'cod',
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
        ];

        $this->postJson('/api/public/orders', $payload + ['source' => 'landing:he'])->assertCreated();
        $this->assertDatabaseHas('orders', ['source' => 'landing:he']);

        $this->postJson('/api/public/orders', $payload + ['source' => '<script>'])
            ->assertStatus(422)->assertJsonValidationErrors('source');
    }
}
