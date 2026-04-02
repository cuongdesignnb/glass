<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Order;
use App\Models\LoyaltyTransaction;
use App\Models\Voucher;
use App\Models\Notification;
use App\Models\NotificationRead;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    // ===================== PROFILE =====================

    public function getProfile(Request $request)
    {
        $user = $request->user();
        $user->unread_notifications = $user->unreadNotificationsCount();
        return response()->json($user);
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|nullable|string|max:20',
            'province' => 'sometimes|nullable|string',
            'ward' => 'sometimes|nullable|string',
            'address_detail' => 'sometimes|nullable|string',
            'avatar' => 'sometimes|nullable|string',
        ]);

        $request->user()->update($data);
        return response()->json($request->user()->fresh());
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Mật khẩu hiện tại không chính xác'], 422);
        }

        $user->update(['password' => $request->password]);
        return response()->json(['message' => 'Đổi mật khẩu thành công']);
    }

    public function changeEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users,email,' . $request->user()->id,
            'password' => 'required|string',
        ]);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Mật khẩu không chính xác'], 422);
        }

        $user->update(['email' => $request->email]);
        return response()->json(['message' => 'Đổi email thành công', 'email' => $request->email]);
    }

    // ===================== ORDERS =====================

    public function getMyOrders(Request $request)
    {
        $orders = Order::with('items')
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json($orders);
    }

    // Tra cứu đơn hàng không cần login (mã đơn + SĐT)
    public function lookupOrder(Request $request)
    {
        $request->validate([
            'order_number' => 'required|string',
            'phone' => 'required|string',
        ]);

        $order = Order::with('items')
            ->where('order_number', $request->order_number)
            ->where('customer_phone', $request->phone)
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
        }

        return response()->json($order);
    }

    // ===================== LOYALTY POINTS =====================

    public function getPoints(Request $request)
    {
        $user = $request->user();
        $transactions = LoyaltyTransaction::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        // Lấy config tích điểm
        $settings = Setting::where('group', 'rewards')->pluck('value', 'key');

        return response()->json([
            'points' => $user->points,
            'total_spent' => $user->total_spent,
            'transactions' => $transactions,
            'config' => [
                'points_per_vnd' => intval($settings['points_per_vnd'] ?? 10000),
                'vnd_per_point' => intval($settings['vnd_per_point'] ?? 1000),
                'min_redeem' => intval($settings['min_redeem_points'] ?? 100),
            ],
        ]);
    }

    public function redeemPoints(Request $request)
    {
        $request->validate([
            'points' => 'required|integer|min:1',
        ]);

        $user = $request->user();
        $settings = Setting::where('group', 'rewards')->pluck('value', 'key');
        $minRedeem = intval($settings['min_redeem_points'] ?? 100);
        $vndPerPoint = intval($settings['vnd_per_point'] ?? 1000);

        if ($request->points < $minRedeem) {
            return response()->json(['message' => "Cần tối thiểu {$minRedeem} điểm để đổi thưởng"], 422);
        }

        if ($user->points < $request->points) {
            return response()->json(['message' => 'Không đủ điểm'], 422);
        }

        $discount = $request->points * $vndPerPoint;

        // Tạo voucher từ điểm
        $voucher = Voucher::create([
            'code' => 'PTS-' . strtoupper(Str::random(6)),
            'type' => 'fixed',
            'value' => $discount,
            'min_order' => 0,
            'max_uses' => 1,
            'expires_at' => now()->addDays(30),
            'user_id' => $user->id,
        ]);

        $user->decrement('points', $request->points);

        LoyaltyTransaction::create([
            'user_id' => $user->id,
            'type' => 'redeem',
            'points' => -$request->points,
            'description' => "Đổi {$request->points} điểm → voucher {$voucher->code}",
        ]);

        return response()->json([
            'message' => "Đổi thành công! Voucher: {$voucher->code}",
            'voucher' => $voucher,
            'remaining_points' => $user->fresh()->points,
        ]);
    }

    // ===================== VOUCHERS =====================

    public function getMyVouchers(Request $request)
    {
        $vouchers = Voucher::where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->whereColumn('used_count', '<', 'max_uses')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($vouchers);
    }

    // ===================== NOTIFICATIONS =====================

    public function getNotifications(Request $request)
    {
        $user = $request->user();
        $notifications = Notification::forUser($user)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        $readIds = NotificationRead::where('user_id', $user->id)->pluck('notification_id')->toArray();

        $notifications->getCollection()->transform(function ($n) use ($readIds) {
            $n->is_read = in_array($n->id, $readIds);
            return $n;
        });

        return response()->json($notifications);
    }

    public function markNotificationRead(Request $request, $id)
    {
        NotificationRead::firstOrCreate([
            'notification_id' => $id,
            'user_id' => $request->user()->id,
        ], ['read_at' => now()]);

        return response()->json(['message' => 'ok']);
    }

    public function markAllNotificationsRead(Request $request)
    {
        $user = $request->user();
        $notificationIds = Notification::forUser($user)->pluck('id');
        $readIds = NotificationRead::where('user_id', $user->id)->pluck('notification_id');
        $unreadIds = $notificationIds->diff($readIds);

        foreach ($unreadIds as $nId) {
            NotificationRead::create([
                'notification_id' => $nId,
                'user_id' => $user->id,
                'read_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Đã đánh dấu tất cả là đã đọc']);
    }
}
