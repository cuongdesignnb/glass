'use client';

import { useState, useEffect } from 'react';
import { publicApi, adminApi } from '@/lib/api';
import { useToken } from '@/lib/useToken';
import { FiPlus, FiTrash2, FiEdit2, FiSave, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminFaqsPage() {
  const { token } = useToken();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ question: '', answer: '', order: 0, is_active: true });

  useEffect(() => { if (token) loadFaqs(); }, [token]);

  const loadFaqs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await adminApi.getFaqs(token);
      const apiData = Array.isArray(result) ? result : (result?.data || []);
      setFaqs(apiData);
    } catch (err: any) { 
      console.error('FAQ load error:', err);
      toast.error('Lỗi khi tải danh sách FAQ');
    } finally { 
      setLoading(false); 
    }
  };

  const handleSave = async () => {
    if (!token || !form.question || !form.answer) return;
    const saveToast = toast.loading('Đang lưu FAQ...');
    try {
      if (editingId) {
        await adminApi.updateFaq(token, editingId, form);
      } else {
        await adminApi.createFaq(token, form);
      }
      toast.success(editingId ? 'Đã cập nhật FAQ' : 'Đã tạo FAQ mới', { id: saveToast });
      resetForm();
      loadFaqs();
    } catch (err: any) { 
      toast.error('Lỗi khi lưu: ' + (err.message || ''), { id: saveToast });
      console.error(err); 
    }
  };

  const handleEdit = (faq: any) => {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      order: faq.order || 0,
      is_active: faq.is_active ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa câu hỏi này?')) return;
    if (!token) return;
    try {
      await adminApi.deleteFaq(token, id);
      toast.success('Đã xóa câu hỏi');
      loadFaqs();
    } catch (err: any) { 
      toast.error('Lỗi khi xóa');
      console.error(err); 
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setForm({ question: '', answer: '', order: 0, is_active: true });
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Quản Lý Câu Hỏi Thường Gặp (FAQ)</h1>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            <FiPlus /> Thêm Câu Hỏi Mới
          </button>
        </div>
      </div>
      
      <div className="admin-content">
        {showForm && (
          <div className="admin-card" style={{ marginBottom: '24px' }}>
            <div className="admin-card__header">
              <h3 className="admin-card__title">{editingId ? 'Sửa Câu Hỏi FAQ' : 'Tạo Câu Hỏi FAQ'}</h3>
              <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={resetForm}><FiX /> Đóng</button>
            </div>
            
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">Câu hỏi *</label>
                <input className="admin-form__input" value={form.question}
                  onChange={e => setForm({ ...form, question: e.target.value })} placeholder="VD: Sản phẩm có được bảo hành không?" />
              </div>
              
              <div className="admin-form__group">
                <label className="admin-form__label">Câu trả lời *</label>
                <textarea className="admin-form__input" value={form.answer}
                  onChange={e => setForm({ ...form, answer: e.target.value })} placeholder="VD: Có, tất cả sản phẩm đều được bảo hành 12 tháng..." rows={4} />
              </div>
              
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Thứ tự hiển thị</label>
                  <input type="number" className="admin-form__input" value={form.order}
                    onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
                </div>
                
                <div className="admin-form__group">
                  <label className="admin-form__label">Trạng thái</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '44px', color: 'rgba(255,255,255,0.7)' }}>
                    <input type="checkbox" checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })} style={{ accentColor: 'var(--color-gold)' }} />
                    {form.is_active ? 'Hiển thị công khai' : 'Đang ẩn'}
                  </label>
                </div>
              </div>
              
              <button className="admin-btn admin-btn--primary" onClick={handleSave} disabled={!form.question}>
                <FiSave /> {editingId ? 'Cập Nhật' : 'Lưu Câu Hỏi Mới'}
              </button>
            </div>
          </div>
        )}

        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th>Câu Hỏi & Câu Trả Lời</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Vị trí</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '100px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh sách...</td></tr>
              ) : faqs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>Chưa có câu hỏi FAQ nào!</td></tr>
              ) : faqs.map((faq, idx) => (
                <tr key={faq.id}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--color-gold)', opacity: 0.8 }}>Q:</span> {faq.question}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 1.5, display: 'flex', gap: '8px' }}>
                      <span style={{ color: '#fff', opacity: 0.3 }}>A:</span> 
                      <div style={{ paddingRight: '10%' }}>{faq.answer.length > 200 ? faq.answer.substring(0, 200) + '...' : faq.answer}</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{faq.order}</td>
                  <td style={{ textAlign: 'center' }}>
                    {faq.is_active ? (
                      <span className="admin-badge admin-badge--success"><FiCheck /> Hiện</span>
                    ) : (
                      <span className="admin-badge admin-badge--danger"><FiX /> Ẩn</span>
                    )}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <button className="admin-table__action" onClick={() => handleEdit(faq)} title="Sửa"><FiEdit2 /></button>
                      <button className="admin-table__action admin-table__action--danger" onClick={() => handleDelete(faq.id)} title="Xóa"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
