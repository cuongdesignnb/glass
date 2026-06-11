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

        $description = strip_tags((string) ($product->description ?: $product->content ?: $product->name));
        $description = mb_substr(trim($description), 0, 5000);

        $genderValue = is_array($product->gender) ? ($product->gender[0] ?? null) : $product->gender;
        $genderMap = ['nam' => 'male', 'nu' => 'female', 'unisex' => 'unisex', 'male' => 'male', 'female' => 'female'];
        $gender = $genderMap[strtolower((string) $genderValue)] ?? null;

        $availability = ($product->stock > 0 || $product->stock === null) ? 'in_stock' : 'out_of_stock';
        if (!$product->is_active) $availability = 'out_of_stock';

        $materialsArr = is_array($product->materials) ? $product->materials : [];
        $materialBase = $materialsArr ? (string) $materialsArr[0] : null;

        $baseId = (string) ($product->sku ?: 'sku-' . $product->id);

        // Generate combinations (Colors + Addon Options)
        $combinations = $this->generateVariantCombinations($product);
        $payloads = [];

        if (count($combinations) > 1) {
            foreach ($combinations as $comb) {
                // Parse combination elements
                $color = null;
                $optionIds = [];
                $optionTitles = [];
                $addedPrice = 0;
                $gmcAttributes = [];

                foreach ($comb as $item) {
                    if ($item['type'] === 'color') {
                        $color = $item['value'];
                    } elseif ($item['type'] === 'option') {
                        $optionIds[] = $item['id'];
                        $optionTitles[] = $item['value'];
                        $addedPrice += $item['price'];

                        // Map to Google Merchant attribute
                        $attrName = $this->getGoogleAttributeName($item['group_name']);
                        $gmcAttributes[$attrName] = $item['value'];
                    }
                }

                // Determine variant suffix
                $suffixParts = [];
                if ($color) {
                    $suffixParts[] = $this->getSafeSuffix($color);
                }
                foreach ($optionTitles as $title) {
                    $suffixParts[] = $this->getSafeSuffix($title);
                }
                $variantId = $baseId . '-' . implode('-', $suffixParts);

                // Price calculation
                $originalPrice = (float) $product->price + $addedPrice;
                $salePrice = $product->sale_price ? ((float) $product->sale_price + $addedPrice) : null;
                $priceValue = $salePrice ?: $originalPrice;

                // Title and Link
                $titleParts = [$product->name];
                if ($color) {
                    $titleParts[] = $color;
                }
                foreach ($optionTitles as $title) {
                    $titleParts[] = $title;
                }
                $variantTitle = implode(' - ', $titleParts);

                // Link query params
                $linkParams = [];
                if ($color) {
                    $linkParams['color'] = $color;
                }
                if (!empty($optionIds)) {
                    $linkParams['option_ids'] = implode(',', $optionIds);
                }
                $linkQuery = !empty($linkParams) ? '?' . http_build_query($linkParams) : '';
                $linkUrl = $siteUrl . '/san-pham/' . $product->slug . $linkQuery;

                // Image: try color-matching if colors exist
                $variantImage = $thumb;
                if ($color && is_array($product->color_names) && is_array($product->images)) {
                    $colorIndex = array_search($color, array_filter($product->color_names));
                    if ($colorIndex !== false && isset($product->images[$colorIndex])) {
                        $img = $product->images[$colorIndex];
                        $variantImage = str_starts_with((string) $img, 'http') ? $img : ($apiBase . '/' . ltrim((string) $img, '/'));
                    }
                }

                $payload = [
                    'offerId' => $variantId,
                    'title' => mb_substr($variantTitle, 0, 150),
                    'description' => $description ?: $product->name,
                    'link' => $linkUrl,
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
                    'itemGroupId' => $baseId,
                    'identifierExists' => false,
                    'productTypes' => $product->category ? [$product->category->name] : [],
                ];

                if ($salePrice && $salePrice < $originalPrice) {
                    $payload['salePrice'] = [
                        'value' => (string) (int) $salePrice,
                        'currency' => $this->currency,
                    ];
                    $payload['price'] = [
                        'value' => (string) (int) $originalPrice,
                        'currency' => $this->currency,
                    ];
                }

                // Add distinguishing attributes
                if ($color) {
                    $payload['color'] = $color;
                }
                foreach ($gmcAttributes as $attrKey => $attrVal) {
                    $payload[$attrKey] = $attrVal;
                }

                // Fallback for material/size if not defined by options
                if (!isset($payload['material']) && $materialBase) {
                    $payload['material'] = $materialBase;
                }

                // Additional images
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
                if ($product->sku) $payload['mpn'] = $variantId;

                $payloads[] = $payload;
            }
        } else {
            // Standalone product payload
            $color = is_array($product->color_names) && count($product->color_names) === 1 ? $product->color_names[0] : null;

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
                    'value' => (string) (int) ($product->sale_price ?: $product->price),
                    'currency' => $this->currency,
                ],
                'brand' => $product->brand ?: $this->brandDefault,
                'identifierExists' => false,
                'productTypes' => $product->category ? [$product->category->name] : [],
            ];

            if ($product->sale_price && $product->sale_price < $product->price) {
                $payload['salePrice'] = [
                    'value' => (string) (int) $product->sale_price,
                    'currency' => $this->currency,
                ];
                $payload['price'] = [
                    'value' => (string) (int) $product->price,
                    'currency' => $this->currency,
                ];
            }

            if ($additional) {
                $payload['additionalImageLinks'] = $additional;
            }
            if ($gender) $payload['gender'] = $gender;
            if ($color) $payload['color'] = $color;
            if ($materialBase) $payload['material'] = $materialBase;
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
     * Insert (create/update) a product on Merchant Center using Batch API.
     */
    public function insertProduct(Product $product, ?string $siteUrl = null): array
    {
        $token = $this->getAccessToken();
        $payloads = $this->buildProductPayloads($product, $siteUrl);

        $entries = [];
        $batchId = 1;
        $batchMap = [];

        foreach ($payloads as $payload) {
            $id = $batchId++;
            $entries[] = [
                'batchId' => $id,
                'merchantId' => $this->merchantId,
                'method' => 'insert',
                'product' => $payload,
            ];
            $batchMap[$id] = $payload['offerId'];
        }

        // If it has variants, also delete the standalone product
        if (count($payloads) > 1) {
            $baseId = (string) ($product->sku ?: 'sku-' . $product->id);
            $gmcIdStandalone = sprintf('online:%s:%s:%s', $this->language, $this->country, $baseId);
            $id = $batchId++;
            $entries[] = [
                'batchId' => $id,
                'merchantId' => $this->merchantId,
                'method' => 'delete',
                'productId' => $gmcIdStandalone,
            ];
            $batchMap[$id] = 'delete_standalone';
        }

        $resp = Http::withToken($token)
            ->acceptJson()
            ->post(self::API_BASE . '/products/batch', [
                'entries' => $entries
            ]);

        if (!$resp->successful()) {
            return [
                'success' => false,
                'product_id' => $product->id,
                'error' => $resp->json('error.message') ?: $resp->body(),
            ];
        }

        $success = true;
        $errors = [];
        $merchantIds = [];

        $respEntries = $resp->json('entries') ?: [];
        foreach ($respEntries as $respEntry) {
            $bId = $respEntry['batchId'] ?? null;
            if (!$bId || !isset($batchMap[$bId])) continue;

            $meta = $batchMap[$bId];
            if ($meta === 'delete_standalone') continue;

            $errorsList = $respEntry['errors']['errors'] ?? null;
            if ($errorsList) {
                $success = false;
                $errMsgs = [];
                foreach ($errorsList as $e) {
                    $errMsgs[] = $e['message'] ?? 'Unknown error';
                }
                $errors[] = $meta . ': ' . implode(', ', $errMsgs);
            } else {
                $merchantIds[] = $respEntry['product']['id'] ?? $respEntry['batchId'];
            }
        }

        return [
            'success' => $success,
            'product_id' => $product->id,
            'merchant_id' => $merchantIds ? implode(', ', $merchantIds) : null,
            'error' => $errors ? implode('; ', $errors) : null,
        ];
    }

    /**
     * Delete a product from Merchant Center by its product id there using Batch API.
     * The id format is: {channel}:{contentLanguage}:{targetCountry}:{offerId}
     */
    public function deleteProduct(Product $product): array
    {
        $token = $this->getAccessToken();
        $payloads = $this->buildProductPayloads($product);

        $entries = [];
        $batchId = 1;
        $batchMap = [];

        if (count($payloads) > 1) {
            foreach ($payloads as $payload) {
                $gmcId = sprintf('online:%s:%s:%s', $this->language, $this->country, $payload['offerId']);
                $id = $batchId++;
                $entries[] = [
                    'batchId' => $id,
                    'merchantId' => $this->merchantId,
                    'method' => 'delete',
                    'productId' => $gmcId,
                ];
                $batchMap[$id] = $payload['offerId'];
            }
        } else {
            $baseId = (string) ($product->sku ?: 'sku-' . $product->id);
            $gmcId = sprintf('online:%s:%s:%s', $this->language, $this->country, $baseId);
            $id = $batchId++;
            $entries[] = [
                'batchId' => $id,
                'merchantId' => $this->merchantId,
                'method' => 'delete',
                'productId' => $gmcId,
            ];
            $batchMap[$id] = $baseId;
        }

        $resp = Http::withToken($token)
            ->acceptJson()
            ->post(self::API_BASE . '/products/batch', [
                'entries' => $entries
            ]);

        if (!$resp->successful()) {
            return [
                'success' => false,
                'product_id' => $product->id,
                'error' => $resp->json('error.message') ?: $resp->body(),
            ];
        }

        $success = true;
        $errors = [];

        $respEntries = $resp->json('entries') ?: [];
        foreach ($respEntries as $respEntry) {
            $bId = $respEntry['batchId'] ?? null;
            if (!$bId || !isset($batchMap[$bId])) continue;

            $meta = $batchMap[$bId];
            $errorsList = $respEntry['errors']['errors'] ?? null;
            $code = $respEntry['errors']['code'] ?? 200;
            // 404 means the product is already deleted, which is a success for us
            if ($errorsList && $code !== 404) {
                $success = false;
                $errMsgs = [];
                foreach ($errorsList as $e) {
                    $errMsgs[] = $e['message'] ?? 'Unknown error';
                }
                $errors[] = $meta . ': ' . implode(', ', $errMsgs);
            }
        }

        return [
            'success' => $success,
            'product_id' => $product->id,
            'error' => $errors ? implode('; ', $errors) : null
        ];
    }

    /**
     * Helper to generate variant combinations based on colors and active addon options.
     */
    private function generateVariantCombinations(Product $product): array
    {
        $colors = is_array($product->color_names) ? array_filter($product->color_names) : [];
        if (empty($colors)) {
            $colors = [null];
        }

        // Get addon groups and options
        $groups = $product->addonGroups()->with('options')->get();
        $prices = $product->addonPrices->keyBy('option_id');

        $dimensions = [];
        // Dimension 0: Colors
        $colorDimension = [];
        foreach ($colors as $c) {
            $colorDimension[] = ['type' => 'color', 'value' => $c, 'id' => null, 'price' => 0];
        }
        $dimensions[] = $colorDimension;

        // Group dimensions
        foreach ($groups as $group) {
            $groupDimension = [];
            foreach ($group->options as $opt) {
                $priceRecord = $prices->get($opt->id);
                $isAvailable = $priceRecord ? (bool) $priceRecord->is_available : true;
                $additionalPrice = $priceRecord ? (float) $priceRecord->additional_price : 0;

                if ($isAvailable) {
                    $groupDimension[] = [
                        'type' => 'option',
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                        'value' => $opt->name,
                        'id' => $opt->id,
                        'price' => $additionalPrice,
                    ];
                }
            }
            if (!empty($groupDimension)) {
                $dimensions[] = $groupDimension;
            }
        }

        // Generate Cartesian Product
        $combinations = [[]];
        foreach ($dimensions as $dim) {
            $temp = [];
            foreach ($combinations as $comb) {
                foreach ($dim as $item) {
                    $temp[] = array_merge($comb, [$item]);
                }
            }
            $combinations = $temp;
        }

        // Filter combinations by constraints
        $optionIds = $groups->pluck('options')->flatten()->pluck('id')->toArray();
        $constraints = [];
        if (!empty($optionIds)) {
            try {
                $constraints = \App\Models\AddonOptionConstraint::where('product_id', $product->id)
                    ->orWhereNull('product_id')
                    ->where(function ($q) use ($optionIds) {
                        $q->whereIn('option_id', $optionIds)
                          ->orWhereIn('blocked_option_id', $optionIds);
                    })
                    ->get();
            } catch (\Exception $e) {
                // Table might not exist
            }
        }

        $filteredCombinations = [];
        foreach ($combinations as $comb) {
            $selectedOptionIds = [];
            foreach ($comb as $item) {
                if ($item['type'] === 'option') {
                    $selectedOptionIds[] = $item['id'];
                }
            }

            $violates = false;
            foreach ($constraints as $c) {
                if (in_array($c->option_id, $selectedOptionIds) && in_array($c->blocked_option_id, $selectedOptionIds)) {
                    $violates = true;
                    break;
                }
            }

            if (!$violates) {
                $filteredCombinations[] = $comb;
            }
        }

        return $filteredCombinations;
    }

    /**
     * Map addon group name to standard Google Merchant attributes (color, size, material, pattern).
     */
    private function getGoogleAttributeName(string $groupName): string
    {
        $normalized = strtolower($this->getSafeSuffix($groupName));
        if (str_contains($normalized, 'chat-lieu') || str_contains($normalized, 'trong-kinh') || str_contains($normalized, 'chat-lieu-trong-kinh')) {
            return 'material';
        }
        if (str_contains($normalized, 'do-can') || str_contains($normalized, 'kich-thuoc') || str_contains($normalized, 'size')) {
            return 'size';
        }
        if (str_contains($normalized, 'mau-sac') || str_contains($normalized, 'color')) {
            return 'color';
        }
        return 'pattern'; // fallback
    }

    /**
     * Sync many products using Batch API. Returns summary.
     */
    public function syncProducts($products, ?string $siteUrl = null): array
    {
        @set_time_limit(600);

        $entries = [];
        $batchId = 1;
        $batchMap = [];
        $failCount = 0;
        $errors = [];

        foreach ($products as $product) {
            try {
                $payloads = $this->buildProductPayloads($product, $siteUrl);
            } catch (\Throwable $e) {
                $failCount++;
                $errors[] = [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'error' => 'Payload error: ' . $e->getMessage(),
                ];
                continue;
            }

            if (count($payloads) > 1) {
                foreach ($payloads as $payload) {
                    $id = $batchId++;
                    $entries[] = [
                        'batchId' => $id,
                        'merchantId' => $this->merchantId,
                        'method' => 'insert',
                        'product' => $payload,
                    ];
                    $batchMap[$id] = [
                        'product_id' => $product->id,
                        'name' => $product->name,
                        'offer_id' => $payload['offerId'],
                        'type' => 'insert_variant',
                    ];
                }

                // Delete standalone version
                $baseId = (string) ($product->sku ?: 'sku-' . $product->id);
                $gmcIdStandalone = sprintf('online:%s:%s:%s', $this->language, $this->country, $baseId);
                $id = $batchId++;
                $entries[] = [
                    'batchId' => $id,
                    'merchantId' => $this->merchantId,
                    'method' => 'delete',
                    'productId' => $gmcIdStandalone,
                ];
                $batchMap[$id] = [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'offer_id' => $baseId,
                    'type' => 'delete_standalone',
                ];
            } else {
                $payload = $payloads[0];
                $id = $batchId++;
                $entries[] = [
                    'batchId' => $id,
                    'merchantId' => $this->merchantId,
                    'method' => 'insert',
                    'product' => $payload,
                ];
                $batchMap[$id] = [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'offer_id' => $payload['offerId'],
                    'type' => 'insert_standalone',
                ];
            }
        }

        if (empty($entries)) {
            return [
                'total' => $failCount,
                'success' => 0,
                'failed' => $failCount,
                'errors' => $errors
            ];
        }

        $chunks = array_chunk($entries, 200);
        $token = $this->getAccessToken();
        $productStatus = [];

        foreach ($chunks as $chunk) {
            try {
                $resp = Http::withToken($token)
                    ->acceptJson()
                    ->post(self::API_BASE . '/products/batch', [
                        'entries' => $chunk
                    ]);

                if (!$resp->successful()) {
                    $errMsg = $resp->json('error.message') ?: $resp->body();
                    foreach ($chunk as $entry) {
                        $meta = $batchMap[$entry['batchId']];
                        if ($meta['type'] !== 'delete_standalone') {
                            if (!isset($productStatus[$meta['product_id']])) {
                                $productStatus[$meta['product_id']] = [
                                    'name' => $meta['name'],
                                    'success' => false,
                                    'errors' => [],
                                ];
                            }
                            $productStatus[$meta['product_id']]['success'] = false;
                            $productStatus[$meta['product_id']]['errors'][] = $meta['offer_id'] . ': Batch request failed: ' . $errMsg;
                        }
                    }
                    continue;
                }

                $respEntries = $resp->json('entries') ?: [];
                foreach ($respEntries as $respEntry) {
                    $bId = $respEntry['batchId'] ?? null;
                    if (!$bId || !isset($batchMap[$bId])) continue;

                    $meta = $batchMap[$bId];
                    if ($meta['type'] === 'delete_standalone') {
                        continue;
                    }

                    $errorsList = $respEntry['errors']['errors'] ?? null;
                    if (!isset($productStatus[$meta['product_id']])) {
                        $productStatus[$meta['product_id']] = [
                            'name' => $meta['name'],
                            'success' => true,
                            'errors' => [],
                        ];
                    }

                    if ($errorsList) {
                        $productStatus[$meta['product_id']]['success'] = false;
                        $errMsgs = [];
                        foreach ($errorsList as $e) {
                            $errMsgs[] = $e['message'] ?? 'Unknown error';
                        }
                        $productStatus[$meta['product_id']]['errors'][] = $meta['offer_id'] . ': ' . implode(', ', $errMsgs);
                    }
                }
            } catch (\Throwable $e) {
                foreach ($chunk as $entry) {
                    $meta = $batchMap[$entry['batchId']];
                    if ($meta['type'] !== 'delete_standalone') {
                        if (!isset($productStatus[$meta['product_id']])) {
                            $productStatus[$meta['product_id']] = [
                                'name' => $meta['name'],
                                'success' => false,
                                'errors' => [],
                            ];
                        }
                        $productStatus[$meta['product_id']]['success'] = false;
                        $productStatus[$meta['product_id']]['errors'][] = $meta['offer_id'] . ': Request exception: ' . $e->getMessage();
                    }
                }
            }
        }

        $okCount = 0;
        foreach ($productStatus as $pId => $status) {
            if ($status['success']) {
                $okCount++;
            } else {
                $failCount++;
                $errors[] = [
                    'product_id' => $pId,
                    'name' => $status['name'],
                    'error' => implode('; ', $status['errors']),
                ];
            }
        }

        return [
            'total' => $okCount + $failCount,
            'success' => $okCount,
            'failed' => $failCount,
            'errors' => $errors
        ];
    }
}
