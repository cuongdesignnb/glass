<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\Product;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

/**
 * Google Merchant Center Content API v2.1 integration.
 *
 * Authenticates via Service Account (JWT -> OAuth2 access token),
 * and provides helpers to insert/delete products on Merchant Center.
 */
class GoogleMerchantService
{
    private const API_BASE = 'https://shoppingcontent.googleapis.com/content/v2.1';
    private const OAUTH_URL = 'https://oauth2.googleapis.com/token';
    private const SCOPE = 'https://www.googleapis.com/auth/content';

    protected string $merchantId;
    protected array $serviceAccount;
    protected string $country;
    protected string $language;
    protected string $currency;
    protected string $brandDefault;

    public function __construct()
    {
        $this->merchantId = (string) (Setting::getValue('merchant_center_id') ?? '');
        $this->country = (string) (Setting::getValue('merchant_country') ?: 'VN');
        $this->language = (string) (Setting::getValue('merchant_language') ?: 'vi');
        $this->currency = (string) (Setting::getValue('merchant_currency') ?: 'VND');
        $this->brandDefault = (string) (Setting::getValue('merchant_brand_default') ?: (Setting::getValue('site_name') ?? 'Glass'));

        $raw = (string) (Setting::getValue('merchant_service_account_json') ?? '');
        $decoded = json_decode($raw, true);
        $this->serviceAccount = is_array($decoded) ? $decoded : [];
    }

    public function isConfigured(): bool
    {
        return !empty($this->merchantId)
            && !empty($this->serviceAccount['client_email'])
            && !empty($this->serviceAccount['private_key']);
    }

    /**
     * Get OAuth2 access token via JWT assertion (Service Account flow).
     * Cached for ~55 minutes.
     */
    public function getAccessToken(): string
    {
        if (!$this->isConfigured()) {
            throw new \RuntimeException('Google Merchant chưa được cấu hình. Vui lòng cập nhật Merchant ID và Service Account JSON trong Cài Đặt.');
        }

        $cacheKey = 'gmc_access_token:' . md5($this->serviceAccount['client_email']);
        $cached = Cache::get($cacheKey);
        if ($cached) return $cached;

        $now = time();
        $header = ['alg' => 'RS256', 'typ' => 'JWT'];
        $claim = [
            'iss' => $this->serviceAccount['client_email'],
            'scope' => self::SCOPE,
            'aud' => self::OAUTH_URL,
            'exp' => $now + 3600,
            'iat' => $now,
        ];

        $b64 = fn($v) => rtrim(strtr(base64_encode(json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)), '+/', '-_'), '=');
        $unsigned = $b64($header) . '.' . $b64($claim);

