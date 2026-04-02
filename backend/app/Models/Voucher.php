<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    protected $fillable = [
        'code', 'type', 'value', 'min_order', 'max_uses',
        'used_count', 'expires_at', 'user_id', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'expires_at' => 'datetime',
            'value' => 'decimal:0',
            'min_order' => 'decimal:0',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isValid(float $orderTotal = 0): bool
    {
        if (!$this->is_active) return false;
        if ($this->expires_at && $this->expires_at->isPast()) return false;
        if ($this->used_count >= $this->max_uses) return false;
        if ($orderTotal > 0 && $orderTotal < $this->min_order) return false;
        return true;
    }

    public function calculateDiscount(float $orderTotal): float
    {
        if ($this->type === 'percent') {
            return min($orderTotal * $this->value / 100, $orderTotal);
        }
        return min($this->value, $orderTotal);
    }
}
