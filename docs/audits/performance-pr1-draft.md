# Draft PR: Performance baseline and low-risk frontend quick wins

## Problem

MITOO lacked reproducible route/API performance evidence and had several avoidable client costs: duplicate Newsletter ownership, a timer-driven placeholder, duplicate cart state listeners, an eagerly bundled virtual Try-On modal, and a legacy network-first service worker that cached successful GET responses broadly and fell back to cache on network failure.

## Verified bottlenecks

- Home mobile LCP: 11.89 s, dominated by about 10.27 s of element render delay on hero text.
- Product/article listings fetch meaningful content only after hydration.
- Product detail cold TTFB: about 761 ms; article detail: about 414 ms.
- About 583 KB of font data transferred on every cold critical route.
- Product-detail initial JavaScript contained the Try-On implementation.

## Baseline

Five critical routes, desktop/mobile, cold/warm, three Lighthouse samples each; twelve pages and eight APIs measured with cold/warm HTTP samples. Machine-readable evidence is committed under `artifacts/performance/summary/`; large raw traces are ignored.

## Changes

- Guarantee a single route-aware Newsletter and use a static accessible placeholder.
- Consolidate cart count/mutation into `CartProvider` and harden cart-line identity.
- Lazy-load and conditionally mount `TryOnModal`; add dialog keyboard/focus behavior.
- Retire the legacy service worker and clear old application caches safely.
- Add reproducible performance, analyzer, and browser-smoke scripts.
- Repair TypeScript/hooks issues that blocked full verification.

## Architecture before/after

Before: layout/page could both own Newsletter; Header and product detail independently read/write cart storage; product detail bundled Try-On on initial navigation; the network-first service worker cached successful GET responses without a narrow bounded scope and could serve stale content when the network failed.

After: Newsletter visibility is centralized; cart state has one provider; Try-On code loads after user intent; a versioned one-time migration unregisters only `/sw.js` workers and deletes only project-prefixed legacy caches. Storage-blocked clients use a bounded cleanup fallback.

## Routes tested

- `/`
- `/san-pham`
- `/san-pham/[real-slug]`
- `/bai-viet`
- `/bai-viet/[real-published-slug]`
- `/thu-kinh-ao` bundle retained as a control

## API measurements

Products list cold/warm TTFB: 164.5/124.0 ms. Articles list: 227.2/177.6 ms. Product detail: 214.0/187.1 ms. Article detail: 187.3/159.8 ms. Public APIs were observed as private/no-cache.

## Bundle measurements

Product-detail raw route graph decreased from 464.4 KB to 457.5 KB (-6.8 KB). The Try-On marker is absent from initial product-detail chunks and appears only in the chunk fetched after interaction. Other audited route deltas are between -0.1 KB and +0.7 KB raw.

## CWV lab

All audited mobile LCP medians exceeded 2.5 seconds. Product and article detail mobile CLS measured 0.871. No field CWV claim is made because CrUX/Search Console data was unavailable.

## DB evidence

No database query/index change is included. Production query plans, slow logs, row counts, and database version were unavailable; PR2 must collect them before altering indexes.

## Cache strategy

Observed page cache headers are documented. This PR removes the network-first worker's broad successful-GET caching and retains server/CDN behavior. API/SSR cache redesign is deferred to PR2.

## Security

No forced dependency upgrade is included. npm reported 13 audit findings; exact advisory/reachability review is a separate security follow-up.

## Tests

- `npm run test:performance`
- `npx tsc --noEmit`
- `npm run lint -- --quiet`
- `npm run build`
- `npm run analyze`
- `npm run perf:browser`

All PR1-owned gates passed locally. The requested branding gates are not present at the base SHA and belong to the separate branding task, so their implementation/tests were intentionally excluded. Browser smoke also verified modal focus/Escape behavior and service-worker/cache retirement.

## Before/after

This PR provides bundle and behavioral before/after evidence. Production after-deploy LCP/CLS/TTFB is intentionally pending deployment and a clean-profile rerun.

## Remaining risks

- Public listings remain client-rendered and API-dependent.
- List payloads remain wider than card views require.
- Detail page origin latency, font weight, image layout, and third-party Zalo cost remain.
- Production post-deploy metrics still require a release and clean-profile rerun.

## Rollback

Each quick win can be reverted independently. Do not restore the legacy network-first, broad successful-GET cache; replace it only with a tested, narrowly scoped PWA strategy if offline support is required.

## Follow-up backlog

- PR2: SSR/RSC initial listings, lean resources, query plans/indexes, explicit API/page cache policy.
- PR3: WOFF2/subsetting, responsive media/CDN, Zalo deferral, PHP/Next runtime tuning, and SHA-tagged RUM.
