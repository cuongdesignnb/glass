<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * Narrowly scoped cache namespace for product/catalog data.
 *
 * List and detail cache keys include the current version. Mutations advance
 * the version, so stale entries become unreachable without flushing unrelated
 * application caches.
 */
final class ProductCatalogCache
{
    public const VERSION_KEY = 'glass_products_catalog_version';

    private const LIST_PREFIX = 'glass_products_index_v';

    private const SHOW_PREFIX = 'glass_product_show_v';

    private const CATEGORY_INDEX_PREFIX = 'glass_categories_index_';

    public static function version(): int
    {
        if (! Cache::has(self::VERSION_KEY)) {
            Cache::forever(self::VERSION_KEY, 1);
        }

        return max(1, (int) Cache::get(self::VERSION_KEY, 1));
    }

    /**
     * Advance the catalog namespace after a product/category mutation.
     */
    public static function bump(): int
    {
        // Category responses include product counts, so product mutations
        // must invalidate those two narrowly scoped entries as well.
        self::invalidateCategoryIndexes();

        if (! Cache::has(self::VERSION_KEY)) {
            Cache::forever(self::VERSION_KEY, 1);
        }

        $nextVersion = Cache::increment(self::VERSION_KEY);

        // A cache store may not support increment for a missing/non-numeric
        // value. Keep the invalidation safe even in that case.
        if (! is_numeric($nextVersion)) {
            $nextVersion = self::version() + 1;
            Cache::forever(self::VERSION_KEY, $nextVersion);
        }

        return max(1, (int) $nextVersion);
    }

    public static function listKey(array $parameters): string
    {
        $serialized = json_encode(
            $parameters,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        return self::LIST_PREFIX.self::version().'_'.md5($serialized ?: serialize($parameters));
    }

    public static function showKey(string $slugOrId): string
    {
        return self::SHOW_PREFIX.self::version().'_'.md5($slugOrId);
    }

    public static function categoryIndexKey(bool $tree): string
    {
        return self::CATEGORY_INDEX_PREFIX.($tree ? 'tree' : 'flat');
    }

    public static function invalidateCategoryIndexes(): void
    {
        Cache::forget(self::categoryIndexKey(false));
        Cache::forget(self::categoryIndexKey(true));
    }
}
