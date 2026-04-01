<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SepayTransaction extends Model
{
    protected $fillable = [
        'sepay_id',
        'gateway',
        'transaction_date',
        'account_number',
        'sub_account',
        'amount_in',
        'amount_out',
        'accumulated',
        'code',
        'content',
        'reference_code',
        'raw_body',
        'processed',
        'order_id',
        'process_note',
    ];

    protected $casts = [
        'raw_body'         => 'array',
        'processed'        => 'boolean',
        'transaction_date' => 'datetime',
        'amount_in'        => 'decimal:0',
        'amount_out'       => 'decimal:0',
        'accumulated'      => 'decimal:0',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
