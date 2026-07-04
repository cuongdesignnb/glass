'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useToken } from '@/lib/useToken';
import { FiPlus, FiTrash2, FiEdit3, FiX, FiSave, FiLink, FiRefreshCw, FiClock } from 'react-icons/fi';
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

  // Bulk Price Sync & Revert States
  const [showBulkSyncModal, setShowBulkSyncModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'sync' | 'history'>('sync');
  const [selectedSyncGroupId, setSelectedSyncGroupId] = useState<number | ''>('');
  const [selectedSyncOptionId, setSelectedSyncOptionId] = useState<number | ''>('');
  const [newSyncPrice, setNewSyncPrice] = useState('');
  const [isSyncAvailable, setIsSyncAvailable] = useState(true);
  const [filterByOldPrice, setFilterByOldPrice] = useState(false);
  const [oldSyncPrice, setOldSyncPrice] = useState('');
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [syncingBulk, setSyncingBulk] = useState(false);
  const [revertingLogId, setRevertingLogId] = useState<number | null>(null);

  // Bulk Apply Range States
  const [categories, setCategories] = useState<any[]>([]);
  const [applyTo, setApplyTo] = useState<'linked' | 'all' | 'category'>('linked');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  const handleOpenBulkSync = () => {
    setShowBulkSyncModal(true);
    setActiveModalTab('sync');
    loadSyncLogs();
    if (categories.length === 0 && token) {
      loadCategories();
    }
  };

  const loadCategories = async () => {
    try {
      const data = await adminApi.getCategories(token!);
      setCategories(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSyncLogs = async () => {
    if (!token) return;
    setLoadingLogs(true);
    try {
      const logs = await adminApi.getAddonSyncLogs(token);
      setSyncLogs(logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleBulkSyncSubmit = async () => {
    if (!selectedSyncOptionId) {
      return toast.error('Vui lòng chọn một tùy chọn (Option)');
    }
    if (newSyncPrice === '' || isNaN(Number(newSyncPrice))) {
      return toast.error('Vui lòng nhập giá cộng thêm mới hợp lệ');
    }
    if (filterByOldPrice && (oldSyncPrice === '' || isNaN(Number(oldSyncPrice)))) {
      return toast.error('Vui lòng nhập giá cũ hợp lệ để lọc');
    }
    if (applyTo === 'category' && selectedCategoryIds.length === 0) {
      return toast.error('Vui lòng chọn ít nhất một danh mục để áp dụng');
    }

    setSyncingBulk(true);
    const loadingToast = toast.loading('Đang đồng bộ giá...');
    try {
      const response = await adminApi.bulkSyncAddonPrice(token!, {
        option_id: Number(selectedSyncOptionId),
        additional_price: Number(newSyncPrice),
        is_available: isSyncAvailable,
        filter_by_old_price: filterByOldPrice,
        old_price: filterByOldPrice ? Number(oldSyncPrice) : null,
        apply_to: applyTo,
        category_ids: applyTo === 'category' ? selectedCategoryIds : null,
      });

      toast.success(response.message || 'Đồng bộ thành công!', { id: loadingToast });
      setNewSyncPrice('');
      setOldSyncPrice('');
      setFilterByOldPrice(false);
      setApplyTo('linked');
      setSelectedCategoryIds([]);
      loadSyncLogs();
    } catch (err: any) {
      toast.error(err.message || 'Không thể đồng bộ giá', { id: loadingToast });
    } finally {
      setSyncingBulk(false);
    }
  };

  const handleRevertSync = async (logId: number) => {
    if (!confirm('Bạn có chắc chắn muốn hoàn tác lần đồng bộ giá này? Toàn bộ giá của sản phẩm liên quan sẽ được khôi phục về trạng thái trước đó.')) return;
    setRevertingLogId(logId);
    const loadingToast = toast.loading('Đang hoàn tác đồng bộ...');
    try {
      const response = await adminApi.revertAddonSync(token!, logId);
      toast.success(response.message || 'Hoàn tác thành công!', { id: loadingToast });
      loadSyncLogs();
    } catch (err: any) {
      toast.error(err.message || 'Không thể hoàn tác', { id: loadingToast });
    } finally {
      setRevertingLogId(null);
    }
  };

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
          <button className="admin-btn admin-btn--secondary" onClick={handleOpenBulkSync}>
            <FiRefreshCw /> Đồng bộ giá hàng loạt
          </button>
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

      {/* ========== BULK PRICE SYNC MODAL ========== */}
      {showBulkSyncModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => !syncingBulk && !revertingLogId && setShowBulkSyncModal(false)}>
          <div style={{
            background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '640px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <FiRefreshCw style={{ color: 'var(--color-gold)' }} /> Đồng bộ giá Option hàng loạt
              </h3>
              <button onClick={() => !syncingBulk && !revertingLogId && setShowBulkSyncModal(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.25rem' }}>
                <FiX />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px', paddingBottom: '8px' }}>
              <button 
                onClick={() => setActiveModalTab('sync')}
                style={{
                  background: 'none', border: 'none', padding: '8px 16px',
                  color: activeModalTab === 'sync' ? 'var(--color-gold)' : 'rgba(255,255,255,0.5)',
                  fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                  borderBottom: activeModalTab === 'sync' ? '2px solid var(--color-gold)' : 'none',
                  borderRadius: 0, transition: 'all 0.2s'
                }}
              >
                Đồng bộ giá mới
              </button>
              <button 
                onClick={() => setActiveModalTab('history')}
                style={{
                  background: 'none', border: 'none', padding: '8px 16px',
                  color: activeModalTab === 'history' ? 'var(--color-gold)' : 'rgba(255,255,255,0.5)',
                  fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                  borderBottom: activeModalTab === 'history' ? '2px solid var(--color-gold)' : 'none',
                  borderRadius: 0, transition: 'all 0.2s'
                }}
              >
                Lịch sử & Hoàn tác
              </button>
            </div>

            {activeModalTab === 'sync' ? (
              <div>
                {/* Step 1: Select Addon Group */}
                <div className="admin-form__group" style={{ marginBottom: '16px' }}>
                  <label className="admin-form__label">Bước 1: Chọn nhóm tùy chọn</label>
                  <select 
                    className="admin-form__input"
                    value={selectedSyncGroupId}
                    onChange={e => {
                      setSelectedSyncGroupId(e.target.value ? Number(e.target.value) : '');
                      setSelectedSyncOptionId('');
                    }}
                    style={{ background: '#16213e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="">-- Chọn nhóm (VD: Chất liệu tròng) --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Select Option */}
                <div className="admin-form__group" style={{ marginBottom: '16px' }}>
                  <label className="admin-form__label">Bước 2: Chọn tùy chọn cụ thể</label>
                  <select 
                    className="admin-form__input"
                    value={selectedSyncOptionId}
                    onChange={e => setSelectedSyncOptionId(e.target.value ? Number(e.target.value) : '')}
                    disabled={!selectedSyncGroupId}
                    style={{ background: '#16213e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="">-- Chọn tùy chọn (VD: Tròng chống xước) --</option>
                    {selectedSyncGroupId && (groups.find(g => g.id === selectedSyncGroupId)?.options || []).map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                {/* Step 3 & 4: New Price & Availability */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                  <div className="admin-form__group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="admin-form__label">Bước 3: Giá cộng thêm mới (VNĐ)</label>
                    <input 
                      type="number" 
                      className="admin-form__input" 
                      placeholder="VD: 30000"
                      value={newSyncPrice}
                      onChange={e => setNewSyncPrice(e.target.value)}
                    />
                  </div>
                  <div className="admin-form__group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="admin-form__label">Bước 4: Trạng thái</label>
                    <select 
                      className="admin-form__input"
                      value={isSyncAvailable ? '1' : '0'}
                      onChange={e => setIsSyncAvailable(e.target.value === '1')}
                      style={{ background: '#16213e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="1">Còn hàng</option>
                      <option value="0">Hết hàng / Tạm khóa</option>
                    </select>
                  </div>
                </div>

                {/* Scope selection */}
                <div className="admin-form__group" style={{ marginBottom: '20px' }}>
                  <label className="admin-form__label">Bước 5: Phạm vi áp dụng cho sản phẩm</label>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="apply_to" 
                        value="linked" 
                        checked={applyTo === 'linked'} 
                        onChange={() => setApplyTo('linked')}
                        style={{ accentColor: 'var(--color-gold)' }}
                      />
                      Sản phẩm đã liên kết nhóm này
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="apply_to" 
                        value="all" 
                        checked={applyTo === 'all'} 
                        onChange={() => setApplyTo('all')}
                        style={{ accentColor: 'var(--color-gold)' }}
                      />
                      Tất cả sản phẩm trong hệ thống
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="apply_to" 
                        value="category" 
                        checked={applyTo === 'category'} 
                        onChange={() => setApplyTo('category')}
                        style={{ accentColor: 'var(--color-gold)' }}
                      />
                      Sản phẩm theo Danh mục
                    </label>
                  </div>

                  {applyTo === 'category' && (
                    <div style={{ 
                      marginTop: '12px', padding: '12px', background: '#16213e', 
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                      maxHeight: '160px', overflowY: 'auto'
                    }}>
                      <label className="admin-form__label" style={{ marginBottom: '8px', display: 'block', fontSize: '0.75rem' }}>
                        Chọn một hoặc nhiều danh mục áp dụng:
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {categories.map((cat: any) => {
                          const isChecked = selectedCategoryIds.includes(cat.id);
                          return (
                            <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.8)', fontSize: '0.8125rem', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedCategoryIds(prev => prev.filter(id => id !== cat.id));
                                  } else {
                                    setSelectedCategoryIds(prev => [...prev, cat.id]);
                                  }
                                }}
                                style={{ accentColor: 'var(--color-gold)' }}
                              />
                              {cat.name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 5: Filter by old price */}
                <div style={{
                  padding: '14px', background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', 
                  marginBottom: '24px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '0.875rem' }}>
                    <input 
                      type="checkbox" 
                      checked={filterByOldPrice} 
                      onChange={e => setFilterByOldPrice(e.target.checked)}
                      style={{ accentColor: 'var(--color-gold)' }}
                    />
                    <strong>Chỉ đồng bộ cho sản phẩm đang có mức giá cũ nhất định</strong>
                  </label>
                  {filterByOldPrice && (
                    <div className="admin-form__group" style={{ marginTop: '12px', marginBottom: 0 }}>
                      <label className="admin-form__label">Giá cộng thêm cũ cần lọc (VNĐ)</label>
                      <input 
                        type="number" 
                        className="admin-form__input" 
                        placeholder="Nhập giá cũ, VD: 20000"
                        value={oldSyncPrice}
                        onChange={e => setOldSyncPrice(e.target.value)}
                        style={{ maxWidth: '240px' }}
                      />
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        Chỉ các sản phẩm có tùy chọn này với mức giá đúng bằng số tiền trên mới bị cập nhật.
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    className="admin-btn admin-btn--ghost" 
                    onClick={() => setShowBulkSyncModal(false)}
                    disabled={syncingBulk}
                  >
                    Hủy
                  </button>
                  <button 
                    className="admin-btn admin-btn--primary" 
                    onClick={handleBulkSyncSubmit}
                    disabled={syncingBulk}
                  >
                    {syncingBulk ? 'Đang xử lý...' : 'Xác nhận đồng bộ'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* History list */}
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>
                  Hiển thị tối đa 10 lần đồng bộ gần đây. Bạn có thể khôi phục (hoàn tác) giá gốc trước khi đồng bộ.
                </p>
                {loadingLogs ? (
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px' }}>Đang tải lịch sử...</div>
                ) : syncLogs.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px' }}>Chưa có lịch sử đồng bộ nào.</div>
                ) : (
                  <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {syncLogs.map((log: any) => {
                      const isReverted = !!log.reverted_at;
                      return (
                        <div 
                          key={log.id} 
                          style={{
                            padding: '12px 16px', background: 'rgba(255,255,255,0.03)', 
                            border: isReverted ? '1px dashed rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.06)', 
                            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            opacity: isReverted ? 0.6 : 1
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <strong style={{ color: '#fff', fontSize: '0.875rem' }}>{log.option?.name || `Tùy chọn #${log.option_id}`}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>({log.option?.group?.name || 'Nhóm'})</span>
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                              <span>Đồng bộ: <strong>{Intl.NumberFormat('vi-VN').format(log.new_price)} ₫</strong></span>
                              {log.old_price !== null && (
                                <span>Chỉ lọc từ giá cũ: <strong>{Intl.NumberFormat('vi-VN').format(log.old_price)} ₫</strong></span>
                              )}
                              <span>Ảnh hưởng: <strong style={{ color: 'var(--color-gold)' }}>{log.affected_count} SP</strong></span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>
                              Ngày tạo: {new Date(log.created_at).toLocaleString('vi-VN')}
                              {isReverted && (
                                <span style={{ color: '#ef4444', marginLeft: '10px', fontWeight: 600 }}>
                                  [Đã hoàn tác lúc: {new Date(log.reverted_at).toLocaleTimeString('vi-VN')}]
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button
                              className={`admin-btn ${isReverted ? 'admin-btn--ghost' : 'admin-btn--secondary'} admin-btn--sm`}
                              disabled={isReverted || revertingLogId === log.id}
                              onClick={() => handleRevertSync(log.id)}
                            >
                              {revertingLogId === log.id ? '...' : isReverted ? 'Đã hoàn tác' : 'Hoàn tác'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
