<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ImageSeoMetadataTest extends TestCase
{
    use RefreshDatabase;

    public function test_article_thumbnail_alt_defaults_to_title_and_caption_is_editable(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $article = $this->postJson('/api/articles', [
            'title' => 'Kính mắt phù hợp khuôn mặt tròn',
            'thumbnail' => '/storage/articles/round-face.webp',
            'thumbnail_alt' => '',
            'thumbnail_caption' => 'Gọng kính cân đối cho khuôn mặt tròn.',
        ])->assertCreated()
            ->assertJsonPath('thumbnail_alt', 'Kính mắt phù hợp khuôn mặt tròn')
            ->assertJsonPath('thumbnail_caption', 'Gọng kính cân đối cho khuôn mặt tròn.')
            ->json();

        $this->putJson('/api/articles/'.$article['id'], [
            'thumbnail_alt' => 'Người mẫu đeo kính cho khuôn mặt tròn',
        ])->assertOk()
            ->assertJsonPath('thumbnail_alt', 'Người mẫu đeo kính cho khuôn mặt tròn');
    }

    public function test_product_supports_thumbnail_and_per_image_seo_metadata(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $galleryUrl = '/storage/products/frame-side.webp';

        $response = $this->postJson('/api/products', [
            'name' => 'Gọng kính MITOO Titan',
            'price' => 1200000,
            'thumbnail' => '/storage/products/frame-main.webp',
            'thumbnail_alt' => '',
            'thumbnail_caption' => 'Gọng kính MITOO Titan nhìn từ phía trước.',
            'images' => [$galleryUrl],
            'image_alts' => [$galleryUrl => 'Gọng kính MITOO Titan nhìn nghiêng'],
            'image_captions' => [$galleryUrl => 'Chi tiết càng kính titan mảnh nhẹ.'],
        ])->assertCreated()
            ->assertJsonPath('thumbnail_alt', 'Gọng kính MITOO Titan')
            ->assertJsonPath('thumbnail_caption', 'Gọng kính MITOO Titan nhìn từ phía trước.');

        $payload = $response->json();
        $this->assertSame('Gọng kính MITOO Titan nhìn nghiêng', $payload['image_alts'][$galleryUrl]);
        $this->assertSame('Chi tiết càng kính titan mảnh nhẹ.', $payload['image_captions'][$galleryUrl]);
    }

    public function test_media_caption_can_be_saved_with_alt_text(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $media = Media::create([
            'filename' => 'frame.webp',
            'original_name' => 'frame.webp',
            'path' => 'uploads/frame.webp',
            'url' => '/storage/uploads/frame.webp',
            'mime_type' => 'image/webp',
            'size' => 100,
            'folder' => 'general',
        ]);

        $this->putJson('/api/media/'.$media->id, [
            'alt' => 'Gọng kính MITOO màu vàng',
            'caption' => 'Thiết kế kim loại thanh mảnh.',
        ])->assertOk()
            ->assertJsonPath('alt', 'Gọng kính MITOO màu vàng')
            ->assertJsonPath('caption', 'Thiết kế kim loại thanh mảnh.');
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin-'.str()->random(8).'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }
}
