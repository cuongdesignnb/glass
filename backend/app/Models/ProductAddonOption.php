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
        'additional_price',
        'is_default',
        'sort_order',
    ];

    protected $casts = [
        'additional_price' => 'float',
        'is_default' => 'boolean',
    ];

    public function group()
    {
        return $this->belongsTo(ProductAddonGroup::class, 'group_id');
    }
}
