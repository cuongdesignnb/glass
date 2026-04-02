<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Voucher;
use App\Models\LoyaltyTransaction;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Thông tin đăng nhập không chính xác.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Tài khoản của bạn đã bị khóa.'],
            ]);
        }

        $tokenName = $user->isAdmin() ? 'admin-token' : 'customer-token';
        $token = $user->createToken($tokenName)->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'phone' => 'nullable|string|max:20',
            'province' => 'nullable|string',
            'ward' => 'nullable|string',
            'address_detail' => 'nullable|string',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => 'customer',
            'phone' => $data['phone'] ?? null,
            'province' => $data['province'] ?? null,
            'ward' => $data['ward'] ?? null,
            'address_detail' => $data['address_detail'] ?? null,
        ]);

        // Tặng phần thưởng đăng ký
        $reward = $this->grantRegistrationReward($user);

        $token = $user->createToken('customer-token')->plainTextToken;

        return response()->json([
            'user' => $user->fresh(),
            'token' => $token,
            'reward' => $reward,
        ], 201);
    }

    private function grantRegistrationReward(User $user): ?array
    {
        $settings = Setting::where('group', 'rewards')->pluck('value', 'key');
        $rewardType = $settings['reward_type'] ?? 'none';

        if ($rewardType === 'none') return null;

        if ($rewardType === 'voucher') {
            $discount = $settings['voucher_discount'] ?? 10;
            $voucherType = $settings['voucher_type'] ?? 'percent';
            $minOrder = $settings['voucher_min_order'] ?? 0;

            $voucher = Voucher::create([
                'code' => 'WELCOME-' . strtoupper(Str::random(6)),
                'type' => $voucherType,
                'value' => $discount,
                'min_order' => $minOrder,
                'max_uses' => 1,
                'expires_at' => now()->addDays(30),
                'user_id' => $user->id,
            ]);

            return [
                'type' => 'voucher',
                'voucher_code' => $voucher->code,
                'voucher_value' => $voucher->value,
                'voucher_type' => $voucher->type,
                'message' => "Chào mừng! Bạn nhận được voucher giảm giá {$discount}" . ($voucherType === 'percent' ? '%' : 'đ'),
            ];
        }

        if ($rewardType === 'product') {
            $productId = $settings['reward_product_id'] ?? null;
            if ($productId) {
                $product = \App\Models\Product::find($productId);
                if ($product) {
                    return [
                        'type' => 'product',
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'message' => "Chào mừng! Bạn được tặng sản phẩm: {$product->name}",
                    ];
                }
            }
        }

        if ($rewardType === 'points') {
            $bonusPoints = intval($settings['register_bonus_points'] ?? 0);
            if ($bonusPoints > 0) {
                $user->increment('points', $bonusPoints);
                LoyaltyTransaction::create([
                    'user_id' => $user->id,
                    'type' => 'register_bonus',
                    'points' => $bonusPoints,
                    'description' => "Điểm thưởng đăng ký thành viên",
                ]);
                return [
                    'type' => 'points',
                    'points' => $bonusPoints,
                    'message' => "Chào mừng! Bạn nhận được {$bonusPoints} điểm thưởng!",
                ];
            }
        }

        return null;
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Đăng xuất thành công']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->unread_notifications = $user->unreadNotificationsCount();
        return response()->json($user);
    }
}
