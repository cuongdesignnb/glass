'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { FiPlus, FiTrash2, FiEdit2, FiEye, FiX, FiFile, FiExternalLink } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import MediaPicker from '@/components/admin/MediaPicker';
import toast from 'react-hot-toast';

const RichEditor = dynamic(() => import('@/components/admin/RichEditor'), { ssr: false });

export default function AdminPages() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [editorInsertFn, setEditorInsertFn] = useState<((url: string) => void) | null>(null);

  const [form, setForm] = useState({
    title: '', slug: '', content: '',
    is_published: true, meta_title: '', meta_desc: ''
  });

  useEffect(() => { loadPages(); }, []);

  const loadPages = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const data = await adminApi.getPages(token);
      setPages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    try {
      await adminApi.createPage(token, form);
      resetForm();
      loadPages();
      toast.success('Đã tạo trang mới');
    } catch (err) {
      toast.error('Lỗi tạo trang. Vui lòng kiểm tra lại thông tin.');
    }
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token || !editingId) return;
    try {
      await adminApi.updatePage(token, editingId, form);
      resetForm();
      loadPages();
      toast.success('Đã cập nhật trang');
    } catch (err) {
      toast.error('Lỗi cập nhật trang.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa trang này?')) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    try {
      await adminApi.deletePage(token, id);
      toast.success('Đã xóa trang');
      loadPages();
    } catch (err) {
      toast.error('Lỗi xóa trang.');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ title: '', slug: '', content: '', is_published: true, meta_title: '', meta_desc: '' });
  };

  const editPage = (p: any) => {
    setEditingId(p.id);
    setForm({
      title: p.title, slug: p.slug || '',
      content: p.content || '', is_published: Boolean(p.is_published),
      meta_title: p.meta_title || '', meta_desc: p.meta_desc || ''
    });
    setShowForm(true);
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Quản Lý Trang Tĩnh</h1>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => setShowForm(true)}>
            <FiPlus /> Tạo trang mới
          </button>
        </div>
      </div>

      <div className="admin-content">
        {showForm && (
          <div className="admin-card" style={{ marginBottom: '24px' }}>
            <h2 className="admin-card__title">
              {editingId ? 'Cập nhật trang tĩnh' : 'Tạo trang mới'}
            </h2>
            <div className="admin-form">
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Tiêu đề trang *</label>
                  <input className="admin-form__input" value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="VD: Chính sách bảo mật" />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Đường dẫn tĩnh (Slug)</label>
                  <input className="admin-form__input" value={form.slug}
                    onChange={e => setForm({ ...form, slug: e.target.value })}
                    placeholder="Để trống để tự tạo (VD: chinh-sach-bao-mat)" />
                </div>
              </div>
              
              <div className="admin-form__group">
                <label className="admin-form__label">Nội dung HTML (Chính sách, Hướng dẫn...)</label>
                <div style={{ background: '#13132B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <RichEditor
                    content={form.content}
                    onChange={(html) => setForm({ ...form, content: html })}
                    placeholder="Soạn thảo nội dung ở đây..."
                    onMediaPick={(insertFn) => {
                      setEditorInsertFn(() => insertFn);
                      setShowMediaPicker(true);
                    }}
                  />
                </div>
              </div>

              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Meta Title (SEO)</label>
                  <input className="admin-form__input" value={form.meta_title}
                    onChange={e => setForm({ ...form, meta_title: e.target.value })} />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Meta Description (SEO)</label>
                  <input className="admin-form__input" value={form.meta_desc}
                    onChange={e => setForm({ ...form, meta_desc: e.target.value })} />
                </div>
              </div>

              <div className="admin-form__group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                  <input type="checkbox" checked={form.is_published}
                    onChange={e => setForm({ ...form, is_published: e.target.checked })}
                    style={{ accentColor: 'var(--color-gold)' }} /> Xuất bản (Hiện trên web)
                </label>
              </div>

              <div className="admin-form__actions">
                <button className="admin-btn admin-btn--primary" onClick={editingId ? handleUpdate : handleCreate}>
                  {editingId ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
                <button className="admin-btn admin-btn--secondary" onClick={resetForm}>Hủy</button>
              </div>
            </div>
          </div>
        )}

        <div className="admin-card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tên trang</th>
                  <th>Đường dẫn tĩnh</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.4)' }}>Đang tải...</td></tr>
                ) : pages.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.4)' }}>Chưa có trang tĩnh nào.</td></tr>
                ) : (
                  pages.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}><FiFile style={{ marginRight: '8px', opacity: 0.5 }} /> {p.title}</td>
                      <td style={{ color: 'rgba(255,255,255,0.5)' }}>/{p.slug}</td>
                      <td>
                        {p.is_published ? (
                          <span className="admin-badge admin-badge--success">Công khai</span>
                        ) : (
                          <span className="admin-badge admin-badge--warning">Bản nháp</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="admin-table__action" onClick={() => editPage(p)} title="Sửa">
                            <FiEdit2 />
                          </button>
                          <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="admin-table__action" title="Xem trang" style={{ color: '#10b981' }}>
                            <FiExternalLink />
                          </a>
                          <button className="admin-table__action admin-table__action--danger" onClick={() => handleDelete(p.id)} title="Xóa">
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => {
          if (editorInsertFn) {
            editorInsertFn(url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${url}`);
          }
        }}
      />
    </>
  );
}
