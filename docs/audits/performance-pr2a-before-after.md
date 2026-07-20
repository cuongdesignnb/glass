# PR2A rendering performance before/after

## Method

- Lighthouse 12.8.2 for both phases.
- Three cold fresh-profile runs per route and device; medians are reported.
- Baseline URL: production PR1 state (`https://mitoo.vn`).
- After URL: local production build connected to the same public API.
- Routes: Home, products, real product detail, articles, real published article detail.
- Raw reports/traces are ignored. Compact JSON lives under `artifacts/performance/summary/pr2a/`.

## Baseline cold medians

| Route | Device | Score | FCP ms | LCP ms | CLS | TBT ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Home | desktop | 100 | 497 | 593 | 0.012 | 0 |
| Home | mobile | 72 | 1,707 | 11,888 | 0.023 | 45 |
| Products | desktop | 100 | 372 | 635 | 0.021 | 0 |
| Products | mobile | 94 | 1,079 | 3,093 | 0.021 | 26 |
| Product detail | desktop | 100 | 320 | 558 | 0.012 | 0 |
| Product detail | mobile | 72 | 1,402 | 2,713 | 0.871 | 15 |
| Articles | desktop | 100 | 380 | 702 | 0.012 | 0 |
| Articles | mobile | 91 | 1,382 | 3,260 | 0.023 | 78 |
| Article detail | desktop | 87 | 393 | 571 | 0.259 | 0 |
| Article detail | mobile | 71 | 1,601 | 2,862 | 0.871 | 139 |

## After cold medians

| Route | Device | Score | FCP ms | LCP ms | CLS | TBT ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Home | desktop | 100 | 300 | 640 | 0.001 | 0 |
| Home | mobile | 93 | 1,059 | 3,169 | 0 | 20 |
| Products | desktop | 100 | 331 | 633 | 0 | 0 |
| Products | mobile | 96 | 1,210 | 2,780 | 0 | 8 |
| Product detail | desktop | 100 | 289 | 603 | 0.001 | 0 |
| Product detail | mobile | 96 | 1,059 | 2,695 | 0 | 36 |
| Articles | desktop | 100 | 330 | 629 | 0.001 | 0 |
| Articles | mobile | 96 | 1,208 | 2,777 | 0 | 6 |
| Article detail | desktop | 100 | 290 | 594 | 0.001 | 0 |
| Article detail | mobile | 96 | 1,058 | 2,695 | 0 | 4 |

All ten groups contain exactly three cold runs. Every after median is below the CLS 0.1 target; both mobile detail medians moved from 0.871 to 0. Home mobile LCP moved from 11,888 ms to 3,169 ms (-73.3%) and its score moved from 72 to 93. Products and articles mobile LCP improved by 10.1% and 14.8% respectively.

The fresh after traces contain zero `LayoutShift` events on Home, product detail and article detail. Home's trace changes from a final text candidate at 11,397.57 ms to a server-rendered description at 360.59 ms followed by the real hero image at 1,177.34 ms.

The before phase used the production origin while the after phase used a local production build connected to the same public API. This is suitable for verifying rendering ownership, candidate timing and CLS elimination, but not for claiming production network/TTFB gains. A post-deploy production rerun remains required before making a field-performance claim.

## Rendering contracts

- `/san-pham`: 12 product cards in initial HTML; categories, products and attributes are fetched in parallel on the server; no initial skeleton or mount refetch.
- `/bai-viet`: five cards and real active API categories in initial HTML; `published_only=1` is always sent; no initial skeleton or mount refetch.
- URL parameters are normalized through a whitelist. Product filters, prices, search, sort and page are URL-owned. Article category, search, sort and page are URL-owned.
- Product and article pagination render real links, so page navigation remains crawlable and works without JavaScript. Page 1 is canonicalized without `?page=1`.
- Debounced text/price search uses history replacement; deliberate category, sort and pagination actions use push-style navigation.
- Product category breadcrumbs use canonical slug URLs in both UI and JSON-LD. Missing category slugs fall back to `/san-pham`.
- Article `oldest` and `popular` sorts remain deferred to PR2B; PR2A does not expose non-working sort choices.
- Client navigation uses Next router transitions. Pending navigation shows the existing skeleton and old responses cannot overwrite newer state because the browser does not issue independent listing fetches.
- Back/forward restores server props and synchronizes controls.
- Only the first product image and the featured article image receive high fetch priority.

## Artifacts

- `artifacts/performance/summary/pr2a/pr2a-after-lighthouse.json`: all ten median groups and their 30 individual runs.
- `artifacts/performance/summary/pr2a/rendering-smoke.json`: SSR, no-JavaScript, URL history, priority and pre-intent Zalo gates.
- `artifacts/performance/summary/pr2a/trace-findings.json`: compact before/after LCP and CLS trace evidence.
