<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Notification;
use App\Models\NotificationRead;
use App\Models\LoyaltyTransaction;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    // ===================== USERS =====================

    public function index(Request $request)
    {
        $query = User::where('role', 'customer')->withCount('orders');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        $sortBy = $request->get('sort', 'created_at');
        $sortDir = $request->get('dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    public function show($id)
    {
        $user = User::withCount('orders')->findOrFail($id);
        $recentOrders = $user->orders()->with('items')->latest()->limit(5)->get();
        $recentPoints = $user->loyaltyTransactions()->latest()->limit(10)->get();

        return response()->json([
            'user' => $user,
            'recent_orders' => $recentOrders,
            'recent_points' => $recentPoints,
        ]);
    }

    public function adjustPoints(Request $request, $id)
    {
        $data = $request->validate([
            'points' => 'required|integer',
            'description' => 'required|string|max:255',
        ]);

        $user = User::findOrFail($id);
        $type = $data['points'] > 0 ? 'admin_add' : 'admin_subtract';

        $user->increment('points', $data['points']);

        // Đảm bảo điểm không âm
        if ($user->fresh()->points < 0) {
            $user->update(['points' => 0]);
        }

        LoyaltyTransaction::create([
            'user_id' => $user->id,
            'type' => $type,
            'points' => $data['points'],
            'description' => $data['description'],
        ]);

        return response()->json([
            'message' => 'Cập nhật điểm thành công',
            'points' => $user->fresh()->points,
        ]);
    }

    public function toggleActive($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => !$user->is_active]);
        return response()->json(['is_active' => $user->is_active]);
    }

    // ===================== NOTIFICATIONS =====================

    public function getNotifications(Request $request)
    {
        $notifications = Notification::with('sender:id,name')
            ->withCount('reads')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($notifications);
    }

    public function storeNotification(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'type' => 'required|in:info,promo,order,system',
            'target_type' => 'required|in:all,group,individual',
            'target_group' => 'nullable|string|in:has_orders,has_points,new_members',
            'target_user_ids' => 'nullable|array',
            'target_user_ids.*' => 'integer|exists:users,id',
        ]);

        $data['sender_id'] = $request->user()->id;

        $notification = Notification::create($data);

        return response()->json($notification, 201);
    }

    public function destroyNotification($id)
    {
        Notification::findOrFail($id)->delete();
        return response()->json(['message' => 'Xóa thông báo thành công']);
    }

    // Search users for notification targeting
    public function searchUsers(Request $request)
    {
        $q = $request->get('q', '');
        $users = User::where('role', 'customer')
            ->where(function ($query) use ($q) {
                $query->where('name', 'like', "%{$q}%")
                      ->orWhere('email', 'like', "%{$q}%");
            })
            ->select('id', 'name', 'email')
            ->limit(20)
            ->get();

        return response()->json($users);
    }
}
