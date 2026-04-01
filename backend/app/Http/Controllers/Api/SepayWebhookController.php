<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\SepayTransaction;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SepayWebhookController extends Controller
{
    /**
     * Nhận webhook từ SePay
     * POST /api/webhook/sepay
     *
     * SePay gửi header: Authorization: Apikey YOUR_API_KEY
     * Payload JSON:
     * {
     *   "id": 92704,
     *   "gateway": "Vietcombank",
     *   "transactionDate": "2023-03-25 14:02:37",
     *   "accountNumber": "0123499999",
     *   "code": "GLASS123456",        // mã đơn hàng trong nội dung CK
     *   "content": "Thanh toan GLASS123456",
     *   "transferType": "in",         // in | out
     *   "transferAmount": 2277000,
     *   "accumulated": 19077000,
     *   "subAccount": null,
     *   "referenceCode": "MBVCB.3278907687",
     *   "description": ""
     * }
     */
    public function handle(Request $request)
    {
        // ── 1. Xác thực API Key ───────────────────────────────────────────
        // Ưu tiên: DB Settings → config → env
        $apiKey = Setting::getValue('payment_sepay_api_key')
            ?: config('services.sepay.api_key', env('SEPAY_API_KEY', ''));
        if ($apiKey) {
            $authHeader = $request->header('Authorization', '');
            $providedKey = str_replace('Apikey ', '', $authHeader);
            if ($providedKey !== $apiKey) {
                Log::warning('SePay webhook: Sai API Key', ['header' => $authHeader]);
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }
        }

        // ── 2. Parse dữ liệu ─────────────────────────────────────────────
        $data = $request->all();

        if (empty($data) || !isset($data['id'])) {
            Log::warning('SePay webhook: Dữ liệu rỗng hoặc thiếu id', $data);
            return response()->json(['success' => false, 'message' => 'Invalid data'], 400);
        }

        $sepayId       = $data['id'];
        $transferType  = $data['transferType'] ?? 'in';
        $transferAmount = (float)($data['transferAmount'] ?? 0);
        $code          = $data['code'] ?? null;       // mã đơn hàng
        $content       = $data['content'] ?? '';
        $gateway       = $data['gateway'] ?? '';
        $referenceCode = $data['referenceCode'] ?? null;

        // Chỉ xử lý giao dịch tiền VÀO
        if ($transferType !== 'in') {
            return response()->json(['success' => true, 'message' => 'Bỏ qua giao dịch tiền ra']);
        }

        // ── 3. Chống trùng lặp: kiểm tra sepay_id đã tồn tại chưa ───────
        if (SepayTransaction::where('sepay_id', $sepayId)->exists()) {
            Log::info("SePay webhook: Giao dịch #{$sepayId} đã được xử lý trước đó");
            return response()->json(['success' => true, 'message' => 'Giao dịch đã xử lý']);
        }

        // ── 4. Lưu log giao dịch ─────────────────────────────────────────
        $txn = SepayTransaction::create([
            'sepay_id'         => $sepayId,
            'gateway'          => $gateway,
            'transaction_date' => $data['transactionDate'] ?? now(),
            'account_number'   => $data['accountNumber'] ?? null,
            'sub_account'      => $data['subAccount'] ?? null,
            'amount_in'        => $transferType === 'in' ? $transferAmount : 0,
            'amount_out'       => $transferType === 'out' ? $transferAmount : 0,
            'accumulated'      => (float)($data['accumulated'] ?? 0),
            'code'             => $code,
            'content'          => $content,
            'reference_code'   => $referenceCode,
            'raw_body'         => $data,
            'processed'        => false,
        ]);

        Log::info("SePay webhook: Đã lưu giao dịch #{$sepayId}", [
            'amount' => $transferAmount,
            'code'   => $code,
        ]);

        // ── 5. Tìm đơn hàng tương ứng ────────────────────────────────────
        $order = null;

        // Ưu tiên 1: Khớp payment_code (mã thanh toán đặt vào nội dung CK)
        if ($code) {
            $order = Order::where('payment_code', $code)
                ->whereIn('payment_status', ['unpaid', 'pending'])
                ->first();
        }

        // Ưu tiên 2: Tìm trong nội dung chuyển khoản theo order_number
        if (!$order && $content) {
            $order = Order::whereIn('payment_status', ['unpaid', 'pending'])
                ->where(function ($q) use ($content) {
                    // Thử khớp order_number trong nội dung
                    $q->whereRaw('INSTR(?, order_number) > 0', [$content])
                      ->orWhereRaw('INSTR(?, payment_code) > 0', [$content]);
                })
                ->orderBy('created_at', 'desc')
                ->first();
        }

        // ── 6. Cập nhật thanh toán đơn hàng ──────────────────────────────
        if ($order) {
            // Kiểm tra số tiền (cho phép sai lệch ±1000đ)
            $amountMatch = abs($transferAmount - $order->total) <= 1000;

            if ($amountMatch || $transferAmount >= $order->total) {
                $order->update([
                    'payment_status' => 'paid',
                    'status'         => 'confirmed',
                ]);

                $txn->update([
                    'processed'    => true,
                    'order_id'     => $order->id,
                    'process_note' => "Tự động xác nhận thanh toán. Số tiền: {$transferAmount}đ",
                ]);

                Log::info("SePay webhook: Xác nhận thanh toán đơn #{$order->order_number}", [
                    'order_id'   => $order->id,
                    'amount'     => $transferAmount,
                    'sepay_id'   => $sepayId,
                ]);
            } else {
                // Số tiền không khớp → ghi chú nhưng không tự động xác nhận
                $txn->update([
                    'processed'    => false,
                    'order_id'     => $order->id,
                    'process_note' => "Số tiền không khớp: nhận {$transferAmount}đ, cần {$order->total}đ",
                ]);

                Log::warning("SePay webhook: Số tiền không khớp đơn #{$order->order_number}", [
                    'received' => $transferAmount,
                    'expected' => $order->total,
                ]);
            }
        } else {
            // Không tìm thấy đơn hàng khớp
            $txn->update([
                'process_note' => "Không tìm thấy đơn hàng với code: {$code}",
            ]);

            Log::warning("SePay webhook: Không tìm thấy đơn hàng", [
                'code'    => $code,
                'content' => $content,
                'amount'  => $transferAmount,
            ]);
        }

        // ── 7. Response cho SePay ─────────────────────────────────────────
        return response()->json(['success' => true], 200);
    }
}
