<?php

namespace Tests\Feature;

use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicCmsPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_page_listing_returns_published_pages_only_with_minimal_payload(): void
    {
        $published = Page::create([
            'title' => 'Chính sách vận chuyển',
            'slug' => 'chinh-sach-van-chuyen',
            'content' => '<p>Nội dung nội bộ</p>',
            'template' => 'policy',
            'is_published' => true,
            'meta_title' => 'Tiêu đề SEO',
            'meta_desc' => 'Mô tả SEO',
        ]);
        $draft = Page::create([
            'title' => 'Bản nháp nội bộ',
            'slug' => 'ban-nhap-noi-bo',
            'content' => 'Không được công khai',
            'is_published' => false,
        ]);

        $response = $this->getJson('/api/public/pages')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $published->id)
            ->assertJsonPath('0.title', $published->title)
            ->assertJsonPath('0.slug', $published->slug)
            ->assertJsonMissing(['id' => $draft->id])
            ->assertJsonMissingPath('0.content')
            ->assertJsonMissingPath('0.template')
            ->assertJsonMissingPath('0.meta_title')
            ->assertJsonMissingPath('0.meta_desc')
            ->assertJsonMissingPath('0.is_published');

        $payload = $response->json('0');
        $this->assertSame(['id', 'title', 'slug', 'updated_at'], array_keys($payload));
    }
}
