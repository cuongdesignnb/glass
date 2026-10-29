<?php

namespace App\Console\Commands;

use App\Models\Article;
use App\Services\SlugHistory;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

class ConsolidateArticle extends Command
{
    protected $signature = 'articles:consolidate
        {source : ID of the secondary article that will redirect}
        {target : ID of the published primary article that receives the redirect}
        {--unpublish : Also unpublish the source so the redirect becomes active}';

    protected $description = 'Redirect a secondary article to a primary article (308) once the source is unpublished';

    public function handle(): int
    {
        $source = Article::query()->find((int) $this->argument('source'));
        $target = Article::query()->find((int) $this->argument('target'));

        if ($source === null || $target === null) {
            $this->error('Source or target article not found.');

            return self::FAILURE;
        }

        try {
            SlugHistory::recordArticleConsolidationRedirect($source, $target);
        } catch (ValidationException $exception) {
            $this->error(collect($exception->errors())->flatten()->implode(' '));

            return self::FAILURE;
        }

        $this->line("REDIRECT_RECORDED /bai-viet/{$source->slug} -> /bai-viet/{$target->slug}");

        if ($this->option('unpublish')) {
            $source->update(['is_published' => false]);
            $this->line('SOURCE_UNPUBLISHED');
        } else {
            $this->line('Redirect becomes active after the source article is unpublished.');
        }

        return self::SUCCESS;
    }
}
