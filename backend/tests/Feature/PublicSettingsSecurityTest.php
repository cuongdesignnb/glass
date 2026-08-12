<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicSettingsSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_settings_use_an_allowlist_and_strip_credential_markers(): void
    {
        Setting::setValue('site_name', 'MITOO', 'general');
        Setting::setValue('site_logo', '/storage/logo.webp', 'general');
        Setting::setValue('site_favicon', '/storage/favicon.ico', 'general');
        Setting::setValue('contact_phone', '0900000000', 'contact');
        Setting::setValue('footer_show_business_registration', '1', 'footer');
        Setting::setValue('footer_business_registration_html', '<a href="https://online.gov.vn"><img alt="Đã xác nhận"></a>', 'footer');
        Setting::setValue('merchant_service_account_json', '{"type":"service_account","private_key":"-----BEGIN PRIVATE KEY----- fake"}', 'merchant');
        Setting::setValue('openai_api_key', 'fake-openai-key', 'api');
        Setting::setValue('public_site_description', 'not allowlisted', 'general');
        Setting::setValue('site_description', 'MITOO eyewear', 'general');

        $response = $this->getJson('/api/public/settings')->assertOk();
        $payload = $response->json();
        $serialized = json_encode($payload, JSON_THROW_ON_ERROR);

        $this->assertSame('MITOO', $payload['general']['site_name']);
        $this->assertSame('/storage/logo.webp', $payload['general']['site_logo']);
        $this->assertSame('/storage/favicon.ico', $payload['general']['site_favicon']);
        $this->assertSame('0900000000', $payload['contact']['contact_phone']);
        $this->assertSame('1', $payload['footer']['footer_show_business_registration']);
        $this->assertStringContainsString('online.gov.vn', $payload['footer']['footer_business_registration_html']);
        $this->assertStringNotContainsString('merchant_service_account_json', $serialized);
        $this->assertStringNotContainsString('openai_api_key', $serialized);
        $this->assertStringNotContainsString('private_key', $serialized);
        $this->assertStringNotContainsString('BEGIN PRIVATE KEY', $serialized);
        $this->assertStringNotContainsString('service_account', $serialized);
        $this->assertArrayNotHasKey('public_site_description', $payload['general']);
    }

    public function test_admin_settings_still_return_stored_credentials(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin-'.str()->random(8).'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
        Setting::setValue('merchant_service_account_json', '{"type":"service_account","private_key":"fake"}', 'merchant');

        Sanctum::actingAs($admin);
        $response = $this->getJson('/api/settings')->assertOk();

        $this->assertSame(
            '{"type":"service_account","private_key":"fake"}',
            $response->json('merchant.merchant_service_account_json')
        );
    }
}
