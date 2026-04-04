'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useToken } from '@/lib/useToken';
import {
  FiPlus, FiTrash2, FiEdit2, FiSave, FiX, FiCheck,
  FiGift, FiSearch, FiCopy
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const SCOPE_LABELS: Record<string, string> = {
  all: 'Toàn bộ',
  product: 'Sản phẩm cụ thể',
  user: 'User cụ thể',
};

const TYPE_LABELS: Record<string, string> = {
  fixed: 'Giảm cố định (₫)',
  percent: 'Giảm theo %',
};

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(n) + 'đ';

const emptyForm = {
  code: '',
  description: '',
  type: 'fixed' as 'fixed' | 'percent',
  scope: 'all' as 'all' | 'product' | 'user',
  value: 0,
  min_order: 0,
  max_discount: 0,
  max_uses: 100,
  per_user_limit: 1,
  expires_at: '',
  is_active: true,
  user_id: null as number | null,
  product_ids: [] as number[],
};

export default function AdminVouchersPage() {
  const { token } = useToken();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  // User search
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => { if (token) loadVouchers(); }, [token]);

  const loadVouchers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await adminApi.getVouchers(token);
      setVouchers(Array.isArray(result) ? result : (result?.data || []));
    } catch (err: any) {
      toast.error('Lỗi khi tải vouchers');
    } finally {
      setLoading(false);
    }
  };

  // Product search
  useEffect(() => {
    if (!token || !productSearch || productSearch.length < 2) {
      setProductResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await adminApi.getProducts(token, { search: productSearch, per_page: '10' });
        const data = res?.data || res || [];
        setProductResults(Array.isArray(data) ? data : []);
      } catch { setProductResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, token]);

  // User search
  useEffect(() => {
    if (!token || !userSearch || userSearch.length < 2) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await adminApi.searchUsers(token, userSearch);
        setUserResults(Array.isArray(res) ? res : (res?.data || []));
      } catch { setUserResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, token]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'GLASS';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, code });
  };

  const addProduct = (p: any) => {
    if (selectedProducts.find(sp => sp.id === p.id)) return;
    setSelectedProducts([...selectedProducts, p]);
    setForm({ ...form, product_ids: [...form.product_ids, p.id] });
    setProductSearch('');
    setProductResults([]);
  };

  const removeProduct = (id: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== id));
    setForm({ ...form, product_ids: form.product_ids.filter(pid => pid !== id) });
  };

  const selectUser = (u: any) => {
    setSelectedUser(u);
    setForm({ ...form, user_id: u.id });
    setUserSearch('');
    setUserResults([]);
  };

  const handleSave = async () => {
    if (!token || !form.code) {
      toast.error('Vui lòng nhập mã voucher');
      return;
    }
    if (form.value <= 0) {
      toast.error('Giá trị giảm phải lớn hơn 0');
      return;
    }
    const saveToast = toast.loading('Đang lưu...');
    try {
      const payload = { ...form };
      if (payload.scope !== 'product') payload.product_ids = [];
      if (payload.scope !== 'user') payload.user_id = null;
      if (payload.type !== 'percent') payload.max_discount = 0;

      if (editingId) {
        await adminApi.updateVoucher(token, editingId, payload);
      } else {
        await adminApi.createVoucher(token, payload);
      }
      toast.success(editingId ? 'Đã cập nhật voucher' : 'Đã tạo voucher mới', { id: saveToast });
      resetForm();
      loadVouchers();
    } catch (err: any) {
      toast.error('Lỗi: ' + (err.message || ''), { id: saveToast });
    }
  };

  const handleEdit = (v: any) => {
    setEditingId(v.id);
    setForm({
      code: v.code || '',
      description: v.description || '',
      type: v.type || 'fixed',
      scope: v.scope || 'all',
      value: v.value || 0,
      min_order: v.min_order || 0,
      max_discount: v.max_discount || 0,
      max_uses: v.max_uses || 100,
      per_user_limit: v.per_user_limit || 1,
      expires_at: v.expires_at ? v.expires_at.slice(0, 10) : '',
      is_active: v.is_active ?? true,
      user_id: v.user_id || null,
      product_ids: v.products?.map((p: any) => p.id) || [],
    });
    setSelectedProducts(v.products || []);
    setSelectedUser(v.user || null);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa voucher này?')) return;
    if (!token) return;
    try {
      await adminApi.deleteVoucher(token, id);
      toast.success('Đã xóa voucher');
      loadVouchers();
    } catch {
      toast.error('Lỗi khi xóa');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setForm(emptyForm);
    setSelectedProducts([]);
    setSelectedUser(null);
    setProductSearch('');
    setUserSearch('');
  };

  const getStatusInfo = (v: any) => {
    if (!v.is_active) return { label: 'Tắt', cls: 'admin-badge--danger' };
    if (v.expires_at && new Date(v.expires_at) < new Date()) return { label: 'Hết hạn', cls: 'admin-badge--danger' };
    if (v.max_uses > 0 && v.used_count >= v.max_uses) return { label: 'Hết lượt', cls: 'admin-badge--danger' };
    return { label: 'Hoạt động', cls: 'admin-badge--success' };
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Quản Lý Voucher</h1>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            <FiPlus /> Tạo Voucher
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Form */}
        {showForm && (
          <div className="admin-card" style={{ marginBottom: '24px' }}>
            <div className="admin-card__header">
              <h3 className="admin-card__title">{editingId ? 'Sửa Voucher' : 'Tạo Voucher Mới'}</h3>
              <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={resetForm}><FiX /> Đóng</button>
            </div>

            <div className="admin-form">
              {/* Row 1: Code + Description */}
              <div className="admin-form__row">
                <div className="admin-form__group" style={{ flex: 1 }}>
                  <label className="admin-form__label">Mã voucher *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="admin-form__input" value={form.code} style={{ flex: 1, fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.1em' }}
                      onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="VD: GIAM50K" />
                    <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={generateCode} type="button" title="Tạo mã ngẫu nhiên">
                      Auto
                    </button>
                  </div>
                </div>
                <div className="admin-form__group" style={{ flex: 2 }}>
                  <label className="admin-form__label">Mô tả</label>
                  <input className="admin-form__input" value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })} placeholder="VD: Giảm 50K cho đơn từ 500K" />
                </div>
              </div>

              {/* Row 2: Type + Scope */}
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Loại giảm giá</label>
                  <select className="admin-form__input" value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as any })}>
                    <option value="fixed">Giảm cố định (₫)</option>
                    <option value="percent">Giảm theo %</option>
                  </select>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Phạm vi áp dụng</label>
                  <select className="admin-form__input" value={form.scope}
                    onChange={e => setForm({ ...form, scope: e.target.value as any })}>
                    <option value="all">Toàn bộ sản phẩm</option>
                    <option value="product">Sản phẩm cụ thể</option>
                    <option value="user">User được chỉ định</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Value + Min Order + Max Discount */}
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">
                    {form.type === 'percent' ? 'Giảm (%)' : 'Giảm (₫)'}
                  </label>
                  <input type="number" className="admin-form__input" value={form.value}
                    onChange={e => setForm({ ...form, value: Number(e.target.value) })} min={0} />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Đơn tối thiểu (₫)</label>
                  <input type="number" className="admin-form__input" value={form.min_order}
                    onChange={e => setForm({ ...form, min_order: Number(e.target.value) })} min={0} step={10000} />
                </div>
                {form.type === 'percent' && (
                  <div className="admin-form__group">
                    <label className="admin-form__label">Giảm tối đa (₫)</label>
                    <input type="number" className="admin-form__input" value={form.max_discount}
                      onChange={e => setForm({ ...form, max_discount: Number(e.target.value) })} min={0} step={10000} />
                  </div>
                )}
              </div>

              {/* Row 4: Uses + Per User + Expires */}
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Tổng lượt dùng tối đa</label>
                  <input type="number" className="admin-form__input" value={form.max_uses}
                    onChange={e => setForm({ ...form, max_uses: Number(e.target.value) })} min={0} />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>0 = không giới hạn</span>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Mỗi user dùng tối đa</label>
                  <input type="number" className="admin-form__input" value={form.per_user_limit}
                    onChange={e => setForm({ ...form, per_user_limit: Number(e.target.value) })} min={0} />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Hạn sử dụng</label>
                  <input type="date" className="admin-form__input" value={form.expires_at}
                    onChange={e => setForm({ ...form, expires_at: e.target.value })} />
                </div>
              </div>

              {/* Product Picker (scope=product) */}
              {form.scope === 'product' && (
                <div className="admin-form__group">
                  <label className="admin-form__label">Chọn sản phẩm áp dụng</label>
                  <div style={{ position: 'relative' }}>
                    <input className="admin-form__input" value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Tìm sản phẩm theo tên..." />
                    {productResults.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        background: '#1a1a3a', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', maxHeight: '200px', overflowY: 'auto',
                      }}>
                        {productResults.map(p => (
                          <div key={p.id} onClick={() => addProduct(p)}
                            style={{
                              padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span style={{ color: '#fff' }}>{p.name}</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>
                              {formatVND(p.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedProducts.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                      {selectedProducts.map(p => (
                        <span key={p.id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          background: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '20px',
                          fontSize: '0.8125rem', color: '#fff',
                        }}>
                          {p.name}
                          <FiX style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => removeProduct(p.id)} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* User Picker (scope=user) */}
              {form.scope === 'user' && (
                <div className="admin-form__group">
                  <label className="admin-form__label">Chọn khách hàng được nhận</label>
                  {selectedUser ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      background: 'rgba(255,255,255,0.06)', padding: '12px 16px', borderRadius: '10px',
                    }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.875rem', fontWeight: 700, color: '#1a1a2e',
                      }}>{selectedUser.name?.charAt(0) || '?'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{selectedUser.name}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>{selectedUser.email} | {selectedUser.phone || 'N/A'}</div>
                      </div>
                      <FiX style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => { setSelectedUser(null); setForm({ ...form, user_id: null }); }} />
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <input className="admin-form__input" value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        placeholder="Tìm theo tên, email, SĐT..." />
                      {userResults.length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                          background: '#1a1a3a', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px', maxHeight: '200px', overflowY: 'auto',
                        }}>
                          {userResults.map((u: any) => (
                            <div key={u.id} onClick={() => selectUser(u)}
                              style={{
                                padding: '10px 16px', cursor: 'pointer',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <div style={{ color: '#fff', fontWeight: 500 }}>{u.name}</div>
                              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>
                                {u.email} | {u.phone || 'N/A'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', marginTop: '4px', opacity: 0.7 }}>
                    💡 Khách hàng sẽ nhận thông báo tự động khi được gán voucher
                  </span>
                </div>
              )}

              {/* Status */}
              <div className="admin-form__group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                  <input type="checkbox" checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    style={{ accentColor: 'var(--color-gold)' }} />
                  {form.is_active ? 'Voucher đang hoạt động' : 'Voucher đang tắt'}
                </label>
              </div>

              {/* Preview */}
              <div className="admin-form__group">
                <label className="admin-form__label">Xem trước</label>
                <div style={{
                  background: 'linear-gradient(135deg, #f8f6f3 0%, #efe9e0 100%)',
                  border: '1px dashed #d4c5b0',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  maxWidth: '400px',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8b7e6a' }}>Mã: {form.code || '???'}</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 300, color: '#1c1917', lineHeight: 1.1, margin: '8px 0' }}>
                      {form.type === 'percent'
                        ? <><span style={{ fontSize: '1rem', fontWeight: 400 }}>Giảm</span> {form.value}<span style={{ fontSize: '1.5rem' }}>%</span></>
                        : <><span style={{ fontSize: '1rem', fontWeight: 400 }}>Giảm</span> {(form.value / 1000)}K</>
                      }
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#78716c', borderLeft: '1px solid #d4c5b0', paddingLeft: '16px' }}>
                    {form.min_order > 0
                      ? `Cho đơn từ ${formatVND(form.min_order)}`
                      : 'Không yêu cầu đơn tối thiểu'}
                    {form.type === 'percent' && form.max_discount > 0 && (
                      <div style={{ marginTop: '4px' }}>Giảm tối đa {formatVND(form.max_discount)}</div>
                    )}
                  </div>
                </div>
              </div>

              <button className="admin-btn admin-btn--primary" onClick={handleSave} disabled={!form.code || form.value <= 0}>
                <FiSave /> {editingId ? 'Cập Nhật' : 'Tạo Voucher'}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>Mã & Mô tả</th>
                <th style={{ width: '130px' }}>Loại</th>
                <th style={{ width: '120px' }}>Phạm vi</th>
                <th style={{ width: '130px' }}>Giá trị</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Đã dùng</th>
                <th style={{ width: '110px' }}>Hạn</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '100px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</td></tr>
              ) : vouchers.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                  Chưa có voucher nào! Nhấn "Tạo Voucher" để bắt đầu.
                </td></tr>
              ) : vouchers.map((v, idx) => {
                const status = getStatusInfo(v);
                return (
                  <tr key={v.id}>
                    <td style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{
                          fontWeight: 700, color: 'var(--color-gold)', fontSize: '0.9375rem',
                          letterSpacing: '0.05em',
                        }}>{v.code}</code>
                        <FiCopy style={{ cursor: 'pointer', opacity: 0.3, fontSize: '0.75rem' }}
                          onClick={() => { navigator.clipboard.writeText(v.code); toast.success('Đã copy mã'); }} />
                      </div>
                      {v.description && (
                        <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{v.description}</div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                        background: v.type === 'percent' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                        color: v.type === 'percent' ? '#60a5fa' : '#34d399',
                      }}>
                        {v.type === 'percent' ? `${v.value}%` : formatVND(v.value)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
                      {SCOPE_LABELS[v.scope] || v.scope}
                      {v.scope === 'product' && v.products_count > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{v.products_count} SP</div>
                      )}
                      {v.scope === 'user' && v.user && (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{v.user.name}</div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
                      {v.min_order > 0 && <div>Từ {formatVND(v.min_order)}</div>}
                      {v.type === 'percent' && v.max_discount > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                          Max: {formatVND(v.max_discount)}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{v.used_count}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>/{v.max_uses || '∞'}</span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
                      {v.expires_at ? new Date(v.expires_at).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`admin-badge ${status.cls}`}>
                        {status.label === 'Hoạt động' ? <FiCheck /> : <FiX />} {status.label}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <button className="admin-table__action" onClick={() => handleEdit(v)} title="Sửa"><FiEdit2 /></button>
                        <button className="admin-table__action admin-table__action--danger" onClick={() => handleDelete(v.id)} title="Xóa"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
