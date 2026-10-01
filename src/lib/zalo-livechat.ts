export const ZALO_SDK_URL = 'https://sp.zalo.me/plugins/sdk.js';
export const ZALO_SDK_SCRIPT_ID = 'zalo-sdk-script';
export const ZALO_WIDGET_STYLE_ID = 'zalo-custom-trigger-styles';

const ZALO_WIDGET_TRIGGER_CSS = `
  #zalo-chat-widget-root .zalo_chat_widget_icon,
  #zalo-chat-widget-root .chat_widget_icon {
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

/** Suppresses only the vendor bubble; the embedded chat panel stays untouched. */
export function hideZaloSdkBubble(doc: Document = document): void {
  if (doc.getElementById(ZALO_WIDGET_STYLE_ID)) return;

  const style = doc.createElement('style');
  style.id = ZALO_WIDGET_STYLE_ID;
  style.textContent = ZALO_WIDGET_TRIGGER_CSS;
  doc.head.appendChild(style);
}

export interface ZaloSocialSdk {
  reload: () => void | Promise<void>;
}

interface ZaloSdkScriptLike {
  id: string;
  src: string;
  async: boolean;
  defer: boolean;
  addEventListener: (type: 'load' | 'error', listener: () => void, options?: { once?: boolean }) => void;
  removeEventListener?: (type: 'load' | 'error', listener: () => void) => void;
}

export interface ZaloSdkLoaderDependencies {
  getSdk: () => ZaloSocialSdk | undefined;
  findScript: () => ZaloSdkScriptLike | null;
  createScript: () => ZaloSdkScriptLike;
  appendScript: (script: ZaloSdkScriptLike) => void;
  setTimer?: (callback: () => void, timeoutMs: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
  timeoutMs?: number;
}

/** Creates a one-shot SDK loader; repeated callers share the same script and promise. */
export function createZaloSdkLoader(dependencies: ZaloSdkLoaderDependencies): () => Promise<void> {
  let loadPromise: Promise<void> | null = null;

  return () => {
    if (dependencies.getSdk()?.reload) return Promise.resolve();
    if (loadPromise) return loadPromise;

    const script = dependencies.findScript() ?? dependencies.createScript();
    script.id = ZALO_SDK_SCRIPT_ID;
    script.src = ZALO_SDK_URL;
    script.async = true;
    script.defer = true;

    const schedule = dependencies.setTimer ?? setTimeout;
    const cancel = dependencies.clearTimer ?? clearTimeout;
    const timeoutMs = dependencies.timeoutMs ?? 15_000;

    loadPromise = new Promise<void>((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (timer !== undefined) cancel(timer);
        script.removeEventListener?.('load', onLoad);
        script.removeEventListener?.('error', onError);
      };
      const settle = (error?: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve();
      };
      const onLoad = () => {
        if (dependencies.getSdk()?.reload) settle();
        else settle(new Error('Zalo SDK loaded without exposing ZaloSocialSDK.reload().'));
      };
      const onError = () => settle(new Error('Unable to load the Zalo chat SDK.'));

      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      timer = schedule(() => settle(new Error('Timed out while loading the Zalo chat SDK.')), timeoutMs);

      if (!dependencies.findScript()) dependencies.appendScript(script);
    });

    return loadPromise;
  };
}

declare global {
  interface Window {
    ZaloSocialSDK?: ZaloSocialSdk;
  }
}

let browserLoader: (() => Promise<void>) | null = null;

/** The browser-level singleton is created only on the first user interaction. */
export function loadZaloSdk(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Zalo chat is only available in a browser.'));
  }

  if (!browserLoader) {
    browserLoader = createZaloSdkLoader({
      getSdk: () => window.ZaloSocialSDK,
      findScript: () => document.getElementById(ZALO_SDK_SCRIPT_ID) as unknown as ZaloSdkScriptLike | null,
      createScript: () => document.createElement('script'),
      appendScript: (script) => document.head.appendChild(script as HTMLScriptElement),
    });
  }

  return browserLoader();
}

export const ZALO_WIDGET_TRIGGER_SELECTOR =
  '#zalo-chat-widget-root .zalo_chat_widget_icon, #zalo-chat-widget-root .chat_widget_icon';

export interface ZaloWidgetDocument {
  querySelector: (selectors: string) => HTMLElement | null;
  documentElement: Node;
}

/** Waits for the SDK's same-page trigger; never enters a cross-origin iframe. */
export function waitForZaloWidgetTrigger(
  doc: ZaloWidgetDocument,
  timeoutMs = 5_000,
): Promise<HTMLElement> {
  const existing = doc.querySelector(ZALO_WIDGET_TRIGGER_SELECTOR);
  if (existing) return Promise.resolve(existing);

  if (typeof MutationObserver === 'undefined') {
    return Promise.reject(new Error('Zalo widget trigger is not available.'));
  }

  return new Promise<HTMLElement>((resolve, reject) => {
    let settled = false;
    const observer = new MutationObserver(() => {
      const trigger = doc.querySelector(ZALO_WIDGET_TRIGGER_SELECTOR);
      if (trigger) settle(trigger);
    });
    const timer = setTimeout(() => settle(undefined), timeoutMs);

    const settle = (trigger?: HTMLElement) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      if (trigger) resolve(trigger);
      else reject(new Error('Zalo widget trigger did not initialize.'));
    };

    observer.observe(doc.documentElement, { childList: true, subtree: true });
    const trigger = doc.querySelector(ZALO_WIDGET_TRIGGER_SELECTOR);
    if (trigger) settle(trigger);
  });
}

/** Reinitializes the official widget, then activates its same-origin trigger. */
export async function openZaloLiveChat(
  doc: ZaloWidgetDocument,
  sdk: ZaloSocialSdk | undefined,
  findTrigger: (doc: ZaloWidgetDocument) => Promise<HTMLElement> = (target) => waitForZaloWidgetTrigger(target),
): Promise<void> {
  if (!sdk?.reload) throw new Error('ZaloSocialSDK.reload() is unavailable.');

  await sdk.reload();
  const trigger = await findTrigger(doc);

  // Keep the user's custom floating button as the only visible/accessibility entry point.
  trigger.setAttribute('aria-hidden', 'true');
  trigger.setAttribute('tabindex', '-1');
  trigger.click();
}

/** Toggles an already initialized widget without reloading or re-injecting its SDK. */
export function clickZaloLiveChatTrigger(doc: ZaloWidgetDocument): void {
  const trigger = doc.querySelector(ZALO_WIDGET_TRIGGER_SELECTOR);
  if (!trigger) throw new Error('Zalo widget trigger is no longer available.');

  trigger.setAttribute('aria-hidden', 'true');
  trigger.setAttribute('tabindex', '-1');
  trigger.click();
}
