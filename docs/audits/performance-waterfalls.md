# Waterfalls and Verified Bottlenecks

## Home

The mobile LCP was the hero description paragraph, not a downloaded image. About 10.27 seconds of the 11.89-second LCP was element render delay. The hero/settings path is client-dependent, so late client state and rendering are the primary verified cause. Recompressing the hero image alone would not resolve this LCP.

## Product listing

The mobile LCP was the first product-card image. Approximately 2.13 seconds (69%) was load delay, and the image was emitted as lazy-loaded without priority. More importantly, the initial HTML does not contain the real product cards. After hydration, the client starts:

- `/api/public/product-attributes`
- `/api/public/categories?tree=false`
- `/api/public/products?sort=newest&page=1`

This serializes useful content behind JavaScript execution and API latency. SSR/RSC for the initial result set belongs in PR2 because it changes data ownership, cache behavior, loading states, and SEO output.

## Article listing

The mobile LCP was the featured article image. Articles are fetched after mount from `/api/public/articles?per_page=9&page=1&sort=newest&published_only=1`; the Lighthouse transfer for that response was about 28 KB. Initial server-rendered article content is absent. This is the same architecture class as the product listing and belongs in PR2.

## Product detail

The main product image was already high priority, but about 2.1 seconds (77%) of the 2.71-second mobile LCP was render delay. Related products are fetched after mount. PR1 removes the virtual Try-On modal implementation from the initial route chunk; it does not claim to solve detail-page server latency or the LCP render delay.

## Article detail

The article thumbnail was the mobile LCP; approximately 1.72 seconds (58%) was render delay. Detail HTML is private/no-cache and showed a cold TTFB around 414 ms. The route also produced high CLS in lab data, requiring a clean-profile post-deploy trace before attributing a specific shifting node.

## Shared payload findings

- Every cold route transferred about 583 KB of font data from a custom TTF endpoint. Font conversion/subsetting and a WOFF2 preload strategy belong in PR3.
- Public list resources include full content and fields not required for cards. Lean list resources belong in PR2 and should be protected by API contract tests.
- The Zalo widget generated third-party circular-JSON console exceptions and long-running SDK/media requests. It should be deferred or isolated in PR3, but its behavior is not an application-code exception.
- Initial route JavaScript was roughly 436–564 KB raw across the audited pages. The largest PR1 removal is the Try-On implementation from the product-detail initial graph.

## Prioritized backlog

1. PR2: server-render the initial product/article listing result and hydrate filters/pagination progressively.
2. PR2: create lean list API resources; omit full HTML/content and unused relationships.
3. PR2: profile detail/list queries with production-like data and `EXPLAIN ANALYZE` before adding indexes.
4. PR3: serve subset WOFF2 fonts with long immutable caching and validate `font-display` behavior.
5. PR3: reserve intrinsic dimensions/aspect ratios for all above-the-fold media and rerun CLS traces.
6. PR3: defer Zalo until interaction/idle/consent and monitor its error/long-task contribution.
7. PR3: add RUM with route, device, connection class, and deploy SHA dimensions.
