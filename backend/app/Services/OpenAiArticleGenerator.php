<?php

namespace App\Services;

use App\Contracts\AiArticleGenerator;
use App\Http\Controllers\Api\AiController;
use App\Models\AiContentQueue;
use Illuminate\Http\Request;
use RuntimeException;

class OpenAiArticleGenerator implements AiArticleGenerator
{
    public function __construct(private readonly AiController $controller) {}

    public function generate(AiContentQueue $item): array
    {
        $request = Request::create(
            $item->with_images ? '/ai/content-with-images' : '/ai/content',
            'POST',
            [
                'topic' => $item->topic,
                'type' => $item->type,
                'keywords' => $item->keywords,
                'tone' => $item->tone,
                'length' => $item->length,
                'full_article' => true,
                'image_count' => $item->image_count,
                'category_id' => $item->article_category_id,
            ]
        );

        $response = $item->with_images
            ? $this->controller->generateContentWithImages($request)
            : $this->controller->generateContent($request);

        $data = json_decode($response->getContent(), true);
        if (! is_array($data) || ! ($data['success'] ?? false)) {
            throw new RuntimeException((string) ($data['error'] ?? 'AI generation failed'));
        }

        if (! array_key_exists('content', $data)) {
            throw new RuntimeException('AI response did not contain article content.');
        }

        return $data;
    }
}
