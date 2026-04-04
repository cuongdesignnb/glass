<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'name', 'slug', 'sku', 'description', 'content',
        'price', 'sale_price', 'images', 'thumbnail',
        'colors', 'color_names', 'prescription', 'gender',
        'face_shapes', 'frame_styles', 'materials',
        'brand', 'weight', 'frame_width', 'lens_width',
        'lens_height', 'bridge_width', 'temple_length',
        'category_id', 'meta_title', 'meta_desc', 'meta_keywords', 'og_image',
        'is_active', 'is_featured', 'is_new', 'stock', 'sold', 'views',
    ];

    protected function casts(): array
    {
        return [
            'images' => 'array',
            'colors' => 'array',
            'color_names' => 'array',
            'prescription' => 'array',
            'face_shapes' => 'array',
            'frame_styles' => 'array',
            'materials' => 'array',
            'price' => 'decimal:0',
            'sale_price' => 'decimal:0',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'is_new' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeFilterByGender($query, ?string $gender)
    {
        if ($gender) {
            return $query->where('gender', $gender);
        }
        return $query;
    }

    public function scopeFilterByColor($query, ?string $color)
    {
        if ($color) {
            return $query->whereJsonContains('colors', $color);
        }
        return $query;
    }

    public function scopeFilterByFaceShape($query, ?string $shape)
    {
        if ($shape) {
            return $query->whereJsonContains('face_shapes', $shape);
        }
        return $query;
    }

    public function scopeFilterByFrameStyle($query, ?string $style)
    {
        if ($style) {
            return $query->whereJsonContains('frame_styles', $style);
        }
        return $query;
    }

    public function scopeFilterByMaterial($query, ?string $material)
    {
        if ($material) {
            return $query->whereJsonContains('materials', $material);
        }
        return $query;
    }

    public function scopeFilterByPrice($query, ?float $min, ?float $max)
    {
        if ($min !== null) {
            $query->where('price', '>=', $min);
        }
        if ($max !== null) {
            $query->where('price', '<=', $max);
        }
        return $query;
    }

    public function getEffectivePriceAttribute(): float
    {
        return $this->sale_price ?? $this->price;
    }

    public function getDiscountPercentAttribute(): ?int
    {
        if ($this->sale_price && $this->price > 0) {
            return round(($this->price - $this->sale_price) / $this->price * 100);
        }
        return null;
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function approvedReviews(): HasMany
    {
        return $this->hasMany(Review::class)->where('is_approved', true);
    }

    public function getAverageRatingAttribute(): ?float
    {
        $avg = $this->approvedReviews()->avg('rating');
        return $avg ? round($avg, 1) : null;
    }

    public function getReviewCountAttribute(): int
    {
        return $this->approvedReviews()->count();
    }

    public function faqs(): HasMany
    {
        return $this->hasMany(Faq::class)->orderBy('order', 'asc');
    }

    public function addonGroups(): HasMany
    {
        return $this->hasMany(ProductAddonGroup::class)->orderBy('sort_order');
    }
}