        $privateKey = openssl_pkey_get_private($this->serviceAccount['private_key']);
        if (!$privateKey) {
            throw new \RuntimeException('Private key không hợp lệ trong Service Account JSON.');
        }
        openssl_sign($unsigned, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        $jwt = $unsigned . '.' . rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

        $resp = Http::asForm()->post(self::OAUTH_URL, [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        if (!$resp->successful()) {
            throw new \RuntimeException('Không lấy được access token từ Google: ' . $resp->body());
        }

        $token = $resp->json('access_token');
        $ttl = (int) ($resp->json('expires_in') ?? 3600);
        Cache::put($cacheKey, $token, max(60, $ttl - 120));

        return $token;
    }

    /**
     * Build Google Merchant product payload from a Product model.
     */
    public function buildProductPayload(Product $product, ?string $siteUrl = null): array
    {
        $siteUrl = rtrim($siteUrl ?: (string) (Setting::getValue('site_url') ?: config('app.url')), '/');
        $apiBase = rtrim((string) config('app.url'), '/');

        // Thumbnail: nếu relative thì ghép với apiBase (storage URL)
        $thumb = (string) ($product->thumbnail ?? '');
        if ($thumb && !str_starts_with($thumb, 'http')) {
            $thumb = $apiBase . '/' . ltrim($thumb, '/');
        }

        // Additional images
        $additional = [];
        foreach ((array) ($product->images ?? []) as $img) {
            if (!$img) continue;
            $url = str_starts_with((string) $img, 'http') ? $img : ($apiBase . '/' . ltrim((string) $img, '/'));
            if ($url !== $thumb) $additional[] = $url;
            if (count($additional) >= 10) break;
        }

        $priceValue = $product->sale_price ?: $product->price;
        $originalPrice = $product->price;

        $description = strip_tags((string) ($product->description ?: $product->content ?: $product->name));
        $description = mb_substr(trim($description), 0, 5000);

        $genderValue = is_array($product->gender) ? ($product->gender[0] ?? null) : $product->gender;
        $genderMap = ['nam' => 'male', 'nu' => 'female', 'unisex' => 'unisex', 'male' => 'male', 'female' => 'female'];
        $gender = $genderMap[strtolower((string) $genderValue)] ?? null;

        $availability = ($product->stock > 0 || $product->stock === null) ? 'in_stock' : 'out_of_stock';
        if (!$product->is_active) $availability = 'out_of_stock';

        $color = null;
        if (is_array($product->color_names) && count($product->color_names) > 0) {
            $color = implode('/', array_slice(array_filter($product->color_names), 0, 3));
        }

        $materialsArr = is_array($product->materials) ? $product->materials : [];
        $material = $materialsArr ? (string) $materialsArr[0] : null;

        $payload = [
            'offerId' => (string) ($product->sku ?: 'sku-' . $product->id),
            'title' => mb_substr($product->name, 0, 150),
            'description' => $description ?: $product->name,
            'link' => $siteUrl . '/san-pham/' . $product->slug,
            'imageLink' => $thumb,
            'contentLanguage' => $this->language,
            'targetCountry' => $this->country,
            'channel' => 'online',
            'availability' => $availability,
            'condition' => 'new',
            'price' => [
                'value' => (string) (int) $priceValue,
                'currency' => $this->currency,
            ],
            'brand' => $product->brand ?: $this->brandDefault,
            'identifierExists' => false,
            'productTypes' => $product->category ? [$product->category->name] : [],
        ];

        if ($product->sale_price && $product->sale_price < $originalPrice) {
            $payload['salePrice'] = [
                'value' => (string) (int) $product->sale_price,
                'currency' => $this->currency,
            ];
            // Reset base price as MSRP
            $payload['price'] = [
                'value' => (string) (int) $originalPrice,
                'currency' => $this->currency,
            ];
        }

        if ($additional) {
            $payload['additionalImageLinks'] = $additional;
        }
        if ($gender) $payload['gender'] = $gender;
        if ($color) $payload['color'] = $color;
        if ($material) $payload['material'] = $material;
        if ($product->sku) $payload['mpn'] = $product->sku;

        return $payload;
    }

    /**
     * Insert (create/update) a product on Merchant Center.
     */
    public function insertProduct(Product $product, ?string $siteUrl = null): array
    {
        $token = $this->getAccessToken();
        $payload = $this->buildProductPayload($product, $siteUrl);

        $resp = Http::withToken($token)
            ->acceptJson()
            ->post(self::API_BASE . '/' . $this->merchantId . '/products', $payload);

        if (!$resp->successful()) {
            return [
                'success' => false,
                'product_id' => $product->id,
                'error' => $resp->json('error.message') ?: $resp->body(),
            ];
        }

        return [
            'success' => true,
            'product_id' => $product->id,
            'merchant_id' => $resp->json('id'),
        ];
    }

    /**
     * Delete a product from Merchant Center by its product id there.
     * The id format is: {channel}:{contentLanguage}:{targetCountry}:{offerId}
     */
    public function deleteProduct(Product $product): array
    {
        $token = $this->getAccessToken();
        $offerId = (string) ($product->sku ?: 'sku-' . $product->id);
        $gmcId = sprintf('online:%s:%s:%s', $this->language, $this->country, $offerId);

        $resp = Http::withToken($token)
            ->delete(self::API_BASE . '/' . $this->merchantId . '/products/' . rawurlencode($gmcId));

        if (!$resp->successful() && $resp->status() !== 404) {
            return [
                'success' => false,
                'product_id' => $product->id,
                'error' => $resp->json('error.message') ?: $resp->body(),
            ];
        }

        return ['success' => true, 'product_id' => $product->id];
    }

    /**
     * Sync many products. Returns summary.
     */
    public function syncProducts($products, ?string $siteUrl = null): array
    {
        $ok = 0; $fail = 0; $errors = [];
        foreach ($products as $p) {
            $r = $this->insertProduct($p, $siteUrl);
            if ($r['success']) {
                $ok++;
            } else {
                $fail++;
                $errors[] = [
                    'product_id' => $p->id,
                    'name' => $p->name,
                    'error' => $r['error'] ?? 'Unknown error',
                ];
            }
        }
        return ['total' => $ok + $fail, 'success' => $ok, 'failed' => $fail, 'errors' => $errors];
    }
}
