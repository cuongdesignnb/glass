<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Notification extends Model
{
    protected $table = 'notifications_custom';

    protected $fillable = [
        'title', 'content', 'type', 'target_type',
        'target_group', 'target_user_ids', 'sender_id',
    ];

    protected function casts(): array
    {
        return [
            'target_user_ids' => 'array',
        ];
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function reads()
    {
        return $this->hasMany(NotificationRead::class);
    }

    /**
     * Scope: lấy notifications dành cho user cụ thể
     */
    public function scopeForUser(Builder $query, User $user): Builder
    {
        return $query->where(function ($q) use ($user) {
            // all
            $q->where('target_type', 'all');

            // individual
            $q->orWhere(function ($q2) use ($user) {
                $q2->where('target_type', 'individual')
                   ->whereJsonContains('target_user_ids', $user->id);
            });

            // group
            $q->orWhere(function ($q2) use ($user) {
                $q2->where('target_type', 'group')
                   ->where(function ($q3) use ($user) {
                       // has_orders
                       if ($user->orders()->exists()) {
                           $q3->orWhere('target_group', 'has_orders');
                       }
                       // has_points
                       if ($user->points > 0) {
                           $q3->orWhere('target_group', 'has_points');
                       }
                       // new_members (< 30 days)
                       if ($user->created_at && $user->created_at->diffInDays(now()) < 30) {
                           $q3->orWhere('target_group', 'new_members');
                       }
                   });
            });
        });
    }
}
