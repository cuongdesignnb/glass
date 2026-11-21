<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Voucher;
use App\Models\User;
use App\Models\LoyaltyTransaction;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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

    /**
     * Replace client-supplied prices with catalogue prices.
     *
     * Unit price = sale price (when set) or regular price, plus the price of
     * every selected add-on option, matching what the storefront displays.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     *
     * @throws ValidationException
     */
    private function repriceItems(array $items): array
    {
        $products = Product::query()
            ->active()
            ->with(['addonGroups.options', 'addonPrices'])
            ->whereIn('id', collect($items)->pluck('product_id')->unique()->all())
            ->get()
            ->keyBy('id');

        $priced = [];

        foreach ($items as $index => $item) {
            $product = $products->get((int) $item['product_id']);

            if ($product === null) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => 'Sản phẩm không còn được bán.',
                ]);
            }

            $unitPrice = (float) ($product->sale_price > 0 ? $product->sale_price : $product->price);

            $addons = [];
            $addonTotal = 0.0;

            foreach (($item['addons'] ?? []) as $addon) {
                $groupName = is_array($addon) ? ($addon['groupName'] ?? null) : null;
                $optionName = is_array($addon) ? ($addon['optionName'] ?? null) : null;

                $group = $product->addonGroups->first(fn ($g) => $g->name === $groupName);
                $option = $group?->options->first(fn ($o) => $o->name === $optionName);
                $priceRow = $option ? $product->addonPrices->firstWhere('option_id', $option->id) : null;

                if ($option === null || ($priceRow !== null && ! $priceRow->is_available)) {
                    throw ValidationException::withMessages([
                        "items.{$index}.addons" => 'Tùy chọn đã chọn không còn khả dụng.',
                    ]);
                }

                $addonPrice = (float) ($priceRow->additional_price ?? 0);
                $addonTotal += $addonPrice;
                $addons[] = [
                    'groupName' => $group->name,
                    'optionName' => $option->name,
                    'price' => $addonPrice,
                ];
            }

            $priced[] = [
                'product_id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'image' => $item['image'] ?? $product->thumbnail,
                'price' => $unitPrice + $addonTotal,
                'quantity' => (int) $item['quantity'],
                'prescription' => $item['prescription'] ?? null,
                'color' => $item['color'] ?? null,
                'color_name' => $item['color_name'] ?? null,
                'addons' => $addons,
                'addon_total' => $addonTotal,
            ];
        }

        return $priced;
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
            'city_id' => 'nullable|integer',
            'district' => 'nullable|string',
            'district_id' => 'nullable|integer',
            'ward' => 'nullable|string',
            'ward_id' => 'nullable|integer',
            'payment_method' => 'nullable|string|in:cod,bank_transfer',
            'note' => 'nullable|string',
            'voucher_code' => 'nullable|string',
            'points_used' => 'nullable|integer|min:0',
            'items' => 'required|array|min:1',
            // Price, name, slug and add-on totals are never trusted from the
            // client: repriceItems() rebuilds them from the product catalogue.
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.name' => 'nullable|string',
            'items.*.slug' => 'nullable|string',
            'items.*.image' => 'nullable|string',
            'items.*.price' => 'nullable|numeric|min:0',
            'items.*.quantity' => 'required|integer|min:1|max:50',
            'items.*.prescription' => 'nullable|string',
            'items.*.color' => 'nullable|string',
            'items.*.color_name' => 'nullable|string',
            'items.*.addons' => 'nullable|array',
            'items.*.addon_total' => 'nullable|numeric|min:0',
        ]);

        // Rebuild every line from the catalogue so a tampered request cannot
        // set its own price.
        $data['items'] = $this->repriceItems($data['items']);

        // Calculate totals
        $subtotal = collect($data['items'])->sum(fn($item) => $item['price'] * $item['quantity']);
        $freeShipThreshold = (int)(Setting::getValue('payment_free_shipping_threshold') ?: 500000);
        $shippingFee = (int)(Setting::getValue('payment_shipping_fee') ?: 30000);
        $shipping = ($freeShipThreshold > 0 && $subtotal >= $freeShipThreshold) ? 0 : $shippingFee;
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
            'city_id'        => $data['city_id'] ?? null,
            'district'       => $data['district'] ?? null,
            'district_id'    => $data['district_id'] ?? null,
            'ward'           => $data['ward'] ?? null,
            'ward_id'        => $data['ward_id'] ?? null,
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

        // Trả về order + thông tin bank từ DB Settings
        $orderData = $order->load('items')->toArray();

        if (($data['payment_method'] ?? 'cod') === 'bank_transfer') {
            $orderData['bank_info'] = [
                'bank_name'        => Setting::getValue('payment_sepay_bank_name') ?: env('SEPAY_BANK_NAME', ''),
                'account_number'   => Setting::getValue('payment_sepay_account_number') ?: env('SEPAY_ACCOUNT_NUMBER', ''),
                'account_name'     => Setting::getValue('payment_sepay_account_name') ?: env('SEPAY_ACCOUNT_NAME', ''),
                'transfer_content' => $order->payment_code, // SEVQRXXXXXX — SePay yêu cầu
            ];
        }

        return response()->json($orderData, 201);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => 'required|string|in:pending,confirmed,shipping,delivered,cancelled',
            'payment_status' => 'nullable|string|in:unpaid,paid',
        ]);

        $oldStatus = $order->status;
        $order->update($data);

        // Auto-push to Viettel Post when confirmed
        if ($data['status'] === 'confirmed' && $oldStatus !== 'confirmed') {
            $autoPush = Setting::getValue('vtp_auto_push', '0');
            if ($autoPush === '1' && !$order->vtp_order_number && $order->city_id) {
                try {
                    $shippingCtrl = new \App\Http\Controllers\Api\ShippingController();
                    $shippingCtrl->pushOrder($request, $order);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Auto-push VTP failed', [
                        'order_id' => $order->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

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
                        $user->increment('total_spent', intval($order->total));

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
            return response()->json(['valid' => false, 'message' => 'Mã đã hết hạn hoặc đã sử dụng hết'], 422);
        }

        // Check user scope
        if ($voucher->scope === 'user') {
            $user = auth('sanctum')->user();
            if (!$user || !$voucher->isValidForUser($user->id)) {
                return response()->json(['valid' => false, 'message' => 'Mã này không dành cho bạn'], 422);
            }
            // Check per-user limit
            if (!$voucher->isWithinUserLimit($user->id)) {
                return response()->json(['valid' => false, 'message' => 'Bạn đã sử dụng hết lượt cho mã này'], 422);
            }
        }

        // Check all_users scope (any logged-in user)
        if ($voucher->scope === 'all_users') {
            $user = auth('sanctum')->user();
            if (!$user) {
                return response()->json(['valid' => false, 'message' => 'Vui lòng đăng nhập để sử dụng mã này'], 422);
            }
            if (!$voucher->isWithinUserLimit($user->id)) {
                return response()->json(['valid' => false, 'message' => 'Bạn đã sử dụng hết lượt cho mã này'], 422);
            }
        }

        // Check product scope
        if ($voucher->scope === 'product' && $request->has('product_ids')) {
            $cartProductIds = $request->product_ids;
            $voucherProductIds = $voucher->products()->pluck('products.id')->toArray();
            $matched = array_intersect($cartProductIds, $voucherProductIds);
            if (empty($matched)) {
                return response()->json(['valid' => false, 'message' => 'Mã không áp dụng cho sản phẩm trong giỏ hàng'], 422);
            }
        }

        return response()->json([
            'valid' => true,
            'voucher' => $voucher,
            'discount' => $voucher->calculateDiscount($subtotal),
        ]);
    }
}

