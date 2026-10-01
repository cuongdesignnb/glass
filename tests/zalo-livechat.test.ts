import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  clickZaloLiveChatTrigger,
  createZaloSdkLoader,
  hideZaloSdkBubble,
  openZaloLiveChat,
  ZALO_SDK_SCRIPT_ID,
  ZALO_SDK_URL,
  ZALO_WIDGET_STYLE_ID,
  type ZaloSdkLoaderDependencies,
} from '../src/lib/zalo-livechat.ts';

type ScriptEvent = 'load' | 'error';

class FakeScript {
  id = '';
  src = '';
  async = false;
  defer = false;
  private listeners = new Map<ScriptEvent, Array<() => void>>();

  addEventListener(type: ScriptEvent, listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(type: ScriptEvent, listener: () => void) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener));
  }

  emit(type: ScriptEvent) {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

function makeLoaderHarness() {
  let ready = false;
  let script: FakeScript | null = null;
  let appendCount = 0;
  let timeoutCallback: (() => void) | undefined;
  const dependencies: ZaloSdkLoaderDependencies = {
    getSdk: () => ready ? { reload() {} } : undefined,
    findScript: () => script,
    createScript: () => new FakeScript(),
    appendScript: (nextScript) => {
      script = nextScript as FakeScript;
      appendCount += 1;
    },
    setTimer: (callback) => {
      timeoutCallback = callback;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: () => {},
    timeoutMs: 100,
  };

  return {
    load: createZaloSdkLoader(dependencies),
    get appendCount() { return appendCount; },
    get script() { return script; },
    get timeoutCallback() { return timeoutCallback; },
    markReady() { ready = true; },
  };
}

test('Zalo SDK uses one lazy singleton script across concurrent user clicks', async () => {
  const harness = makeLoaderHarness();
  const first = harness.load();
  const second = harness.load();

  assert.strictEqual(first, second);
  assert.equal(harness.appendCount, 1);
  assert.equal(harness.script?.id, ZALO_SDK_SCRIPT_ID);
  assert.equal(harness.script?.src, ZALO_SDK_URL);
  assert.equal(harness.script?.async, true);

  harness.markReady();
  harness.script?.emit('load');
  await Promise.all([first, second]);
});

test('SDK script load failure rejects cleanly so UI can switch to the direct fallback', async () => {
  const harness = makeLoaderHarness();
  const load = harness.load();
  harness.script?.emit('error');

  await assert.rejects(load, /Unable to load the Zalo chat SDK/);
  assert.equal(harness.appendCount, 1);
  assert.ok(harness.timeoutCallback);

  const component = readFileSync('src/components/layout/ChatWidget.tsx', 'utf8');
  assert.match(component, /zaloMode === 'direct' \|\| zaloState === 'failed'/);
  assert.match(component, /href=\{zaloUrl\}/);
});

test('live chat initializes through the SDK and activates only the same-page widget trigger', async () => {
  const attributes = new Map<string, string>();
  let clickCount = 0;
  const trigger = {
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    click: () => { clickCount += 1; },
  } as unknown as HTMLElement;
  const doc = {
    querySelector: () => trigger,
    documentElement: {} as Node,
  };
  let reloadCount = 0;

  await openZaloLiveChat(doc, { reload: () => { reloadCount += 1; } });
  assert.equal(reloadCount, 1);
  assert.equal(clickCount, 1);
  assert.equal(attributes.get('aria-hidden'), 'true');
  assert.equal(attributes.get('tabindex'), '-1');
});

test('subsequent custom-button clicks toggle the ready widget without reinjecting or reloading the SDK', () => {
  let clickCount = 0;
  const trigger = {
    setAttribute() {},
    click: () => { clickCount += 1; },
  } as unknown as HTMLElement;
  clickZaloLiveChatTrigger({ querySelector: () => trigger, documentElement: {} as Node });
  assert.equal(clickCount, 1);
});

test('legacy custom icon remains the external Zalo trigger and vendor bubble is visually suppressed', () => {
  const component = readFileSync('src/components/layout/ChatWidget.tsx', 'utf8');
  const sdk = readFileSync('src/lib/zalo-livechat.ts', 'utf8');
  assert.match(component, /<Image src=\{zaloIcon\}/);
  assert.match(component, /data-testid="chat-widget-zalo"/);
  assert.match(component, /hideZaloSdkBubble\(\)/);
  assert.match(sdk, /#zalo-chat-widget-root \.zalo_chat_widget_icon/);
  assert.match(sdk, /pointer-events:\s*none/);
  assert.match(sdk, /ZALO_WIDGET_STYLE_ID/);

  let appended = 0;
  const existing = new Set<string>();
  const fakeDocument = {
    getElementById: (id: string) => existing.has(id) ? {} as HTMLElement : null,
    createElement: () => ({
      id: '',
      textContent: '',
    }),
    head: {
      appendChild: (style: { id: string }) => {
        existing.add(style.id);
        appended += 1;
        return style;
      },
    },
  } as unknown as Document;
  hideZaloSdkBubble(fakeDocument);
  hideZaloSdkBubble(fakeDocument);
  assert.equal(appended, 1);
  assert.ok(existing.has(ZALO_WIDGET_STYLE_ID));
});
