<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('article_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('meta_title')->nullable();
            $table->text('meta_desc')->nullable();
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('article_categories')->onDelete('cascade');
            $table->index(['is_active', 'order']);
        });

        // Add article_category_id to articles table
        Schema::table('articles', function (Blueprint $table) {
            $table->unsignedBigInteger('article_category_id')->nullable()->after('id');
            $table->foreign('article_category_id')->references('id')->on('article_categories')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropForeign(['article_category_id']);
            $table->dropColumn('article_category_id');
        });
        Schema::dropIfExists('article_categories');
    }
};
