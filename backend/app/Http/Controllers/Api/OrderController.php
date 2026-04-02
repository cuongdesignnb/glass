<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Voucher;
use App\Models\User;
use App\Models\LoyaltyTransaction;
use App\Models\Setting;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with(['items', 'user:id,name,email'])->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 20);
        return response()->json($query->paginate($perPage));
    }

    public function show(Order $order)
    {
        return response()->json($order->load(['items', 'user:id,name,email']));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'nullable|email',
            'customer_phone' => 'required|string|max:20',
            'address' => 'required|string',
            'city' => 'nullable|string',
            'district' => 'nullable|string',
            'ward' => 'nullable|string',
            'payment_method' => 'nullable|string|in:cod,bank_transfer',
            'note' => 'nullable|string',
            'voucher_code' => 'nullable|string',
            'points_used' => 'nullable|integer|min:0',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.name' => 'required|string',
            'items.*.slug' => 'required|string',
            'items.*.image' => 'nullable|string',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.prescription' => 'nullable|string',
        ]);

        // Calculate totals
        $subtotal = collect($data['items'])->sum(fn($item) => $item['price'] * $item['quantity']);
        $shipping = $subtotal >= 500000 ? 0 : 30000;
        $discount = 0;
        $pointsDiscount = 0;
        $pointsUsed = 0;

        // Áp dụng voucher
        if (!empty($data['voucher_code'])) {
            $voucher = Voucher::where('code', $data['voucher_code'])->first();
            if ($voucher && $voucher->isValid($subtotal)) {
                $discount = $voucher->calculateDiscount($subtotal);
                $voucher->increment('used_count');
            }
        }

        // Áp dụng điểm thưởng
        $userId = null;
        if ($request->bearerToken()) {
            $user = auth('sanctum')->user();
            if ($user) {
                $userId = $user->id;

                if (!empty($data['points_used']) && $data['points_used'] > 0) {
                    $settings = Setting::where('group', 'rewards')->pluck('value', 'key');
                    $vndPerPoint = intval($settings['vnd_per_point'] ?? 1000);

                    $pointsUsed = min($data['points_used'], $user->points);
                    $pointsDiscount = $pointsUsed * $vndPerPoint;
                    $pointsDiscount = min($pointsDiscount, $subtotal - $discount);
                }
            }
        }

        $total = max(0, $subtotal + $shipping - $discount - $pointsDiscount);

        $order = Order::create([
            'order_number'   => Order::generateOrderNumber(),
            'payment_code'   => Order::generatePaymentCode(),
            'user_id'        => $userId,
            'customer_name'  => $data['customer_name'],
            'customer_email' => $data['customer_email'] ?? null,
            'customer_phone' => $data['customer_phone'],
            'address'        => $data['address'],
            'city'           => $data['city'] ?? null,
            'district'       => $data['district'] ?? null,
            'ward'           => $data['ward'] ?? null,
            'subtotal'       => $subtotal,
            'shipping'       => $shipping,
            'discount'       => $discount,
            'total'          => $total,
            'payment_method' => $data['payment_method'] ?? 'cod',
            'note'           => $data['note'] ?? null,
            'voucher_code'   => $data['voucher_code'] ?? null,
            'points_used'    => $pointsUsed,
            'points_discount' => $pointsDiscount,
        ]);

        foreach ($data['items'] as $item) {
            $order->items()->create($item);
        }

        // Trừ điểm user nếu đã dùng
        if ($userId && $pointsUsed > 0) {
            $user->decrement('points', $pointsUsed);
            LoyaltyTransaction::create([
                'user_id' => $userId,
                'order_id' => $order->id,
                'type' => 'redeem',
                'points' => -$pointsUsed,
                'description' => "Dùng {$pointsUsed} điểm cho đơn #{$order->order_number}",
            ]);
        }

        return response()->json($order->load('items'), 201);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => 'required|string|in:pending,confirmed,shipping,delivered,cancelled',
            'payment_status' => 'nullable|string|in:unpaid,paid',
        ]);

        $oldStatus = $order->status;
        $order->update($data);

        // Cộng điểm khi đơn hàng delivered
        if ($data['status'] === 'delivered' && $oldStatus !== 'delivered' && $order->user_id) {
            $settings = Setting::where('group', 'rewards')->pluck('value', 'key');
            $pointsPerVnd = intval($settings['points_per_vnd'] ?? 10000);

            if ($pointsPerVnd > 0) {
                $earnedPoints = intval($order->total / $pointsPerVnd);
                if ($earnedPoints > 0) {
                    $user = User::find($order->user_id);
                    if ($user) {
                        $user->increment('points', $earnedPoints);
                        $user->increment('total_spent', $order->total);

                        LoyaltyTransaction::create([
                            'user_id' => $user->id,
                            'order_id' => $order->id,
                            'type' => 'earn',
                            'points' => $earnedPoints,
                            'description' => "Tích điểm đơn #{$order->order_number} (+{$earnedPoints}đ)",
                        ]);
                    }
                }
            }
        }

        return response()->json($order);
    }

    public function destroy(Order $order)
    {
        $order->delete();
        return response()->json(['message' => 'Xóa đơn hàng thành công']);
    }

    // Validate voucher (public)
    public function validateVoucher(Request $request)
    {
        $request->validate(['code' => 'required|string']);

        $voucher = Voucher::where('code', $request->code)->first();

        if (!$voucher) {
            return response()->json(['valid' => false, 'message' => 'Mã không tồn tại'], 404);
        }

        $subtotal = $request->get('subtotal', 0);
        if (!$voucher->isValid($subtotal)) {
            return response()->json(['valid' => false, 'message' => 'Mã đã hết hạn hoặc đã sử dụng'], 422);
        }

        return response()->json([
            'valid' => true,
            'voucher' => $voucher,
            'discount' => $voucher->calculateDiscount($subtotal),
        ]);
    }
}
