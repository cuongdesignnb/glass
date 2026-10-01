<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChatWidgetSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_save_and_publicly_read_all_chat_widget_settings_and_unrelated_settings(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $settings = [
            ['key' => 'chat_zalo_enabled', 'value' => '1', 'group' => 'social'],
            ['key' => 'chat_zalo_url', 'value' => 'https://zalo.me/mitoo-oa?ref=website', 'group' => 'social'],
            ['key' => 'chat_zalo_icon', 'value' => '/storage/uploads/chat-icons/zalo.webp', 'group' => 'social'],
            ['key' => 'chat_messenger_enabled', 'value' => '0', 'group' => 'social'],
            ['key' => 'chat_messenger_url', 'value' => 'https://m.me/mitoo?ref=website', 'group' => 'social'],
            ['key' => 'chat_messenger_icon', 'value' => '/storage/uploads/chat-icons/messenger.svg', 'group' => 'social'],
            ['key' => 'seo_title', 'value' => 'MITOO SEO regression', 'group' => 'seo'],
            ['key' => 'payment_shipping_fee', 'value' => '30000', 'group' => 'payment'],
        ];

        $this->putJson('/api/settings', ['settings' => $settings])->assertOk();

        $admin = $this->getJson('/api/settings')->assertOk();
        $public = $this->getJson('/api/public/settings')->assertOk();
        foreach (array_slice($settings, 0, 6) as $setting) {
            $this->assertSame($setting['value'], $admin->json('social.'.$setting['key']));
            $this->assertSame($setting['value'], $public->json('social.'.$setting['key']));
        }
        $this->assertSame('MITOO SEO regression', $admin->json('seo.seo_title'));
        $this->assertSame('30000', $admin->json('payment.payment_shipping_fee'));
    }

    public function test_chat_url_and_enable_fields_reject_unsafe_values_but_allow_http_and_https(): void
    {
        Sanctum::actingAs($this->createAdmin());

        foreach (['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', '//evil.example/path'] as $value) {
            $this->putJson('/api/settings', [
                'settings' => [[
                    'key' => 'chat_zalo_url',
                    'value' => $value,
                    'group' => 'social',
                ]],
            ])->assertUnprocessable();
        }

        $this->putJson('/api/settings', [
            'settings' => [
                ['key' => 'chat_zalo_url', 'value' => 'https://zalo.me/mitoo', 'group' => 'social'],
                ['key' => 'chat_messenger_url', 'value' => 'http://example.com/contact', 'group' => 'social'],
                ['key' => 'chat_zalo_enabled', 'value' => '0', 'group' => 'social'],
            ],
        ])->assertOk();

        $this->getJson('/api/public/settings')
            ->assertOk()
            ->assertJsonPath('social.chat_zalo_url', 'https://zalo.me/mitoo')
            ->assertJsonPath('social.chat_messenger_url', 'http://example.com/contact')
            ->assertJsonPath('social.chat_zalo_enabled', '0');

        $this->putJson('/api/settings', [
            'settings' => [[
                'key' => 'chat_messenger_enabled',
                'value' => 'yes',
                'group' => 'social',
            ]],
        ])->assertUnprocessable();
    }

    public function test_media_upload_supports_chat_icons_folder_and_alt_metadata(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->createAdmin());

        $upload = $this->post('/api/media/upload', [
            'file' => UploadedFile::fake()->createWithContent('chat-zalo.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'),
            'folder' => 'chat-icons',
            'alt' => 'Biểu tượng Zalo hỗ trợ khách hàng MITOO',
            'caption' => 'Biểu tượng liên hệ Zalo',
        ])->assertCreated();

        $this->assertSame('chat-icons', $upload->json('folder'));
        $this->assertSame('Biểu tượng Zalo hỗ trợ khách hàng MITOO', $upload->json('alt'));
        $this->assertSame('Biểu tượng liên hệ Zalo', $upload->json('caption'));

        $media = Media::query()->findOrFail($upload->json('id'));
        Setting::setValue('chat_zalo_icon', $media->url, 'social');
        Sanctum::actingAs($this->createAdmin());
        $this->getJson('/api/public/settings')
            ->assertOk()
            ->assertJsonPath('social.chat_zalo_icon', $media->url);
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Chat Settings Admin',
            'email' => 'chat-settings-'.Str::random(8).'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }
}
