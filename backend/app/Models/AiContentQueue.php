<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiContentQueue extends Model
{
    protected $table = 'ai_content_queue';

    protected $fillable = [
        'topic', 'keywords', 'type', 'tone', 'length',
        'with_images', 'image_count', 'status', 'error_message',
        'article_id', 'scheduled_at', 'processed_at',
    ];

    protected $casts = [
        'with_images' => 'boolean',
        'scheduled_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function article()
    {
        return $this->belongsTo(Article::class);
    }
}
