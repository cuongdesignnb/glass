# PR2B API, cache and database plan

## Scope

PR2B must be a separate Draft PR. It should focus on public API payload shape, validation, targeted cache policy, query profiling and view-counter isolation. Do not include PR3 media/font/infrastructure work.

## Lean ProductListResource

Return only card/listing fields required by `/san-pham` and related product cards:

- id, slug, name, category card label, price, sale price, thumbnail, stock/sale/new/featured badges, compact color dots.
- Exclude full content, full gallery, SEO fields, FAQs, addon groups, unused specifications and admin-only fields.

Measure payload size before/after and keep detail endpoints unchanged.

## Lean ArticleListResource

Return only list-card fields:

- id, slug, title, excerpt, thumbnail, published/created date, author label, category/tag label, views when needed.
- Exclude full article HTML/content and editor-only metadata from list responses.

## Public API validation

Validate and normalize:

- `per_page` with a strict maximum.
- `page` as a positive integer.
- `sort` as an allowlist, not a raw column name.
- `category` as a slug.
- price range as bounded numeric input.
- search length and control characters.

Invalid inputs should fall back safely or return a 422 only when the public contract requires it.

## Article sort correction

Implement backend sort in a separate commit:

- `newest`: `published_at` or `created_at` descending.
- `oldest`: `published_at` or `created_at` ascending.
- `popular`: `views` descending, then `created_at` descending.

Do not pass request values directly to `orderBy`. Keep `published_only=1` enforced and verify stable pagination.

## Cache audit and policy

Audit the actual deployed cache store before assuming Redis. Define targeted cache keys/tags for:

- public settings;
- categories and article categories;
- product and article listings by normalized params;
- product and article details where safe.

Avoid caching arbitrary search strings indefinitely. Replace broad `Cache::flush()` with targeted invalidation where possible. Add invalidation tests for product, category, article and settings updates.

## Query profiling

Collect production-like evidence before adding indexes:

- row counts;
- `EXPLAIN`;
- `EXPLAIN ANALYZE` only where safe;
- slow query samples;
- N+1 checks;
- payload sizes;
- p50/p95 timing.

Indexes should be proposed only with query evidence and rollback notes.

## View counter

Move synchronous view increments out of the critical rendering path. Handle:

- bots;
- prefetch and metadata requests;
- repeat sessions;
- failed writes;
- queue/cache unavailable states.

The page response should not wait on a best-effort view increment.

## HTTP cache policy

Define per endpoint:

- `Cache-Control`;
- `ETag`;
- private/public behavior;
- TTL;
- invalidation owner.

Never expose personalized or token-dependent responses as public cache.

## Acceptance

- Public list payloads are materially smaller.
- Backend article sort matches the UI contract.
- Validation rejects or normalizes unsafe params.
- Cache invalidation is targeted and tested.
- Query/index changes are evidence-backed.
- View counters no longer sit on the critical render path.
- No PR3 media/font/infrastructure changes are included.
