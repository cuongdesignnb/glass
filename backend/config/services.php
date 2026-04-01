<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel'              => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | SePay
    |--------------------------------------------------------------------------
    | API Key lấy từ dashboard SePay → Webhooks → Cấu hình chứng thực
    | Để trống nếu dùng chế độ "Không chứng thực"
    */
    'sepay' => [
        'api_key'        => env('SEPAY_API_KEY', ''),
        'account_number' => env('SEPAY_ACCOUNT_NUMBER', ''),  // STK ngân hàng nhận tiền
        'bank_name'      => env('SEPAY_BANK_NAME', ''),       // VD: Vietcombank
        'account_name'   => env('SEPAY_ACCOUNT_NAME', ''),    // Tên chủ TK
    ],

];
