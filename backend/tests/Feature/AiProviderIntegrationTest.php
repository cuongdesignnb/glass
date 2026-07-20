<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\SettingController;
use App\Models\Media;
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
            $table->string('folder')->default('general');
            $table->timestamps();
        });

        config()->set('services.openai', [
            'api_key' => '',
            'base_url' => 'https://modelapi.vn/v1',
            'model' => 'gpt-5.6-sol',
            'reasoning_effort' => 'xhigh',
            'max_tokens' => 4096,
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

    public function test_only_api_key_is_required_for_default_responses_request(): void
    {
        Setting::setValue('openai_api_key', 'test-provider-key', 'api');

        Http::fake([
            'https://modelapi.vn/v1/responses' => Http::response([
                'status' => 'completed',
                'output' => [[
                    'type' => 'message',
                    'content' => [[
                        'type' => 'output_text',
                        'text' => '<h2>Noi dung thu nghiem</h2><p>Thanh cong.</p>',
                    ]],
                ]],
                'usage' => ['input_tokens' => 100, 'output_tokens' => 40],
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
            return $request->url() === 'https://modelapi.vn/v1/responses'
                && $request->hasHeader('Authorization', 'Bearer test-provider-key')
                && $request['model'] === 'gpt-5.6-sol'
                && $request['reasoning']['effort'] === 'xhigh'
                && $request['max_output_tokens'] === 4096
                && $request['store'] === false
                && isset($request['instructions'], $request['input']);
        });
    }

    public function test_database_settings_override_environment_configuration_and_full_article_is_parsed(): void
    {
        config()->set('services.openai', [
            'api_key' => 'env-key',
            'base_url' => 'https://env-provider.example/v1',
            'model' => 'env-model',
            'reasoning_effort' => 'medium',
            'max_tokens' => 2048,
            'image_model' => 'env-image-model',
            'image_quality' => 'low',
        ]);

        foreach ([
            'openai_api_key' => 'database-key',
            'openai_base_url' => 'https://database-provider.example/v1/',
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

    public function test_image_requests_use_the_custom_base_url_and_failures_remain_warnings(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');

        Http::fake(function (HttpRequest $request) {
            if ($request->url() === 'https://modelapi.vn/v1/responses') {
                return Http::response([
                    'status' => 'completed',
                    'output_text' => '<h2>Gong kinh</h2><p>Noi dung bai viet.</p>',
                    'usage' => ['input_tokens' => 20, 'output_tokens' => 10],
                ]);
            }

            if ($request->url() === 'https://modelapi.vn/v1/images/generations') {
                return Http::response(['error' => ['message' => 'Image model unavailable']], 503);
            }

            return Http::response([], 404);
        });

        $response = (new AiController)->generateContentWithImages(Request::create('/ai/content-with-images', 'POST', [
            'topic' => 'Kinh mat co anh',
            'image_count' => 1,
        ]));

        $payload = $response->getData(true);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertStringContainsString('Gong kinh', $payload['content']);
        $this->assertNotEmpty($payload['warnings']);
        $this->assertNull($payload['thumbnail']);

        Http::assertSent(fn (HttpRequest $request) => $request->url() === 'https://modelapi.vn/v1/images/generations');
        Http::assertNotSent(fn (HttpRequest $request) => str_contains($request->url(), 'api.openai.com'));
    }

    public function test_image_generation_accepts_base64_results(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');
        $png = $this->tinyPng();

        Http::fake(function (HttpRequest $request) use ($png) {
            if ($request->url() === 'https://modelapi.vn/v1/responses') {
                return Http::response(['status' => 'completed', 'output_text' => '<h2>Base64</h2><p>Test.</p>']);
            }

            if ($request->url() === 'https://modelapi.vn/v1/images/generations') {
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
        $this->rememberGeneratedFile($payload['thumbnail']);
        $this->assertDatabaseHas('media', ['url' => $payload['thumbnail'], 'folder' => 'ai-generated']);
    }

    public function test_image_generation_accepts_remote_url_results(): void
    {
        Setting::setValue('openai_api_key', 'test-key', 'api');
        $png = $this->tinyPng();

        Http::fake(function (HttpRequest $request) use ($png) {
            if ($request->url() === 'https://modelapi.vn/v1/responses') {
                return Http::response(['status' => 'completed', 'output_text' => '<h2>URL</h2><p>Test.</p>']);
            }

            if ($request->url() === 'https://modelapi.vn/v1/images/generations') {
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
