<?php

namespace Tests\Feature;

use App\Models\Menu;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MenuPersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_updated_header_menu_is_returned_by_admin_and_public_endpoints(): void
    {
        Sanctum::actingAs($this->createAdmin());
        $menu = Menu::create([
            'name' => 'Sản phẩm cũ',
            'url' => '/san-pham',
            'position' => 'header',
            'order' => 1,
            'depth' => 0,
            'is_active' => true,
        ]);

        $this->putJson("/api/menus/{$menu->id}", [
            'name' => 'Sản phẩm mới',
            'url' => '/san-pham-moi',
        ])->assertOk();

        $adminResponse = $this->getJson('/api/menus/all?fresh=1')->assertOk();
        $this->assertSame('Sản phẩm mới', $adminResponse->json("0.name"));
        $this->assertStringContainsString('no-store', $adminResponse->headers->get('Cache-Control'));

        $publicResponse = $this->getJson('/api/public/menus?position=header&fresh=1')->assertOk();
        $this->assertSame('Sản phẩm mới', $publicResponse->json("0.name"));
        $this->assertSame('/san-pham-moi', $publicResponse->json("0.url"));
        $this->assertStringContainsString('no-store', $publicResponse->headers->get('Cache-Control'));
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'menu-admin-'.str()->random(8).'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }
}
