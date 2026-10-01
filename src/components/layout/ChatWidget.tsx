'use client';

import Image from 'next/image';
import { useSettings } from '@/lib/useSettings';
import {
  isChatWidgetEnabled,
  resolveChatIconUrl,
  resolveChatWidgetUrl,
} from '@/lib/chat-widget';
import styles from './ChatWidget.module.css';

function ZaloIcon() {
  return (
    <svg viewBox="0 0 32 32" width="31" height="31" fill="none" aria-hidden="true" focusable="false">
      <path d="M6 5.5h20a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5h-9l-6.3 4v-4H6A2.5 2.5 0 0 1 3.5 21V8A2.5 2.5 0 0 1 6 5.5Z" fill="currentColor" />
      <path d="M10 12h11l-7.5 7H22" stroke="#0068ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg viewBox="0 0 28 28" width="30" height="30" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M14 2.042c-6.76 0-12 4.952-12 11.64 0 3.72 1.56 6.88 4.08 9.08V26l3.24-1.8c.96.28 1.92.42 3 .42h.36c6.76 0 11.64-4.952 11.64-11.64S20.76 2.042 14 2.042zm1.2 15.6l-3.12-3.36-5.88 3.36 6.36-6.72 3.12 3.36 5.88-3.36-6.36 6.72z" />
    </svg>
  );
}

export default function ChatWidget() {
  const { settings } = useSettings();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const zaloUrl = resolveChatWidgetUrl('zalo', settings);
  const messengerUrl = resolveChatWidgetUrl('messenger', settings);
  const showZalo = isChatWidgetEnabled('zalo', settings, zaloUrl);
  const showMessenger = isChatWidgetEnabled('messenger', settings, messengerUrl);
  const zaloIcon = resolveChatIconUrl(settings.chat_zalo_icon, apiUrl);
  const messengerIcon = resolveChatIconUrl(settings.chat_messenger_icon, apiUrl);

  if ((!showZalo || !zaloUrl) && (!showMessenger || !messengerUrl)) return null;

  return (
    <nav className={styles.stack} aria-label="Liên hệ nhanh" data-testid="chat-widget-stack">
      {showZalo && zaloUrl && (
        <a
          className={`${styles.button} ${styles.zalo}`}
          href={zaloUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat qua Zalo"
          title="Chat qua Zalo"
          data-testid="chat-widget-zalo"
        >
          {zaloIcon ? (
            <Image src={zaloIcon} alt="" aria-hidden="true" width={42} height={42} className={styles.customIcon} unoptimized />
          ) : <ZaloIcon />}
          <span className={styles.tooltip} aria-hidden="true">Chat Zalo</span>
        </a>
      )}
      {showMessenger && messengerUrl && (
        <a
          className={`${styles.button} ${styles.messenger}`}
          href={messengerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat qua Facebook Messenger"
          title="Chat qua Messenger"
          data-testid="chat-widget-messenger"
        >
          {messengerIcon ? (
            <Image src={messengerIcon} alt="" aria-hidden="true" width={42} height={42} className={styles.customIcon} unoptimized />
          ) : <MessengerIcon />}
          <span className={styles.tooltip} aria-hidden="true">Messenger</span>
        </a>
      )}
    </nav>
  );
}
