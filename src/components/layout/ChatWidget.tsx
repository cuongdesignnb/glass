'use client';

import { useEffect } from 'react';
import { useSettings } from '@/lib/useSettings';
import Image from 'next/image';

export default function ChatWidget() {
  const { settings } = useSettings();

  const zaloOaId = settings['zalo_oa_id'];
  const zaloPhone = settings['zalo_phone'];
  const messengerPageId = settings['messenger_page_id'];
  const zaloWelcome = settings['zalo_welcome'] || 'Xin chào! Mình có thể giúp gì cho bạn?';

  const zaloIcon = settings['chat_zalo_icon'];
  const messengerIcon = settings['chat_messenger_icon'];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const zaloTarget = zaloOaId || zaloPhone;
  const hasZalo = !!zaloTarget;
  const hasMessenger = !!messengerPageId;

  // Load Zalo OA SDK for embedded chat widget
  useEffect(() => {
    if (!zaloOaId) return;

    // Check if already loaded
    if (document.getElementById('zalo-sdk-script')) return;

    const script = document.createElement('script');
    script.id = 'zalo-sdk-script';
    script.src = 'https://sp.zalo.me/plugins/sdk.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      const existing = document.getElementById('zalo-sdk-script');
      if (existing) existing.remove();
    };
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
      {/* Zalo OA SDK embedded chat widget (hidden default bubble, we use custom icon) */}
      {zaloOaId && (
        <div
          className="zalo-chat-widget"
          data-oaid={zaloOaId}
          data-welcome-message={zaloWelcome}
          data-autopopup="0"
          data-width="350"
          data-height="420"
          style={{ display: 'none' }}
        />
      )}

      <div className="chat-float">
        {hasMessenger && (
          <a
            href={`https://m.me/${messengerPageId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-float__btn chat-float__btn--messenger"
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

        {hasZalo && (
          <a
            href={`https://zalo.me/${zaloTarget}`}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-float__btn chat-float__btn--zalo"
            aria-label="Chat Zalo"
            title="Chat qua Zalo"
          >
            {zaloIcon ? (
              <Image
                src={resolveIcon(zaloIcon)}
                alt="Zalo"
                width={40}
                height={40}
                style={{ objectFit: 'contain' }}
                unoptimized
              />
            ) : (
              <svg viewBox="0 0 48 48" fill="currentColor" width="34" height="34">
                <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm8.95 26.75c-.35.85-2.05 1.65-2.85 1.75-.75.1-1.7.15-2.75-.17-1.6-.5-3.65-1.4-6.3-3.95-3.55-3.4-5.55-7.55-5.75-7.9-.15-.35-1.5-2-1.5-3.8s.95-2.7 1.3-3.05c.35-.35.75-.45 1-.45h.7c.25 0 .55-.05.85.65.35.75 1.15 2.8 1.25 3 .1.2.15.45.05.7-.15.3-.2.45-.4.7-.2.25-.4.55-.6.75-.2.2-.4.4-.2.8.25.4 1 1.7 2.15 2.75 1.5 1.35 2.7 1.8 3.1 2 .35.2.6.15.8-.1.25-.25 1-1.15 1.25-1.55.25-.4.55-.35.9-.2.35.15 2.25 1.05 2.65 1.25.4.2.65.3.75.45.1.2.1 1.05-.25 1.9z"/>
              </svg>
            )}
          </a>
        )}
      </div>

      <style jsx global>{`
        .chat-float {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .chat-float__btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease;
          position: relative;
          overflow: hidden;
        }
        .chat-float__btn:hover {
          transform: scale(1.12);
          box-shadow: 0 6px 24px rgba(0,0,0,0.28);
        }
        .chat-float__btn:active {
          transform: scale(0.95);
        }

        .chat-float__btn--zalo {
          background: #0068ff;
          color: #fff;
        }
        .chat-float__btn--messenger {
          background: linear-gradient(135deg, #0695FF, #A334FA, #FF6968);
          color: #fff;
        }

        /* Pulse ring */
        .chat-float__btn::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          box-shadow: 0 0 0 0 currentColor;
          animation: chat-ring 2.5s infinite;
          opacity: 0.3;
          pointer-events: none;
        }
        .chat-float__btn--zalo::after {
          box-shadow: 0 0 0 0 #0068ff;
        }
        .chat-float__btn--messenger::after {
          box-shadow: 0 0 0 0 #A334FA;
        }

        @keyframes chat-ring {
          0% { box-shadow: 0 0 0 0 currentColor; opacity: 0.4; }
          70% { box-shadow: 0 0 0 14px currentColor; opacity: 0; }
          100% { box-shadow: 0 0 0 0 currentColor; opacity: 0; }
        }

        /* Hide default Zalo SDK bubble (we use custom icon) */
        .zalo-chat-widget,
        #zalo-chat-widget-root {
          display: none !important;
        }

        @media (max-width: 768px) {
          .chat-float {
            bottom: 16px;
            right: 12px;
            gap: 10px;
          }
          .chat-float__btn {
            width: 48px;
            height: 48px;
          }
        }
      `}</style>
    </>
  );
}
