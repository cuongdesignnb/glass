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

    private function getSafeSuffix(string $str): string
    {
        $unicode = [
            'a'=>'á|à|ả|ã|ạ|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ',
            'd'=>'đ',
            'e'=>'é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ',
            'i'=>'í|ì|ỉ|ĩ|ị',
            'o'=>'ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ',
            'u'=>'ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự',
            'y'=>'ý|ỳ|ỷ|ỹ|ỵ',
            'A'=>'Á|À|Ả|Ã|Ạ|Ă|Ắ|Ằ|Ẳ|Ẵ|Ặ|Â|Ấ|Ầ|Ẩ|Ẫ|Ậ',
            'D'=>'Đ',
            'E'=>'É|È|Ẻ|Ẽ|Ẹ|Ê|Ế|Ề|Ể|Ễ|Ệ',
            'I'=>'Í|Ì|Ỉ|Ĩ|Ị',
            'O'=>'Ó|Ò|Ỏ|Õ|Ọ|Ô|Ố|Ồ|Ổ|Ỗ|Ộ|Ơ|Ớ|Ờ|Ở|Ỡ|Ợ',
            'U'=>'Ú|Ù|Ủ|Ũ|Ụ|Ư|Ứ|Ừ|Ử|Ữ|Ự',
            'Y'=>'Ý|Ỳ|Ỷ|Ỹ|Ỵ'
        ];
        foreach ($unicode as $nonUnicode => $uni) {
            $str = preg_replace("/($uni)/i", $nonUnicode, $str);
        }
        $str = strtolower(trim($str));
        $str = preg_replace('/[^a-z0-9\-]/', '-', $str);
        $str = preg_replace('/-+/', '-', $str);
        return trim($str, '-');
    }

    /**
     * Build Google Merchant product payloads (plural) from a Product model.
     * Returns an array of payloads (one for each variant, or one for standalone).
     */
    public function buildProductPayloads(Product $product, ?string $siteUrl = null): array
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

        $materialsArr = is_array($product->materials) ? $product->materials : [];
        $material = $materialsArr ? (string) $materialsArr[0] : null;

        $baseId = (string) ($product->sku ?: 'sku-' . $product->id);
        $colorNames = is_array($product->color_names) ? array_filter($product->color_names) : [];

        $payloads = [];

        if (count($colorNames) > 1) {
            // Generate multiple variant payloads
            foreach ($colorNames as $index => $colorName) {
                $colorSlug = $this->getSafeSuffix($colorName);
                $variantId = $baseId . '-' . $colorSlug;

                // Try to find a variant-specific image if available
                $variantImage = $thumb;
                if (is_array($product->images) && isset($product->images[$index])) {
                    $img = $product->images[$index];
                    $variantImage = str_starts_with((string) $img, 'http') ? $img : ($apiBase . '/' . ltrim((string) $img, '/'));
                }

                $payload = [
                    'offerId' => $variantId,
                    'title' => mb_substr($product->name . ' - ' . $colorName, 0, 150),
                    'description' => $description ?: $product->name,
                    'link' => $siteUrl . '/san-pham/' . $product->slug . '?color=' . urlencode($colorName),
                    'imageLink' => $variantImage,
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
                    'color' => $colorName,
                    'itemGroupId' => $baseId,
                    'identifierExists' => false,
                    'productTypes' => $product->category ? [$product->category->name] : [],
                ];

                if ($product->sale_price && $product->sale_price < $originalPrice) {
                    $payload['salePrice'] = [
                        'value' => (string) (int) $product->sale_price,
                        'currency' => $this->currency,
                    ];
                    $payload['price'] = [
                        'value' => (string) (int) $originalPrice,
                        'currency' => $this->currency,
                    ];
                }

                // Add other images as additional
                $varAdditional = [];
                if ($variantImage !== $thumb) {
                    $varAdditional[] = $thumb;
                }
                foreach ($additional as $addUrl) {
                    if ($addUrl !== $variantImage && $addUrl !== $thumb) {
                        $varAdditional[] = $addUrl;
                    }
                }
                if ($varAdditional) {
                    $payload['additionalImageLinks'] = array_slice($varAdditional, 0, 10);
                }

                if ($gender) $payload['gender'] = $gender;
                if ($material) $payload['material'] = $material;
                if ($product->sku) $payload['mpn'] = $variantId;

                $payloads[] = $payload;
            }
        } else {
            // Standalone product payload
            $color = count($colorNames) === 1 ? $colorNames[0] : null;

            $payload = [
                'offerId' => $baseId,
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

            $payloads[] = $payload;
        }

        return $payloads;
    }

    /**
     * Legacy helper method for single product payload.
     */
    public function buildProductPayload(Product $product, ?string $siteUrl = null): array
    {
        $payloads = $this->buildProductPayloads($product, $siteUrl);
        return $payloads[0];
    }

    /**
     * Insert (create/update) a product on Merchant Center.
     */
    public function insertProduct(Product $product, ?string $siteUrl = null): array
    {
        $token = $this->getAccessToken();
        $colorNames = is_array($product->color_names) ? array_filter($product->color_names) : [];

        if (count($colorNames) > 1) {
            $success = true;
            $errors = [];
            $merchantIds = [];
            $payloads = $this->buildProductPayloads($product, $siteUrl);

            foreach ($payloads as $payload) {
                $resp = Http::withToken($token)
                    ->acceptJson()
                    ->post(self::API_BASE . '/' . $this->merchantId . '/products', $payload);

                if (!$resp->successful()) {
                    $success = false;
                    $errors[] = $payload['color'] . ': ' . ($resp->json('error.message') ?: $resp->body());
                } else {
                    $merchantIds[] = $resp->json('id');
                }
            }

            // If the product used to be a standalone item, delete it to prevent duplicate orphans
            $baseId = (string) ($product->sku ?: 'sku-' . $product->id);
            $gmcIdStandalone = sprintf('online:%s:%s:%s', $this->language, $this->country, $baseId);
            Http::withToken($token)->delete(self::API_BASE . '/' . $this->merchantId . '/products/' . rawurlencode($gmcIdStandalone));

            return [
                'success' => $success,
                'product_id' => $product->id,
                'merchant_id' => $merchantIds ? implode(', ', $merchantIds) : null,
                'error' => $errors ? implode('; ', $errors) : null,
            ];
        } else {
            $payloads = $this->buildProductPayloads($product, $siteUrl);
            $payload = $payloads[0];

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
    }

    /**
     * Delete a product from Merchant Center by its product id there.
     * The id format is: {channel}:{contentLanguage}:{targetCountry}:{offerId}
     */
    public function deleteProduct(Product $product): array
    {
        $token = $this->getAccessToken();
        $baseId = (string) ($product->sku ?: 'sku-' . $product->id);
        $colorNames = is_array($product->color_names) ? array_filter($product->color_names) : [];

        if (count($colorNames) > 1) {
            $success = true;
            $errors = [];
            foreach ($colorNames as $colorName) {
                $colorSlug = $this->getSafeSuffix($colorName);
                $offerId = $baseId . '-' . $colorSlug;
                $gmcId = sprintf('online:%s:%s:%s', $this->language, $this->country, $offerId);

                $resp = Http::withToken($token)
                    ->delete(self::API_BASE . '/' . $this->merchantId . '/products/' . rawurlencode($gmcId));

                if (!$resp->successful() && $resp->status() !== 404) {
                    $success = false;
                    $errors[] = $resp->json('error.message') ?: $resp->body();
                }
            }
            return [
                'success' => $success,
                'product_id' => $product->id,
                'error' => $errors ? implode('; ', $errors) : null
            ];
        } else {
            $gmcId = sprintf('online:%s:%s:%s', $this->language, $this->country, $baseId);

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
