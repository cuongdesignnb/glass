'use client';

import { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

interface FAQItem {
  question: string;
  answer: string;
}

export default function AboutClient({ faqs }: { faqs: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!faqs || faqs.length === 0) return null;

  return (
    <div style={{ marginTop: '50px' }}>
      <h2 style={{
        fontSize: '2rem',
        textAlign: 'center',
        marginBottom: '30px',
        color: 'var(--color-gold)',
        fontFamily: 'var(--font-display)',
      }}>
        Câu Hỏi Thường Gặp (FAQs)
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px 24px',
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  gap: '12px',
                }}
              >
                <span>{faq.question}</span>
                <FiChevronDown
                  style={{
                    color: 'var(--color-gold)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                    flexShrink: 0,
                  }}
                />
              </button>
              <div
                style={{
                  maxHeight: isOpen ? '500px' : '0px',
                  opacity: isOpen ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: 'rgba(255, 255, 255, 0.01)',
                }}
              >
                <div
                  style={{
                    padding: '0 24px 24px 24px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: '1.6',
                    fontSize: '0.95rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.03)',
                    paddingTop: '16px',
                  }}
                >
                  {faq.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
