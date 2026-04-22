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

  const zaloIcon = settings['chat_zalo_icon'];
  const messengerIcon = settings['chat_messenger_icon'];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const hasZalo = !!(zaloOaId || zaloPhone);
  const hasMessenger = !!messengerPageId;

  // Load Zalo SDK for embedded live chat widget
  useEffect(() => {
    if (!zaloOaId || zaloLoaded.current) return;

    // Remove existing SDK to re-init
    const oldScript = document.getElementById('zalo-sdk-script');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'zalo-sdk-script';
    script.src = 'https://sp.zalo.me/plugins/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    zaloLoaded.current = true;
  }, [zaloOaId]);

  if (!hasZalo && !hasMessenger) return null;

  const resolveIcon = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return `${apiUrl}${path}`;
    return path;
  };

  return (
    <>
      {/* ── Zalo OA Chat Widget (embedded live chat by SDK) ── */}
      {zaloOaId && (
        <div
          className="zalo-chat-widget"
          data-oaid={zaloOaId}
          data-welcome-message={zaloWelcome}
          data-autopopup="0"
          data-width="350"
          data-height="420"
        />
      )}

      {/* ── Custom Zalo icon (override SDK default bubble) ── */}
      {hasZalo && zaloIcon && (
        <style jsx global>{`
          /* Hide default Zalo SDK bubble when custom icon is set */
          #zalo-chat-widget-root .zalo_chat_widget_icon,
          #zalo-chat-widget-root .chat_widget_icon {
            background-image: url('${resolveIcon(zaloIcon)}') !important;
            background-size: contain !important;
            background-repeat: no-repeat !important;
            background-position: center !important;
          }
          #zalo-chat-widget-root .zalo_chat_widget_icon svg,
          #zalo-chat-widget-root .chat_widget_icon svg,
          #zalo-chat-widget-root .zalo_chat_widget_icon img,
          #zalo-chat-widget-root .chat_widget_icon img {
            display: none !important;
          }
        `}</style>
      )}

      {/* ── Messenger floating button (always visible) ── */}
      {hasMessenger && (
        <a
          href={`https://m.me/${messengerPageId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-messenger-float"
          aria-label="Chat Messenger"
          title="Chat qua Messenger"
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

      <style jsx global>{`
        /* ── Messenger floating button ── */
        .chat-messenger-float {
          position: fixed;
          bottom: ${hasZalo && zaloOaId ? '90px' : '24px'};
          right: 24px;
          z-index: 9998;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0695FF, #A334FA, #FF6968);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease;
          overflow: hidden;
        }
        .chat-messenger-float:hover {
          transform: scale(1.12);
          box-shadow: 0 6px 24px rgba(0,0,0,0.28);
        }
        .chat-messenger-float:active {
          transform: scale(0.95);
        }

        /* Pulse ring for Messenger */
        .chat-messenger-float::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          animation: msg-ring 2.5s infinite;
          pointer-events: none;
        }
        @keyframes msg-ring {
          0% { box-shadow: 0 0 0 0 rgba(163,52,250,0.4); }
          70% { box-shadow: 0 0 0 14px rgba(163,52,250,0); }
          100% { box-shadow: 0 0 0 0 rgba(163,52,250,0); }
        }

        /* ── Position Zalo SDK widget properly ── */
        #zalo-chat-widget-root {
          z-index: 9999 !important;
        }

        @media (max-width: 768px) {
          .chat-messenger-float {
            bottom: ${hasZalo && zaloOaId ? '80px' : '16px'};
            right: 12px;
            width: 48px;
            height: 48px;
          }
        }
      `}</style>
    </>
  );
}
