<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Voucher;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VoucherController extends Controller
{
    /**
     * Public: Get active vouchers (scope=all only)
     */
    public function publicIndex()
    {
        $vouchers = Voucher::where('is_active', true)
            ->where('scope', 'all')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->where(function ($q) {
                $q->where('max_uses', 0)
                  ->orWhereColumn('used_count', '<', 'max_uses');
            })
            ->orderBy('value', 'desc')
            ->get();

        return response()->json($vouchers);
    }

    /**
     * Admin: List all vouchers
     */
    public function index(Request $request)
    {
        $query = Voucher::with('user:id,name,email')
            ->withCount('products')
            ->orderBy('created_at', 'desc');

        if ($request->filled('scope')) {
            $query->where('scope', $request->scope);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        return response()->json($query->get());
    }

    /**
     * Admin: Create voucher
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'code'           => 'nullable|string|max:50|unique:vouchers,code',
            'description'    => 'nullable|string|max:255',
            'type'           => 'required|in:fixed,percent',
            'scope'          => 'required|in:all,product,user',
            'value'          => 'required|numeric|min:0',
            'min_order'      => 'nullable|numeric|min:0',
            'max_discount'   => 'nullable|numeric|min:0',
            'max_uses'       => 'nullable|integer|min:0',
            'per_user_limit' => 'nullable|integer|min:0',
            'expires_at'     => 'nullable|date',
            'is_active'      => 'nullable|boolean',
            'user_id'        => 'nullable|exists:users,id',
            'product_ids'    => 'nullable|array',
            'product_ids.*'  => 'exists:products,id',
        ]);

        // Auto-generate code if empty
        if (empty($data['code'])) {
            $data['code'] = strtoupper(Str::random(8));
        }

        $data['min_order'] = $data['min_order'] ?? 0;
        $data['max_uses'] = $data['max_uses'] ?? 0;
        $data['per_user_limit'] = $data['per_user_limit'] ?? 1;

        $productIds = $data['product_ids'] ?? [];
        unset($data['product_ids']);

        $voucher = Voucher::create($data);

        // Attach products for scope=product
        if ($data['scope'] === 'product' && !empty($productIds)) {
            $voucher->products()->attach($productIds);
        }

        // Send notification for scope=user
        if ($data['scope'] === 'user' && !empty($data['user_id'])) {
            $this->notifyUser($voucher);
        }

        return response()->json($voucher->load('products'), 201);
    }

    /**
     * Admin: Update voucher
     */
    public function update(Request $request, Voucher $voucher)
    {
        $data = $request->validate([
            'code'           => 'sometimes|string|max:50|unique:vouchers,code,' . $voucher->id,
            'description'    => 'nullable|string|max:255',
            'type'           => 'sometimes|in:fixed,percent',
            'scope'          => 'sometimes|in:all,product,user',
            'value'          => 'sometimes|numeric|min:0',
            'min_order'      => 'nullable|numeric|min:0',
            'max_discount'   => 'nullable|numeric|min:0',
            'max_uses'       => 'nullable|integer|min:0',
            'per_user_limit' => 'nullable|integer|min:0',
            'expires_at'     => 'nullable|date',
            'is_active'      => 'nullable|boolean',
            'user_id'        => 'nullable|exists:users,id',
            'product_ids'    => 'nullable|array',
            'product_ids.*'  => 'exists:products,id',
        ]);

        $productIds = $data['product_ids'] ?? null;
        unset($data['product_ids']);

        $voucher->update($data);

        // Sync products if provided
        if ($productIds !== null) {
            $voucher->products()->sync($productIds);
        }

        // Notify user if scope changed to user
        if (isset($data['scope']) && $data['scope'] === 'user' && !empty($data['user_id'])) {
            $this->notifyUser($voucher);
        }

        return response()->json($voucher->load('products'));
    }

    /**
     * Admin: Delete voucher
     */
    public function destroy(Voucher $voucher)
    {
        $voucher->products()->detach();
        $voucher->delete();
        return response()->json(['message' => 'Xóa voucher thành công']);
    }

    /**
     * Send notification to assigned user
     */
    private function notifyUser(Voucher $voucher)
    {
        if (!$voucher->user_id) return;

        $discountText = $voucher->type === 'percent'
            ? "giảm {$voucher->value}%"
            : "giảm " . number_format((float)$voucher->value) . "đ";

        $maxText = ($voucher->type === 'percent' && $voucher->max_discount > 0)
            ? " (tối đa " . number_format((float)$voucher->max_discount) . "đ)"
            : "";

        $expiresText = $voucher->expires_at
            ? " | HSD: " . $voucher->expires_at->format('d/m/Y')
            : "";

        try {
            Notification::create([
                'title' => "🎁 Bạn nhận được voucher {$voucher->code}!",
                'content' => "Voucher {$discountText}{$maxText} cho đơn từ " . number_format((float)$voucher->min_order) . "đ{$expiresText}. Dùng mã: {$voucher->code}",
                'type' => 'promo',
                'target_type' => 'individual',
                'target_user_ids' => [$voucher->user_id],
                'sender_id' => auth()->id(),
            ]);
        } catch (\Exception $e) {
            \Log::warning('Voucher notification failed: ' . $e->getMessage());
        }
    }
}
