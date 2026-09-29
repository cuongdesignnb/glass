<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Services\SlugHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ArticleConsolidationRedirectTest extends TestCase
{
    use RefreshDatabase;

    private const PRIMARY_SLUG = 'mat-kinh-gong-bau-duc-oval-chon-chuan-gu-cho-moi-khuon-mat-196';

    private const SECONDARY_SLUG = 'gong-kinh-hinh-bau-duc-bi-quyet-chon-chuan-gu-197';

    public function test_published_secondary_remains_authoritative_until_unpublished_then_redirects_to_primary(): void
    {
        $primary = $this->createArticle(self::PRIMARY_SLUG, 'Bài chính', true);
        $secondary = $this->createArticle(self::SECONDARY_SLUG, 'Bài phụ', true);
        $originalPrimarySlug = $primary->slug;
        $originalSecondarySlug = $secondary->slug;

        $mapping = SlugHistory::recordArticleConsolidationRedirect($secondary, $primary);

        $this->assertSame($primary->id, (int) $mapping->entity_id);
        $this->assertSame(self::SECONDARY_SLUG, $mapping->old_slug);
        $this->assertSame($originalPrimarySlug, $primary->fresh()->slug);
        $this->assertSame($originalSecondarySlug, $secondary->fresh()->slug);
        $this->assertDatabaseHas('slug_redirects', [
            'entity_type' => SlugHistory::ARTICLE,
            'entity_id' => $primary->id,
            'old_slug' => self::SECONDARY_SLUG,
        ]);

        // A migration mapping must not steal the URL while the source is live.
        $this->getJson('/api/public/articles/'.self::SECONDARY_SLUG)
            ->assertOk()
            ->assertJsonPath('id', $secondary->id)
            ->assertJsonPath('slug', self::SECONDARY_SLUG);

        $secondary->update(['is_published' => false]);
        $query = 'utm_source=phase2a&tag=one&tag=two&empty=';
        $redirect = $this->get('/api/public/articles/'.self::SECONDARY_SLUG.'?'.$query)
            ->assertStatus(308);

        $location = (string) $redirect->headers->get('Location');
        $this->assertSame('/bai-viet/'.self::PRIMARY_SLUG, parse_url($location, PHP_URL_PATH));
        $this->assertSame($query, parse_url($location, PHP_URL_QUERY));

        // The location names the primary directly, and resolving it is a 200,
        // so the redirect chain has exactly one hop and no loop.
        $primaryResponse = $this->getJson('/api/public/articles/'.self::PRIMARY_SLUG)
            ->assertOk()
            ->assertJsonPath('id', $primary->id)
            ->assertJsonPath('slug', self::PRIMARY_SLUG);
        $this->assertFalse($primaryResponse->headers->has('Location'));

        $this->assertSame($originalPrimarySlug, $primary->fresh()->slug);
        $this->assertSame($originalSecondarySlug, $secondary->fresh()->slug);
    }

    public function test_unpublished_secondary_without_consolidation_mapping_is_not_publicly_exposed(): void
    {
        $secondary = $this->createArticle(self::SECONDARY_SLUG, 'Bài phụ', false);

        $this->getJson('/api/public/articles/'.self::SECONDARY_SLUG)->assertNotFound();
        $this->getJson('/api/public/articles/'.$secondary->id)->assertNotFound();
    }

    public function test_published_article_feed_keeps_primary_and_excludes_unpublished_secondary(): void
    {
        $primary = $this->createArticle(self::PRIMARY_SLUG, 'Bài chính', true);
        $secondary = $this->createArticle(self::SECONDARY_SLUG, 'Bài phụ', true);
        SlugHistory::recordArticleConsolidationRedirect($secondary, $primary);
        $secondary->update(['is_published' => false]);

        $feed = $this->getJson('/api/public/articles?per_page=1000&published_only=1')->assertOk();

        $articleIds = collect($feed->json('data'))->pluck('id')->map(fn ($id) => (int) $id)->all();
        $articleSlugs = collect($feed->json('data'))->pluck('slug')->all();
        $this->assertContains($primary->id, $articleIds);
        $this->assertNotContains($secondary->id, $articleIds);
        $this->assertContains(self::PRIMARY_SLUG, $articleSlugs);
        $this->assertNotContains(self::SECONDARY_SLUG, $articleSlugs);
    }

    public function test_consolidation_mapping_rejects_an_unpublished_target(): void
    {
        $primary = $this->createArticle(self::PRIMARY_SLUG, 'Bài chính', false);
        $secondary = $this->createArticle(self::SECONDARY_SLUG, 'Bài phụ', true);

        try {
            SlugHistory::recordArticleConsolidationRedirect($secondary, $primary);
            $this->fail('A redirect to an unpublished target must be rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('slug', $exception->errors());
        }

        $this->assertDatabaseCount('slug_redirects', 0);
        $this->assertSame(self::PRIMARY_SLUG, $primary->fresh()->slug);
        $this->assertSame(self::SECONDARY_SLUG, $secondary->fresh()->slug);
    }

    public function test_consolidation_mapping_rejects_an_unpublished_source_to_prevent_immediate_activation(): void
    {
        $primary = $this->createArticle(self::PRIMARY_SLUG, 'Bài chính', true);
        $secondary = $this->createArticle(self::SECONDARY_SLUG, 'Bài phụ', false);

        try {
            SlugHistory::recordArticleConsolidationRedirect($secondary, $primary);
            $this->fail('A consolidation redirect must be recorded before the source is unpublished.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('slug', $exception->errors());
        }

        $this->assertDatabaseCount('slug_redirects', 0);
        $this->assertSame(self::PRIMARY_SLUG, $primary->fresh()->slug);
        $this->assertSame(self::SECONDARY_SLUG, $secondary->fresh()->slug);
    }

    private function createArticle(string $slug, string $title, bool $published): Article
    {
        return Article::create([
            'title' => $title,
            'slug' => $slug,
            'content' => '<p>Article content</p>',
            'is_published' => $published,
        ]);
    }
}
