# MITOO Virtual Try-On SEO Case Study

## Scope and safety

- **Production SHA supplied by Owner:** `c4a4b48a36c249529915b8234a6706ec0d3da78d`
- **Existing URL:** <https://mitoo.vn/thu-kinh-ao>
- **New URL created:** No. `/thu-kinh-online` was not created and no redirect was added.
- **GSC writes:** None. No Request Indexing, Validate Fix, or removal action.
- **Production:** No deploy, database mutation, or CMS publication.
- **Captured at:** `2026-09-15T07:24:28+07:00` (workspace clock; GSC UI capture during this session).

## Baseline

### GSC Index State

Property: `sc-domain:mitoo.vn`

URL Inspection for `https://mitoo.vn/thu-kinh-ao` returned:

- Index state: **URL is on Google / Page is indexed**.
- Last crawl: **September 10, 2026, 7:43:28 AM** (Google UI timezone as displayed).
- Page fetch: **Successful**.
- Crawl allowed: **Yes**.
- Indexing allowed: **Yes**.
- User-declared canonical: `https://mitoo.vn/thu-kinh-ao`.
- Google-selected canonical: **Inspected URL**.
- Discovery: referring page `https://mitoo.vn/`; GSC displayed `Sitemaps: Temporary processing error` in the discovery summary at capture time.

This is the Google index version, not a live HTTP test. The live Chrome page rendered successfully (HTTP 200 observed through browser navigation).

### Live/source audit before the patch

The live page showed the existing interactive flow: upload or capture a face image, choose a frame, and generate a simulated result with the existing AI flow. Before this patch the live metadata was:

- Title: `Thử Kính Ảo AI | MITOO`.
- Description: `Trải nghiệm đeo thử kính ngay tại nhà với công nghệ AI tiên tiến.`
- H1: `Thử Kính Ảo`.
- Canonical: `https://mitoo.vn/thu-kinh-ao`.
- Robots: `index, follow`.
- Existing sitemap entry: one clean `/thu-kinh-ao` URL in `src/app/sitemap.ts`; the loader is dynamic and uses `cache: 'no-store'`.
- Existing crawlable links: header, footer and homepage already linked to `/thu-kinh-ao`. Product detail exposed a JavaScript-only “Đeo thử kính” action; product cards in the tool were buttons without detail anchors.

### Performance baseline (Page = exact URL)

GSC Search results, Search type Web, Countries All, Devices All, exact Page filter `https://mitoo.vn/thu-kinh-ao`:

| Period | Dates shown by GSC | Clicks | Impressions | CTR | Average position |
| --- | --- | ---: | ---: | ---: | ---: |
| Last 28 days | 2026-08-16 → 2026-09-12 | 0 | 1 | 0% | 7 |
| Previous 28 days | 2026-07-19 → 2026-08-15 | 0 | 7 | 0% | 32.7 |

The selected end date is the last complete date exposed by the report at capture time; GSC displayed “Last update: 8 hours ago”.

### Query cluster baseline

Under the same exact page filter and comparison, the only disclosed cluster queries were:

| Query | Last 28 days (clicks / impressions) | Previous 28 days (clicks / impressions) |
| --- | --- | --- |
| thử kính online | 0 / 0 | 0 / 1 |
| thử gọng kính online | 0 / 0 | 0 / 1 |

Totals for the disclosed cluster rows: **0 clicks / 0 impressions** in the last 28 days and **0 clicks / 2 impressions** in the previous 28 days. GSC does not expose every query; the result is therefore `BASELINE_ZERO_OR_INSUFFICIENT_DATA=YES` for demand conclusions. No property-level queries were attributed to this page.

## Hypothesis

MITOO already has a working AI-assisted try-on tool, but its landing page did not explicitly cover the search intent “thử kính online / thử kính ảo / chọn kính hợp khuôn mặt”. A single, accurate landing page with server-rendered explanatory content, matching FAQ, and a small number of crawlable internal links should improve discovery without creating a second URL or making unsupported AR, medical, accuracy, or privacy claims. Ranking and traffic outcomes remain hypotheses to be measured after publication and crawling.

## Implementation on this branch

Branch: `codex/try-on-seo-landing`

### Landing metadata and copy

- Title: `Thử Kính Online Bằng AI Trên Khuôn Mặt | MITOO`.
- Description: `Thử kính online miễn phí với MITOO: chụp hoặc tải ảnh khuôn mặt, chọn gọng kính yêu thích và xem hình ảnh mô phỏng bằng AI trước khi quyết định mua.`
- H1: `Thử Kính Online Bằng AI Trên Khuôn Mặt`.
- Hero explains the real flow (photo/upload → choose frame → AI-generated simulation), with “Thử kính ngay” and “Xem gọng kính” actions.
- Disclaimer states that the image is a style simulation and that colour, proportions and wearing feel may differ. It does not claim real-time AR, medical measurement, guaranteed fit, or unverified image retention.

