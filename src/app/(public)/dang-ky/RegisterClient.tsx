'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiUser, FiMail, FiLock, FiPhone, FiArrowRight, FiEye, FiEyeOff, FiGift } from 'react-icons/fi';
import { useAuth } from '@/lib/useAuth';
import LocationPicker from '@/components/ui/LocationPicker';
import '../dang-nhap/auth.css';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', password: '', password_confirmation: '',
    phone: '', province: '', ward: '', address_detail: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reward, setReward] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.password_confirmation) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const res = await register(form);
      if (res.reward) {
        setReward(res.reward);
      } else {
        router.push('/tai-khoan');
      }
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (reward) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-reward">
            <FiGift className="auth-reward__icon" />
            <h2 className="auth-reward__title">Chào Mừng Thành Viên Mới!</h2>
            <p className="auth-reward__message">{reward.message}</p>
            {reward.type === 'voucher' && (
              <div className="auth-reward__code">
                <span>Mã voucher:</span>
                <strong>{reward.voucher_code}</strong>
              </div>
            )}
            <button className="auth-submit" onClick={() => router.push('/tai-khoan')}>
              Đi tới Tài khoản <FiArrowRight />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-card__header">
          <h1 className="auth-card__title">Đăng Ký Tài Khoản</h1>
          <p className="auth-card__subtitle">Trở thành thành viên Glass Eyewear để nhận ưu đãi đặc biệt</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form__row">
            <div className="auth-field">
              <label className="auth-label">Họ tên *</label>
              <div className="auth-input-wrap">
                <FiUser className="auth-input-icon" />
                <input type="text" className="auth-input" placeholder="Nguyễn Văn A" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-label">Số điện thoại</label>
              <div className="auth-input-wrap">
                <FiPhone className="auth-input-icon" />
                <input type="tel" className="auth-input" placeholder="0912 345 678" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Email *</label>
            <div className="auth-input-wrap">
              <FiMail className="auth-input-icon" />
              <input type="email" className="auth-input" placeholder="email@example.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
          </div>

          <div className="auth-form__row">
            <div className="auth-field">
              <label className="auth-label">Mật khẩu *</label>
              <div className="auth-input-wrap">
                <FiLock className="auth-input-icon" />
                <input type={showPw ? 'text' : 'password'} className="auth-input" placeholder="Tối thiểu 6 ký tự"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-label">Xác nhận mật khẩu *</label>
              <div className="auth-input-wrap">
                <FiLock className="auth-input-icon" />
                <input type={showPw ? 'text' : 'password'} className="auth-input" placeholder="Nhập lại mật khẩu"
                  value={form.password_confirmation} onChange={e => setForm(f => ({ ...f, password_confirmation: e.target.value }))} required />
              </div>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Địa chỉ (tùy chọn)</label>
            <LocationPicker
              province={form.province}
              ward={form.ward}
              addressDetail={form.address_detail}
              onChange={loc => setForm(f => ({ ...f, province: loc.province, ward: loc.ward, address_detail: loc.address_detail }))}
              compact
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký'}
            {!loading && <FiArrowRight />}
          </button>
        </form>

        <div className="auth-footer">
          <p>Đã có tài khoản? <Link href="/dang-nhap" className="auth-link">Đăng nhập</Link></p>
        </div>
      </div>
    </div>
  );
}
