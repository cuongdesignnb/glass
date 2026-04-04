<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductAddonGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'is_required',
        'sort_order',
    ];

    protected $casts = [
        'is_required' => 'boolean',
    ];

    public function options()
    {
        return $this->hasMany(ProductAddonOption::class, 'group_id')
                    ->orderBy('sort_order');
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'product_addon_group_product', 'group_id', 'product_id');
    }
}
