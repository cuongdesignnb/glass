<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ViettelPostService
{
    protected string $baseUrl;
    protected string $token;

    public function __construct()
    {
        $env = Setting::getValue('vtp_environment', 'production');
        $this->baseUrl = $env === 'dev'
            ? 'https://partnerdev.viettelpost.vn'
            : 'https://partner.viettelpost.vn';

        $this->token = Setting::getValue('vtp_token', '') ?: '';
    }

    /**
     * Login to get short-lived token
     */
    public function login(): ?string
    {
        $username = Setting::getValue('vtp_username', '');
        $password = Setting::getValue('vtp_password', '');

        if (!$username || !$password) {
            throw new \Exception('Chưa cấu hình tài khoản Viettel Post');
        }

        $response = Http::post("{$this->baseUrl}/v2/user/Login", [
            'USERNAME' => $username,
            'PASSWORD' => $password,
        ]);

        if ($response->successful() && $response->json('status') == 200) {
            return $response->json('data.token');
        }

        Log::error('VTP Login failed', ['response' => $response->json()]);
        throw new \Exception('Đăng nhập Viettel Post thất bại: ' . ($response->json('message') ?? 'Unknown'));
    }

    /**
     * Get long-lived token (1 year)
     */
    public function getLongToken(): string
    {
        $shortToken = $this->login();

        $response = Http::withHeaders([
            'Token' => $shortToken,
        ])->get("{$this->baseUrl}/v2/user/ownerconnect");

        if ($response->successful() && $response->json('status') == 200) {
            $longToken = $response->json('data.token');
            Setting::setValue('vtp_token', $longToken, 'shipping');
            $this->token = $longToken;
            return $longToken;
        }

        throw new \Exception('Lấy token dài hạn thất bại');
    }

    /**
     * Get available provinces
     */
    public function getProvinces(): array
    {
        $response = Http::withHeaders([
            'Token' => $this->token,
        ])->get("{$this->baseUrl}/v2/categories/listProvinceById?provinceId=-1");

        if ($response->successful()) {
            return $response->json('data') ?? [];
        }

        return [];
    }

    /**
     * Get districts by province ID
     */
    public function getDistricts(int $provinceId): array
    {
        $response = Http::withHeaders([
            'Token' => $this->token,
        ])->get("{$this->baseUrl}/v2/categories/listDistrict?provinceId={$provinceId}");

        if ($response->successful()) {
            return $response->json('data') ?? [];
        }

        return [];
    }

    /**
     * Get wards by district ID
     */
    public function getWards(int $districtId): array
    {
        $response = Http::withHeaders([
            'Token' => $this->token,
        ])->get("{$this->baseUrl}/v2/categories/listWards?districtId={$districtId}");

        if ($response->successful()) {
            return $response->json('data') ?? [];
        }

        return [];
    }

    /**
     * Calculate shipping fee for all services
     */
    public function calculateFee(array $params): array
    {
        $defaults = [
            'PRODUCT_WEIGHT' => intval(Setting::getValue('vtp_default_weight', 500)),
            'PRODUCT_TYPE'   => 'HH', // Hàng hóa
            'ORDER_SERVICE'  => '',
            'NATIONAL_TYPE'  => 1, // Nội địa
        ];

        $body = array_merge($defaults, $params);

        $response = Http::withHeaders([
            'Token' => $this->token,
            'Content-Type' => 'application/json',
        ])->post("{$this->baseUrl}/v2/order/getPriceAll", $body);

        if ($response->successful()) {
            return $response->json() ?? [];
        }

        Log::error('VTP Calculate Fee failed', [
            'body' => $body,
            'response' => $response->json(),
        ]);
        return [];
    }

    /**
     * Create a shipping order on Viettel Post
     */
    public function createOrder(array $orderData): array
    {
        // Lấy thông tin gửi hàng từ Settings
        $senderName       = Setting::getValue('vtp_sender_name', '');
        $senderPhone      = Setting::getValue('vtp_sender_phone', '');
        $senderAddress     = Setting::getValue('vtp_sender_address', '');
        $senderProvinceId = intval(Setting::getValue('vtp_sender_province_id', 0));
        $senderDistrictId = intval(Setting::getValue('vtp_sender_district_id', 0));
        $senderWardsId    = intval(Setting::getValue('vtp_sender_wards_id', 0));
        $defaultService   = Setting::getValue('vtp_default_service', 'LCOD');
        $defaultWeight    = intval(Setting::getValue('vtp_default_weight', 500));
        $orderPayment     = intval(Setting::getValue('vtp_order_payment', 3)); // 3 = người nhận trả

        $body = [
            'ORDER_NUMBER'      => $orderData['order_number'],
            'GROUPADDRESS_ID'   => intval(Setting::getValue('vtp_group_address_id', 0)),
            'CUS_ID'            => intval(Setting::getValue('vtp_customer_id', 0)),
            'DELIVERY_DATE'     => now()->format('d/m/Y H:i:s'),
            'SENDER_FULLNAME'   => $senderName,
            'SENDER_ADDRESS'    => $senderAddress,
            'SENDER_PHONE'      => $senderPhone,
            'SENDER_WARD'       => $senderWardsId,
            'SENDER_DISTRICT'   => $senderDistrictId,
            'SENDER_PROVINCE'   => $senderProvinceId,
            'RECEIVER_FULLNAME' => $orderData['customer_name'],
            'RECEIVER_ADDRESS'  => $orderData['address'],
            'RECEIVER_PHONE'    => $orderData['customer_phone'],
            'RECEIVER_WARD'     => intval($orderData['ward_id'] ?? 0),
            'RECEIVER_DISTRICT' => intval($orderData['district_id'] ?? 0),
            'RECEIVER_PROVINCE' => intval($orderData['city_id'] ?? 0),
            'PRODUCT_NAME'      => $orderData['product_name'] ?? 'Kính mắt',
            'PRODUCT_DESCRIPTION' => $orderData['product_description'] ?? '',
            'PRODUCT_QUANTITY'  => intval($orderData['product_quantity'] ?? 1),
            'PRODUCT_PRICE'     => intval($orderData['total'] ?? 0),
            'PRODUCT_WEIGHT'    => intval($orderData['weight'] ?? $defaultWeight),
            'PRODUCT_TYPE'      => 'HH',
            'ORDER_PAYMENT'     => $orderPayment,
            'ORDER_SERVICE'     => $orderData['service'] ?? $defaultService,
            'MONEY_COLLECTION'  => intval($orderData['money_collection'] ?? 0),
            'ORDER_NOTE'        => $orderData['note'] ?? '',
        ];

        $response = Http::withHeaders([
            'Token' => $this->token,
            'Content-Type' => 'application/json',
        ])->post("{$this->baseUrl}/v2/order/createOrder", $body);

        $result = $response->json();

        Log::info('VTP Create Order', [
            'order_number' => $orderData['order_number'],
            'request' => $body,
            'response' => $result,
        ]);

        if ($response->successful() && ($result['status'] ?? 0) == 200) {
            return [
                'success' => true,
                'data'    => $result['data'] ?? [],
                'message' => $result['message'] ?? 'Tạo đơn thành công',
            ];
        }

        return [
            'success' => false,
            'message' => $result['message'] ?? 'Tạo đơn VTP thất bại',
            'data'    => $result,
        ];
    }

    /**
     * Update order (cancel, approve, etc)
     * TYPE: 1 = Duyệt, 3 = Giao lại, 4 = Hủy
     */
    public function updateOrder(string $orderNumber, int $type, string $note = ''): array
    {
        $response = Http::withHeaders([
            'Token' => $this->token,
            'Content-Type' => 'application/json',
        ])->post("{$this->baseUrl}/v2/order/UpdateOrder", [
            'TYPE'         => $type,
            'ORDER_NUMBER' => $orderNumber,
            'NOTE'         => $note,
        ]);

        $result = $response->json();

        if ($response->successful() && ($result['status'] ?? 0) == 200) {
            return ['success' => true, 'data' => $result['data'] ?? []];
        }

        return ['success' => false, 'message' => $result['message'] ?? 'Cập nhật đơn VTP thất bại'];
    }

    /**
     * Check if service is properly configured
     */
    public function isConfigured(): bool
    {
        return !empty($this->token)
            && !empty(Setting::getValue('vtp_sender_phone', ''))
            && !empty(Setting::getValue('vtp_sender_address', ''));
    }
}
