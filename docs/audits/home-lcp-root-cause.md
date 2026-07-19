# Home LCP root cause

## Scope and evidence

- Route: `https://mitoo.vn/`
- Lighthouse: 12.8.2, mobile cold, three fresh profiles
- Baseline median: FCP 1,707 ms, LCP 11,888 ms, CLS 0.023, performance 72
- Raw trace and DevTools log remain in ignored `.audit-evidence/performance/before/` and are not committed.

## Finding

The final LCP is text, not the hero image. The initial main-frame LCP candidate is `H1.hero__title` at 1,947.96 ms (36,260 px²). The final candidate is `P.hero__desc` at 11,397.57 ms (42,612 px²).

The decisive delay is a stale admin custom-font URL:

| Event | Relative time |
| --- | ---: |
| Custom TTF request starts | 1,020 ms |
| `GET /api/public/font-file?v=/fonts/custom-font-1775581171.ttf` returns 404 | 11,339 ms |
| `P.hero__desc` becomes final LCP | 11,398 ms |

The 404 completes only 58 ms before the final LCP candidate. The hero description also had `fadeInUp 0.8s ease 0.4s both`, which deliberately started it at `opacity: 0`; this was a smaller but avoidable critical-paint delay.

The hero settings were consumed through a Client Component (`DynamicHero` and `useSettings`). Although Next.js could serialize surrounding data, this made the critical content dependent on a client boundary and prevented a simple View Source/JavaScript-disabled contract.

## Change

- `HomeHero` is a Server Component. Home awaits `getPublicSettings()` in the existing parallel server fetch group and emits the real title, description and CTA in the initial HTML.
- Critical tag/title/description/actions have no entrance opacity/transform animation. Decorative rings, particles and badges remain animated and honor `prefers-reduced-motion`.
- The untrusted dynamic custom font is no longer preloaded. It uses `font-display: optional`, so a slow or stale admin URL cannot replace already-painted critical text late in the navigation.
- Admin-controlled hero copy, colors, overlay and desktop/mobile images remain supported.

`font-display: optional` is an interim mitigation. It avoids late critical-text replacement but may use the fallback font on a first slow visit. WOFF2 conversion/subsetting is deferred to PR3.

## Verification

- View Source contains `.hero__title` and `.hero__desc` with real text.
- JavaScript-disabled Chrome contains the same title and description.
- Production build succeeds and Home first-load JS is 118 kB.
- The final PR2A rendering smoke observes Home CLS 0.00052 and no Zalo SDK request before user intent.

No API, database, backend cache or view-counter behavior changed.
