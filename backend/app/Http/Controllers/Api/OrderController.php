<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with('items')->orderBy('created_at', 'desc');

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
        return response()->json($order->load('items'));
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

        $order = Order::create([
            'order_number'   => Order::generateOrderNumber(),
            'payment_code'   => Order::generatePaymentCode(),
            'customer_name'  => $data['customer_name'],
            'customer_email' => $data['customer_email'] ?? null,
            'customer_phone' => $data['customer_phone'],
            'address'        => $data['address'],
            'city'           => $data['city'] ?? null,
            'district'       => $data['district'] ?? null,
            'ward'           => $data['ward'] ?? null,
            'subtotal'       => $subtotal,
            'shipping'       => $shipping,
            'total'          => $subtotal + $shipping,
            'payment_method' => $data['payment_method'] ?? 'cod',
            'note'           => $data['note'] ?? null,
        ]);

        foreach ($data['items'] as $item) {
            $order->items()->create($item);
        }

        return response()->json($order->load('items'), 201);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => 'required|string|in:pending,confirmed,shipping,delivered,cancelled',
            'payment_status' => 'nullable|string|in:unpaid,paid',
        ]);

        $order->update($data);

        return response()->json($order);
    }

    public function destroy(Order $order)
    {
        $order->delete();
        return response()->json(['message' => 'Xóa đơn hàng thành công']);
    }
}
