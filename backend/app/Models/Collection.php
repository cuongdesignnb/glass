<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Collection extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'tag',
        'variant',
        'size',
        'image',
        'gradient_from',
        'gradient_to',
        'accent_color',
        'order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer',
    ];

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'collection_product')
            ->withPivot('order')
            ->orderByPivot('order')
            ->withTimestamps();
    }
}
