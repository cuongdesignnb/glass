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
            ->withPivot('order', 'price_override', 'sale_price_override')
            ->orderByPivot('order')
            ->withTimestamps();
    }

    /**
     * Price actually charged for a product on this landing page: the admin's
     * landing-only price when set, otherwise the catalogue price.
     *
     * @return array{0: float, 1: float} [regular price, sale price (0 = none)]
     */
    public static function effectivePrices(Product $product): array
    {
        $pivot = $product->pivot ?? null;
        $price = $pivot && $pivot->price_override !== null ? (float) $pivot->price_override : (float) $product->price;
        $sale = $pivot && $pivot->sale_price_override !== null ? (float) $pivot->sale_price_override : (float) $product->sale_price;

        return [$price, $sale];
    }
}
