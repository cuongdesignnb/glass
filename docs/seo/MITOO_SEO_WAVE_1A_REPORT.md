# MITOO SEO Wave 1A Report

## Scope and source state

- Repository: `cuongdesignnb/glass`
- Production brand/domain: MITOO / `https://mitoo.vn`
- Stack: Next.js 14 App Router + Laravel API
- Source SHA before changes: `ff0c6fd56fbcd29f7ceae2420e27585833c47f61`
- Production data mutated: **NO**
- Production deployed: **NO**

The existing clean category route, `/danh-muc/[slug]`, was retained. The sitemap already reads active categories from the API and emits `/danh-muc/{slug}`. Product multi-category support (`category_product` and `Product::categories()`) was also retained. No product, category, article, or indexed slug was renamed or deleted.

## Root causes found

1. `CategoryController::update()` regenerated a category slug whenever the display name changed. This could change an indexed URL without an explicit slug workflow.
2. `DatabaseSeeder` still created header category submenu links under `/san-pham?category=...`, while clean category owners are `/danh-muc/{slug}`.
3. Product listing metadata used one facet canonical policy, but the `CollectionPage` schema used the raw listing URL. A facet could therefore have schema URL `/san-pham?color=...` while metadata canonical was `/san-pham`.
4. Product variant requests could put `color` and `option_ids` into the Product/Offer schema URL even though those parameters are client selection state and the page metadata canonical is the clean product URL.

## Code changes

### Category slug stability

- Create keeps Vietnamese slug generation and now uses deterministic `-2`, `-3`, ... suffixes for duplicate names.
- Update no longer derives or overwrites `slug` from `name`; an existing category slug remains stable when its display name changes.
- Added `backend/tests/Feature/CategorySlugStabilityTest.php` covering create, rename stability, and duplicate-name uniqueness.

### Clean category navigation

The default product submenu in `DatabaseSeeder` now uses:

```text
/danh-muc/kinh-can
/danh-muc/kinh-ram
/danh-muc/kinh-thoi-trang
/danh-muc/gong-kinh
```

The seeder was not run against production.

### Facet canonical/schema policy

`productListingCanonicalPolicy()` is a pure helper shared by listing metadata and `CollectionPage` schema:

| Request | Canonical | Robots |
| --- | --- | --- |
| `/san-pham` | `/san-pham` | index, follow |
| `/san-pham?page=2` | `/san-pham?page=2` | index, follow |
| `/san-pham?category=gong-kinh` | `/san-pham` | noindex, follow |
| `/san-pham?color=...` | `/san-pham` | noindex, follow |
| `/san-pham?search=...` | `/san-pham` | noindex, follow |
| `/san-pham?sort=...` | `/san-pham` | noindex, follow |
| facet + `page=2` | `/san-pham` | noindex, follow |

Functional filtering and pagination behavior remain query based. Facet URLs are not redirected and are not added to the sitemap.

### Product variant schema policy

Color and addon query parameters remain available to the client selection/cart flow. Product and Offer structured data now use the clean `/san-pham/{slug}` URL, and the Product schema also exposes that clean URL at its top level. No cart, variant selection, or price UI behavior was changed.

## Panto pilot read-only audit

The local backend `.env` points to MySQL at `127.0.0.1:33069`, but the connection was refused during this read-only check. There is no local SQLite catalog. The source `DatabaseSeeder` does not contain a `gong-kinh-panto` category or a Panto product; the only source mention is generic About-page copy and is not catalog evidence.

```text
CATEGORY_EXISTS=UNKNOWN
HIGH_CONFIDENCE_PRODUCTS=DATA_NOT_AVAILABLE
MEDIUM_CONFIDENCE_PRODUCTS=DATA_NOT_AVAILABLE
LOW_CONFIDENCE_PRODUCTS=DATA_NOT_AVAILABLE
```

No category or product was created or attached. A production/dev catalog export or a working read-only dev database is required before candidate matching. Only products with explicit Panto taxonomy/frame style should be considered HIGH confidence; name/content mentions should remain manual-review candidates.

### Proposed content brief (not written to production data)

- Name: Gọng Kính Panto
- Slug: `gong-kinh-panto`
- Primary keyword: gọng kính panto
- Secondary keywords: kính panto, gọng panto
- Intent: Commercial / Category
- Required content: explain the Panto form, suitable face profiles, material/color choices, verified MITOO products once attached, and a natural purchase/eye-measurement CTA. Do not claim medical benefits, certifications, or product properties absent from catalog data.

## Regression and QA

- `tests/seo-wave-1a.test.ts` covers the clean/pagination/facet policy, clean seeded navigation, sitemap contract, and product variant schema URL.
- `backend/tests/Feature/CategorySlugStabilityTest.php` covers category slug behavior through the API.
- Existing clean category route and sitemap implementation were preserved.

Observed QA results on this source:

| Check | Result |
| --- | --- |
| `npm ci` | PASS (npm reported existing dependency audit/engine warnings) |
| `npm run lint` | PASS (existing `<img>` and hook warnings only) |
| `npm run test:performance` | BLOCKED_BY_LOCAL_NODE_VERSION (`v20.15.1` does not support `--experimental-strip-types`) |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `composer install --no-interaction --prefer-dist` | PASS (PHP extension warnings only) |
| `php artisan test` | PASS — 64 tests, 372 assertions |
| `./vendor/bin/pint --test` | BASELINE_ONLY_FAILURES |
| CI workflow | NOT_RUN (workflow is PR/manual only) |

Pint was also run scoped to the touched PHP files. It still reports pre-existing style fixers in `CategoryController.php` and `DatabaseSeeder.php`; no broad formatter rewrite was applied.

## Unresolved risks

- Existing database menu rows are not rewritten by this source-only change; a separately approved admin/data operation would be needed if deployed rows still contain legacy links.
- Panto taxonomy cannot be safely prepared without a readable catalog. No fuzzy matching or automatic production attachment was performed.
- Functional facet URLs remain crawlable endpoints by design; their noindex/canonical policy is the SEO control for this wave.

## Recommended Wave 1B

1. Obtain a read-only production catalog export or working dev DB and perform the Panto candidate audit.
2. Manually approve HIGH-confidence products, then populate category metadata/content through the existing admin workflow.
3. Validate rendered metadata/schema and sitemap entries for representative clean categories, pagination, facets, and product variants in staging before any production deploy.
