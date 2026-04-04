<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductAddonPrice extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'option_id',
        'additional_price',
        'is_available',
    ];

    protected $casts = [
        'additional_price' => 'float',
        'is_available' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function option()
    {
        return $this->belongsTo(ProductAddonOption::class, 'option_id');
    }
}
