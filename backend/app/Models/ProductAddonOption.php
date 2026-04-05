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

    /**
     * Options that become disabled when this option is selected
     */
    public function blockedOptions()
    {
        return $this->belongsToMany(
            self::class,
            'addon_option_constraints',
            'option_id',
            'blocked_option_id'
        );
    }

    /**
     * Options that, when selected, will block this option
     */
    public function blockedByOptions()
    {
        return $this->belongsToMany(
            self::class,
            'addon_option_constraints',
            'blocked_option_id',
            'option_id'
        );
    }
}
