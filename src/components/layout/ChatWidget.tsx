'use client';

import { useState } from 'react';
import { useSettings } from '@/lib/useSettings';

export default function ChatWidget() {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);

  const zaloOaId = settings['zalo_oa_id'];
  const zaloPhone = settings['zalo_phone'];
  const messengerPageId = settings['messenger_page_id'];
  const phone = settings['contact_phone'];

  // Build links
  const zaloLink = zaloOaId
    ? `https://zalo.me/${zaloOaId}`
    : zaloPhone
      ? `https://zalo.me/${zaloPhone}`
      : null;

  const messengerLink = messengerPageId
    ? `https://m.me/${messengerPageId}`
    : null;

  const phoneLink = phone ? `tel:${phone}` : null;

  // Don't render if nothing configured
  if (!zaloLink && !messengerLink && !phoneLink) return null;

  return (
    <>
      <div className="chat-widget">
        {/* Expanded items */}
        <div className={`chat-widget__items ${open ? 'chat-widget__items--open' : ''}`}>
          {phoneLink && (
            <a
              href={phoneLink}
              className="chat-widget__item chat-widget__item--phone"
              aria-label="Gọi điện"
              title="Gọi điện tư vấn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </a>
          )}

          {messengerLink && (
            <a
              href={messengerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-widget__item chat-widget__item--messenger"
              aria-label="Chat Messenger"
              title="Chat qua Messenger"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.18V22l2.96-1.63c.84.23 1.72.36 2.64.36h.25c5.64 0 10-4.13 10-9.7S17.64 2 12 2zm1.07 13.06l-2.54-2.73L5.8 15.06l5.13-5.46 2.6 2.73 4.67-2.73-5.13 5.46z"/>
              </svg>
            </a>
          )}

          {zaloLink && (
            <a
              href={zaloLink}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-widget__item chat-widget__item--zalo"
              aria-label="Chat Zalo"
              title="Chat qua Zalo"
            >
              <svg viewBox="0 0 48 48" fill="currentColor" width="26" height="26">
                <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm8.95 26.75c-.35.85-2.05 1.65-2.85 1.75-.75.1-1.7.15-2.75-.17-1.6-.5-3.65-1.4-6.3-3.95-3.55-3.4-5.55-7.55-5.75-7.9-.15-.35-1.5-2-1.5-3.8s.95-2.7 1.3-3.05c.35-.35.75-.45 1-.45h.7c.25 0 .55-.05.85.65.35.75 1.15 2.8 1.25 3 .1.2.15.45.05.7-.15.3-.2.45-.4.7-.2.25-.4.55-.6.75-.2.2-.4.4-.2.8.25.4 1 1.7 2.15 2.75 1.5 1.35 2.7 1.8 3.1 2 .35.2.6.15.8-.1.25-.25 1-1.15 1.25-1.55.25-.4.55-.35.9-.2.35.15 2.25 1.05 2.65 1.25.4.2.65.3.75.45.1.2.1 1.05-.25 1.9z"/>
              </svg>
            </a>
          )}
        </div>

        {/* Main toggle button */}
        <button
          className={`chat-widget__toggle ${open ? 'chat-widget__toggle--open' : ''}`}
          onClick={() => setOpen(!open)}
          aria-label="Chat với chúng tôi"
        >
          <svg className="chat-widget__icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <svg className="chat-widget__icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <style jsx>{`
        .chat-widget {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .chat-widget__items {
          display: flex;
          flex-direction: column;
          gap: 10px;
          opacity: 0;
          transform: translateY(20px) scale(0.8);
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .chat-widget__items--open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: all;
        }

        .chat-widget__item {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(0,0,0,0.15);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .chat-widget__item:hover {
          transform: scale(1.12);
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        }

        .chat-widget__item--zalo {
          background: #0068ff;
        }
        .chat-widget__item--messenger {
          background: linear-gradient(135deg, #0695FF, #A334FA, #FF6968);
        }
        .chat-widget__item--phone {
          background: #25d366;
        }

        .chat-widget__toggle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #c9a96e, #b8944f);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(201,169,110,0.4);
          transition: all 0.3s ease;
          position: relative;
        }
        .chat-widget__toggle:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 24px rgba(201,169,110,0.5);
        }

        .chat-widget__icon-chat,
        .chat-widget__icon-close {
          position: absolute;
          transition: all 0.3s ease;
        }
        .chat-widget__icon-chat {
          opacity: 1;
          transform: rotate(0deg);
        }
        .chat-widget__icon-close {
          opacity: 0;
          transform: rotate(-90deg);
        }
        .chat-widget__toggle--open .chat-widget__icon-chat {
          opacity: 0;
          transform: rotate(90deg);
        }
        .chat-widget__toggle--open .chat-widget__icon-close {
          opacity: 1;
          transform: rotate(0deg);
        }

        /* Pulse animation for attention */
        .chat-widget__toggle::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(201,169,110,0.3);
          animation: chat-pulse 2s infinite;
        }
        .chat-widget__toggle--open::before {
          animation: none;
          opacity: 0;
        }

        @keyframes chat-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        @media (max-width: 768px) {
          .chat-widget {
            bottom: 16px;
            right: 16px;
          }
          .chat-widget__toggle {
            width: 50px;
            height: 50px;
          }
          .chat-widget__item {
            width: 44px;
            height: 44px;
          }
        }
      `}</style>
    </>
  );
}
