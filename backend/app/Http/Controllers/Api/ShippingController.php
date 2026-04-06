<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Setting;
use App\Services\ViettelPostService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ShippingController extends Controller
{
    /**
     * Lấy token dài hạn Viettel Post (admin)
     */
    public function getToken()
    {
        try {
            $service = new ViettelPostService();
            $token = $service->getLongToken();

            return response()->json([
                'success' => true,
                'message' => 'Lấy token thành công! Token có hiệu lực 1 năm.',
                'token' => substr($token, 0, 20) . '...',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Kiểm tra kết nối VTP
     */
    public function testConnection()
    {
        try {
            $service = new ViettelPostService();

            if (!$service->isConfigured()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chưa cấu hình đầy đủ Viettel Post (cần token, địa chỉ gửi, SĐT)',
                ]);
            }

            $provinces = $service->getProvinces();

            return response()->json([
                'success' => count($provinces) > 0,
                'message' => count($provinces) > 0
                    ? 'Kết nối Viettel Post thành công! (' . count($provinces) . ' tỉnh/tp)'
                    : 'Không lấy được dữ liệu tỉnh/thành',
                'province_count' => count($provinces),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi kết nối: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Lấy danh sách tỉnh/thành
     */
    public function getProvinces()
    {
        $service = new ViettelPostService();
        return response()->json($service->getProvinces());
    }

    /**
     * Lấy danh sách quận/huyện
     */
    public function getDistricts(Request $request)
    {
        $request->validate(['province_id' => 'required|integer']);
        $service = new ViettelPostService();
        return response()->json($service->getDistricts($request->province_id));
    }

    /**
     * Lấy danh sách phường/xã
     */
    public function getWards(Request $request)
    {
        $request->validate(['district_id' => 'required|integer']);
        $service = new ViettelPostService();
        return response()->json($service->getWards($request->district_id));
    }

    /**
     * Tính phí vận chuyển
     */
    public function calculateFee(Request $request)
    {
        $data = $request->validate([
            'sender_province'   => 'required|integer',
            'sender_district'   => 'required|integer',
            'receiver_province' => 'required|integer',
            'receiver_district' => 'required|integer',
            'weight'            => 'nullable|integer',
            'price'             => 'nullable|integer',
            'money_collection'  => 'nullable|integer',
        ]);

        $service = new ViettelPostService();
        $result = $service->calculateFee([
            'SENDER_PROVINCE'   => $data['sender_province'],
            'SENDER_DISTRICT'   => $data['sender_district'],
            'RECEIVER_PROVINCE' => $data['receiver_province'],
            'RECEIVER_DISTRICT' => $data['receiver_district'],
            'PRODUCT_WEIGHT'    => $data['weight'] ?? intval(Setting::getValue('vtp_default_weight', 500)),
            'PRODUCT_PRICE'     => $data['price'] ?? 0,
            'MONEY_COLLECTION'  => $data['money_collection'] ?? 0,
        ]);

        return response()->json($result);
    }

    /**
     * Gửi đơn hàng sang Viettel Post (admin)
     */
    public function pushOrder(Request $request, Order $order)
    {
        try {
            $service = new ViettelPostService();

            if (!$service->isConfigured()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chưa cấu hình đầy đủ Viettel Post',
                ], 400);
            }

            // Nếu đã có mã vận đơn → không tạo lại
            if ($order->vtp_order_number) {
                return response()->json([
                    'success' => false,
                    'message' => "Đơn đã có mã vận đơn VTP: {$order->vtp_order_number}",
                ], 400);
            }

            // Tính tổng số lượng và tên sản phẩm
            $order->load('items');
            $productNames = $order->items->pluck('name')->implode(', ');
            $totalQty = $order->items->sum('quantity');

            // Auto-resolve VTP address IDs from names if missing
            $cityId = $order->city_id;
            $districtId = $order->district_id;
            $wardId = $order->ward_id;

            if (!$cityId && $order->city) {
                $provinces = $service->getProvinces();
                foreach ($provinces as $p) {
                    $pName = $p['PROVINCE_NAME'] ?? '';
                    if (mb_stripos($pName, $order->city) !== false || mb_stripos($order->city, $pName) !== false) {
                        $cityId = $p['PROVINCE_ID'] ?? null;
                        break;
                    }
                }
                if ($cityId) {
                    $order->update(['city_id' => $cityId]);
                }
            }

            if ($cityId && !$districtId && $order->district) {
                $districts = $service->getDistricts($cityId);
                foreach ($districts as $d) {
                    $dName = $d['DISTRICT_NAME'] ?? '';
                    if (mb_stripos($dName, $order->district) !== false || mb_stripos($order->district, $dName) !== false) {
                        $districtId = $d['DISTRICT_ID'] ?? null;
                        break;
                    }
                }
                if ($districtId) {
                    $order->update(['district_id' => $districtId]);
                }
            }

            if ($districtId && !$wardId && $order->ward) {
                $wards = $service->getWards($districtId);
                foreach ($wards as $w) {
                    $wName = $w['WARDS_NAME'] ?? '';
                    if (mb_stripos($wName, $order->ward) !== false || mb_stripos($order->ward, $wName) !== false) {
                        $wardId = $w['WARDS_ID'] ?? null;
                        break;
                    }
                }
                if ($wardId) {
                    $order->update(['ward_id' => $wardId]);
                }
            }

            // COD amount
            $moneyColl = 0;
            if ($order->payment_method === 'cod') {
                $moneyColl = intval($order->total);
            }

            $result = $service->createOrder([
                'order_number'        => $order->order_number,
                'customer_name'       => $order->customer_name,
                'customer_phone'      => $order->customer_phone,
                'address'             => $order->address,
                'city_id'             => $cityId,
                'district_id'         => $districtId,
                'ward_id'             => $wardId,
                'total'               => $order->total,
                'product_name'        => mb_substr($productNames, 0, 200),
                'product_description' => "Đơn #{$order->order_number}",
                'product_quantity'    => $totalQty,
                'money_collection'    => $moneyColl,
                'note'                => $order->note ?? '',
                'service'             => $request->input('service', Setting::getValue('vtp_default_service', 'LCOD')),
            ]);

            if ($result['success']) {
                $vtpData = $result['data'];

                $order->update([
                    'vtp_order_number' => $vtpData['ORDER_NUMBER'] ?? null,
                    'vtp_status_code'  => 100,
                    'vtp_status_name'  => 'Đã tiếp nhận',
                    'vtp_status_date'  => now(),
                    'vtp_service'      => $request->input('service', Setting::getValue('vtp_default_service', 'LCOD')),
                    'vtp_shipping_fee' => $vtpData['MONEY_TOTAL'] ?? 0,
                    'status'           => 'shipping',
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Đã gửi đơn sang Viettel Post thành công!',
                    'vtp_order_number' => $vtpData['ORDER_NUMBER'] ?? null,
                    'order'   => $order->fresh(),
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], 400);
        } catch (\Exception $e) {
            Log::error('Push VTP order failed', [
                'order_id' => $order->id,
                'error'    => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Lỗi gửi đơn VTP: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Hủy đơn VTP (admin)
     */
    public function cancelVtpOrder(Request $request, Order $order)
    {
        if (!$order->vtp_order_number) {
            return response()->json([
                'success' => false,
                'message' => 'Đơn chưa có mã vận đơn VTP',
            ], 400);
        }

        try {
            $service = new ViettelPostService();
            $result = $service->updateOrder(
                $order->vtp_order_number,
                4, // TYPE 4 = Cancel
                $request->input('note', 'Hủy bởi admin')
            );

            if ($result['success']) {
                $order->update([
                    'vtp_status_code' => -100,
                    'vtp_status_name' => 'Đã hủy vận đơn',
                    'vtp_status_date' => now(),
                    'status'          => 'cancelled',
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Đã hủy đơn vận chuyển VTP thành công',
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Webhook nhận trạng thái từ Viettel Post
     * VTP gửi POST khi trạng thái đơn thay đổi
     */
    public function webhook(Request $request)
    {
        $data = $request->all();

        Log::info('VTP Webhook received', $data);

        // VTP gửi DATA dạng array hoặc object
        $items = isset($data['DATA']) ? $data['DATA'] : [$data];

        if (!is_array($items)) {
            $items = [$items];
        }

        // Có thể DATA là 1 object, wrap thành array nếu cần
        if (isset($items['ORDER_NUMBER'])) {
            $items = [$items];
        }

        foreach ($items as $item) {
            $orderNumber = $item['ORDER_NUMBER'] ?? null;
            $statusCode  = $item['ORDER_STATUS'] ?? null;
            $statusName  = $item['STATUS_NAME']  ?? '';
            $statusDate  = $item['ORDER_STATUS_DATE'] ?? null;
            $moneyTotal  = $item['MONEY_TOTAL'] ?? null;

            if (!$orderNumber) continue;

            // Tìm đơn theo mã vận đơn VTP
            $order = Order::where('vtp_order_number', $orderNumber)->first();

            if (!$order) {
                // Thử tìm theo order_number nội bộ
                $order = Order::where('order_number', $orderNumber)->first();
            }

            if (!$order) {
                Log::warning('VTP Webhook: Order not found', ['order_number' => $orderNumber]);
                continue;
            }

            // Cập nhật log tracking
            $trackingLog = json_decode($order->vtp_tracking_log, true) ?: [];
            $trackingLog[] = [
                'status_code' => $statusCode,
                'status_name' => $statusName,
                'date'        => $statusDate,
                'received_at' => now()->toISOString(),
            ];

            $updates = [
                'vtp_status_code' => $statusCode,
                'vtp_status_name' => $statusName,
                'vtp_status_date' => $statusDate ? date('Y-m-d H:i:s', strtotime($statusDate)) : now(),
                'vtp_tracking_log' => json_encode($trackingLog),
            ];

            if ($moneyTotal !== null) {
                $updates['vtp_shipping_fee'] = $moneyTotal;
            }

            // Map VTP status → internal status
            $internalStatus = $this->mapVtpStatus($statusCode);
            if ($internalStatus) {
                $updates['status'] = $internalStatus;
            }

            $order->update($updates);

            Log::info('VTP Webhook: Updated order', [
                'order_id'     => $order->id,
                'order_number' => $order->order_number,
                'vtp_status'   => $statusCode,
                'status_name'  => $statusName,
            ]);
        }

        return response()->json(['status' => 200, 'message' => 'OK']);
    }

    /**
     * Map VTP status code → internal order status
     */
    private function mapVtpStatus(?int $statusCode): ?string
    {
        if ($statusCode === null) return null;

        // VTP Status Codes:
        // 100   = Mới tiếp nhận
        // 101   = Lấy hàng thành công
        // 102   = Đã nhập kho
        // 103-199 = Đang vận chuyển
        // 200   = Đang giao
        // 201   = Giao lại
        // 300-399 = Chuyển hoàn
        // 500   = Phát thành công
        // 501   = Đã giao hàng
        // 503   = Đã đối soát
        // -100  = Hủy

        if ($statusCode >= 500 && $statusCode <= 505) {
            return 'delivered';
        }
        if ($statusCode == -100 || $statusCode == 107) {
            return 'cancelled';
        }
        if ($statusCode >= 100 && $statusCode < 500) {
            return 'shipping';
        }

        return null;
    }

    /**
     * Tra cứu đơn hàng có thông tin vận chuyển (public)
     */
    public function trackOrder(Request $request)
    {
        $request->validate([
            'order_number' => 'required|string',
            'phone'        => 'required|string',
        ]);

        $order = Order::with('items')
            ->where('order_number', $request->order_number)
            ->where('customer_phone', $request->phone)
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
        }

        // Parse tracking log
        $trackingLog = json_decode($order->vtp_tracking_log, true) ?: [];

        return response()->json([
            'order'         => $order,
            'tracking' => [
                'vtp_order_number' => $order->vtp_order_number,
                'vtp_status_code'  => $order->vtp_status_code,
                'vtp_status_name'  => $order->vtp_status_name,
                'vtp_status_date'  => $order->vtp_status_date,
                'vtp_service'      => $order->vtp_service,
                'vtp_shipping_fee' => $order->vtp_shipping_fee,
                'tracking_log'     => $trackingLog,
            ],
        ]);
    }
}
