<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiContentQueue extends Model
{
    protected $table = 'ai_content_queue';

    protected $fillable = [
        'topic', 'keywords', 'type', 'tone', 'length',
        'with_images', 'image_count', 'auto_publish', 'article_category_id',
        'status', 'attempts', 'max_attempts', 'error_message', 'article_id',
        'scheduled_at', 'locked_at', 'last_attempt_at', 'next_attempt_at',
        'started_at', 'processed_at', 'completed_at',
    ];

    protected $casts = [
        'with_images' => 'boolean',
        'auto_publish' => 'boolean',
        'attempts' => 'integer',
        'max_attempts' => 'integer',
        'scheduled_at' => 'datetime',
        'locked_at' => 'datetime',
        'last_attempt_at' => 'datetime',
        'next_attempt_at' => 'datetime',
        'started_at' => 'datetime',
        'processed_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    public function articleCategory(): BelongsTo
    {
        return $this->belongsTo(ArticleCategory::class, 'article_category_id');
    }
}