### Indexable content and structured data

After the interactive tool, the page now server-renders:

1. How the MITOO try-on flow works (three steps).
2. Reasons to compare frames online.
3. Links to verified managed frame-shape category routes (`gong-kinh-vuong`, `gong-kinh-tron`, `gong-kinh-mat-meo`, `gong-kinh-panto`, `gong-kinh-da-giac`). The lens category is intentionally excluded from this frame-shape discovery section.
4. Neutral guidance by face shape.
5. A visible five-question FAQ.

The page emits WebPage, BreadcrumbList and FAQPage JSON-LD from the same FAQ data rendered on screen. No Product, SoftwareApplication, MedicalApplication, ratings, or invented claims were added. The existing single clean sitemap entry was preserved; no query or pagination URL was introduced.

### Frame-shape category verification

The five category candidates were checked read-only against the live site before updating the links. Each returned HTTP 200 with a category H1, so each is safe to expose as a crawlable frame-shape link:

| Label | URL | HTTP | Category exists | Live H1 |
| --- | --- | ---: | --- | --- |
| Gọng kính vuông | `/danh-muc/gong-kinh-vuong` | 200 | YES | Gọng Kính Vuông |
| Gọng kính tròn | `/danh-muc/gong-kinh-tron` | 200 | YES | Gọng Kính Tròn |
| Gọng kính mắt mèo | `/danh-muc/gong-kinh-mat-meo` | 200 | YES | Gọng Kính Mắt Mèo |
| Gọng kính Panto | `/danh-muc/gong-kinh-panto` | 200 | YES | Gọng Kính Panto |
| Gọng kính đa giác | `/danh-muc/gong-kinh-da-giac` | 200 | YES | Gọng Kính Đa Giác |

`/danh-muc/trong-kinh` was removed from this section because it describes lens type rather than frame shape. No unverified or known-404 category link was added.

### Internal links and product discovery

- Existing header, footer and homepage links remain in place.
- Product detail now has a crawlable text link: “Thử thêm nhiều gọng kính online” → `/thu-kinh-ao`, without changing the modal button.
- Try-on product cards retain their selection buttons and now expose sibling crawlable “Xem chi tiết sản phẩm” links using each product’s current slug. The selected-product panel repeats that detail link.

### Functionality and privacy

The existing camera/upload, product selection, colour selection, Gemini AI request and result actions were not redesigned. No Gemini request was made in QA. Retention behaviour for uploaded face images is not asserted (`PRIVACY_RETENTION_NOT_VERIFIED`). Analytics event work remains deferred because no new analytics infrastructure was added.

## Supporting article

Because CMS Save is an external write and must be confirmed immediately before the action, this run prepared a complete local draft only:

- File: [`TRY_ON_ARTICLE_DRAFT.md`](./TRY_ON_ARTICLE_DRAFT.md)
- Proposed title: `Thử Kính Online Là Gì? Cách Chọn Gọng Kính Hợp Khuôn Mặt Bằng AI`
- Proposed slug: `thu-kinh-online-cach-chon-gong-kinh-hop-khuon-mat-bang-ai`
- Proposed meta title/description and body are included in the file.
- The draft contains several natural links to `/thu-kinh-ao` and explicitly keeps `is_published=false`.
- CMS Article ID: **not created**; no draft was saved in Admin during this run.

Optional future backlog (not created): Mặt tròn đeo kính gì?; Mặt vuông đeo kính gì?; Mặt dài đeo kính gì?; Gọng kính Panto hợp khuôn mặt nào?

## QA evidence

- `npm run test:performance`: the workstation Node `v20.15.1` does not support `--experimental-strip-types`; with the bundled Node `v24.19.0` first on `PATH`, the project script completed **77/77** tests, including `tests/try-on-seo.test.ts` (`PERFORMANCE_TEST=PASS`).
- `npm run lint`: PASS (existing warnings only, including baseline `<img>` and hook warnings).
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS (`/thu-kinh-ao` generated as a dynamic route).
- Local production build smoke: `GET http://127.0.0.1:3224/thu-kinh-ao` returned **200**; SSR HTML contained the approved H1, canonical, `index, follow`, SEO sections, FAQ JSON-LD and all five verified category links.
- Docker: not used.
- CI/PR: not run/created yet; this report is prepared before commit/PR handoff.

## Measurement plan

After Owner reviews and publishes the CMS article separately, compare exact-page GSC data for `/thu-kinh-ao` using complete 28-day windows. Track indexed state, clicks, impressions, CTR, average position and disclosed query variants. If existing analytics is later enabled, the useful events are `try_on_start`, `try_on_photo_ready`, `try_on_product_selected`, `try_on_generate`, `try_on_success` and `try_on_product_view`; no events were added here.

## Review status

Implementation is ready for source review on `codex/try-on-seo-landing`. It must not be merged or deployed until Owner reviews the diff and separately decides whether to save/publish the article draft.
