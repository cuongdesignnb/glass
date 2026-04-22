<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_content_queue', function (Blueprint $table) {
            $table->id();
            $table->string('topic', 500);
            $table->string('keywords', 500)->nullable();
            $table->enum('type', ['article', 'product_description', 'seo'])->default('article');
            $table->enum('tone', ['professional', 'casual', 'luxury'])->default('professional');
            $table->enum('length', ['short', 'medium', 'long'])->default('medium');
            $table->boolean('with_images')->default(false);
            $table->unsignedTinyInteger('image_count')->default(2);
            $table->enum('status', ['pending', 'processing', 'done', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            $table->foreignId('article_id')->nullable()->constrained('articles')->nullOnDelete();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('scheduled_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_content_queue');
    }
};
