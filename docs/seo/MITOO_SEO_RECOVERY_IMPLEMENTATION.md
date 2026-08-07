# MITOO SEO recovery and favicon implementation

## Scope

This release consolidates the public entity as MITOO, removes duplicate structured data, adds indexable product-category landing pages, and makes favicon delivery deterministic. Docker is not part of the normal development or deployment path; it is only an optional QA environment.

## Indexation and canonical policy

- `/san-pham?page=N` and `/bai-viet?page=N` keep a self-referencing canonical URL.
- Search, sort, price, attribute, and category query facets on those listing routes are `noindex,follow` and canonicalize to the clean listing route. Category links use `/danh-muc/{slug}`.
- `/danh-muc/{slug}` is server-rendered, has category-specific metadata and H1 text, emits `BreadcrumbList` and `CollectionPage`/`ItemList`, and includes self-canonical pagination.
- Product category landing URLs are included in `sitemap.xml`; query facets and pagination URLs are not added to the sitemap.
- Product detail pages emit one `BreadcrumbList`. Organization references use `https://mitoo.vn/#organization` when production `NEXT_PUBLIC_APP_URL` is configured.

## Title and entity consistency

`generateMeta()` returns a clean page title while the root layout owns the `| MITOO` template. Existing titles that already contain the site name are normalized before the template is applied. Public fallback author/site labels now use MITOO rather than the legacy Glass name.

## Favicon architecture

1. Upload an ICO through Admin Settings or Media Library. The backend validates the ICO signature (`00 00 01 00`) and stores the original bytes as `image/x-icon`; it never transcodes ICO data to WebP.
2. Save the resulting media URL in the `site_favicon` setting.
3. The document head, manifest, and crawler-facing endpoint all advertise the stable URL `/favicon.ico` without query-string cache keys.
4. `/favicon.ico` reads the current public setting on every revalidation window and proxies the configured image bytes. A configured broken source returns `502`; an unset source returns `404`. The old legacy icon is never silently served.

After changing the icon, purge the CDN/browser cache if applicable and validate the response with:

```bash
curl -I https://mitoo.vn/favicon.ico
curl --fail --silent https://mitoo.vn/favicon.ico -o /tmp/mitoo-favicon.ico
file /tmp/mitoo-favicon.ico
```

## Validation commands

Run without Docker first:

```bash
npm ci
npm run lint
npm run test:performance
npm run build
npx tsc --noEmit
cd backend
php artisan test
./vendor/bin/pint --test
```

Start the Docker stack only if a failing QA check requires the containerized MySQL/Redis/application environment. Do not start it as part of `deploy.sh`.

## Deployment and post-deploy checks

Deploy only the exact commit SHA that passed QA:

```bash
cd /www/wwwroot/kinhmathongnhung.vn
git fetch origin main
DEPLOY_SHA="<40-character-lowercase-commit-sha>" bash deploy.sh
```

Then check `/`, `/san-pham?page=2`, one `/danh-muc/{slug}`, one product, `/sitemap.xml`, `/robots.txt`, and `/favicon.ico`. Confirm old-domain redirects remain 301 to `https://mitoo.vn` with the same path/query. Submit the canonical sitemap and request recrawls in Search Console after production verification.

## Remaining operational work

Search Console recrawl, favicon propagation, rich-result eligibility, and image thumbnail selection are Google-controlled post-deploy processes. They must be reported as pending until live HTTP responses and Search Console evidence are available.
