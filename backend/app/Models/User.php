<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role', 'avatar',
        'phone', 'province', 'ward', 'address_detail',
        'points', 'total_spent', 'is_active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['password' => 'hashed', 'is_active' => 'boolean'];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function loyaltyTransactions()
    {
        return $this->hasMany(LoyaltyTransaction::class);
    }

    public function vouchers()
    {
        return $this->hasMany(Voucher::class);
    }

    public function unreadNotificationsCount(): int
    {
        $allNotifications = Notification::forUser($this)->pluck('id');
        $readIds = NotificationRead::where('user_id', $this->id)->pluck('notification_id');
        return $allNotifications->diff($readIds)->count();
    }
}
