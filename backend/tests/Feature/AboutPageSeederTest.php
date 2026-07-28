<?php

namespace Tests\Feature;

use App\Models\Setting;
use Database\Seeders\AboutPageSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AboutPageSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_updates_the_existing_about_page_settings_idempotently(): void
    {
        $this->seed(AboutPageSeeder::class);
        $this->seed(AboutPageSeeder::class);

        $this->assertSame(
            'Giới thiệu Kính Mắt MITOO | Gọng kính và Tròng kính',
            Setting::getValue('about_seo_title')
        );
        $this->assertSame('Giới thiệu Kính Mắt MITOO', Setting::getValue('about_title'));
        $this->assertStringContainsString('Kính Mắt MITOO tại Yên Phong, Bắc Ninh', (string) Setting::getValue('about_seo_description'));
        $this->assertStringContainsString('<h2>Thử kính ảo bằng trí tuệ nhân tạo</h2>', (string) Setting::getValue('about_content'));
        $this->assertStringContainsString('Công ty TNHH MITOO Việt Nam', (string) Setting::getValue('about_content'));
        $this->assertStringNotContainsString('<h1>', (string) Setting::getValue('about_content'));

        $faqs = json_decode((string) Setting::getValue('about_faqs'), true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(7, $faqs);
        $this->assertSame('Kính Mắt MITOO là gì?', $faqs[0]['question']);

        foreach ([
            'about_seo_title',
            'about_seo_description',
            'about_seo_keywords',
            'about_title',
            'about_content',
            'about_faqs',
        ] as $key) {
            $this->assertSame(1, Setting::where('key', $key)->count());
            $this->assertSame('about', Setting::where('key', $key)->value('group'));
        }
    }

    public function test_seeded_content_is_clean_utf8_and_keeps_existing_banner(): void
    {
        Setting::setValue('about_banner', 'uploads/about/custom.webp', 'about');

        $this->seed(AboutPageSeeder::class);

        $combined = implode(' ', [
            Setting::getValue('about_seo_title'),
            Setting::getValue('about_seo_description'),
            Setting::getValue('about_seo_keywords'),
            Setting::getValue('about_title'),
            Setting::getValue('about_content'),
            Setting::getValue('about_faqs'),
        ]);

        foreach (['Ã', 'Â', 'Æ', 'áº', 'á»', '�'] as $marker) {
            $this->assertStringNotContainsString($marker, $combined);
        }
        $this->assertSame('uploads/about/custom.webp', Setting::getValue('about_banner'));
    }
}
