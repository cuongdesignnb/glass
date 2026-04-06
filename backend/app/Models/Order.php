<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'order_number', 'payment_code', 'user_id',
        'customer_name', 'customer_email', 'customer_phone',
        'address', 'city', 'city_id', 'district', 'district_id', 'ward', 'ward_id',
        'subtotal', 'shipping', 'discount', 'total',
        'status', 'payment_method', 'payment_status', 'note',
        'voucher_code', 'points_used', 'points_discount',
        // Viettel Post shipping
        'vtp_order_number', 'vtp_status_code', 'vtp_status_name',
        'vtp_status_date', 'vtp_service', 'vtp_shipping_fee', 'vtp_tracking_log',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'subtotal'         => 'decimal:0',
            'shipping'         => 'decimal:0',
            'discount'         => 'decimal:0',
            'total'            => 'decimal:0',
            'vtp_shipping_fee' => 'decimal:0',
            'vtp_status_date'  => 'datetime',
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
     * Tạo mã thanh toán theo format SePay: SEVQR + mã duy nhất
     * SePay yêu cầu nội dung CK bắt đầu bằng SEVQR để webhook nhận diện
     * VD: SEVQR8A3F2C
     */
    public static function generatePaymentCode(): string
    {
        do {
            $code = 'SEVQR' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 6));
        } while (self::where('payment_code', $code)->exists());

        return $code;
    }
}
