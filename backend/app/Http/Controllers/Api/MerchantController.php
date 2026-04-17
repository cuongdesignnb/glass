<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Setting;
use App\Services\GoogleMerchantService;
use Illuminate\Http\Request;

class MerchantController extends Controller
{
    /**
     * Check connection and return configuration status.
     */
    public function status(GoogleMerchantService $svc)
    {
        $configured = $svc->isConfigured();
        $data = [
            'configured' => $configured,
            'merchant_id' => Setting::getValue('merchant_center_id'),
            'country' => Setting::getValue('merchant_country') ?: 'VN',
            'language' => Setting::getValue('merchant_language') ?: 'vi',
            'currency' => Setting::getValue('merchant_currency') ?: 'VND',
            'site_url' => Setting::getValue('site_url') ?: config('app.url'),
        ];

        if ($configured) {
            try {
                $svc->getAccessToken();
                $data['token_ok'] = true;
            } catch (\Throwable $e) {
                $data['token_ok'] = false;
                $data['token_error'] = $e->getMessage();
            }
        }

        return response()->json($data);
    }

    /**
     * Sync all active products to Google Merchant.
     */
    public function syncAll(Request $request, GoogleMerchantService $svc)
    {
        if (!$svc->isConfigured()) {
            return response()->json(['message' => 'Google Merchant chưa được cấu hình.'], 422);
        }

        $onlyActive = $request->boolean('only_active', true);
        $siteUrl = $request->input('site_url') ?: (Setting::getValue('site_url') ?: config('app.url'));

        $query = Product::with('category');
        if ($onlyActive) $query->where('is_active', true);

        $products = $query->get();

        try {
            $result = $svc->syncProducts($products, $siteUrl);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }

        return response()->json($result);
    }

    /**
     * Sync a single product.
     */
    public function syncOne(Request $request, int $productId, GoogleMerchantService $svc)
    {
        if (!$svc->isConfigured()) {
            return response()->json(['message' => 'Google Merchant chưa được cấu hình.'], 422);
        }

        $product = Product::with('category')->findOrFail($productId);
        $siteUrl = $request->input('site_url') ?: (Setting::getValue('site_url') ?: config('app.url'));

        try {
            $result = $svc->insertProduct($product, $siteUrl);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }

        return response()->json($result);
    }

    /**
     * Delete a product from Google Merchant.
     */
    public function deleteOne(int $productId, GoogleMerchantService $svc)
    {
        if (!$svc->isConfigured()) {
            return response()->json(['message' => 'Google Merchant chưa được cấu hình.'], 422);
        }

        $product = Product::findOrFail($productId);

        try {
            $result = $svc->deleteProduct($product);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }

        return response()->json($result);
    }
}
