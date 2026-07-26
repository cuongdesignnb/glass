<?php

namespace App\Providers;

use App\Contracts\AiArticleGenerator;
use App\Services\OpenAiArticleGenerator;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AiArticleGenerator::class, OpenAiArticleGenerator::class);
    }

    public function boot(): void
    {
        //
    }
}
