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
    | OpenAI-compatible article provider
    |--------------------------------------------------------------------------
    */
    'openai' => [
        'api_key'          => env('OPENAI_API_KEY', ''),
        'base_url'         => env('OPENAI_BASE_URL', 'https://modelapi.vn/v1'),
        'wire_api'         => env('OPENAI_WIRE_API', 'chat_completions'),
        'model'            => env('OPENAI_MODEL', 'gpt-5.5'),
        'reasoning_effort' => env('OPENAI_REASONING_EFFORT', 'high'),
        'max_tokens'       => (int) env('OPENAI_MAX_TOKENS', 4096),
        'image_api_key'    => env('OPENAI_IMAGE_API_KEY', ''),
        'image_base_url'   => env('OPENAI_IMAGE_BASE_URL', 'https://api.openai.com/v1'),
        'image_model'      => env('OPENAI_IMAGE_MODEL', 'gpt-image-2'),
        'image_quality'    => env('OPENAI_IMAGE_QUALITY', 'medium'),
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
