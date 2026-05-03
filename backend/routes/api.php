<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\BannerController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\SepayWebhookController;
use App\Http\Controllers\Api\FaqController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\VoucherController;
use App\Http\Controllers\Api\AddonGroupController;
use App\Http\Controllers\Api\ProductAttributeController;
use App\Http\Controllers\Api\ShippingController;
use App\Http\Controllers\Api\MerchantController;
use App\Http\Controllers\Api\ArticleCategoryController;
use App\Http\Controllers\Api\AiContentQueueController;

/*
|--------------------------------------------------------------------------
| API Routes - Glass Eyewear
|--------------------------------------------------------------------------
*/

// ==========================================
// SEPAY WEBHOOK
// ==========================================
Route::post('/webhook/sepay', [SepayWebhookController::class, 'handle']);
Route::post('/webhook/viettelpost', [ShippingController::class, 'webhook']);

// ==========================================
// PUBLIC ROUTES
// ==========================================
Route::prefix('public')->group(function () {
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{slugOrId}', [ProductController::class, 'show']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{slugOrId}', [CategoryController::class, 'show']);
    Route::get('/articles', [ArticleController::class, 'index']);
    Route::get('/articles/{slugOrId}', [ArticleController::class, 'show']);
    Route::get('/article-categories', [ArticleCategoryController::class, 'index']);
    Route::get('/article-categories/{slugOrId}', [ArticleCategoryController::class, 'show']);
    Route::get('/pages/{slugOrId}', [PageController::class, 'show']);
    Route::get('/banners', [BannerController::class, 'index']);
    Route::get('/menus', [MenuController::class, 'index']);
    Route::get('/settings', [SettingController::class, 'index']);
    Route::get('/font-file', [SettingController::class, 'serveFont']);
    Route::get('/faqs', [FaqController::class, 'index']);
    Route::get('/collections', [CollectionController::class, 'index']);
    Route::get('/collections/{slugOrId}', [CollectionController::class, 'show']);
    Route::get('/vouchers', [VoucherController::class, 'publicIndex']);
    Route::get('/addon-groups', [AddonGroupController::class, 'index']);
    Route::get('/product-attributes', [ProductAttributeController::class, 'publicIndex']);

    // Global search (products + articles)
    Route::get('/search', function (\Illuminate\Http\Request $request) {
        $q = $request->input('q', '');
        if (strlen($q) < 2) return response()->json(['products' => [], 'articles' => []]);

        $products = \App\Models\Product::where('is_active', true)
            ->where(function ($query) use ($q) {
                $query->where('name', 'LIKE', "%{$q}%")
                      ->orWhere('sku', 'LIKE', "%{$q}%")
                      ->orWhere('brand', 'LIKE', "%{$q}%");
            })
            ->select('id', 'name', 'slug', 'thumbnail', 'price', 'sale_price')
            ->limit(5)
            ->get();

        $articles = \App\Models\Article::where('is_published', true)
            ->where(function ($query) use ($q) {
                $query->where('title', 'LIKE', "%{$q}%")
                      ->orWhere('excerpt', 'LIKE', "%{$q}%");
            })
            ->select('id', 'title', 'slug', 'thumbnail', 'excerpt')
            ->limit(3)
            ->get();

        return response()->json([
            'products' => $products,
            'articles' => $articles,
        ]);
    });

    // Orders (public create)
    Route::post('/orders', [OrderController::class, 'store']);
    Route::post('/orders/validate-voucher', [OrderController::class, 'validateVoucher']);
    Route::get('/orders/{id}/payment-status', function ($id) {
        $order = \App\Models\Order::findOrFail($id);
        return response()->json([
            'id' => $order->id,
            'payment_status' => $order->payment_status,
            'status' => $order->status,
        ]);
    });

    // Newsletter
    Route::post('/newsletter', function (\Illuminate\Http\Request $request) {
        $request->validate(['email' => 'required|email']);
        \App\Models\NewsletterSubscriber::updateOrCreate(
            ['email' => $request->email],
            ['is_active' => true]
        );
        return response()->json(['success' => true, 'message' => 'Đăng ký thành công!']);
    });

    // Tra cứu đơn hàng (không cần login)
    Route::post('/orders/lookup', [UserController::class, 'lookupOrder']);

    // Reviews
    Route::get('/products/{productId}/reviews', [ReviewController::class, 'productReviews']);
    Route::post('/reviews', [ReviewController::class, 'store']);

    // Viettel Post public
    Route::post('/shipping/track', [ShippingController::class, 'trackOrder']);
    Route::post('/shipping/calculate-fee', [ShippingController::class, 'calculateFee']);
    Route::get('/shipping/provinces', [ShippingController::class, 'getProvinces']);
    Route::get('/shipping/districts', [ShippingController::class, 'getDistricts']);
    Route::get('/shipping/wards', [ShippingController::class, 'getWards']);

    // AI
    Route::post('/ai/try-on', [AiController::class, 'tryOn']);
});

