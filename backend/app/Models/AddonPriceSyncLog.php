<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AddonPriceSyncLog extends Model
{
    protected $fillable = [
        'option_id',
        'old_price',
        'new_price',
        'is_available',
        'affected_count',
        'snapshot',
        'reverted_at',
    ];

    protected $casts = [
        'old_price' => 'float',
        'new_price' => 'float',
        'is_available' => 'boolean',
        'affected_count' => 'integer',
        'snapshot' => 'array',
        'reverted_at' => 'datetime',
    ];

    public function option()
    {
        return $this->belongsTo(ProductAddonOption::class, 'option_id');
    }
}
