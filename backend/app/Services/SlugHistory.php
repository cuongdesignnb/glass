<?php

namespace App\Services;

use App\Models\Article;
use App\Models\Collection;
use App\Models\Product;
use App\Models\SlugRedirect;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns explicit slug changes and resolves historical public URLs.
 *
 * A history row points to an entity ID rather than another slug. Therefore
 * every historical URL resolves directly to the entity's current slug even
 * after that entity is renamed more than once.
 */
final class SlugHistory
{
    public const PRODUCT = 'product';
    public const ARTICLE = 'article';
    public const COLLECTION = 'collection';

    /** @var array<string, class-string<Model>> */
    private const ENTITY_MAP = [
        self::PRODUCT => Product::class,
        self::ARTICLE => Article::class,
        self::COLLECTION => Collection::class,
    ];

    /** @return list<string> */
    public static function types(): array
    {
        return array_keys(self::ENTITY_MAP);
    }

    /** @return class-string<Model> */
    public static function modelClass(string $entityType): string
    {
        if (! isset(self::ENTITY_MAP[$entityType])) {
            throw new \InvalidArgumentException('Unsupported slug entity type.');
        }

        return self::ENTITY_MAP[$entityType];
    }

    public static function entity(string $entityType, int $entityId): ?Model
    {
        $class = self::modelClass($entityType);

        return $class::query()->find($entityId);
    }

    public static function isAvailable(string $entityType, string $slug, ?int $entityId = null): bool
    {
        if ($slug === '') {
            return false;
        }

        $class = self::modelClass($entityType);

        $current = $class::query()->where('slug', $slug);
        if ($entityId !== null) {
            $current->where('id', '!=', $entityId);
        }
        if ($current->exists()) {
            return false;
        }

        $historical = SlugRedirect::query()
            ->where('entity_type', $entityType)
            ->where('old_slug', $slug);
        if ($entityId !== null) {
            $historical->where('entity_id', '!=', $entityId);
        }

        return ! $historical->exists();
    }

    /**
     * Change an entity's slug atomically and record its previous slug.
     *
     * A historical slug belonging to the same entity may be reused (revert).
     * Its old history row is removed before recording the current slug, which
     * prevents a redirect loop while retaining all other history rows.
     */
    public static function change(Model $entity, string $entityType, string $newSlug): Model
    {
        $class = self::modelClass($entityType);

        return DB::transaction(function () use ($class, $entity, $entityType, $newSlug): Model {
            /** @var Model $locked */
            $locked = $class::query()
                ->lockForUpdate()
                ->findOrFail($entity->getKey());

            $currentSlug = (string) $locked->getAttribute('slug');
            if ($currentSlug === $newSlug) {
                return $locked->fresh() ?? $locked;
            }

            if ($newSlug === '' || ! self::isAvailable($entityType, $newSlug, (int) $locked->getKey())) {
                throw ValidationException::withMessages([
                    'slug' => 'Slug này đang được sử dụng bởi một URL khác.',
                ]);
            }

            // Reusing this entity's historical slug is a supported revert.
            SlugRedirect::query()
                ->where('entity_type', $entityType)
                ->where('entity_id', $locked->getKey())
                ->where('old_slug', $newSlug)
                ->delete();

            SlugRedirect::create([
                'entity_type' => $entityType,
                'entity_id' => $locked->getKey(),
                'old_slug' => $currentSlug,
            ]);

            $locked->forceFill(['slug' => $newSlug])->save();

            return $locked->fresh() ?? $locked;
        });
    }

    /**
     * Build the public 308 response for a historical slug, or return null.
     * The current entity is resolved by ID and must still be publicly visible.
     */
    public static function publicRedirect(
        string $entityType,
        string $slug,
        Request $request,
        string $pathPrefix,
    ): ?RedirectResponse {
        if ($slug === '' || ctype_digit($slug)) {
            return null;
        }

        $class = self::modelClass($entityType);
        $current = $class::query()->where('slug', $slug)->first();
        if ($current !== null) {
            return null;
        }

        $history = SlugRedirect::query()
            ->where('entity_type', $entityType)
            ->where('old_slug', $slug)
            ->first();
        if ($history === null) {
            return null;
        }

        $entity = $class::query()->find($history->entity_id);
        if ($entity === null || ! self::isPubliclyVisible($entityType, $entity)) {
            return null;
        }

        $baseUrl = rtrim((string) config('app.url'), '/');
        if ($baseUrl === '') {
            $baseUrl = $request->getSchemeAndHttpHost();
        }

        $target = $baseUrl.'/'.trim($pathPrefix, '/').'/'.$entity->slug;
        // Symfony's normalized query string can collapse repeated keys. Use
        // the raw server value first so repeated, encoded and empty values
        // survive the permanent redirect exactly as requested.
        $query = $request->server->get('QUERY_STRING');
        if (! is_string($query)) {
            $query = $request->getQueryString();
        }
        if ($query !== null && $query !== '') {
            $target .= '?'.$query;
        }

        return redirect()->away($target, 308);
    }

    private static function isPubliclyVisible(string $entityType, Model $entity): bool
    {
        return match ($entityType) {
            self::PRODUCT => (bool) $entity->getAttribute('is_active'),
            self::ARTICLE => (bool) $entity->getAttribute('is_published'),
            self::COLLECTION => (bool) $entity->getAttribute('is_active'),
            default => false,
        };
    }
}