// ==========================================
// AUTH ROUTES
// ==========================================
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// ==========================================
// CUSTOMER AUTH ROUTES
// ==========================================
Route::middleware('auth:sanctum')->prefix('user')->group(function () {
    Route::get('/profile', [UserController::class, 'getProfile']);
    Route::put('/profile', [UserController::class, 'updateProfile']);
    Route::put('/change-password', [UserController::class, 'changePassword']);
    Route::put('/change-email', [UserController::class, 'changeEmail']);
    Route::get('/orders', [UserController::class, 'getMyOrders']);
    Route::get('/points', [UserController::class, 'getPoints']);
    Route::post('/redeem', [UserController::class, 'redeemPoints']);
    Route::get('/vouchers', [UserController::class, 'getMyVouchers']);
    Route::get('/notifications', [UserController::class, 'getNotifications']);
    Route::put('/notifications/{id}/read', [UserController::class, 'markNotificationRead']);
    Route::put('/notifications/read-all', [UserController::class, 'markAllNotificationsRead']);
});

// ==========================================
// ADMIN ROUTES (auth required)
// ==========================================
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Products CRUD
    Route::apiResource('products', ProductController::class);
    Route::get('/products-export', [ProductController::class, 'exportExcel']);
    Route::post('/products-import', [ProductController::class, 'importExcel']);
    Route::get('/products-import-template', [ProductController::class, 'importTemplate']);
    Route::put('/products/{product}/constraints', [ProductController::class, 'saveConstraints']);
    Route::post('/products/{product}/clone', [ProductController::class, 'clone']);

    // Categories CRUD
    Route::apiResource('categories', CategoryController::class);

    // Media
    Route::get('/media', [MediaController::class, 'index']);
    Route::post('/media/upload', [MediaController::class, 'upload']);
    Route::put('/media/{media}', [MediaController::class, 'update']);
    Route::delete('/media/{media}', [MediaController::class, 'destroy']);

    // Menus
    Route::get('/menus/all', [MenuController::class, 'all']);
    Route::apiResource('menus', MenuController::class);
    Route::put('/menus-reorder', [MenuController::class, 'reorder']);

    // Banners
    Route::apiResource('banners', BannerController::class);

    // Settings
    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);
    Route::post('/settings/font-upload', [SettingController::class, 'uploadFont']);
    Route::delete('/settings/font-delete', [SettingController::class, 'deleteFont']);

    // Articles
    Route::apiResource('articles', ArticleController::class);

    // Article Categories
    Route::apiResource('article-categories', ArticleCategoryController::class)->parameters([
        'article-categories' => 'articleCategory',
    ]);

    // Pages
    Route::apiResource('pages', PageController::class);

    // FAQs
    Route::apiResource('faqs', FaqController::class);

    // Collections
    Route::apiResource('collections', CollectionController::class);
    Route::put('/collections-reorder', [CollectionController::class, 'reorder']);

    // Vouchers
    Route::apiResource('vouchers', VoucherController::class);

    // Addon Groups (global variants)
    Route::apiResource('addon-groups', AddonGroupController::class)->parameters([
        'addon-groups' => 'addonGroup',
    ]);
    Route::put('/addon-constraints', [AddonGroupController::class, 'saveConstraints']);

    // Orders (admin)
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::put('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::delete('/orders/{order}', [OrderController::class, 'destroy']);

    // Reviews
    Route::get('/reviews', [ReviewController::class, 'index']);
    Route::put('/reviews/{review}/approve', [ReviewController::class, 'approve']);
    Route::put('/reviews/{review}/reply', [ReviewController::class, 'reply']);
    Route::delete('/reviews/{review}', [ReviewController::class, 'destroy']);

    // AI
    Route::post('/ai/try-on', [AiController::class, 'tryOn']);
    Route::post('/ai/content', [AiController::class, 'generateContent']);
    Route::post('/ai/content-with-images', [AiController::class, 'generateContentWithImages']);

    // AI Content Queue
    Route::get('/ai/queue', [AiContentQueueController::class, 'index']);
    Route::post('/ai/queue', [AiContentQueueController::class, 'store']);
    Route::delete('/ai/queue/{aiContentQueue}', [AiContentQueueController::class, 'destroy']);
    Route::delete('/ai/queue-clear', [AiContentQueueController::class, 'clearPending']);
    Route::post('/ai/queue-process', [AiContentQueueController::class, 'processNext']);
    Route::post('/ai/queue-process-batch', [AiContentQueueController::class, 'processBatch']);
    Route::get('/ai/queue-settings', [AiContentQueueController::class, 'settings']);
    Route::put('/ai/queue-settings', [AiContentQueueController::class, 'updateSettings']);

    // === ADMIN: Users ===
    Route::get('/admin/users', [AdminUserController::class, 'index']);
    Route::get('/admin/users/search', [AdminUserController::class, 'searchUsers']);
    Route::get('/admin/users/{id}', [AdminUserController::class, 'show']);
    Route::put('/admin/users/{id}/points', [AdminUserController::class, 'adjustPoints']);
    Route::put('/admin/users/{id}/toggle-active', [AdminUserController::class, 'toggleActive']);

    // === ADMIN: Notifications ===
    Route::get('/admin/notifications', [AdminUserController::class, 'getNotifications']);
    Route::post('/admin/notifications', [AdminUserController::class, 'storeNotification']);
    Route::delete('/admin/notifications/{id}', [AdminUserController::class, 'destroyNotification']);

    // === ADMIN: Product Attributes ===
    Route::get('/admin/product-attributes', [ProductAttributeController::class, 'index']);
    Route::post('/admin/product-attributes', [ProductAttributeController::class, 'store']);
    Route::put('/admin/product-attributes/{attribute}', [ProductAttributeController::class, 'update']);
    Route::delete('/admin/product-attributes/{attribute}', [ProductAttributeController::class, 'destroy']);
    Route::post('/admin/product-attributes/reorder', [ProductAttributeController::class, 'reorder']);

    // SePay Transactions
    Route::get('/sepay/transactions', function () {
        $txns = \App\Models\SepayTransaction::with('order:id,order_number,customer_name,total')
            ->orderBy('created_at', 'desc')
            ->paginate(request('per_page', 20));
        return response()->json($txns);
    });

    // === Viettel Post Shipping (Admin) ===
    Route::post('/shipping/get-token', [ShippingController::class, 'getToken']);
    Route::get('/shipping/test-connection', [ShippingController::class, 'testConnection']);
    Route::post('/shipping/push-order/{order}', [ShippingController::class, 'pushOrder']);
    Route::post('/shipping/cancel-order/{order}', [ShippingController::class, 'cancelVtpOrder']);

    // === Google Merchant Center (Admin) ===
    Route::get('/merchant/status', [MerchantController::class, 'status']);
    Route::post('/merchant/sync-all', [MerchantController::class, 'syncAll']);
    Route::post('/merchant/sync/{product}', [MerchantController::class, 'syncOne']);
    Route::delete('/merchant/delete/{product}', [MerchantController::class, 'deleteOne']);
});
