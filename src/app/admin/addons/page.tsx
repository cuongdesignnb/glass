'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useToken } from '@/lib/useToken';
import { FiPlus, FiTrash2, FiEdit3, FiX, FiSave, FiLink } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface AddonOption {
  id?: number;
  name: string;
  sort_order: number;
}

interface AddonGroup {
  id?: number;
  name: string;
  is_required: boolean;
  sort_order: number;
  options: AddonOption[];
  products_count?: number;
}

interface Constraint {
  option_id: number;
  blocked_option_id: number;
}

export default function AddonGroupsPage() {
  const { token } = useToken();
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showConstraints, setShowConstraints] = useState(false);

  // Constraint editor state
  const [selectedSourceOption, setSelectedSourceOption] = useState<number | null>(null);

  const emptyGroup: AddonGroup = {
    name: '', is_required: false, sort_order: 0,
    options: [{ name: '', sort_order: 0 }],
  };
  const [form, setForm] = useState<AddonGroup>({ ...emptyGroup });

  useEffect(() => {
    if (token) loadGroups();
  }, [token]);

  const loadGroups = async () => {
    try {
      const data = await adminApi.getAddonGroups(token!);
      // Handle new format { groups, constraints } or old format (array)
      if (Array.isArray(data)) {
        setGroups(data);
      } else {
        setGroups(data?.groups || []);
        setConstraints(data?.constraints || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Nhập tên nhóm');
    const validOptions = form.options.filter(o => o.name.trim());
    if (validOptions.length === 0) return toast.error('Cần ít nhất 1 tuỳ chọn');

    const payload = {
      name: form.name,
      is_required: form.is_required,
      sort_order: form.sort_order,
      options: validOptions.map((o, i) => ({ name: o.name, sort_order: i })),
    };

    try {
      const t = toast.loading('Đang lưu...');
      if (editingId) {
        await adminApi.updateAddonGroup(token!, editingId, payload);
      } else {
        await adminApi.createAddonGroup(token!, payload);
      }
      toast.success('Đã lưu!', { id: t });
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyGroup });
      loadGroups();
    } catch (e: any) {
      toast.error('Lỗi: ' + (e.message || 'Không thể lưu'));
    }
  };

  const handleEdit = (g: AddonGroup) => {
    setForm({
      ...g,
      options: (g.options || []).map((o: any, i: number) => ({
        id: o.id,
        name: o.name || '',
        sort_order: o.sort_order ?? i,
      })),
    });
    setEditingId(g.id!);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xoá nhóm tuỳ chọn này?')) return;
    try {
      await adminApi.deleteAddonGroup(token!, id);
      toast.success('Đã xoá');
      loadGroups();
    } catch (e: any) {
      toast.error('Lỗi: ' + (e.message || 'Không thể xoá'));
    }
  };

  // === Constraint helpers ===
  const allOptions = groups.flatMap(g =>
    (g.options || []).map((o: any) => ({ ...o, groupName: g.name, groupId: g.id }))
  );

  const isBlocked = (sourceId: number, targetId: number) =>
    constraints.some(c => c.option_id === sourceId && c.blocked_option_id === targetId);

  const toggleConstraint = (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return;
    setConstraints(prev => {
      const exists = prev.some(c => c.option_id === sourceId && c.blocked_option_id === targetId);
      if (exists) {
        return prev.filter(c => !(c.option_id === sourceId && c.blocked_option_id === targetId));
      } else {
        return [...prev, { option_id: sourceId, blocked_option_id: targetId }];
      }
    });
  };

  const handleSaveConstraints = async () => {
    try {
      const t = toast.loading('Đang lưu ràng buộc...');
      await adminApi.saveAddonConstraints(token!, constraints);
      toast.success('Đã lưu ràng buộc!', { id: t });
    } catch (e: any) {
      toast.error('Lỗi: ' + (e.message || 'Không thể lưu'));
    }
  };

  // Get options from other groups for constraint target
  const getTargetOptions = (sourceOptionId: number) => {
    const sourceOption = allOptions.find(o => o.id === sourceOptionId);
    if (!sourceOption) return [];
    return allOptions.filter(o => o.groupId !== sourceOption.groupId);
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Quản Lý Biến Thể</h1>
        <div className="admin-topbar__actions" style={{ display: 'flex', gap: '8px' }}>
          <button className="admin-btn admin-btn--secondary" onClick={() => setShowConstraints(!showConstraints)}>
            <FiLink /> Ràng buộc
          </button>
          <button className="admin-btn admin-btn--primary" onClick={() => {
            setForm({ ...emptyGroup });
            setEditingId(null);
            setShowForm(true);
          }}>
            <FiPlus /> Thêm nhóm mới
          </button>
        </div>
      </div>

      <div className="admin-content">
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '20px' }}>
          Tạo các nhóm tuỳ chọn ở đây (VD: Chất liệu tròng, Độ cận...). <strong>Chỉ tạo tên</strong>, giá sẽ nhập riêng từng sản phẩm.
        </p>

        {/* ========== CONSTRAINT MANAGER ========== */}
        {showConstraints && (
          <div className="admin-card" style={{ marginBottom: '24px', border: '1px solid rgba(201,169,110,0.3)', background: 'rgba(201,169,110,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiLink style={{ color: 'var(--color-gold)' }} /> Quản lý ràng buộc giữa các tuỳ chọn
              </h3>
              <button onClick={() => setShowConstraints(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.2rem' }}><FiX /></button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
              Chọn option ở cột trái → tick các option ở cột phải sẽ bị <strong style={{ color: '#f87171' }}>khoá</strong> khi option đó được chọn.
            </p>

            {allOptions.length < 2 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '30px' }}>
                Cần ít nhất 2 nhóm với các option để tạo ràng buộc.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Left: Source option selector */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Khi chọn option:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '400px', overflowY: 'auto' }}>
                    {groups.map(g => (
                      <div key={g.id}>
                        <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', padding: '6px 8px', fontWeight: 600 }}>{g.name}</div>
                        {(g.options || []).map((opt: any) => {
                          const constraintCount = constraints.filter(c => c.option_id === opt.id).length;
                          return (
                            <button key={opt.id}
                              onClick={() => setSelectedSourceOption(opt.id)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px',
                                border: selectedSourceOption === opt.id ? '1px solid var(--color-gold)' : '1px solid rgba(255,255,255,0.06)',
                                background: selectedSourceOption === opt.id ? 'rgba(201,169,110,0.1)' : 'rgba(255,255,255,0.02)',
                                color: selectedSourceOption === opt.id ? '#fff' : 'rgba(255,255,255,0.7)',
                                cursor: 'pointer', fontSize: '0.8125rem', transition: 'all 0.15s',
                              }}>
                              <span>{opt.name}</span>
                              {constraintCount > 0 && (
                                <span style={{
                                  background: 'rgba(239,68,68,0.15)', color: '#f87171',
                                  padding: '1px 8px', borderRadius: '99px', fontSize: '0.6875rem', fontWeight: 600,
                                }}>
                                  khoá {constraintCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Target options to block */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Sẽ bị khoá:
                  </div>
                  {!selectedSourceOption ? (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8125rem', padding: '20px', textAlign: 'center' }}>
                      ← Chọn option bên trái
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '400px', overflowY: 'auto' }}>
                      {groups.map(g => {
                        const sourceOpt = allOptions.find(o => o.id === selectedSourceOption);
                        // Skip same group
                        if (sourceOpt && g.id === sourceOpt.groupId) return null;
                        const groupOptions = (g.options || []).filter((o: any) => o.id !== selectedSourceOption);
                        if (groupOptions.length === 0) return null;

                        return (
                          <div key={g.id}>
                            <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', padding: '6px 8px', fontWeight: 600 }}>{g.name}</div>
                            {groupOptions.map((opt: any) => {
                              const blocked = isBlocked(selectedSourceOption, opt.id);
                              return (
                                <label key={opt.id} style={{
                                  display: 'flex', alignItems: 'center', gap: '10px',
                                  padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                                  border: blocked ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                  background: blocked ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                                  marginBottom: '2px', transition: 'all 0.15s',
                                }}>
                                  <input type="checkbox" checked={blocked}
                                    onChange={() => toggleConstraint(selectedSourceOption, opt.id)}
                                    style={{ accentColor: '#ef4444' }} />
                                  <span style={{
                                    fontSize: '0.8125rem',
                                    color: blocked ? '#f87171' : 'rgba(255,255,255,0.7)',
                                    textDecoration: blocked ? 'line-through' : 'none',
                                  }}>
                                    {opt.name}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button className="admin-btn admin-btn--primary" onClick={handleSaveConstraints}>
                <FiSave /> Lưu ràng buộc ({constraints.length} rules)
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="admin-card" style={{ marginBottom: '24px', border: '1px solid var(--color-gold)', background: 'rgba(201,169,110,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', margin: 0 }}>{editingId ? 'Sửa nhóm' : 'Thêm nhóm mới'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.2rem' }}><FiX /></button>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <div className="admin-form__group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="admin-form__label">Tên nhóm</label>
                <input className="admin-form__input" placeholder="VD: Chất liệu tròng" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', paddingTop: '20px' }}>
                <input type="checkbox" checked={form.is_required}
                  onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))} /> Bắt buộc chọn
              </label>
            </div>

            <div style={{ paddingLeft: '12px', borderLeft: '2px solid rgba(201,169,110,0.3)', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', fontWeight: 600 }}>
                Các tuỳ chọn (chỉ nhập tên, giá sẽ nhập khi gán vào sản phẩm):
              </div>
              {form.options.map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <input className="admin-form__input" placeholder={`Tuỳ chọn ${oi + 1} (VD: Tròng tổng hợp)`} value={opt.name}
                    style={{ flex: 1 }}
                    onChange={e => {
                      const opts = [...form.options]; opts[oi].name = e.target.value;
                      setForm(f => ({ ...f, options: opts }));
                    }} />
                  {form.options.length > 1 && (
                    <button onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, i) => i !== oi) }))}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><FiX /></button>
                  )}
                </div>
              ))}
              <button className="admin-btn admin-btn--ghost" style={{ fontSize: '0.8125rem', padding: '6px 12px', marginTop: '4px' }}
                onClick={() => setForm(f => ({
                  ...f,
                  options: [...f.options, { name: '', sort_order: f.options.length }],
                }))}>
                <FiPlus /> Thêm tuỳ chọn
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="admin-btn admin-btn--ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>Huỷ</button>
              <button className="admin-btn admin-btn--primary" onClick={handleSave}><FiSave /> Lưu</button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="skeleton" style={{ height: '200px', borderRadius: '12px' }} />
        ) : groups.length === 0 ? (
          <div className="admin-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📦</p>
            <p>Chưa có nhóm tuỳ chọn nào. Nhấn &quot;Thêm nhóm mới&quot; để bắt đầu.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {groups.map(g => (
              <div key={g.id} className="admin-card"
                style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h4 style={{ color: '#fff', margin: 0, fontSize: '0.9375rem' }}>{g.name}</h4>
                    {g.is_required && (
                      <span style={{ fontSize: '0.625rem', background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>Bắt buộc</span>
                    )}
                    <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>
                      • {g.products_count || 0} sản phẩm sử dụng
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(g.options || []).map((opt: any, i: number) => {
                      const constraintCount = constraints.filter(c => c.option_id === opt.id).length;
                      return (
                        <span key={i} style={{
                          padding: '4px 12px', borderRadius: '99px', fontSize: '0.75rem',
                          background: constraintCount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)',
                          color: constraintCount > 0 ? '#fca5a5' : 'rgba(255,255,255,0.6)',
                          border: constraintCount > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.08)',
                        }}>
                          {opt.name}
                          {constraintCount > 0 && (
                            <span style={{ marginLeft: '4px', fontSize: '0.625rem' }}>🔗{constraintCount}</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button className="admin-btn admin-btn--ghost" style={{ padding: '6px 12px' }} onClick={() => handleEdit(g)}>
                    <FiEdit3 />
                  </button>
                  <button className="admin-btn admin-btn--ghost" style={{ padding: '6px 12px', color: '#f87171' }} onClick={() => handleDelete(g.id!)}>
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
