'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiShoppingBag, FiStar, FiBell, FiShield, FiLogOut, FiSave } from 'react-icons/fi';
import { useAuth } from '@/lib/useAuth';
import { userApi } from '@/lib/api';
import LocationPicker from '@/components/ui/LocationPicker';
import '../dang-nhap/auth.css';

const tabs = [
  { id: 'profile', label: 'Thông tin', icon: <FiUser /> },
  { id: 'security', label: 'Bảo mật', icon: <FiShield /> },
  { id: 'orders', label: 'Đơn hàng', icon: <FiShoppingBag /> },
  { id: 'points', label: 'Điểm thưởng', icon: <FiStar /> },
  { id: 'notifications', label: 'Thông báo', icon: <FiBell /> },
];

const statusLabels: Record<string, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận',
  shipping: 'Đang giao', delivered: 'Hoàn thành', cancelled: 'Đã hủy',
};

export default function AccountPage() {
  const router = useRouter();
  const { user, token, loading: authLoading, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (!authLoading && !user) router.push('/dang-nhap');
  }, [user, authLoading, router]);

  if (authLoading || !user || !token) {
    return <div className="auth-page"><div className="auth-card"><p style={{ textAlign: 'center' }}>Đang tải...</p></div></div>;
  }

  const initial = user.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="account-page">
      <div className="container">
        <div className="account-layout">
          {/* Sidebar */}
          <aside className="account-sidebar">
            <div className="account-user">
              <div className="account-avatar">{initial}</div>
              <div>
                <div className="account-username">{user.name}</div>
                <div className="account-email">{user.email}</div>
              </div>
            </div>
            <nav className="account-nav">
              {tabs.map(t => (
                <button key={t.id} className={`account-nav-item ${activeTab === t.id ? 'account-nav-item--active' : ''}`}
                  onClick={() => setActiveTab(t.id)}>
                  {t.icon} {t.label}
                  {t.id === 'notifications' && user.unread_notifications ? (
                    <span className="badge">{user.unread_notifications}</span>
                  ) : null}
                </button>
              ))}
            </nav>
            <div className="account-logout">
              <button onClick={() => { logout(); router.push('/'); }}>
                <FiLogOut /> Đăng xuất
              </button>
            </div>
          </aside>

          {/* Content */}
          <div className="account-content">
            {activeTab === 'profile' && <ProfileTab user={user} token={token} onUpdate={refreshUser} />}
            {activeTab === 'security' && <SecurityTab token={token} />}
            {activeTab === 'orders' && <OrdersTab token={token} />}
            {activeTab === 'points' && <PointsTab token={token} />}
            {activeTab === 'notifications' && <NotificationsTab token={token} onRead={refreshUser} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== PROFILE TAB =====================
function ProfileTab({ user, token, onUpdate }: { user: any; token: string; onUpdate: () => void }) {
  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '', province: user.province || '', ward: user.ward || '', address_detail: user.address_detail || '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await userApi.updateProfile(token, form);
      onUpdate();
      setMsg('Cập nhật thành công!');
    } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <h2 className="account-content__title">Thông Tin Cá Nhân</h2>
      <div className="profile-form">
        <div className="profile-form__row">
          <div className="profile-field"><label>Họ tên</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="profile-field"><label>Số điện thoại</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
        </div>
        <LocationPicker province={form.province} ward={form.ward} addressDetail={form.address_detail}
          onChange={loc => setForm(f => ({ ...f, province: loc.province, ward: loc.ward, address_detail: loc.address_detail }))} />
        {msg && <div className="profile-success">{msg}</div>}
        <button className="profile-save" onClick={handleSave} disabled={saving}>
          <FiSave style={{ marginRight: 6 }} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
}

