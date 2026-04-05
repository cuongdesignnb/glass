<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AddonOptionConstraint extends Model
{
    protected $fillable = [
        'option_id',
        'blocked_option_id',
    ];

    public function option()
    {
        return $this->belongsTo(ProductAddonOption::class, 'option_id');
    }

    public function blockedOption()
    {
        return $this->belongsTo(ProductAddonOption::class, 'blocked_option_id');
    }
}
