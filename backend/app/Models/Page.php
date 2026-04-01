<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Page extends Model
{
    protected $fillable = [
        'title', 'slug', 'content', 'template',
        'is_published', 'meta_title', 'meta_desc',
    ];

    protected function casts(): array
    {
        return ['is_published' => 'boolean'];
    }
}
