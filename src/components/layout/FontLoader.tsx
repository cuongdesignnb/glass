"use client";

import { useEffect } from "react";
import { publicApi } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const STYLE_ID = "custom-font-loader";

export default function FontLoader() {
  useEffect(() => {
    let cancelled = false;

    publicApi
      .getSettings("font")
      .then((settings: any) => {
        if (cancelled) return;
        let s: Record<string, string> = {};
        if (Array.isArray(settings)) {
          settings.forEach((item: any) => {
            s[item.key] = item.value;
          });
        } else if (settings && typeof settings === "object") {
          s = settings;
        }

        const enabled = s["custom_font_enabled"] === "1";
        const fontUrl = s["custom_font_url"];
        const fontName = s["custom_font_name"];
        const fontFormat = s["custom_font_format"] || "ttf";

        if (!enabled || !fontUrl || !fontName) return;

        const formatMap: Record<string, string> = {
          ttf: "truetype",
          otf: "opentype",
          woff: "woff",
          woff2: "woff2",
        };
        const cssFormat = formatMap[fontFormat] || "truetype";

        // Serve via /api so the request hits Laravel (nginx only routes /api,
        // /sanctum, /storage to PHP; /fonts/* falls through to Next.js proxy).
        const fullUrl = `${API}/public/font-file?v=${encodeURIComponent(fontUrl)}`;
        const safeName = String(fontName).replace(/['\\]/g, "\\$&");

        // Use FontFace API so the browser actually loads the file and we can
        // detect errors in the console.
        if (typeof window !== "undefined" && "FontFace" in window) {
          try {
            const ff = new FontFace(safeName, `url("${fullUrl}") format("${cssFormat}")`, {
              display: "swap",
              weight: "100 900",
            });
            ff.load()
              .then((loaded) => {
                (document as any).fonts.add(loaded);
              })
              .catch((err) => {
                console.warn("[FontLoader] Không tải được font tùy chỉnh:", err);
              });
          } catch (err) {
            console.warn("[FontLoader] FontFace error:", err);
          }
        }

        // Override CSS vars + common typographic selectors site-wide.
        const css = `
          @font-face {
            font-family: '${safeName}';
            src: url('${fullUrl}') format('${cssFormat}');
            font-weight: 100 900;
            font-style: normal;
            font-display: swap;
          }
          :root {
            --font-body: '${safeName}', -apple-system, BlinkMacSystemFont, sans-serif !important;
            --font-display: '${safeName}', Georgia, serif !important;
          }
          html, body, button, input, select, textarea, p, a, span, div, li {
            font-family: var(--font-body) !important;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-display) !important;
          }
        `;

        // Inject (or replace) a single <style> tag in <head> so it persists
        // across client-side navigations and has higher precedence than
        // component-level CSS files loaded earlier in <head>.
        let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
        if (!tag) {
          tag = document.createElement("style");
          tag.id = STYLE_ID;
          document.head.appendChild(tag);
        }
        tag.textContent = css;
      })
      .catch((err) => {
        console.warn("[FontLoader] Không đọc được cài đặt font:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
