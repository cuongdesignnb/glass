'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminArticleCategories, invalidateAdmin } from '@/lib/useAdmin';
import { useToken } from '@/lib/useToken';
import MediaPicker from '@/components/admin/MediaPicker';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiFolder, FiFolderPlus, FiX, FiChevronRight, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminArticleCategoriesPage() {
  const { token } = useToken();
  const { data: categories, isLoading, mutate: refresh } = useAdminArticleCategories(token);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', image: '', parent_id: '',
    order: 0, is_active: true, meta_title: '', meta_desc: '',
  });

  const allCategories = Array.isArray(categories) ? categories : [];

  // Flatten tree for parent dropdown
  const flattenCategories = (cats: any[], depth = 0): any[] => {
    let result: any[] = [];
    for (const cat of cats) {
      result.push({ ...cat, depth });
      if (cat.children?.length) {
        result = result.concat(flattenCategories(cat.children, depth + 1));
      }
    }
    return result;
  };
  const flatCategories = flattenCategories(allCategories);

  const handleSave = async () => {
    if (!token || !form.name) return;
    try {
      const payload = { ...form, parent_id: form.parent_id ? Number(form.parent_id) : null };
      if (editingId) {
        await adminApi.updateArticleCategory(token, editingId, payload);
      } else {
        await adminApi.createArticleCategory(token, payload);
      }
      toast.success(editingId ? 'Đã cập nhật danh mục' : 'Đã tạo danh mục');
      resetForm();
      invalidateAdmin('/admin/article-categories');
      refresh();
    } catch (err: any) { toast.error('Lỗi: ' + (err.message || 'Không thể lưu')); }
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name, description: cat.description || '',
      image: cat.image || '', parent_id: cat.parent_id ? String(cat.parent_id) : '',
      order: cat.order || 0, is_active: cat.is_active ?? true,
      meta_title: cat.meta_title || '', meta_desc: cat.meta_desc || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa danh mục bài viết này?')) return;
    if (!token) return;
    try {
      await adminApi.deleteArticleCategory(token, id);
      toast.success('Đã xóa danh mục');
      invalidateAdmin('/admin/article-categories');
      refresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi khi xóa: ' + (err.message || ''));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setForm({ name: '', description: '', image: '', parent_id: '', order: 0, is_active: true, meta_title: '', meta_desc: '' });
  };

  const renderCategory = (cat: any, depth = 0) => (
    <div key={cat.id}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px', marginLeft: depth * 28 + 'px',
        background: editingId === cat.id ? 'rgba(201,169,110,0.08)' : 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', marginBottom: '6px',
        transition: 'all 0.2s',
      }}>
        {depth > 0 && <FiChevronRight style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />}
        <FiFolder style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-white)' }}>{cat.name}</span>
            <span className={`admin-badge ${cat.is_active ? 'admin-badge--success' : 'admin-badge--danger'}`} style={{ fontSize: '0.625rem' }}>
              {cat.is_active ? 'Hoạt động' : 'Ẩn'}
            </span>
            {cat.articles_count !== undefined && (
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>({cat.articles_count} bài viết)</span>
            )}
          </div>
          {cat.description && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{cat.description}</div>}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="admin-table__action" onClick={() => handleEdit(cat)} title="Sửa"><FiEdit2 /></button>
          <button className="admin-table__action admin-table__action--danger" onClick={() => handleDelete(cat.id)} title="Xóa"><FiTrash2 /></button>
        </div>
      </div>
      {cat.children?.sort((a: any, b: any) => a.order - b.order).map((child: any) => renderCategory(child, depth + 1))}
    </div>
  );

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Danh Mục Bài Viết ({flatCategories.length})</h1>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            <FiFolderPlus /> Thêm Danh Mục
          </button>
        </div>
      </div>
      <div className="admin-content">
        {/* Form */}
        {showForm && (
          <div className="admin-card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="admin-card__title">{editingId ? 'Sửa Danh Mục' : 'Thêm Danh Mục Mới'}</h3>
              <button onClick={resetForm} style={{ color: 'rgba(255,255,255,0.4)' }}><FiX /></button>
            </div>
            <div className="admin-form">
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Tên danh mục *</label>
                  <input className="admin-form__input" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ví dụ: Tin tức thời trang" />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Danh mục cha</label>
                  <select className="admin-form__input" value={form.parent_id}
                    onChange={e => setForm({ ...form, parent_id: e.target.value })}>
                    <option value="">— Không có (Danh mục gốc) —</option>
                    {flatCategories.filter((c: any) => c.id !== editingId).map((c: any) => (
                      <option key={c.id} value={c.id}>{'—'.repeat(c.depth)} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">Mô tả</label>
                <textarea className="admin-form__input" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả danh mục bài viết" rows={2} />
              </div>
              <div className="admin-form__row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="admin-form__group">
                  <label className="admin-form__label">Hình ảnh</label>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() => setShowMediaPicker(true)}>
                    <FiImage /> Chọn từ Media
                  </button>
                  {form.image && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={form.image.startsWith('http') ? form.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${form.image}`}
                        alt="" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <button onClick={() => setForm({ ...form, image: '' })} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}><FiX /></button>
                    </div>
                  )}
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Thứ tự</label>
                  <input type="number" className="admin-form__input" value={form.order}
                    onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">&nbsp;</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', paddingTop: '8px' }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                      style={{ accentColor: 'var(--color-gold)' }} /> Hiển thị
                  </label>
                </div>
              </div>
              <details style={{ color: 'rgba(255,255,255,0.5)' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.875rem', marginBottom: '12px' }}>SEO (tùy chọn)</summary>
                <div className="admin-form__row">
                  <div className="admin-form__group">
                    <label className="admin-form__label">Meta Title</label>
                    <input className="admin-form__input" value={form.meta_title}
                      onChange={e => setForm({ ...form, meta_title: e.target.value })} />
                  </div>
                  <div className="admin-form__group">
                    <label className="admin-form__label">Meta Description</label>
                    <input className="admin-form__input" value={form.meta_desc}
                      onChange={e => setForm({ ...form, meta_desc: e.target.value })} />
                  </div>
                </div>
              </details>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="admin-btn admin-btn--primary" onClick={handleSave}>
                  <FiSave /> {editingId ? 'Cập Nhật' : 'Thêm Danh Mục'}
                </button>
                <button className="admin-btn admin-btn--secondary" onClick={resetForm}>Hủy</button>
              </div>
            </div>
          </div>
        )}

        {/* Categories Tree */}
        <div className="admin-card">
          <h2 className="admin-card__title" style={{ marginBottom: '16px' }}>
            <FiFolder style={{ marginRight: '8px', color: 'var(--color-gold)' }} /> Cây Danh Mục Bài Viết
          </h2>
          {isLoading ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', padding: '24px', textAlign: 'center' }}>Đang tải...</p>
          ) : allCategories.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', padding: '24px', textAlign: 'center' }}>
              Chưa có danh mục bài viết. Click &quot;Thêm Danh Mục&quot; để bắt đầu.
            </p>
          ) : (
            <div>{allCategories.filter((c: any) => !c.parent_id).sort((a: any, b: any) => a.order - b.order).map((cat: any) => renderCategory(cat))}</div>
          )}
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
