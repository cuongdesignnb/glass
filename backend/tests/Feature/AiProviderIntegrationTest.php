<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\SettingController;
use App\Models\Article;
use App\Models\Media;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AiProviderIntegrationTest extends TestCase
{
    private array $generatedFiles = [];

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->longText('value')->nullable();
            $table->string('group')->default('general');
            $table->timestamps();
        });

        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->string('slug')->nullable();
            $table->string('meta_keywords')->nullable();
            $table->boolean('is_published')->default(false);
            $table->unsignedBigInteger('article_category_id')->nullable();
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('slug')->nullable();
            $table->string('brand')->nullable();
            $table->string('meta_keywords')->nullable();
            $table->json('frame_styles')->nullable();
            $table->json('materials')->nullable();
            $table->json('gender')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('filename');
            $table->string('original_name');
            $table->string('path');
            $table->string('url');
            $table->string('mime_type');
            $table->integer('size');
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();
            $table->string('alt')->nullable();
            $table->text('caption')->nullable();
            $table->string('folder')->default('general');
            $table->timestamps();
        });

        config()->set('services.openai', [
            'api_key' => '',
            'base_url' => 'https://modelapi.vn/v1',
            'wire_api' => 'chat_completions',
            'model' => 'gpt-5.5',
            'reasoning_effort' => 'high',
            'max_tokens' => 4096,
            'image_api_key' => 'official-image-key',
            'image_base_url' => 'https://api.openai.com/v1',
            'image_model' => 'gpt-image-2',
            'image_quality' => 'medium',
        ]);

        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        foreach ($this->generatedFiles as $path) {
            if (is_file($path)) {
                unlink($path);
            }
        }

        parent::tearDown();
    }

    public function test_only_api_key_is_required_for_default_chat_completions_request(): void
    {
        Setting::setValue('openai_api_key', 'test-provider-key', 'api');

        Http::fake([
            'https://modelapi.vn/v1/chat/completions' => Http::response([
                'choices' => [[
                    'message' => [
                        'role' => 'assistant',
                        'content' => '<h2>Noi dung thu nghiem</h2><p>Thanh cong.</p>',
                    ],
                ]],
                'usage' => ['prompt_tokens' => 100, 'completion_tokens' => 40],
            ]),
        ]);

        $response = (new AiController)->generateContent(Request::create('/ai/content', 'POST', [
            'topic' => 'Kinh mat mua he',
            'length' => 'short',
        ]));

        $payload = $response->getData(true);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertStringContainsString('Noi dung thu nghiem', $payload['content']);

        Http::assertSent(function (HttpRequest $request) {
            return $request->url() === 'https://modelapi.vn/v1/chat/completions'
                && $request->hasHeader('Authorization', 'Bearer test-provider-key')
                && $request['model'] === 'gpt-5.5'
                && $request['max_tokens'] === 4096
                && $request['messages'][0]['role'] === 'system'
                && $request['messages'][1]['role'] === 'user'
                && !isset($request['reasoning'], $request['store'], $request['instructions']);
        });
    }

    public function test_database_settings_override_environment_configuration_and_full_article_is_parsed(): void
    {
        config()->set('services.openai', [
            'api_key' => 'env-key',
            'base_url' => 'https://env-provider.example/v1',
            'wire_api' => 'chat_completions',
            'model' => 'env-model',
            'reasoning_effort' => 'medium',
            'max_tokens' => 2048,
            'image_model' => 'env-image-model',
            'image_quality' => 'low',
        ]);

        foreach ([
            'openai_api_key' => 'database-key',
            'openai_base_url' => 'https://database-provider.example/v1/',
            'openai_wire_api' => 'responses',
            'openai_model' => 'database-model',
            'openai_reasoning_effort' => 'high',
            'openai_max_tokens' => '8192',
        ] as $key => $value) {
            Setting::setValue($key, $value, 'api');
        }

        $article = [
            'title' => 'Tieu de tu AI',
            'excerpt' => 'Tom tat',
            'content' => '<h2>Noi dung</h2><p>Chi tiet.</p>',
            'meta_title' => 'Meta title',
            'meta_desc' => 'Meta description',
            'meta_keywords' => 'kinh mat',
            'tags' => ['kinh-mat'],
        ];

        Http::fake([
            'https://database-provider.example/v1/responses' => Http::response([
                'status' => 'completed',
                'output_text' => json_encode($article, JSON_UNESCAPED_UNICODE),
                'usage' => ['input_tokens' => 50, 'output_tokens' => 25],
            ]),
        ]);

        $response = (new AiController)->generateContent(Request::create('/ai/content', 'POST', [
            'topic' => 'Bai viet day du',
            'full_article' => true,
            'keywords' => null,
            'tone' => null,
            'length' => null,
        ]));

        $payload = $response->getData(true);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['full_article']);
        $this->assertSame('Tieu de tu AI', $payload['title']);
        $this->assertSame(['kinh-mat'], $payload['tags']);

        Http::assertSent(function (HttpRequest $request) {
            return $request->url() === 'https://database-provider.example/v1/responses'
                && $request->hasHeader('Authorization', 'Bearer database-key')
                && $request['model'] === 'database-model'
                && $request['reasoning']['effort'] === 'high'
                && $request['max_output_tokens'] === 8192
                && $request['text']['format']['type'] === 'json_object';
        });
    }

    public function test_chat_completions_shaped_gateway_response_is_supported(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');
        Setting::setValue('openai_wire_api', 'responses', 'api');

        Http::fake([
            'https://modelapi.vn/v1/responses' => Http::response([
                'choices' => [[
                    'message' => [
                        'role' => 'assistant',
                        'content' => '<h2>Gateway compatible</h2><p>Noi dung.</p>',
                    ],
                ]],
                'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 20],
            ]),
        ]);

        $response = (new AiController)->generateContent(Request::create('/ai/content', 'POST', [
            'topic' => 'Gateway response',
        ]));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertStringContainsString('Gateway compatible', $response->getData(true)['content']);
    }

    public function test_internal_anchor_text_is_bound_to_its_related_target_url(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');

        Article::create([
            'title' => 'Cách chọn gọng kính cho mặt tròn',
            'slug' => 'cach-chon-gong-kinh-mat-tron',
            'meta_keywords' => 'gọng kính mặt tròn, phong cách oval',
            'is_published' => true,
        ]);
        Article::create([
            'title' => 'Cách vệ sinh kính áp tròng',
            'slug' => 'cach-ve-sinh-kinh-ap-trong',
            'meta_keywords' => 'vệ sinh kính áp tròng, dung dịch ngâm kính',
            'is_published' => true,
        ]);

        $article = [
            'title' => 'Gọng kính phù hợp khuôn mặt tròn',
            'excerpt' => 'Tóm tắt',
            'content' => '<p>Hãy tham khảo <a href="/bai-viet/cach-chon-gong-kinh-mat-tron">chăm sóc kính áp tròng</a> trước khi chọn.</p>'
                . '<p><a href="/bai-viet/duong-dan-khong-duoc-phep">anchor không có trong danh sách</a></p>',
            'meta_title' => 'Meta title',
            'meta_desc' => 'Meta description',
            'meta_keywords' => 'gọng kính mặt tròn',
            'tags' => ['gọng kính'],
        ];

        Http::fake([
            'https://modelapi.vn/v1/chat/completions' => Http::response([
                'choices' => [[
                    'message' => [
                        'role' => 'assistant',
                        'content' => json_encode($article, JSON_UNESCAPED_UNICODE),
                    ],
                ]],
            ]),
        ]);

        $response = (new AiController)->generateContent(Request::create('/ai/content', 'POST', [
            'topic' => 'Gọng kính phù hợp khuôn mặt tròn',
            'keywords' => 'gọng kính mặt tròn',
            'length' => 'medium',
            'full_article' => true,
        ]));

        $payload = $response->getData(true);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertStringContainsString(
            '<a href="/bai-viet/cach-chon-gong-kinh-mat-tron">gọng kính mặt tròn</a>',
            $payload['content']
        );
        $this->assertStringNotContainsString('>chăm sóc kính áp tròng</a>', $payload['content']);
        $this->assertStringNotContainsString('href="/bai-viet/duong-dan-khong-duoc-phep"', $payload['content']);
        $this->assertStringContainsString('anchor không có trong danh sách', $payload['content']);

        Http::assertSent(function (HttpRequest $request) {
            $systemPrompt = (string) ($request['messages'][0]['content'] ?? '');

            return str_contains($systemPrompt, 'cach-chon-gong-kinh-mat-tron')
                && str_contains($systemPrompt, 'gọng kính mặt tròn')
                && !str_contains($systemPrompt, 'cach-ve-sinh-kinh-ap-trong');
        });
    }

    public function test_product_rewrite_prompt_preserves_context_and_excludes_self_from_internal_links(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');

        $currentProduct = Product::create([
            'name' => 'Gong kinh Titan MS005',
            'slug' => 'gong-kinh-titan-ms005',
            'meta_keywords' => 'gong kinh titan MS005',
            'is_active' => true,
        ]);
        Product::create([
            'name' => 'Kinh Titan dang vuong',
            'slug' => 'kinh-titan-dang-vuong',
            'meta_keywords' => 'kinh titan dang vuong',
            'brand' => 'MITOO',
            'is_active' => true,
        ]);

        Http::fake([
            'https://modelapi.vn/v1/chat/completions' => Http::response([
                'choices' => [[
                    'message' => [
                        'role' => 'assistant',
                        'content' => '<h2>Gong kinh Titan MS005</h2><p>Noi dung da duoc cai thien.</p>',
                    ],
                ]],
            ]),
        ]);

        $response = (new AiController)->generateContent(Request::create('/ai/content', 'POST', [
            'topic' => 'Gong kinh Titan MS005',
            'type' => 'product_description',
            'keywords' => 'gong kinh titan, gong kinh MS005',
            'length' => 'short',
            'product_id' => $currentProduct->id,
            'existing_content' => '<p>Noi dung cu cua san pham.</p>',
        ]));

        $payload = $response->getData(true);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertStringContainsString('<h2>Gong kinh Titan MS005</h2>', $payload['content']);

        Http::assertSent(function (HttpRequest $request) use ($currentProduct) {
            $systemPrompt = (string) ($request['messages'][0]['content'] ?? '');

            return str_contains($systemPrompt, 'CHE DO VIET LAI NOI DUNG HIEN CO')
                && str_contains($systemPrompt, 'Noi dung cu cua san pham')
                && str_contains($systemPrompt, '/san-pham/kinh-titan-dang-vuong')
                && !str_contains($systemPrompt, '/san-pham/'.$currentProduct->slug);
        });
    }

    public function test_product_image_mode_returns_alt_caption_and_inline_image_markup(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');
        $product = Product::create([
            'name' => 'Gong kinh Titan MS005',
            'slug' => 'gong-kinh-titan-ms005',
            'is_active' => true,
        ]);
        $png = $this->tinyPng();

        Http::fake(function (HttpRequest $request) use ($png) {
            if ($request->url() === 'https://modelapi.vn/v1/chat/completions') {
                return Http::response([
                    'choices' => [[
                        'message' => [
                            'role' => 'assistant',
                            'content' => '<h2>Phom kinh vuong</h2><p>Mo ta san pham.</p>',
                        ],
                    ]],
                ]);
            }

            if ($request->url() === 'https://api.openai.com/v1/images/generations') {
                return Http::response(['data' => [['b64_json' => base64_encode($png)]]]);
            }

            return Http::response([], 404);
        });

        $response = (new AiController)->generateContentWithImages(Request::create('/ai/content-with-images', 'POST', [
            'topic' => $product->name,
            'type' => 'product_description',
            'product_id' => $product->id,
            'image_count' => 1,
            'length' => 'short',
        ]));

        $payload = $response->getData(true);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(1, count($payload['images']));
        $this->assertStringContainsString('alt="Phom kinh vuong"', $payload['content']);
        $this->assertStringContainsString('<figcaption', $payload['content']);
        $this->assertStringContainsString('>Phom kinh vuong</figcaption>', $payload['content']);
        $this->assertNotEmpty($payload['thumbnail']);
        $this->rememberGeneratedFile($payload['thumbnail']);
        $this->rememberGeneratedFile($payload['images'][0]['url']);
        $this->assertDatabaseHas('media', [
            'url' => $payload['images'][0]['url'],
            'alt' => 'Phom kinh vuong',
            'caption' => 'Phom kinh vuong',
        ]);
    }

    public function test_category_description_mode_returns_semantic_seo_content(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');

        Http::fake([
            'https://modelapi.vn/v1/chat/completions' => Http::response([
                'choices' => [[
                    'message' => [
                        'role' => 'assistant',
                        'content' => json_encode([
                            'content' => '<h2>Kinh can</h2><p>Mo ta danh muc toi uu cho nguoi dung.</p><ul><li>De chon san pham</li></ul>',
                            'meta_title' => 'Kinh can dep, chuan SEO | MITOO',
                            'meta_desc' => 'Kham pha danh muc kinh can MITOO voi nhieu lua chon phong cach, de deo va phu hop nhu cau hang ngay.',
                        ]),
                    ],
                ]],
            ]),
        ]);

        $response = (new AiController)->generateContent(Request::create('/ai/content', 'POST', [
            'topic' => 'Kinh can',
            'type' => 'category_description',
            'keywords' => 'kinh can, danh muc kinh mat',
            'length' => 'short',
        ]));

        $payload = $response->getData(true);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertStringContainsString('<h2>Kinh can</h2>', $payload['content']);
        $this->assertStringContainsString('<ul><li>', $payload['content']);
        $this->assertSame('Kinh can dep, chuan SEO | MITOO', $payload['meta_title']);
        $this->assertLessThanOrEqual(60, mb_strlen($payload['meta_title']));
        $this->assertLessThanOrEqual(160, mb_strlen($payload['meta_desc']));

        Http::assertSent(function (HttpRequest $request) {
            $systemPrompt = (string) ($request['messages'][0]['content'] ?? '');

            return str_contains($systemPrompt, 'danh muc san pham kinh mat')
                && str_contains($systemPrompt, 'HTML semantic')
                && str_contains($systemPrompt, 'khong dung <h1>')
                && str_contains($systemPrompt, 'meta_title')
                && str_contains($systemPrompt, 'meta_desc');
        });
    }

    public function test_provider_gateway_error_remains_json_and_exposes_original_status(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');

        Http::fake([
            'https://modelapi.vn/v1/chat/completions' => Http::response([
                'error' => ['message' => 'Model is not available'],
            ], 502),
        ]);

        $response = (new AiController)->generateContent(Request::create('/ai/content', 'POST', [
            'topic' => 'Provider error',
        ]));

        $payload = $response->getData(true);
        $this->assertSame(424, $response->getStatusCode());
        $this->assertSame(502, $payload['provider_status']);
        $this->assertSame('Model is not available', $payload['message']);
    }

    public function test_invalid_base_url_is_rejected_before_an_http_request(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');
        Setting::setValue('openai_base_url', 'http://localhost:9000/v1', 'api');

        $response = (new AiController)->generateContent(Request::create('/ai/content', 'POST', [
            'topic' => 'Invalid provider',
        ]));

        $this->assertSame(422, $response->getStatusCode());
        $this->assertStringContainsString('HTTPS', $response->getData(true)['error']);
        Http::assertNothingSent();
    }

    public function test_image_requests_use_separate_official_openai_configuration_and_failures_remain_warnings(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');

        Http::fake(function (HttpRequest $request) {
            if ($request->url() === 'https://modelapi.vn/v1/chat/completions') {
                return Http::response([
                    'status' => 'completed',
                    'output_text' => '<h2>Gong kinh</h2><p>Noi dung bai viet.</p>',
                    'usage' => ['input_tokens' => 20, 'output_tokens' => 10],
                ]);
            }

            if ($request->url() === 'https://api.openai.com/v1/images/generations') {
                return Http::response(['error' => ['message' => 'Image model unavailable']], 503);
            }

            return Http::response([], 404);
        });

        $response = (new AiController)->generateContentWithImages(Request::create('/ai/content-with-images', 'POST', [
            'topic' => 'Kinh mat co anh',
            'image_count' => 1,
            'keywords' => null,
            'tone' => null,
            'length' => null,
            'category_id' => null,
        ]));

        $payload = $response->getData(true);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertStringContainsString('Gong kinh', $payload['content']);
        $this->assertNotEmpty($payload['warnings']);
        $this->assertNull($payload['thumbnail']);

        Http::assertSent(function (HttpRequest $request) {
            return $request->url() === 'https://api.openai.com/v1/images/generations'
                && $request->hasHeader('Authorization', 'Bearer official-image-key')
                && $request['model'] === 'gpt-image-2';
        });
        Http::assertNotSent(function (HttpRequest $request) {
            return str_contains($request->url(), 'modelapi.vn/v1/images/generations')
                || ($request->hasHeader('Authorization', 'Bearer test-key')
                    && str_contains($request->url(), '/images/generations'));
        });
    }

    public function test_missing_official_image_key_skips_images_but_keeps_generated_article(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');
        config()->set('services.openai.image_api_key', '');

        Http::fake([
            'https://modelapi.vn/v1/chat/completions' => Http::response([
                'choices' => [[
                    'message' => [
                        'role' => 'assistant',
                        'content' => '<h2>Noi dung khong anh</h2><p>Thanh cong.</p>',
                    ],
                ]],
            ]),
        ]);

        $response = (new AiController)->generateContentWithImages(Request::create('/ai/content-with-images', 'POST', [
            'topic' => 'Khong co image key',
            'image_count' => 1,
        ]));

        $payload = $response->getData(true);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertNull($payload['thumbnail']);
        $this->assertNotEmpty($payload['warnings']);
        $this->assertStringContainsString('API key', $payload['warnings'][0]);
        Http::assertNotSent(fn (HttpRequest $request) => str_contains($request->url(), '/images/generations'));
    }

    public function test_image_generation_accepts_base64_results(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');
        $png = $this->tinyPng();

        Http::fake(function (HttpRequest $request) use ($png) {
            if ($request->url() === 'https://modelapi.vn/v1/chat/completions') {
                return Http::response(['status' => 'completed', 'output_text' => '<h2>Base64</h2><p>Test.</p>']);
            }

            if ($request->url() === 'https://api.openai.com/v1/images/generations') {
                return Http::response(['data' => [['b64_json' => base64_encode($png)]]]);
            }

            return Http::response([], 404);
        });

        $response = (new AiController)->generateContentWithImages(Request::create('/ai/content-with-images', 'POST', [
            'topic' => 'Base64 image',
            'image_count' => 0,
        ]));

        $payload = $response->getData(true);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertNotEmpty($payload['thumbnail']);
        $this->assertSame('Base64 image', $payload['thumbnail_alt']);
        $this->assertSame('Ảnh minh họa: Base64 image', $payload['thumbnail_caption']);
        $this->rememberGeneratedFile($payload['thumbnail']);
        $this->assertDatabaseHas('media', [
            'url' => $payload['thumbnail'],
            'folder' => 'ai-generated',
            'alt' => 'Base64 image',
            'caption' => 'Ảnh minh họa: Base64 image',
        ]);
    }

    public function test_image_generation_accepts_remote_url_results(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');
        $png = $this->tinyPng();

        Http::fake(function (HttpRequest $request) use ($png) {
            if ($request->url() === 'https://modelapi.vn/v1/chat/completions') {
                return Http::response(['status' => 'completed', 'output_text' => '<h2>URL</h2><p>Test.</p>']);
            }

            if ($request->url() === 'https://api.openai.com/v1/images/generations') {
                return Http::response(['data' => [['url' => 'https://cdn.example/generated.png']]]);
            }

            if ($request->url() === 'https://cdn.example/generated.png') {
                return Http::response($png, 200, ['Content-Type' => 'image/png']);
            }

            return Http::response([], 404);
        });

        $response = (new AiController)->generateContentWithImages(Request::create('/ai/content-with-images', 'POST', [
            'topic' => 'URL image',
            'image_count' => 0,
        ]));

        $payload = $response->getData(true);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertNotEmpty($payload['thumbnail']);
        $this->rememberGeneratedFile($payload['thumbnail']);
        $this->assertSame(1, Media::query()->count());
        Http::assertSent(fn (HttpRequest $request) => $request->url() === 'https://cdn.example/generated.png');
    }

    public function test_admin_rejects_invalid_provider_settings(): void
    {
        $this->expectException(ValidationException::class);

        (new SettingController)->update(Request::create('/settings', 'PUT', [
            'settings' => [[
                'key' => 'openai_reasoning_effort',
                'value' => 'extreme',
                'group' => 'api',
            ]],
        ]));
    }

    private function rememberGeneratedFile(string $url): void
    {
        $this->generatedFiles[] = storage_path('app/public/'.ltrim(str_replace('/storage/', '', $url), '/'));
    }

    private function tinyPng(): string
    {
        $image = imagecreatetruecolor(2, 2);
        imagefill($image, 0, 0, imagecolorallocate($image, 240, 240, 240));

        ob_start();
        imagepng($image);
        $png = (string) ob_get_clean();
        imagedestroy($image);

        return $png;
    }
}
