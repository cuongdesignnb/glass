<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductAddonGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'name',
        'is_required',
        'sort_order',
    ];

    protected $casts = [
        'is_required' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function options()
    {
        return $this->hasMany(ProductAddonOption::class, 'group_id')
                    ->orderBy('sort_order');
    }
}
