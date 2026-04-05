'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ATTR_TYPES = [
  { value: 'gender', label: 'Giới Tính' },
  { value: 'face_shape', label: 'Khuôn Mặt Phù Hợp' },
  { value: 'frame_style', label: 'Kiểu Gọng' },
  { value: 'material', label: 'Chất Liệu' },
  { value: 'color', label: 'Màu Sắc' },
];

interface Attribute {
  id: number;
  type: string;
  value: string;
  label: string;
  extra: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function ProductAttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('gender');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ value: '', label: '', extra: '', sort_order: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ value: '', label: '', extra: '', sort_order: 0 });

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getProductAttributes(token);
      setAttributes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  const filtered = attributes.filter(a => a.type === activeType).sort((a, b) => a.sort_order - b.sort_order);
  const typeLabel = ATTR_TYPES.find(t => t.value === activeType)?.label || activeType;

  const handleAdd = async () => {
    if (!addForm.value.trim() || !addForm.label.trim()) {
      toast.error('Vui lòng nhập đủ Value và Label');
      return;
    }
    try {
      await adminApi.createProductAttribute(token, {
        type: activeType,
        ...addForm,
        sort_order: addForm.sort_order || filtered.length + 1,
      });
      toast.success('Đã thêm thuộc tính');
      setShowAdd(false);
      setAddForm({ value: '', label: '', extra: '', sort_order: 0 });
      fetchAttributes();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi');
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await adminApi.updateProductAttribute(token, id, editForm);
      toast.success('Đã cập nhật');
      setEditingId(null);
      fetchAttributes();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi');
    }
  };

  const handleDelete = async (id: number, label: string) => {
    if (!confirm(`Xóa thuộc tính "${label}"?`)) return;
    try {
      await adminApi.deleteProductAttribute(token, id);
      toast.success('Đã xóa');
      fetchAttributes();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi');
    }
  };

  const handleToggleActive = async (attr: Attribute) => {
    try {
      await adminApi.updateProductAttribute(token, attr.id, { is_active: !attr.is_active });
      fetchAttributes();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi');
    }
  };

  const startEdit = (attr: Attribute) => {
    setEditingId(attr.id);
    setEditForm({ value: attr.value, label: attr.label, extra: attr.extra || '', sort_order: attr.sort_order });
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Thuộc Tính Sản Phẩm</h1>
          <p className="admin-page__subtitle">Quản lý các bộ lọc sản phẩm: Giới tính, Khuôn mặt, Kiểu gọng, Chất liệu, Màu sắc</p>
        </div>
      </div>

      {/* Type Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {ATTR_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => { setActiveType(t.value); setEditingId(null); setShowAdd(false); }}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: activeType === t.value ? '2px solid var(--color-gold, #c9a96e)' : '1px solid rgba(255,255,255,0.1)',
              background: activeType === t.value ? 'rgba(201,169,110,0.15)' : 'rgba(255,255,255,0.03)',
              color: activeType === t.value ? 'var(--color-gold, #c9a96e)' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontWeight: activeType === t.value ? 600 : 400,
              fontSize: '0.875rem',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
            <span style={{
              marginLeft: '6px',
              fontSize: '0.75rem',
              opacity: 0.6,
            }}>
              ({attributes.filter(a => a.type === t.value).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="admin-card" style={{ overflow: 'visible' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>{typeLabel}</h3>
          <button
            onClick={() => { setShowAdd(!showAdd); setEditingId(null); }}
            className="admin-btn admin-btn--primary admin-btn--sm"
          >
            <FiPlus /> Thêm mới
          </button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(201,169,110,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'grid',
            gridTemplateColumns: activeType === 'color' ? '1fr 1fr 120px 80px auto' : '1fr 1fr 80px auto',
            gap: '12px',
            alignItems: 'end',
          }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Value (mã lọc)</label>
              <input
                className="admin-input admin-input--sm"
                placeholder="vd: cat-eye"
                value={addForm.value}
                onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Tên hiển thị</label>
              <input
                className="admin-input admin-input--sm"
                placeholder="vd: Cat-Eye"
                value={addForm.label}
                onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>
            {activeType === 'color' && (
              <div>
                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Mã màu</label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={addForm.extra || '#000000'}
                    onChange={e => setAddForm(f => ({ ...f, extra: e.target.value }))}
                    style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                  />
                  <input
                    className="admin-input admin-input--sm"
                    placeholder="#hex"
                    value={addForm.extra}
                    onChange={e => setAddForm(f => ({ ...f, extra: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            )}
            <div>
              <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Thứ tự</label>
              <input
                type="number"
                className="admin-input admin-input--sm"
                value={addForm.sort_order}
                onChange={e => setAddForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={handleAdd}>
                <FiCheck /> Lưu
              </button>
              <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => setShowAdd(false)}>
                <FiX />
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Chưa có thuộc tính nào</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Value</th>
                <th style={thStyle}>Tên Hiển Thị</th>
                {activeType === 'color' && <th style={thStyle}>Màu</th>}
                <th style={thStyle}>TT</th>
                <th style={thStyle}>Trạng Thái</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((attr, idx) => (
                <tr key={attr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {editingId === attr.id ? (
                    <>
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={tdStyle}>
                        <input className="admin-input admin-input--sm" value={editForm.value}
                          onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} />
                      </td>
                      <td style={tdStyle}>
                        <input className="admin-input admin-input--sm" value={editForm.label}
                          onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} />
                      </td>
                      {activeType === 'color' && (
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input type="color" value={editForm.extra || '#000000'}
                              onChange={e => setEditForm(f => ({ ...f, extra: e.target.value }))}
                              style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', borderRadius: '4px' }} />
                            <input className="admin-input admin-input--sm" value={editForm.extra}
                              onChange={e => setEditForm(f => ({ ...f, extra: e.target.value }))}
                              style={{ width: '90px' }} />
                          </div>
                        </td>
                      )}
                      <td style={tdStyle}>
                        <input type="number" className="admin-input admin-input--sm" value={editForm.sort_order}
                          onChange={e => setEditForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                          style={{ width: '60px' }} />
                      </td>
                      <td style={tdStyle}></td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => handleUpdate(attr.id)}>
                            <FiSave />
                          </button>
                          <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => setEditingId(null)}>
                            <FiX />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{attr.value}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{attr.label}</td>
                      {activeType === 'color' && (
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              display: 'inline-block', width: '24px', height: '24px', borderRadius: '6px',
                              backgroundColor: attr.extra === 'transparent' ? '#f5f5dc' : (attr.extra || '#000'),
                              border: '2px solid rgba(255,255,255,0.15)',
                            }} />
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{attr.extra}</span>
                          </div>
                        </td>
                      )}
                      <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{attr.sort_order}</td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => handleToggleActive(attr)}
                          style={{
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                            border: 'none', cursor: 'pointer',
                            background: attr.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: attr.is_active ? '#10b981' : '#ef4444',
                          }}
                        >
                          {attr.is_active ? 'Hiện' : 'Ẩn'}
                        </button>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => startEdit(attr)} title="Sửa">
                            <FiEdit2 />
                          </button>
                          <button className="admin-btn admin-btn--sm" onClick={() => handleDelete(attr.id, attr.label)} title="Xóa"
                            style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem',
  color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)',
};
