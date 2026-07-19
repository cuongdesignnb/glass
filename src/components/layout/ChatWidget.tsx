'use client';

import { useEffect, useRef } from 'react';
import { useSettings } from '@/lib/useSettings';
import Image from 'next/image';

export default function ChatWidget() {
  const { settings } = useSettings();
  const zaloLoaded = useRef(false);

  const zaloOaId = settings['zalo_oa_id'];
  const zaloPhone = settings['zalo_phone'];
  const messengerPageId = settings['messenger_page_id'];
  const zaloWelcome = settings['zalo_welcome'] || 'Xin chào! Mình có thể giúp gì cho bạn?';
  const messengerIcon = settings['chat_messenger_icon'];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const hasZalo = !!(zaloOaId || zaloPhone);
  const hasMessenger = !!messengerPageId;

  // The third-party iframe changes size several times while booting. Load it only
  // after intent on the stable placeholder so those movements cannot create CLS.
  useEffect(() => {
    if (!zaloOaId) return;
    const trigger = document.getElementById('zalo-chat-widget-trigger');
    if (!trigger) return;

    const loadScript = () => {
      if (zaloLoaded.current) return;
      if (document.getElementById('zalo-sdk-script')) {
        zaloLoaded.current = true;
        return;
      }

      const script = document.createElement('script');
      script.id = 'zalo-sdk-script';
      script.src = 'https://sp.zalo.me/plugins/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      zaloLoaded.current = true;
      cleanup();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        loadScript();
      }
    };

    const cleanup = () => {
      trigger.removeEventListener('pointerenter', loadScript);
      trigger.removeEventListener('pointerdown', loadScript);
      trigger.removeEventListener('focus', loadScript);
      trigger.removeEventListener('keydown', handleKeyDown);
    };

    trigger.addEventListener('pointerenter', loadScript, { passive: true });
    trigger.addEventListener('pointerdown', loadScript, { passive: true });
    trigger.addEventListener('focus', loadScript, { passive: true });
    trigger.addEventListener('keydown', handleKeyDown);

    return cleanup;
  }, [zaloOaId]);

  // Inject global CSS for messenger pulse + zalo z-index
  useEffect(() => {
    if (document.getElementById('chat-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'chat-widget-styles';
    style.textContent = `
      @keyframes msg-ring {
        0% { box-shadow: 0 0 0 0 rgba(163,52,250,0.4); }
        70% { box-shadow: 0 0 0 14px rgba(163,52,250,0); }
        100% { box-shadow: 0 0 0 0 rgba(163,52,250,0); }
      }
      #zalo-chat-widget-root { z-index: 9999 !important; }
      #zalo-chat-widget-trigger {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 9999;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #0068ff;
        box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font: 700 13px/1 sans-serif;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }, []);

  if (!hasZalo && !hasMessenger) return null;

  const resolveIcon = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return `${apiUrl}${path}`;
    return path;
  };

  const messengerBottom = hasZalo && zaloOaId ? 90 : 24;

  return (
    <>
      {/* Zalo OA Chat Widget — SDK creates embedded live chat */}
      {zaloOaId && (
        <div
          id="zalo-chat-widget-trigger"
          className="zalo-chat-widget"
          data-oaid={zaloOaId}
          data-welcome-message={zaloWelcome}
          data-autopopup="0"
          data-width="350"
          data-height="420"
          role="button"
          tabIndex={0}
          aria-label="Mở chat Zalo"
        >
          Zalo
        </div>
      )}

      {/* Messenger floating button */}
      {hasMessenger && (
        <a
          href={`https://m.me/${messengerPageId}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat Messenger"
          title="Chat qua Messenger"
          style={{
            position: 'fixed',
            bottom: `${messengerBottom}px`,
            right: '24px',
            zIndex: 9998,
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0695FF, #A334FA, #FF6968)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            animation: 'msg-ring 2.5s infinite',
          }}
        >
          {messengerIcon ? (
            <Image
              src={resolveIcon(messengerIcon)}
              alt="Messenger"
              width={40}
              height={40}
              style={{ objectFit: 'contain' }}
              unoptimized
            />
          ) : (
            <svg viewBox="0 0 28 28" fill="currentColor" width="30" height="30">
              <path d="M14 2.042c-6.76 0-12 4.952-12 11.64 0 3.72 1.56 6.88 4.08 9.08V26l3.24-1.8c.96.28 1.92.42 3 .42h.36c6.76 0 11.64-4.952 11.64-11.64S20.76 2.042 14 2.042zm1.2 15.6l-3.12-3.36-5.88 3.36 6.36-6.72 3.12 3.36 5.88-3.36-6.36 6.72z"/>
            </svg>
          )}
        </a>
      )}
    </>
  );
}
