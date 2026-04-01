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

/*
|--------------------------------------------------------------------------
| API Routes - Glass Eyewear
|--------------------------------------------------------------------------
*/

// ==========================================
// SEPAY WEBHOOK (public, xác thực bằng API Key trong header)
// ==========================================
Route::post('/webhook/sepay', [SepayWebhookController::class, 'handle']);

Route::prefix('public')->group(function () {
    // Products (public listing)
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{slugOrId}', [ProductController::class, 'show']);

    // Categories
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{slugOrId}', [CategoryController::class, 'show']);

    // Articles
    Route::get('/articles', [ArticleController::class, 'index']);
    Route::get('/articles/{slugOrId}', [ArticleController::class, 'show']);

    // Pages (static pages)
    Route::get('/pages/{slugOrId}', [PageController::class, 'show']);

    // Banners (active only)
    Route::get('/banners', [BannerController::class, 'index']);

    // Menus (by position)
    Route::get('/menus', [MenuController::class, 'index']);

    // Settings (public readable)
    Route::get('/settings', [SettingController::class, 'index']);

    // FAQs (public active)
    Route::get('/faqs', [FaqController::class, 'index']);

    // Orders (create from frontend)
    Route::post('/orders', [OrderController::class, 'store']);

    // Kiểm tra trạng thái thanh toán (polling từ frontend)
    Route::get('/orders/{id}/payment-status', function ($id) {
        $order = \App\Models\Order::findOrFail($id);
        return response()->json([
            'id'             => $order->id,
            'payment_status' => $order->payment_status,
            'status'         => $order->status,
        ]);
    });

    // Reviews
    Route::get('/products/{productId}/reviews', [ReviewController::class, 'productReviews']);
    Route::post('/reviews', [ReviewController::class, 'store']);

    // AI Virtual Try-On (public, không cần đăng nhập)
    Route::post('/ai/try-on', [AiController::class, 'tryOn']);
});

// ==========================================
// AUTH ROUTES
// ==========================================
Route::post('/auth/login', [AuthController::class, 'login']);

// ==========================================
// PROTECTED ROUTES (admin auth required)
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

    // Articles
    Route::apiResource('articles', ArticleController::class);

    // Pages
    Route::apiResource('pages', PageController::class);

    // FAQs
    Route::apiResource('faqs', FaqController::class);

    // Orders
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

    // SePay Transactions (admin xem log)
    Route::get('/sepay/transactions', function () {
        $txns = \App\Models\SepayTransaction::with('order:id,order_number,customer_name,total')
            ->orderBy('created_at', 'desc')
            ->paginate(request('per_page', 20));
        return response()->json($txns);
    });
});
