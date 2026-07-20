# PR1 Implementation and Verification

## Implemented quick wins

- A route-aware `NewsletterSlot` guarantees one Newsletter instance; the animated typing placeholder and timers were removed in favor of static accessible text.
- Header cart count and product-detail add-to-cart now use the shared `CartProvider`; duplicate storage/event ownership was removed. Cart identity includes product, color, and sorted add-ons.
- `TryOnModal` is dynamically imported with `ssr: false` and mounted only after intent. It now has dialog semantics, Escape close, initial close-button focus, and focus restoration.
- Service-worker registration was removed. A versioned, one-time inline migration retires `/sw.js` registrations and only project-prefixed caches; a self-destructing `public/sw.js` covers returning clients. The retired worker was network-first with broad successful-GET caching and cache fallback on network failure, not cache-first.
- `@next/bundle-analyzer` is gated behind `ANALYZE=true`, with scripts for HTTP, Lighthouse, bundle, and browser evidence.
- Separate product filter debounce handles eliminate a shared-timer race.
- Build gates were repaired by making `useSettings` hooks unconditional, safely coercing article category IDs, and removing an unused Prisma singleton that referenced an uninstalled package.

## Bundle comparison

Raw route-graph JavaScript is a diagnostic metric, not compressed transfer size.

| Route | Before KB | After KB | Delta KB |
| --- | ---: | ---: | ---: |
| Home | 447.6 | 447.5 | -0.1 |
| Products | 441.9 | 442.6 | +0.7 |
| Product detail | 464.4 | 457.5 | -6.8 |
| Articles | 436.6 | 437.1 | +0.5 |
| Article detail | 435.6 | 436.0 | +0.5 |
| Dedicated Try-On | 450.2 | 450.7 | +0.5 |

Before PR1, the product-detail initial page chunk contained Try-On implementation markers. After PR1, no initial product-detail chunk contains them. Browser evidence confirms the dynamic chunk is absent on first load and fetched only after clicking Try-On. The dedicated Try-On route correctly retains its own implementation.

The small increases on listing/article routes come from shared quick-win and migration code. They are below 1 KB raw per route and are reported rather than hidden.

## Build output

Final Next.js production build completed successfully. Reported First Load JS:

| Route | First Load JS |
| --- | ---: |
| `/` | 119 KB |
| `/san-pham` | 118 KB |
| `/san-pham/[slug]` | 123 KB |
| `/bai-viet` | 115 KB |
| `/bai-viet/[slug]` | 111 KB |
| `/thu-kinh-ao` | 106 KB |

Shared First Load JS was 87.9 KB.

## Verification

- Performance quick-win and cart-regression tests: 8/8 passed.
- Full TypeScript check: passed.
- ESLint with `--quiet`: passed with no errors.
- Production build: passed.
- Bundle analyzer: generated client, Node.js, and Edge reports.
- Browser smoke: passed for Home and a real product detail page.
- Browser smoke verified one Newsletter, static placeholder, no registered service worker/legacy cache, no error overlay, lazy Try-On download, focus on the modal close button, and Escape close.

Branding tests and `tsconfig.branding.json` do not exist at the base SHA. They belong to the separate uncommitted branding task and were intentionally not copied into PR1 merely to make those commands available.

Zalo third-party errors and local cross-origin font errors were retained separately in the browser evidence. No unexpected application error remained after classification. The local font error is caused by the local origin requesting the production font endpoint and is not evidence of a same-origin production failure.

## Before/after claim boundary

No production after-deploy metric exists yet. Therefore PR1 claims only code-path, bundle, build, test, and browser-behavior improvements. It does not claim a faster production LCP, CLS, TTFB, or field Core Web Vital.

After deployment, rerun the exact matrix with fresh Chrome profiles per route, compare medians and traces, and annotate results with the deployed SHA. A rollback decision should use both error rate and CWV/route regressions, not a single Lighthouse score.

## Security and dependency note

`npm install` reported 13 known dependency findings (6 moderate, 6 high, 1 critical). No forced audit fix was applied because it can introduce unrelated breaking upgrades. Dependency remediation should be reviewed as a separate security change with exact advisory reachability and regression tests.

## Rollback

- The analyzer is opt-in; remove its wrapper/scripts/dependency if it conflicts with CI.
- Revert the Newsletter slot/static placeholder and cart-provider changes independently if functional regression appears.
- Revert the dynamic modal import if loading fails, accepting the previous initial-JS cost.
- Do not restore the old network-first, broad successful-GET cache strategy. If offline/PWA behavior is required, introduce a versioned, asset-specific strategy with explicit HTML/API invalidation and tests.
