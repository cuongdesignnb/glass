'use client';

import { useState, useEffect, useRef } from 'react';
import { FiSend } from 'react-icons/fi';
import './newsletter.css';

const PLACEHOLDER_TEXTS = [
  'Bạn muốn nhận ưu đãi?',
  'Hãy để lại địa chỉ email của bạn!',
  'Giảm giá đến 50% cho thành viên!',
];

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const phaseRef = useRef(0);         // which text
  const charRef = useRef(0);          // which char
  const typingRef = useRef(true);     // typing vs deleting
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const tick = () => {
      const text = PLACEHOLDER_TEXTS[phaseRef.current];
      if (typingRef.current) {
        charRef.current++;
        setPlaceholder(text.slice(0, charRef.current));
        if (charRef.current >= text.length) {
          typingRef.current = false;
          timerRef.current = setTimeout(tick, 2000); // pause before delete
          return;
        }
        timerRef.current = setTimeout(tick, 70);
      } else {
        charRef.current--;
        setPlaceholder(text.slice(0, charRef.current));
        if (charRef.current <= 0) {
          typingRef.current = true;
          phaseRef.current = (phaseRef.current + 1) % PLACEHOLDER_TEXTS.length;
          timerRef.current = setTimeout(tick, 400);
          return;
        }
        timerRef.current = setTimeout(tick, 35);
      }
    };
    timerRef.current = setTimeout(tick, 500);
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Vui lòng nhập email hợp lệ');
      return;
    }
    setError('');
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      await fetch(`${API}/public/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSubmitted(true);
      setEmail('');
    } catch {
      setError('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  return (
    <section className="newsletter">
      <div className="container">
        <div className="newsletter__inner">
          <div className="newsletter__text">
            <h2 className="newsletter__title">Nhận ưu đãi & coupon mới nhất!</h2>
            <p className="newsletter__desc">Chúng tôi cam kết bảo mật không lộ thông tin của bạn.</p>
          </div>
          <div className="newsletter__form-wrap">
            {submitted ? (
              <div className="newsletter__success">
                ✅ Cảm ơn bạn! Chúng tôi sẽ gửi ưu đãi qua email sớm nhất.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="newsletter__form">
                <div className="newsletter__input-wrap">
                  <input
                    type="email"
                    className="newsletter__input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={placeholder + '|'}
                  />
                </div>
                <button type="submit" className="newsletter__btn">
                  <FiSend /> ĐĂNG KÝ
                </button>
              </form>
            )}
            {error && <div className="newsletter__error">{error}</div>}
            <p className="newsletter__note">Nhận ngay coupon giảm 15% khi đăng ký ngay</p>
          </div>
        </div>
      </div>
    </section>
  );
}
