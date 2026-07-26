<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_content_queue', function (Blueprint $table) {
            $table->boolean('auto_publish')->default(false)->after('image_count');
            $table->foreignId('article_category_id')->nullable()->after('auto_publish')
                ->constrained('article_categories')->nullOnDelete();
            $table->unsignedInteger('attempts')->default(0)->after('status');
            $table->unsignedInteger('max_attempts')->default(3)->after('attempts');
            $table->timestamp('locked_at')->nullable()->after('error_message');
            $table->timestamp('last_attempt_at')->nullable()->after('locked_at');
            $table->timestamp('next_attempt_at')->nullable()->after('last_attempt_at');
            $table->timestamp('started_at')->nullable()->after('next_attempt_at');
            $table->timestamp('completed_at')->nullable()->after('processed_at');

            $table->index(['status', 'scheduled_at'], 'ai_queue_status_scheduled_idx');
            $table->index(['status', 'next_attempt_at'], 'ai_queue_status_retry_idx');
            $table->index('locked_at', 'ai_queue_locked_idx');
            $table->index('article_category_id', 'ai_queue_article_category_idx');
        });
    }

    public function down(): void
    {
        Schema::table('ai_content_queue', function (Blueprint $table) {
            $table->dropIndex('ai_queue_status_scheduled_idx');
            $table->dropIndex('ai_queue_status_retry_idx');
            $table->dropIndex('ai_queue_locked_idx');
            $table->dropIndex('ai_queue_article_category_idx');
            $table->dropForeign(['article_category_id']);
            $table->dropColumn([
                'auto_publish',
                'article_category_id',
                'attempts',
                'max_attempts',
                'locked_at',
                'last_attempt_at',
                'next_attempt_at',
                'started_at',
                'completed_at',
            ]);
        });
    }
};
