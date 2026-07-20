# Detail CLS root cause

## Scope and evidence

Fresh baseline traces were inspected for the real product and published article detail routes. Their mobile cold Lighthouse medians both contained unstable runs with CLS 0.871.

The same main-frame node caused the large shift on Home and both detail pages. Trace paint events identify it as an `IFRAME`; its document URL is `https://page.widget.zalo.me/...`.

| Route | Node | Shift sequence (old → new rect) | Cumulative score |
| --- | ---: | --- | ---: |
| Product detail | 618 | `0×0` → `328×514` → `380×566` → `0×0` | 0.871248 |
| Article detail | 132 | `0×0` → `328×514` → `380×566` → `0×0` | 0.871248 |
| Home | 248 | `0×0` → `328×514` → `380×566` → `0×0` | 0.871248 |

The shifts occur about 5.4–6.4 seconds after navigation. `ChatWidget` loaded `https://sp.zalo.me/plugins/sdk.js` automatically after a four-second timer; the SDK then booted and resized the cross-origin iframe several times without recent input.

## Change

- Removed the automatic four-second SDK timer and global scroll/mouse/touch listeners.
- Render a stable 56×56 Zalo placeholder.
- Load the SDK only after intent on that control: pointer enter, pointer down, keyboard focus, Enter or Space.
- Messenger behavior and the Zalo OA settings contract remain unchanged.

This preserves chat while moving third-party iframe initialization behind a direct interaction. Layout changes caused immediately by that interaction carry recent-input attribution and do not contaminate page-load CLS.

## Verification

- Rendering smoke waits 6.5 seconds and sees zero requests for `sp.zalo.me/plugins/sdk.js` before intent.
- The passing local Home observation records CLS 0.
- Post-change Lighthouse detail CLS values are recorded in `performance-pr2a-before-after.md`.
- Raw before/after traces remain ignored; only compact summaries and this node-level evidence are committed.
