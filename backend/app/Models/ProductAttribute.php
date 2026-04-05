<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductAttribute extends Model
{
    protected $fillable = ['type', 'value', 'label', 'extra', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Get active attributes by type
     */
    public static function getByType(string $type): \Illuminate\Database\Eloquent\Collection
    {
        return static::where('type', $type)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * Get all active attributes grouped by type
     */
    public static function getAllGrouped(): array
    {
        $all = static::where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->groupBy('type');

        return $all->toArray();
    }
}
