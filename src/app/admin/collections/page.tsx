'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useToken } from '@/lib/useToken';
import MediaPicker from '@/components/admin/MediaPicker';
import {
  FiPlus, FiTrash2, FiEdit2, FiSave, FiX, FiCheck,
  FiArrowUp, FiArrowDown, FiEye, FiEyeOff, FiImage
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const SIZE_OPTIONS = [
  { value: 'normal', label: 'Bình thường' },
  { value: 'tall', label: 'Cao (2 hàng)' },
  { value: 'wide', label: 'Rộng (2 cột)' },
];

const PRESET_VARIANTS = [
  { value: 'classic', label: 'Classic (Vàng ấm)', gradient_from: '#f7f0e8', gradient_to: '#ede4d6', accent: '#c9a96e' },
  { value: 'sport', label: 'Sport (Xanh dương)', gradient_from: '#e8eef7', gradient_to: '#d6e0f0', accent: '#3b82f6' },
  { value: 'vintage', label: 'Vintage (Nâu trầm)', gradient_from: '#f0ebe3', gradient_to: '#e5ddd0', accent: '#8b6914' },
  { value: 'minimal', label: 'Minimal (Hồng nhạt)', gradient_from: '#f5f0ed', gradient_to: '#ebe5e2', accent: '#8b7064' },
  { value: 'luxury', label: 'Luxury (Xanh lá)', gradient_from: '#e8efe8', gradient_to: '#d5e0d5', accent: '#166534' },
  { value: 'custom', label: 'Tùy chỉnh màu...' },
];

const emptyForm = {
  name: '',
  description: '',
  tag: '',
  variant: 'classic',
  size: 'normal',
  image: '',
  gradient_from: '#f7f0e8',
  gradient_to: '#ede4d6',
  accent_color: '#c9a96e',
  order: 0,
  is_active: true,
};

export default function AdminCollectionsPage() {
  const { token } = useToken();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  useEffect(() => { if (token) loadCollections(); }, [token]);

  const loadCollections = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await adminApi.getCollections(token);
      setCollections(Array.isArray(result) ? result : (result?.data || []));
    } catch (err: any) {
      console.error('Collection load error:', err);
      toast.error('Lỗi khi tải bộ sưu tập');
    } finally {
      setLoading(false);
    }
  };

  const handleVariantChange = (variant: string) => {
    const preset = PRESET_VARIANTS.find(p => p.value === variant);
    if (preset && preset.value !== 'custom') {
      setForm({
        ...form,
        variant,
        gradient_from: preset.gradient_from || form.gradient_from,
        gradient_to: preset.gradient_to || form.gradient_to,
        accent_color: preset.accent || form.accent_color,
      });
    } else {
      setForm({ ...form, variant });
    }
  };

  const handleSave = async () => {
    if (!token || !form.name) return;
    const saveToast = toast.loading('Đang lưu...');
    try {
      if (editingId) {
        await adminApi.updateCollection(token, editingId, form);
      } else {
        await adminApi.createCollection(token, form);
      }
      toast.success(editingId ? 'Đã cập nhật bộ sưu tập' : 'Đã tạo bộ sưu tập mới', { id: saveToast });
      resetForm();
      loadCollections();
    } catch (err: any) {
      toast.error('Lỗi: ' + (err.message || ''), { id: saveToast });
    }
  };

  const handleEdit = (col: any) => {
    setEditingId(col.id);
    setForm({
      name: col.name || '',
      description: col.description || '',
      tag: col.tag || '',
      variant: col.variant || 'classic',
      size: col.size || 'normal',
      image: col.image || '',
      gradient_from: col.gradient_from || '#f7f0e8',
      gradient_to: col.gradient_to || '#ede4d6',
      accent_color: col.accent_color || '#c9a96e',
      order: col.order || 0,
      is_active: col.is_active ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa bộ sưu tập này?')) return;
    if (!token) return;
    try {
      await adminApi.deleteCollection(token, id);
      toast.success('Đã xóa bộ sưu tập');
      loadCollections();
    } catch (err: any) {
      toast.error('Lỗi khi xóa');
    }
  };

  const handleReorder = async (id: number, direction: 'up' | 'down') => {
    if (!token) return;
    const idx = collections.findIndex(c => c.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= collections.length) return;

    const items = [
      { id: collections[idx].id, order: collections[swapIdx].order },
      { id: collections[swapIdx].id, order: collections[idx].order },
    ];

    try {
      await adminApi.reorderCollections(token, items);
      loadCollections();
    } catch {
      toast.error('Lỗi khi sắp xếp');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setForm(emptyForm);
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Quản Lý Bộ Sưu Tập</h1>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            <FiPlus /> Thêm Bộ Sưu Tập
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Form */}
        {showForm && (
          <div className="admin-card" style={{ marginBottom: '24px' }}>
            <div className="admin-card__header">
              <h3 className="admin-card__title">{editingId ? 'Sửa Bộ Sưu Tập' : 'Tạo Bộ Sưu Tập Mới'}</h3>
              <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={resetForm}><FiX /> Đóng</button>
            </div>

            <div className="admin-form">
              {/* Row 1: Name + Tag */}
              <div className="admin-form__row">
                <div className="admin-form__group" style={{ flex: 2 }}>
                  <label className="admin-form__label">Tên bộ sưu tập *</label>
                  <input className="admin-form__input" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Thanh Lịch" />
                </div>
                <div className="admin-form__group" style={{ flex: 1 }}>
                  <label className="admin-form__label">Nhãn (Tag)</label>
                  <input className="admin-form__input" value={form.tag}
                    onChange={e => setForm({ ...form, tag: e.target.value.toUpperCase() })} placeholder="VD: CLASSIC" />
                </div>
              </div>

              {/* Row 2: Description */}
              <div className="admin-form__group">
                <label className="admin-form__label">Mô tả ngắn</label>
                <input className="admin-form__input" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} placeholder="VD: Tinh tế, sang trọng" />
              </div>

              {/* Row 3: Variant + Size */}
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Kiểu màu</label>
                  <select className="admin-form__input" value={form.variant}
                    onChange={e => handleVariantChange(e.target.value)}>
                    {PRESET_VARIANTS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Kích thước Masonry</label>
                  <select className="admin-form__input" value={form.size}
                    onChange={e => setForm({ ...form, size: e.target.value })}>
                    {SIZE_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Color pickers */}
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Màu gradient (Từ)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="color" value={form.gradient_from}
                      onChange={e => setForm({ ...form, gradient_from: e.target.value })}
                      style={{ width: '44px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                    <input className="admin-form__input" value={form.gradient_from} style={{ flex: 1 }}
                      onChange={e => setForm({ ...form, gradient_from: e.target.value })} />
                  </div>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Màu gradient (Đến)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="color" value={form.gradient_to}
                      onChange={e => setForm({ ...form, gradient_to: e.target.value })}
                      style={{ width: '44px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                    <input className="admin-form__input" value={form.gradient_to} style={{ flex: 1 }}
                      onChange={e => setForm({ ...form, gradient_to: e.target.value })} />
                  </div>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Màu nhấn (Tag/CTA)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="color" value={form.accent_color}
                      onChange={e => setForm({ ...form, accent_color: e.target.value })}
                      style={{ width: '44px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                    <input className="admin-form__input" value={form.accent_color} style={{ flex: 1 }}
                      onChange={e => setForm({ ...form, accent_color: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Image picker */}
              <div className="admin-form__group">
                <label className="admin-form__label">Ảnh bộ sưu tập *</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <button type="button" className="admin-btn admin-btn--secondary"
                    onClick={() => setShowMediaPicker(true)}>
                    <FiImage /> Chọn từ Media Library
                  </button>
                  {form.image && (
                    <div style={{ position: 'relative' }}>
                      <img src={form.image.startsWith('http') ? form.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${form.image}`}
                        alt="" style={{ width: '160px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <button onClick={() => setForm({ ...form, image: '' })}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem' }}>
                        <FiX />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="admin-form__group">
                <label className="admin-form__label">Xem trước</label>
                <div style={{
                  position: 'relative',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  minHeight: form.size === 'tall' ? '280px' : '180px',
                  maxWidth: form.size === 'wide' ? '100%' : '300px',
                  background: form.image ? '#000' : `linear-gradient(160deg, ${form.gradient_from} 0%, ${form.gradient_to} 100%)`,
                }}>
                  {form.image && (
                    <img src={form.image.startsWith('http') ? form.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${form.image}`}
                      alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <div style={{ 
                    position: 'absolute', inset: 0, 
                    background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 40%, transparent 100%)' 
                  }} />
                  <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px', zIndex: 2 }}>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: form.size === 'tall' ? '1.75rem' : '1.375rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                      {form.name || 'Tên Bộ Sưu Tập'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row: Order + Status */}
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Thứ tự</label>
                  <input type="number" className="admin-form__input" value={form.order}
                    onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Trạng thái</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '44px', color: 'rgba(255,255,255,0.7)' }}>
                    <input type="checkbox" checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
                      style={{ accentColor: 'var(--color-gold)' }} />
                    {form.is_active ? 'Hiển thị công khai' : 'Đang ẩn'}
                  </label>
                </div>
              </div>

              <button className="admin-btn admin-btn--primary" onClick={handleSave} disabled={!form.name}>
                <FiSave /> {editingId ? 'Cập Nhật' : 'Tạo Bộ Sưu Tập'}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Vị trí</th>
                <th>Xem trước</th>
                <th>Tên</th>
                <th style={{ width: '100px' }}>Nhãn</th>
                <th style={{ width: '100px' }}>Kích thước</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '120px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</td></tr>
              ) : collections.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                  Chưa có bộ sưu tập nào! Nhấn "Thêm Bộ Sưu Tập" để tạo mới.
                </td></tr>
              ) : collections.map((col, idx) => (
                <tr key={col.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                      <button className="admin-table__action" onClick={() => handleReorder(col.id, 'up')}
                        disabled={idx === 0} style={{ opacity: idx === 0 ? 0.3 : 1 }}><FiArrowUp /></button>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{col.order}</span>
                      <button className="admin-table__action" onClick={() => handleReorder(col.id, 'down')}
                        disabled={idx === collections.length - 1} style={{ opacity: idx === collections.length - 1 ? 0.3 : 1 }}><FiArrowDown /></button>
                    </div>
                  </td>
                  <td>
                    {col.image ? (
                      <img src={col.image.startsWith('http') ? col.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${col.image}`}
                        alt={col.name}
                        style={{
                          width: col.size === 'wide' ? '120px' : '80px',
                          height: col.size === 'tall' ? '80px' : '50px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }} />
                    ) : (
                      <div style={{
                        width: col.size === 'wide' ? '120px' : '80px',
                        height: col.size === 'tall' ? '80px' : '50px',
                        background: `linear-gradient(160deg, ${col.gradient_from || '#f5f3ef'} 0%, ${col.gradient_to || '#ede4d6'} 100%)`,
                        borderRadius: '8px',
                        border: `1px solid ${col.accent_color || '#c9a96e'}25`,
                      }} />
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{col.name}</div>
                    {col.description && (
                      <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{col.description}</div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                      /{col.slug}
                    </div>
                  </td>
                  <td>
                    {col.tag && (
                      <span style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        padding: '3px 8px',
                        borderRadius: '999px',
                        color: col.accent_color || '#c9a96e',
                        border: `1px solid ${col.accent_color || '#c9a96e'}40`,
                        background: `${col.accent_color || '#c9a96e'}15`,
                      }}>{col.tag}</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
                    {SIZE_OPTIONS.find(s => s.value === col.size)?.label || col.size}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {col.is_active ? (
                      <span className="admin-badge admin-badge--success"><FiCheck /> Hiện</span>
                    ) : (
                      <span className="admin-badge admin-badge--danger"><FiX /> Ẩn</span>
                    )}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <button className="admin-table__action" onClick={() => handleEdit(col)} title="Sửa"><FiEdit2 /></button>
                      <button className="admin-table__action admin-table__action--danger" onClick={() => handleDelete(col.id)} title="Xóa"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => {
          setForm(f => ({ ...f, image: url }));
        }}
      />
    </>
  );
}
