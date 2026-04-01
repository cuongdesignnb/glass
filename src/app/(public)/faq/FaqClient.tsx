'use client';

import { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

export default function FaqClient({ initialFaqs }: { initialFaqs: any[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {initialFaqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={faq.id || index}
            style={{
              background: isOpen ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isOpen ? 'var(--color-gold, #c9a96e)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '12px',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
            }}
          >
            <button
              onClick={() => toggle(index)}
              aria-expanded={isOpen}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                color: isOpen ? 'var(--color-gold, #c9a96e)' : '#fff',
                transition: 'color 0.2s',
              }}
            >
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, paddingRight: '20px' }}>
                {faq.question}
              </h3>
              <FiChevronDown
                style={{
                  fontSize: '1.25rem',
                  color: isOpen ? 'var(--color-gold, #c9a96e)' : 'rgba(255,255,255,0.4)',
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  flexShrink: 0,
                }}
              />
            </button>
            {isOpen && (
              <div style={{ padding: '0 24px 24px 24px', color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: 1.7 }}>
                <p style={{ margin: 0 }}>{faq.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
