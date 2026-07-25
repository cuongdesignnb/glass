# MITOO Dynamic Homepage Collections

## Verified issue

The homepage fetched collection records but the active client path retained five fabricated fallback collections. Cards linked to `/san-pham?style=<slug>`, while the product listing did not consume `style`, so cards could open an unfiltered listing.

## Target data flow

```text
Admin /admin/collections
  -> collections table
  -> collection_product pivot and order
  -> public collections API
  -> server-rendered homepage cards
  -> /bo-suu-tap
  -> /bo-suu-tap/<slug>
  -> assigned active products
```

## Implemented

- Homepage now accepts only active API records and hides the section when none exist.
- The active homepage path no longer uses the hardcoded `DynamicCollections` fallback.
- Existing Admin controls remain the source of truth for name, description, tag, image/gradient, masonry size, order, visibility and product assignments.
- Cards link to stable collection landing pages rather than an unsupported query parameter.
- Added collection directory/detail pages with metadata, canonical URLs, BreadcrumbList, CollectionPage and ItemList structured data.
- Added the directory and active collection URLs to the sitemap.
- Public/customer requests cannot expose inactive collections or products; `all=1` is admin-only.
- Management actions explicitly require an admin and validate assigned product IDs and display values.

## Optional homepage copy settings

The section reads these settings when present, with safe fallbacks:

```text
homepage_collections_eyebrow
homepage_collections_title
homepage_collections_description
homepage_collections_cta
homepage_style_collection
```

## Validation

Run:

```bash
npm ci
npm run test:performance
npx tsc --noEmit
npm run lint -- --quiet
npm run build
cd backend && php artisan test
```

Manual smoke must confirm active order, hidden-record 404 behavior, assigned product order, JavaScript-disabled content, Admin CRUD, and sitemap output. No production deployment is part of this change.
