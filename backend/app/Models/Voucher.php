<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    protected $fillable = [
        'code', 'description', 'type', 'scope', 'value', 'min_order',
        'max_discount', 'max_uses', 'per_user_limit', 'used_count',
        'expires_at', 'user_id', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'expires_at' => 'datetime',
            'value' => 'decimal:0',
            'min_order' => 'decimal:0',
            'max_discount' => 'decimal:0',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'voucher_products');
    }

    /**
     * Check if voucher is valid for given order total
     */
    public function isValid(float $orderTotal = 0): bool
    {
        if (!$this->is_active) return false;
        if ($this->expires_at && $this->expires_at->isPast()) return false;
        if ($this->max_uses > 0 && $this->used_count >= $this->max_uses) return false;
        if ($orderTotal > 0 && $orderTotal < $this->min_order) return false;
        return true;
    }

    /**
     * Check if voucher applies to a specific product
     */
    public function isValidForProduct(int $productId): bool
    {
        if ($this->scope !== 'product') return true;
        return $this->products()->where('products.id', $productId)->exists();
    }

    /**
     * Check if voucher is assigned to a specific user
     */
    public function isValidForUser(?int $userId): bool
    {
        if ($this->scope !== 'user') return true;
        if (!$userId) return false;
        return $this->user_id === $userId;
    }

    /**
     * Check per-user usage limit
     */
    public function isWithinUserLimit(int $userId): bool
    {
        if ($this->per_user_limit <= 0) return true;
        $usedByUser = \App\Models\Order::where('user_id', $userId)
            ->where('voucher_code', $this->code)
            ->count();
        return $usedByUser < $this->per_user_limit;
    }

    /**
     * Calculate discount amount, respecting max_discount for percent type
     */
    public function calculateDiscount(float $orderTotal): float
    {
        if ($this->type === 'percent') {
            $discount = $orderTotal * $this->value / 100;
            if ($this->max_discount > 0) {
                $discount = min($discount, $this->max_discount);
            }
            return min($discount, $orderTotal);
        }
        return min($this->value, $orderTotal);
    }
}
