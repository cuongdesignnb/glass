<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SlugRedirect extends Model
{
    protected $fillable = [
        'entity_type',
        'entity_id',
        'old_slug',
    ];

    protected function casts(): array
    {
        return [
            'entity_id' => 'integer',
        ];
    }
}
