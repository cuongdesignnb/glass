'use client';

import { useState } from 'react';
import { FiSend } from 'react-icons/fi';
import './newsletter.css';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

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
                    placeholder="Nhập địa chỉ email của bạn"
                    aria-label="Địa chỉ email nhận ưu đãi"
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
