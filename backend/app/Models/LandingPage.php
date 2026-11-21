<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class LandingPage extends Model
{
    protected $fillable = [
        'title', 'slug', 'headline', 'subheadline', 'hero_image', 'cta_text',
        'promo_text', 'promo_ends_at', 'benefits', 'testimonials', 'faqs',
        'fb_pixel_id', 'tiktok_pixel_id', 'google_ads_id', 'is_active',
    ];

    protected $casts = [
        'benefits' => 'array',
        'testimonials' => 'array',
        'faqs' => 'array',
        'promo_ends_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'landing_page_product')
            ->withPivot('order')
            ->orderByPivot('order')
            ->withTimestamps();
    }
}