// ===================== SECURITY TAB =====================
function SecurityTab({ token }: { token: string }) {
  const [pwForm, setPwForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [emailMsg, setEmailMsg] = useState('');

  const handlePw = async () => {
    setPwMsg('');
    try {
      const res = await userApi.changePassword(token, pwForm);
      setPwMsg(res.message);
      setPwForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (e: any) { setPwMsg(e.message); }
  };

  const handleEmail = async () => {
    setEmailMsg('');
    try {
      const res = await userApi.changeEmail(token, emailForm);
      setEmailMsg(res.message);
      setEmailForm({ email: '', password: '' });
    } catch (e: any) { setEmailMsg(e.message); }
  };

  return (
    <div>
      <h2 className="account-content__title">Bảo Mật Tài Khoản</h2>
      <div className="profile-form" style={{ marginBottom: 'var(--space-3xl)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Đổi mật khẩu</h3>
        <div className="profile-field"><label>Mật khẩu hiện tại</label><input type="password" value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} /></div>
        <div className="profile-form__row">
          <div className="profile-field"><label>Mật khẩu mới</label><input type="password" value={pwForm.password} onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} /></div>
          <div className="profile-field"><label>Xác nhận</label><input type="password" value={pwForm.password_confirmation} onChange={e => setPwForm(f => ({ ...f, password_confirmation: e.target.value }))} /></div>
        </div>
        {pwMsg && <div className="profile-success">{pwMsg}</div>}
        <button className="profile-save" onClick={handlePw}>Đổi mật khẩu</button>
      </div>

      <div className="profile-form">
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Đổi Email</h3>
        <div className="profile-field"><label>Email mới</label><input type="email" value={emailForm.email} onChange={e => setEmailForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div className="profile-field"><label>Xác nhận mật khẩu</label><input type="password" value={emailForm.password} onChange={e => setEmailForm(f => ({ ...f, password: e.target.value }))} /></div>
        {emailMsg && <div className="profile-success">{emailMsg}</div>}
        <button className="profile-save" onClick={handleEmail}>Đổi Email</button>
      </div>
    </div>
  );
}

// ===================== ORDERS TAB =====================
function OrdersTab({ token }: { token: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookupNum, setLookupNum] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupErr, setLookupErr] = useState('');

  useEffect(() => {
    userApi.getMyOrders(token).then(d => setOrders(d.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleLookup = async () => {
    setLookupErr(''); setLookupResult(null);
    try {
      const res = await (await import('@/lib/api')).publicApi.lookupOrder(lookupNum, lookupPhone);
      setLookupResult(res);
    } catch { setLookupErr('Không tìm thấy đơn hàng'); }
  };

  if (loading) return <p>Đang tải...</p>;

  return (
    <div>
      <h2 className="account-content__title">Đơn Hàng Của Tôi</h2>
      {orders.length === 0 ? (
        <div className="orders-empty">Bạn chưa có đơn hàng nào</div>
      ) : (
        orders.map((o: any) => (
          <div key={o.id} className="order-card">
            <div className="order-card__header">
              <div>
                <span className="order-card__number">#{o.order_number}</span>
                <span className="order-card__date" style={{ marginLeft: 12 }}>{new Date(o.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
              <span className={`order-status order-status--${o.status}`}>{statusLabels[o.status] || o.status}</span>
            </div>
            <div className="order-card__items">
              {o.items?.map((item: any, i: number) => (
                <div key={i} className="order-item-row">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{Number(item.price).toLocaleString('vi-VN')}đ</span>
                </div>
              ))}
            </div>
            <div className="order-card__total">Tổng: {Number(o.total).toLocaleString('vi-VN')}đ</div>
          </div>
        ))
      )}

      <div className="lookup-section">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Tra cứu đơn hàng</h3>
        <p style={{ fontSize: '.8125rem', color: 'var(--color-neutral-500)', marginBottom: 12 }}>Nhập mã đơn và số điện thoại để tra cứu đơn hàng không cần đăng nhập</p>
        <div className="lookup-form">
          <input placeholder="Mã đơn hàng (VD: GLS...)" value={lookupNum} onChange={e => setLookupNum(e.target.value)} />
          <input placeholder="Số điện thoại" value={lookupPhone} onChange={e => setLookupPhone(e.target.value)} />
          <button onClick={handleLookup}>Tra cứu</button>
        </div>
        {lookupErr && <p style={{ color: '#dc2626', marginTop: 8, fontSize: '.875rem' }}>{lookupErr}</p>}
        {lookupResult && (
          <div className="order-card" style={{ marginTop: 16 }}>
            <div className="order-card__header">
              <span className="order-card__number">#{lookupResult.order_number}</span>
              <span className={`order-status order-status--${lookupResult.status}`}>{statusLabels[lookupResult.status]}</span>
            </div>
            <div className="order-card__total">Tổng: {Number(lookupResult.total).toLocaleString('vi-VN')}đ</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== POINTS TAB =====================
function PointsTab({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [redeemPts, setRedeemPts] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    userApi.getPoints(token).then(setData).catch(console.error);
  }, [token]);

  const handleRedeem = async () => {
    setMsg('');
    try {
      const res = await userApi.redeemPoints(token, parseInt(redeemPts));
      setMsg(res.message);
      setRedeemPts('');
      userApi.getPoints(token).then(setData);
    } catch (e: any) { setMsg(e.message); }
  };

  if (!data) return <p>Đang tải...</p>;

  const txns = data.transactions?.data || [];

  return (
    <div>
      <h2 className="account-content__title">Điểm Thưởng</h2>
      <div className="points-summary">
        <div className="points-card"><div className="points-card__value">{data.points}</div><div className="points-card__label">Điểm hiện có</div></div>
        <div className="points-card"><div className="points-card__value">{Number(data.total_spent).toLocaleString('vi-VN')}đ</div><div className="points-card__label">Tổng chi tiêu</div></div>
        <div className="points-card"><div className="points-card__value">{data.config?.points_per_vnd?.toLocaleString()}đ</div><div className="points-card__label">= 1 điểm</div></div>
      </div>

      <div className="redeem-section">
        <h3>Đổi điểm lấy voucher</h3>
        <p style={{ fontSize: '.8125rem', color: 'var(--color-neutral-500)', marginBottom: 12 }}>
          Tối thiểu {data.config?.min_redeem} điểm. {data.config?.vnd_per_point?.toLocaleString()}đ / điểm
        </p>
        <div className="redeem-form">
          <input type="number" placeholder="Số điểm muốn đổi" value={redeemPts} onChange={e => setRedeemPts(e.target.value)} />
          <button onClick={handleRedeem}>Đổi thưởng</button>
        </div>
        {msg && <p style={{ marginTop: 8, fontSize: '.875rem', color: 'var(--color-primary)' }}>{msg}</p>}
      </div>

      <div className="points-history">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Lịch sử điểm</h3>
        {txns.map((t: any) => (
          <div key={t.id} className="points-item">
            <div>
              <div className="points-item__desc">{t.description}</div>
              <div className="points-item__date">{new Date(t.created_at).toLocaleDateString('vi-VN')}</div>
            </div>
            <div className={`points-item__amount ${t.points > 0 ? 'points-item__amount--earn' : 'points-item__amount--redeem'}`}>
              {t.points > 0 ? '+' : ''}{t.points}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== NOTIFICATIONS TAB =====================
function NotificationsTab({ token, onRead }: { token: string; onRead: () => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    userApi.getNotifications(token).then(d => setData(d.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const handleMarkRead = async (id: number) => {
    await userApi.markNotificationRead(token, id);
    load();
    onRead();
  };

  const handleMarkAll = async () => {
    await userApi.markAllRead(token);
    load();
    onRead();
  };

  const typeLabels: Record<string, string> = { info: 'Thông tin', promo: 'Khuyến mãi', order: 'Đơn hàng', system: 'Hệ thống' };

  if (loading) return <p>Đang tải...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="account-content__title" style={{ marginBottom: 0 }}>Thông Báo</h2>
        {data.some((n: any) => !n.is_read) && (
          <button onClick={handleMarkAll} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '.875rem' }}>
            Đọc tất cả
          </button>
        )}
      </div>
      {data.length === 0 ? (
        <div className="orders-empty">Chưa có thông báo nào</div>
      ) : (
        data.map((n: any) => (
          <div key={n.id} className={`notification-item ${!n.is_read ? 'notification-item--unread' : ''}`}
            onClick={() => !n.is_read && handleMarkRead(n.id)}>
            <div className={`notification-dot ${n.is_read ? 'notification-dot--read' : ''}`}></div>
            <div className="notification-item__content">
              <div className="notification-item__title">
                {n.title}
                <span className={`notification-type-badge notification-type-badge--${n.type}`}>{typeLabels[n.type]}</span>
              </div>
              <div className="notification-item__text">{n.content}</div>
              <div className="notification-item__time">{new Date(n.created_at).toLocaleString('vi-VN')}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
