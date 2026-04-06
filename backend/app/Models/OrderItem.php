<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'product_id', 'name', 'slug',
        'image', 'price', 'quantity', 'prescription',
        'color', 'color_name', 'addons', 'addon_total',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:0',
            'addon_total' => 'decimal:0',
            'addons' => 'array',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
