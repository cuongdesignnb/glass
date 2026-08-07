<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FaviconPersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_favicon_setting_survives_admin_read_back_and_public_read_back(): void
    {
        Sanctum::actingAs($this->createAdmin());
        $expected = '/storage/uploads/test/favicon.ico';

        $this->putJson('/api/settings', [
            'settings' => [[
                'key' => 'site_favicon',
                'value' => $expected,
                'group' => 'general',
            ]],
        ])->assertOk();

        $this->getJson('/api/settings')
            ->assertOk()
            ->assertJsonPath('general.site_favicon', $expected);

        $this->getJson('/api/public/settings')
            ->assertOk()
            ->assertJsonPath('general.site_favicon', $expected);
    }

    public function test_uploaded_ico_can_be_persisted_and_read_back_as_favicon(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->createAdmin());

        $validIco = "\x00\x00\x01\x00\x01\x00"
            . pack('C4vvVV', 1, 1, 0, 0, 1, 32, 4, 22)
            . "\x00\x00\x00\x00";

        $upload = $this->post('/api/media/upload', [
            'file' => UploadedFile::fake()->createWithContent('mitoo.ico', $validIco),
            'folder' => 'favicon',
            'alt' => 'MITOO favicon',
        ])->assertCreated();

        $url = $upload->json('url');
        $this->assertIsString($url);
        $this->assertStringStartsWith('/storage/', $url);

        $this->putJson('/api/settings', [
            'settings' => [[
                'key' => 'site_favicon',
                'value' => $url,
                'group' => 'general',
            ]],
        ])->assertOk();

        $this->getJson('/api/settings')
            ->assertOk()
            ->assertJsonPath('general.site_favicon', $url);
        $this->getJson('/api/public/settings')
            ->assertOk()
            ->assertJsonPath('general.site_favicon', $url);

        $this->assertTrue(Storage::disk('public')->exists(str_replace('/storage/', '', $url)));
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'favicon-admin-'.str()->random(8).'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }
}
