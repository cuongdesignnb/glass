'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiBell, FiSend, FiTrash2, FiUsers, FiUser, FiSearch, FiX } from 'react-icons/fi';
import { adminApi } from '@/lib/api';

const typeOptions = [
  { value: 'info', label: 'Thông tin', color: '#3b82f6' },
  { value: 'promo', label: 'Khuyến mãi', color: '#f59e0b' },
  { value: 'order', label: 'Đơn hàng', color: '#10b981' },
  { value: 'system', label: 'Hệ thống', color: '#8b5cf6' },
];

const targetOptions = [
  { value: 'all', label: 'Tất cả thành viên', icon: <FiUsers /> },
  { value: 'group', label: 'Nhóm', icon: <FiUsers /> },
  { value: 'individual', label: 'Cá nhân', icon: <FiUser /> },
];

const groupOptions = [
  { value: 'has_orders', label: 'Có đơn hàng' },
  { value: 'has_points', label: 'Có điểm thưởng' },
  { value: 'new_members', label: 'Thành viên mới (< 30 ngày)' },
];

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', content: '', type: 'info',
    target_type: 'all', target_group: '', target_user_ids: [] as number[],
  });
  const [sending, setSending] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

  const load = () => {
    adminApi.getNotifications(token).then((d: any) => setNotifications(d.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearchUsers = useCallback(async (q: string) => {
    setSearchUsers(q);
    if (q.length < 2) { setFoundUsers([]); return; }
    const res = await adminApi.searchUsers(token, q);
    setFoundUsers(res || []);
  }, [token]);

  const addUser = (u: any) => {
    if (!selectedUsers.find(s => s.id === u.id)) {
      setSelectedUsers(prev => [...prev, u]);
      setForm(f => ({ ...f, target_user_ids: [...f.target_user_ids, u.id] }));
    }
    setSearchUsers('');
    setFoundUsers([]);
  };

  const removeUser = (id: number) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== id));
    setForm(f => ({ ...f, target_user_ids: f.target_user_ids.filter(uid => uid !== id) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setMsg('');
    try {
      await adminApi.createNotification(token, form);
      setMsg('Gửi thông báo thành công!');
      setShowForm(false);
      setForm({ title: '', content: '', type: 'info', target_type: 'all', target_group: '', target_user_ids: [] });
      setSelectedUsers([]);
      load();
    } catch (e: any) { setMsg(e.message); }
    finally { setSending(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa thông báo này?')) return;
    await adminApi.deleteNotification(token, id);
    load();
  };

  const targetLabels: Record<string, string> = { all: 'Tất cả', group: 'Nhóm', individual: 'Cá nhân' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
          <FiBell style={{ marginRight: 8 }} /> Thông Báo
        </h1>
        <button onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
          <FiSend /> Tạo thông báo
        </button>
      </div>

      {msg && <div style={{ padding: '10px 16px', background: 'rgba(16,185,129,.12)', borderRadius: 10, marginBottom: 16, color: '#10b981', fontSize: '.875rem' }}>{msg}</div>}

      {/* Create Form */}
      {showForm && (
        <div style={{ background: '#1e293b', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Tiêu đề *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                style={inputStyle} placeholder="Tiêu đề thông báo" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nội dung *</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required
                style={{ ...inputStyle, minHeight: 100 }} placeholder="Nội dung thông báo..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Loại</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {typeOptions.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, type: t.value }))}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid', borderColor: form.type === t.value ? t.color : '#334155',
                        background: form.type === t.value ? t.color + '20' : 'transparent', color: form.type === t.value ? t.color : '#94a3b8',
                        cursor: 'pointer', fontSize: '.8125rem', fontWeight: 600 }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Đối tượng nhận</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {targetOptions.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, target_type: t.value }))}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid',
                        borderColor: form.target_type === t.value ? '#7c3aed' : '#334155',
                        background: form.target_type === t.value ? '#7c3aed20' : 'transparent',
                        color: form.target_type === t.value ? '#7c3aed' : '#94a3b8',
                        cursor: 'pointer', fontSize: '.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Group selector */}
            {form.target_type === 'group' && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Chọn nhóm</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {groupOptions.map(g => (
                    <button key={g.value} type="button" onClick={() => setForm(f => ({ ...f, target_group: g.value }))}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid',
                        borderColor: form.target_group === g.value ? '#10b981' : '#334155',
                        background: form.target_group === g.value ? '#10b98120' : 'transparent',
                        color: form.target_group === g.value ? '#10b981' : '#94a3b8',
                        cursor: 'pointer', fontSize: '.8125rem', fontWeight: 600 }}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Individual selector */}
            {form.target_type === 'individual' && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Tìm và chọn user</label>
                <div style={{ position: 'relative' }}>
                  <FiSearch style={{ position: 'absolute', left: 12, top: 10, color: '#888' }} />
                  <input value={searchUsers} onChange={e => handleSearchUsers(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Tìm theo tên hoặc email..." />
                  {foundUsers.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, maxHeight: 200, overflow: 'auto', zIndex: 10 }}>
                      {foundUsers.map(u => (
                        <div key={u.id} onClick={() => addUser(u)} style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b' }}>
                          <span>{u.name}</span><span style={{ color: '#94a3b8', fontSize: '.8125rem' }}>{u.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedUsers.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {selectedUsers.map(u => (
                      <span key={u.id} style={{ padding: '4px 10px', background: '#334155', borderRadius: 99, fontSize: '.8125rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {u.name} <FiX style={{ cursor: 'pointer' }} onClick={() => removeUser(u.id)} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={sending}
                style={{ padding: '10px 24px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
                {sending ? 'Đang gửi...' : 'Gửi thông báo'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ padding: '10px 24px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications List */}
      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? <p style={{ padding: 20 }}>Đang tải...</p> :
         notifications.length === 0 ? <p style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Chưa có thông báo nào</p> :
         notifications.map(n => (
          <div key={n.id} style={{ padding: '16px 20px', borderBottom: '1px solid #0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {n.title}
                <span style={{ marginLeft: 8, fontSize: '.75rem', padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                  background: typeOptions.find(t => t.value === n.type)?.color + '20',
                  color: typeOptions.find(t => t.value === n.type)?.color }}>
                  {typeOptions.find(t => t.value === n.type)?.label}
                </span>
              </div>
              <p style={{ fontSize: '.8125rem', color: '#94a3b8', marginBottom: 4, maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</p>
              <div style={{ display: 'flex', gap: 12, fontSize: '.75rem', color: '#64748b' }}>
                <span>Gửi tới: {targetLabels[n.target_type]}{n.target_group ? ` (${n.target_group})` : ''}</span>
                <span>Đã đọc: {n.reads_count || 0}</span>
                <span>{new Date(n.created_at).toLocaleString('vi-VN')}</span>
              </div>
            </div>
            <button onClick={() => handleDelete(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 8 }}>
              <FiTrash2 />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #334155', borderRadius: 10, background: '#0f172a', color: '#fff', fontSize: '.9375rem' };
