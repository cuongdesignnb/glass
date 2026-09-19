<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ArticleAuthorRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_author_role_column_is_added_and_nullable(): void
    {
        $this->assertTrue(Schema::hasColumn('articles', 'author_role'));

        $article = Article::create([
            'title' => 'Bài viết không có vai trò',
            'slug' => 'bai-viet-khong-co-vai-tro',
            'is_published' => true,
        ]);

        $this->assertNull($article->fresh()->author_role);
    }

    public function test_store_accepts_and_returns_author_role(): void
    {
        Sanctum::actingAs($this->createAdmin());

        $this->postJson('/api/articles', [
            'title' => 'Hướng dẫn chọn gọng kính',
            'content' => '<p>Nội dung</p>',
            'author' => 'MITOO',
            'author_role' => 'Biên tập nội dung kính mắt MITOO',
            'is_published' => true,
        ])->assertCreated()
            ->assertJsonPath('author_role', 'Biên tập nội dung kính mắt MITOO');
    }

    public function test_update_accepts_and_returns_author_role_without_changing_slug(): void
    {
        $article = Article::create([
            'title' => 'Bài viết hiện tại',
            'slug' => 'bai-viet-hien-tai',
            'content' => '<p>Nội dung</p>',
            'is_published' => true,
        ]);
        Sanctum::actingAs($this->createAdmin());

        $this->putJson('/api/articles/'.$article->id, [
            'title' => 'Bài viết đã cập nhật',
            'slug' => 'slug-khong-duoc-tu-dong-doi',
            'author_role' => 'Đội ngũ MITOO',
        ])->assertOk()
            ->assertJsonPath('author_role', 'Đội ngũ MITOO')
            ->assertJsonPath('slug', 'bai-viet-hien-tai');

        $this->assertSame('Đội ngũ MITOO', $article->fresh()->author_role);
        $this->assertSame('bai-viet-hien-tai', $article->fresh()->slug);
    }

    public function test_author_role_can_be_cleared_and_is_returned_by_public_api(): void
    {
        $article = Article::create([
            'title' => 'Bài viết công khai',
            'slug' => 'bai-viet-cong-khai',
            'author_role' => 'Đội ngũ MITOO',
            'is_published' => true,
        ]);

        $this->getJson('/api/public/articles/'.$article->slug)
            ->assertOk()
            ->assertJsonPath('author_role', 'Đội ngũ MITOO');

        Sanctum::actingAs($this->createAdmin());
        $this->putJson('/api/articles/'.$article->id, [
            'author_role' => null,
        ])->assertOk()
            ->assertJsonPath('author_role', null);

        $this->assertNull($article->fresh()->author_role);
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Article Role Admin',
            'email' => 'article-role-'.Str::random(8).'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);
    }
}
