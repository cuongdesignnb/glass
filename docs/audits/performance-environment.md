# Performance Environment and Infrastructure

## Verified production surface

- Origin: `https://mitoo.vn`
- Reverse proxy identifies itself as `nginx` without disclosing a version.
- Chrome negotiated HTTP/2. The Node HTTP measurement client reported HTTP/1.1; this is a client/protocol difference, not evidence that browsers receive HTTP/1.1.
- Text responses were gzip-compressed.
- Public list/static pages expose `s-maxage`/stale-while-revalidate policies; detail pages are private/no-cache.
- Public APIs sampled in this audit were private/no-cache.
- Production SHA, PHP-FPM configuration, OPcache state, process manager, process count, host resources, database version, query cache, Redis/Memcached, queue workers, and session storage could not be verified remotely.

## Verified repository/toolchain surface

- Node.js: `v26.4.0`
- npm: `11.17.0`
- Next.js resolved version: `14.2.35`
- React / React DOM: `18.3.1`
- Laravel resolved version: `11.50.0`
- PHP requirement: `^8.2`
- Local PHP and Composer executables were unavailable on the host.
- The local Compose file declares MySQL 8.0. This is local configuration only and is not proof of the production database version.
- Laravel's repository cache default is `database`. The session example/config defaults are not consistent (`file` in the example and `database` in config), so the deployed value must be read from production configuration before tuning.

## Cache behavior observed

| Surface | Observed policy | Consequence |
| --- | --- | --- |
| Home | `s-maxage=60` with SWR | Short edge/shared freshness window |
| Product listing | `s-maxage=300` | Listing HTML can be shared/cached |
| Article listing | Shared cache headers | Listing HTML can be shared/cached |
| Product/article details | Private/no-cache | Every navigation can require origin work |
| Public APIs | Private/no-cache | Browser/CDN reuse is limited |

The legacy service worker was network-first: it attempted the network, cached successful GET responses broadly, and fell back to cache when a network request failed. It was not cache-first. The practical risks were its overly broad and unbounded cache scope, storing navigation/static responses that did not need offline persistence, and serving stale content during offline/network-failure paths.

PR1 replaces it with a self-retiring migration worker and a versioned, one-time registration/cache cleanup. Cleanup is limited to the project's `glass-eyewear-` and `mitoo-store-` cache prefixes and `/sw.js` registrations. A localStorage marker avoids repeating work; when storage is blocked, a bounded registration/cache scan is the fallback. It does not clear the browser HTTP cache or touch cart/auth storage.

## Infrastructure follow-up for PR3

Production access is required to verify and tune:

1. PHP-FPM pool sizing, request timeouts, slow log, and worker saturation.
2. OPcache enablement, memory, revalidation policy, and hit rate.
3. Next.js process count, memory limits, restart policy, and reverse-proxy upstream reuse.
4. Database slow query log, `EXPLAIN ANALYZE`, buffer-pool hit rate, locks, and missing indexes.
5. Shared application cache/session/queue drivers and their availability guarantees.
6. Brotli, immutable asset caching, CDN image transformation, and font subsetting.
7. RUM collection and release/SHA tagging so field regressions can be attributed to deployments.

No Docker service was required for PR1. The project Compose stack was kept stopped.
