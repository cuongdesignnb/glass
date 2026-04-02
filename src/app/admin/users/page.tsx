'use client';

import React, { useState, useEffect } from 'react';
import { FiSearch, FiUsers, FiStar, FiToggleLeft, FiToggleRight, FiPlus, FiMinus } from 'react-icons/fi';
import { adminApi } from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [pointsForm, setPointsForm] = useState({ points: 0, description: '' });
  const [msg, setMsg] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

  const load = (p = 1, q = '') => {
    setLoading(true);
    adminApi.getUsers(token, { page: String(p), search: q }).then((d: any) => {
      setUsers(d.data || []);
      setTotal(d.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(page, search); }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, search);
  };

  const handleToggle = async (id: number) => {
    await adminApi.toggleUserActive(token, id);
    load(page, search);
  };

  const handleAdjustPoints = async () => {
    if (!selected || !pointsForm.description) return;
    setMsg('');
    try {
      const res = await adminApi.adjustUserPoints(token, selected.id, pointsForm);
      setMsg(res.message);
      setPointsForm({ points: 0, description: '' });
      load(page, search);
    } catch (e: any) { setMsg(e.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
          <FiUsers style={{ marginRight: 8 }} /> Khách Hàng ({total})
        </h1>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 12px 8px 36px', border: '1px solid #334155', borderRadius: 8, background: '#1e293b', color: '#fff', fontSize: '.875rem' }} />
          </div>
        </form>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              <th style={thStyle}>Tên</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>SĐT</th>
              <th style={thStyle}>Đơn hàng</th>
              <th style={thStyle}>Điểm</th>
              <th style={thStyle}>Trạng thái</th>
              <th style={thStyle}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center' }}>Đang tải...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={tdStyle}>{u.name}</td>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}>{u.phone || '—'}</td>
                <td style={tdStyle}>{u.orders_count}</td>
                <td style={tdStyle}>
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>{u.points}</span>
                </td>
                <td style={tdStyle}>
                  <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: '.75rem', fontWeight: 600,
                    background: u.is_active ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)',
                    color: u.is_active ? '#10b981' : '#ef4444' }}>
                    {u.is_active ? 'Hoạt động' : 'Bị khóa'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setSelected(u)} style={btnStyle} title="Điều chỉnh điểm">
                      <FiStar />
                    </button>
                    <button onClick={() => handleToggle(u.id)} style={btnStyle} title={u.is_active ? 'Khóa' : 'Mở khóa'}>
                      {u.is_active ? <FiToggleRight color="#10b981" /> : <FiToggleLeft color="#ef4444" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtnStyle}>← Trước</button>
        <span style={{ padding: '8px 16px', color: '#94a3b8' }}>Trang {page}</span>
        <button disabled={users.length < 20} onClick={() => setPage(p => p + 1)} style={pageBtnStyle}>Sau →</button>
      </div>

      {/* Points Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setSelected(null)}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Điều chỉnh điểm: {selected.name}</h3>
            <p style={{ fontSize: '.875rem', color: '#94a3b8', marginBottom: 16 }}>Điểm hiện tại: <strong style={{ color: '#fbbf24' }}>{selected.points}</strong></p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '.8125rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Số điểm (+ cộng, - trừ)</label>
              <input type="number" value={pointsForm.points} onChange={e => setPointsForm(f => ({ ...f, points: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #334155', borderRadius: 8, background: '#0f172a', color: '#fff' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '.8125rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Lý do *</label>
              <input value={pointsForm.description} onChange={e => setPointsForm(f => ({ ...f, description: e.target.value }))}
                placeholder="VD: Thưởng khách hàng thân thiết"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #334155', borderRadius: 8, background: '#0f172a', color: '#fff' }} />
            </div>
            {msg && <p style={{ fontSize: '.875rem', color: '#10b981', marginBottom: 12 }}>{msg}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAdjustPoints} style={{ ...pageBtnStyle, background: '#7c3aed', flex: 1 }}>Xác nhận</button>
              <button onClick={() => setSelected(null)} style={{ ...pageBtnStyle, flex: 1 }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: '.8125rem', fontWeight: 600, color: '#94a3b8', background: '#0f172a' };
const tdStyle: React.CSSProperties = { padding: '12px 16px', fontSize: '.875rem' };
const btnStyle: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#e2e8f0' };
const pageBtnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', cursor: 'pointer', color: '#e2e8f0', fontSize: '.875rem' };
