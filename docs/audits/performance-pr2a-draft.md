# Draft PR: Server-render critical content and eliminate detail layout shifts

## Problem

Home mobile LCP was finalized by hero description text at 11.4 seconds, both public listings rendered meaningful results only after hydration, and the Zalo iframe produced repeatable 0.871 mobile CLS on detail routes.

## Root causes

- A stale custom TTF preload returned 404 after 10.3 seconds and was followed 58 ms later by the final text LCP candidate.
- Critical hero text lived in a Client Component and used opacity-based entrance delays.
- Product and article listing clients fetched their results, categories and attributes after mount.
- Zalo SDK automatically booted after four seconds and resized its 380×566 iframe three times without recent input.

## Changes

- Server-render Home hero settings and remove critical-text entrance opacity.
- Prevent slow/stale admin font URLs from triggering late critical-text replacement.
- SSR product/article initial results with normalized whitelisted URL state and parallel server fetches.
- Use real active article categories and enforce published-only article API requests.
- Remove listing mount refetches; use router transitions and synchronize back/forward state.
- Prioritize only the first product image and featured article image.
- Gate Zalo SDK behind explicit user intent.
- Add trace analysis, rendering smoke and cold-only Lighthouse matrix controls.

## Boundaries

No API contract, database/index, backend cache, view-counter, merge or deployment change is included.

## Verification

- TypeScript: PASS
- ESLint: PASS
- Production build: PASS
- Existing performance regression tests: 8/8 PASS
- Rendering/JS-disabled/history smoke: PASS
- Lighthouse 12.8.2, 30 cold fresh profiles: PASS (three runs for each of five routes on desktop/mobile).
- All after CLS medians: 0–0.001; product/article detail mobile CLS: 0.871 → 0.
- Home mobile LCP: 11,888 → 3,169 ms; performance score: 72 → 93.

## Rollback

Revert this PR2A commit. PR1 remains independently deployable. The Zalo timer should not be restored unless the iframe can initialize without page-load layout shifts.
