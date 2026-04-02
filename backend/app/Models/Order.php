<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'order_number', 'payment_code', 'user_id',
        'customer_name', 'customer_email', 'customer_phone',
        'address', 'city', 'district', 'ward',
        'subtotal', 'shipping', 'discount', 'total',
        'status', 'payment_method', 'payment_status', 'note',
        'voucher_code', 'points_used', 'points_discount',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:0',
            'shipping' => 'decimal:0',
            'discount' => 'decimal:0',
            'total'    => 'decimal:0',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function sepayTransactions(): HasMany
    {
        return $this->hasMany(SepayTransaction::class);
    }

    public static function generateOrderNumber(): string
    {
        $prefix = 'GLS';
        $date   = date('Ymd');
        $random = strtoupper(substr(uniqid(), -4));
        return "{$prefix}{$date}{$random}";
    }

    /**
     * Tạo mã thanh toán ngắn gọn để điền vào nội dung chuyển khoản.
     * VD: GLS8A3F2C  (dễ đọc, unique)
     */
    public static function generatePaymentCode(): string
    {
        do {
            $code = 'GLS' . strtoupper(substr(md5(uniqid()), 0, 6));
        } while (self::where('payment_code', $code)->exists());

        return $code;
    }
}
