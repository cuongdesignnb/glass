'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useToken } from '@/lib/useToken';
import MediaPicker from '@/components/admin/MediaPicker';
import { FiPlus, FiTrash2, FiEdit2, FiSave, FiImage, FiEye, FiEyeOff } from 'react-icons/fi';
import { BANNER_POSITIONS } from '@/lib/constants';
import toast from 'react-hot-toast';

export default function AdminBannersPage() {
  const { token } = useToken();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'image' | 'image_mobile'>('image');
  const [form, setForm] = useState({
    title: '', subtitle: '', image: '', image_mobile: '', url: '',
    position: 'hero', order: 0, is_active: true, start_date: '', end_date: '',
  });

  useEffect(() => { loadBanners(); }, []);

  const loadBanners = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await adminApi.getBanners(token);
      setBanners(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!token || !form.title) return;
    try {
      if (editingId) {
        await adminApi.updateBanner(token, editingId, form);
      } else {
        await adminApi.createBanner(token, form);
      }
      toast.success(editingId ? 'Đã cập nhật banner' : 'Đã thêm banner Mới');
      resetForm();
      loadBanners();
    } catch (err: any) { 
      toast.error('Lỗi khi lưu banner: ' + (err.message || ''));
      console.error(err); 
    }
  };

  const handleEdit = (banner: any) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title, subtitle: banner.subtitle || '',
      image: banner.image, image_mobile: banner.image_mobile || '',
      url: banner.url || '', position: banner.position,
      order: banner.order, is_active: banner.is_active,
      start_date: banner.start_date ? banner.start_date.slice(0, 16) : '',
      end_date: banner.end_date ? banner.end_date.slice(0, 16) : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa banner này?')) return;
    if (!token) return;
    try {
      await adminApi.deleteBanner(token, id);
      toast.success('Đã xóa banner');
      loadBanners();
    } catch (err: any) { 
      toast.error('Lỗi khi xóa banner');
      console.error(err); 
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setForm({
      title: '', subtitle: '', image: '', image_mobile: '', url: '',
      position: 'hero', order: 0, is_active: true, start_date: '', end_date: '',
    });
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Quản Lý Banner</h1>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            <FiPlus /> Thêm Banner
          </button>
        </div>
      </div>
      <div className="admin-content">
        {/* Form */}
        {showForm && (
          <div className="admin-card" style={{ marginBottom: '24px' }}>
            <h3 className="admin-card__title" style={{ marginBottom: '20px' }}>
              {editingId ? 'Sửa Banner' : 'Thêm Banner Mới'}
            </h3>
            <div className="admin-form">
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Tiêu đề *</label>
                  <input className="admin-form__input" value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Tiêu đề banner" />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Phụ đề</label>
                  <input className="admin-form__input" value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Phụ đề" />
                </div>
              </div>
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Hình ảnh Desktop *</label>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() => { setMediaTarget('image'); setShowMediaPicker(true); }}>
                    <FiImage /> Chọn từ Media
                  </button>
                  {form.image && (
                    <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', height: '80px', width: '160px', background: 'rgba(255,255,255,0.06)' }}>
                      <img src={form.image.startsWith('http') ? form.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${form.image}`}
                        alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Hình ảnh Mobile</label>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() => { setMediaTarget('image_mobile'); setShowMediaPicker(true); }}>
                    <FiImage /> Chọn ảnh Mobile
                  </button>
                  {form.image_mobile && (
                    <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', height: '80px', width: '80px', background: 'rgba(255,255,255,0.06)' }}>
                      <img src={form.image_mobile.startsWith('http') ? form.image_mobile : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${form.image_mobile}`}
                        alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">URL (liên kết khi click)</label>
                <input className="admin-form__input" value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="/san-pham" />
              </div>
              <div className="admin-form__row--3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
                <div className="admin-form__group">
                  <label className="admin-form__label">Vị trí</label>
                  <select className="admin-form__input" value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}>
                    {BANNER_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Bắt đầu</label>
                  <input type="datetime-local" className="admin-form__input" value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Kết thúc</label>
                  <input type="datetime-local" className="admin-form__input" value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="admin-btn admin-btn--primary" onClick={handleSave}>
                  <FiSave /> {editingId ? 'Cập Nhật' : 'Thêm Banner'}
                </button>
                <button className="admin-btn admin-btn--secondary" onClick={resetForm}>Hủy</button>
              </div>
            </div>
          </div>
        )}

        {/* Banner List */}
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Hình ảnh</th>
                <th>Tiêu đề</th>
                <th>Vị trí</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</td></tr>
              ) : banners.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>Chưa có banner</td></tr>
              ) : banners.map((banner: any) => (
                <tr key={banner.id}>
                  <td>
                    <div style={{ width: '120px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                      {banner.image && <img src={banner.image.startsWith('http') ? banner.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${banner.image}`}
                        alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-white)' }}>{banner.title}</div>
                    {banner.subtitle && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{banner.subtitle}</div>}
                  </td>
                  <td>
                    <span className="admin-badge admin-badge--info">
                      {BANNER_POSITIONS.find(p => p.value === banner.position)?.label || banner.position}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${banner.is_active ? 'admin-badge--success' : 'admin-badge--danger'}`}>
                      {banner.is_active ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <button className="admin-table__action" onClick={() => handleEdit(banner)} title="Sửa"><FiEdit2 /></button>
                      <button className="admin-table__action admin-table__action--danger" onClick={() => handleDelete(banner.id)} title="Xóa"><FiTrash2 /></button>
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
          setForm(f => ({ ...f, [mediaTarget]: url }));
        }}
      />
    </>
  );
}
