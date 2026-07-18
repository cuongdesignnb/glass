# MITOO Performance Audit

Audit date: 2026-07-18

Production origin: `https://mitoo.vn`

Repository base SHA: `395adf006e20a56892b0159c737f780fa3217ca2`

This audit deliberately separates implementation into the three pull requests requested by the brief. The clean `perf/baseline-and-quick-wins` branch implements only PR1 (baseline tooling and low-risk quick wins). It does not claim production improvement before deployment.

Service-worker terminology in this audit is precise: the retired worker was network-first, cached successful GET responses broadly, and used cache only as a network-failure fallback. PR1's cleanup is versioned and one-time when localStorage is available, with a bounded fallback when storage is blocked.

## Documents

- [Environment and infrastructure](./performance-environment.md)
- [Production baseline](./performance-baseline.md)
- [Waterfalls and verified bottlenecks](./performance-waterfalls.md)
- [PR1 implementation and verification](./performance-after.md)
- [Draft PR1 description](./performance-pr1-draft.md)
- [PR1 worktree separation evidence](./performance-pr1-split.md)

Machine-readable summaries live in `artifacts/performance/summary/`. Raw Lighthouse reports, traces, DevTools logs, and screenshots are intentionally ignored under `.audit-evidence/performance/` because they total about 443 MB.

## Delivery boundary

| PR | Scope | Status |
| --- | --- | --- |
| PR1 | Baseline tooling, duplicate Newsletter, static placeholder, lazy Try-On, single cart source, safe service-worker retirement, analyzer | Implemented and locally verified |
| PR2 | Server-render public listings, lean API resources, query/index work, cache policy | Not implemented; requires backend/data profiling and a separately reviewable change set |
| PR3 | Image/font delivery, CDN and compression policy, RUM/field CWV, production runtime tuning | Not implemented; requires production access and post-deploy measurement |

## Evidence constraints

- PageSpeed Insights API returned HTTP 429 because its public quota was exhausted; Lighthouse CLI was used for reproducible lab data instead.
- No Search Console or CrUX access was available, so field Core Web Vitals are unknown.
- The production deployment does not expose a source SHA, so it cannot be proven to match the repository base SHA.
- PHP-FPM, OPcache, production CPU/RAM, process count, database version, cache/session/queue backends, and slow query logs are not remotely observable. Repository defaults are documented separately and are not presented as production facts.
- Warm Lighthouse samples showed large route-to-route state variance. They are retained as evidence, but are not used to claim an improvement. A clean-profile CI rerun is required after deployment.
