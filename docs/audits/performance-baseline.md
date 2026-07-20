# Production Performance Baseline

## Method

Five critical production routes were measured on 2026-07-18 with Lighthouse 12.8.2, desktop and mobile emulation, cold and warm modes, three samples each. The table below reports the cold median. Service-worker interception was blocked during measurement. HTTP timing used three cold and three warm requests for twelve pages and eight APIs.

Critical detail slugs were verified as real published records before measurement.

## Cold Lighthouse median

| Route | Device | Score | FCP ms | LCP ms | CLS | TBT ms | Transfer KB | JS KB | Font KB | Requests |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | Desktop | 100 | 497 | 593 | 0.012 | 0 | 1,473.9 | 552.3 | 583.1 | 100 |
| Home | Mobile | 72 | 1,707 | 11,888 | 0.023 | 45 | 1,530.6 | 546.2 | 583.1 | 86 |
| Products | Desktop | 100 | 372 | 635 | 0.021 | 0 | 1,470.3 | 552.3 | 583.1 | 108 |
| Products | Mobile | 94 | 1,079 | 3,093 | 0.021 | 26 | 1,442.3 | 538.8 | 583.1 | 98 |
| Product detail | Desktop | 100 | 320 | 558 | 0.012 | 0 | 1,470.0 | 564.3 | 583.1 | 97 |
| Product detail | Mobile | 72 | 1,402 | 2,713 | 0.871 | 15 | 1,435.0 | 550.5 | 583.1 | 87 |
| Articles | Desktop | 100 | 380 | 702 | 0.012 | 0 | 1,485.3 | 552.3 | 583.2 | 95 |
| Articles | Mobile | 91 | 1,382 | 3,260 | 0.023 | 78 | 1,432.0 | 542.5 | 583.1 | 84 |
| Article detail | Desktop | 87 | 393 | 571 | 0.259 | 0 | 1,582.8 | 555.6 | 583.1 | 94 |
| Article detail | Mobile | 71 | 1,601 | 2,862 | 0.871 | 139 | 1,548.8 | 545.7 | 583.2 | 86 |

## HTTP cold/warm median

| Surface | Cold TTFB ms | Warm TTFB ms | Cold total ms | Warm total ms | Gzip KB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home page | 36.6 | 9.8 | 37.8 | 11.2 | 31.3 |
| Products page | 31.6 | 9.0 | 31.8 | 9.1 | 15.5 |
| Articles page | 39.7 | 11.1 | 39.9 | 11.3 | 14.6 |
| Product detail page | 760.8 | 568.1 | 946.8 | 839.7 | 25.9 |
| Article detail page | 413.5 | 385.7 | 654.7 | 716.0 | 31.7 |
| Products API | 164.5 | 124.0 | — | — | 20.3 |
| Articles API | 227.2 | 177.6 | — | — | 31.1 |
| Product detail API | 214.0 | 187.1 | — | — | 3.6 |
| Article detail API | 187.3 | 159.8 | — | — | 5.4 |
| Settings API | 135.0 | 161.9 | — | — | 4.3 |
| Menus API | 211.4 | 163.2 | — | — | 0.5 |
| Attributes API | 146.5 | 141.6 | — | — | 0.7 |
| Categories API | 169.1 | 132.5 | — | — | 0.4 |

The article-detail warm total and settings warm TTFB were slower than cold medians, which indicates normal network/origin variance in the small sample. Product and article detail pages are materially slower at the server boundary than shared-cache listing pages.

## Core Web Vitals status

- Lab LCP fails the 2.5 s target on all five mobile routes, most severely on Home at 11.9 s.
- Lab CLS is severe on product and article detail mobile samples (0.871) and elevated on article detail desktop (0.259).
- Lab TBT is generally modest; JavaScript cost still matters because mobile main-thread time ranged from about 5.2 s to 13.8 s.
- Field LCP, INP, and CLS are unknown because Search Console/CrUX access was unavailable.

Warm Lighthouse results are preserved in the JSON evidence but excluded from conclusions because shared Chrome state produced anomalous CLS around 0.86–0.88 on several routes. Post-deploy comparison must use a fresh profile per route and retain the same device/network settings.
