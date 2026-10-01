import { resolveMediaUrl } from './media.ts';

export type ChatChannel = 'zalo' | 'messenger';
export type ChatSettings = Record<string, string | undefined>;
export type ZaloDisplayMode = 'disabled' | 'livechat' | 'direct';

function safeWebUrl(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname) return null;
    if (parsed.username || parsed.password) return null;
    return candidate;
  } catch {
    return null;
  }
}

function legacyFallback(channel: ChatChannel, settings: ChatSettings): string | null {
  const value = channel === 'zalo'
    ? settings.zalo_phone?.trim() || settings.zalo_oa_id?.trim() || ''
    : settings.messenger_page_id?.trim() || '';

  // A legacy field is an identifier, not a URL. Do not wrap a pasted URL in
  // another provider URL or let path/query characters escape the identifier.
  const normalized = value.replace(/\s+/g, '');
  if (!normalized || !/^[A-Za-z0-9._+-]+$/.test(normalized)) return null;

  const encoded = encodeURIComponent(normalized);
  return safeWebUrl(channel === 'zalo'
    ? `https://zalo.me/${encoded}`
    : `https://m.me/${encoded}`);
}

/** Direct URLs win. An explicitly supplied but invalid URL fails closed. */
export function resolveChatWidgetUrl(channel: ChatChannel, settings: ChatSettings): string | null {
  const directValue = (channel === 'zalo' ? settings.chat_zalo_url : settings.chat_messenger_url)?.trim() || '';
  if (directValue) return safeWebUrl(directValue);
  return legacyFallback(channel, settings);
}

/**
 * Prefer the first-party OA chat widget whenever an OA ID is configured.
 * The safe direct/legacy URL is retained for SDK failure and no-OA fallback.
 */
export function resolveZaloDisplayMode(settings: ChatSettings): ZaloDisplayMode {
  const oaId = settings.zalo_oa_id?.trim() || '';
  const fallbackUrl = resolveChatWidgetUrl('zalo', settings);
  const enabledSetting = settings.chat_zalo_enabled;
  const enabled = enabledSetting === '0'
    ? false
    : enabledSetting === '1'
      ? true
      : Boolean(oaId || fallbackUrl);

  if (!enabled) return 'disabled';
  if (oaId) return 'livechat';
  return fallbackUrl ? 'direct' : 'disabled';
}

/** Missing enable flags preserve an already configured legacy/direct channel. */
export function isChatWidgetEnabled(
  channel: ChatChannel,
  settings: ChatSettings,
  resolvedUrl: string | null = resolveChatWidgetUrl(channel, settings),
): boolean {
  const setting = channel === 'zalo' ? settings.chat_zalo_enabled : settings.chat_messenger_enabled;
  if (setting === '0') return false;
  if (setting === '1') return true;
  return Boolean(resolvedUrl);
}

/** Accept only web URLs or local library paths for a decorative chat icon. */
export function resolveChatIconUrl(value: string | undefined, apiUrl?: string): string | null {
  const raw = value?.trim() || '';
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return safeWebUrl(raw);
  if (raw.startsWith('//') || raw.includes('\\') || /(^|\/)\.\.(?:\/|$)/.test(raw)) return null;
  if (!raw.startsWith('/storage/') && !/^[A-Za-z0-9._/-]+$/.test(raw)) return null;

  return resolveMediaUrl(raw, apiUrl);
}
