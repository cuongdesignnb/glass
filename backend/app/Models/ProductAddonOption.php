<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductAddonOption extends Model
{
    use HasFactory;

    protected $fillable = [
        'group_id',
        'name',
        'sort_order',
    ];

    public function group()
    {
        return $this->belongsTo(ProductAddonGroup::class, 'group_id');
    }

    /**
     * Get product-specific prices for this option
     */
    public function prices()
    {
        return $this->hasMany(ProductAddonPrice::class, 'option_id');
    }
}
