<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicSettingsCacheConsistencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_settings_reflect_an_admin_update_without_cache_clear(): void
    {
        Setting::setValue('site_name', 'OLD', 'general');

        $this->getJson('/api/public/settings')
            ->assertOk()
            ->assertJsonPath('general.site_name', 'OLD');

        // A public read must not create the legacy shared cache entry.
        $this->assertFalse(Cache::has('glass_settings_all'));

        Sanctum::actingAs($this->createAdmin());
        $this->putJson('/api/settings', [
            'settings' => [[
                'key' => 'site_name',
                'value' => 'MITOO',
                'group' => 'general',
            ]],
        ])->assertOk();

        $this->getJson('/api/public/settings')
            ->assertOk()
            ->assertJsonPath('general.site_name', 'MITOO');

        $this->getJson('/api/settings')
            ->assertOk()
            ->assertJsonPath('general.site_name', 'MITOO');
    }

    public function test_public_settings_keep_sensitive_values_hidden_after_fresh_reads(): void
    {
        Setting::setValue('site_name', 'MITOO', 'general');
        Setting::setValue('openai_api_key', 'secret-key', 'openai');
        Setting::setValue('merchant_service_account_json', '{"type":"service_account"}', 'payment');

        $public = $this->getJson('/api/public/settings')
            ->assertOk()
            ->json();

        $this->assertSame('MITOO', $public['general']['site_name']);
        $this->assertArrayNotHasKey('openai_api_key', $public['openai'] ?? []);
        $this->assertArrayNotHasKey('merchant_service_account_json', $public['payment'] ?? []);
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Settings Admin',
            'email' => 'settings-admin-'.Str::random(8).'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }
}
