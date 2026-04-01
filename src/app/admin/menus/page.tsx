'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { FiPlus, FiTrash2, FiEdit2, FiMenu, FiSave, FiChevronDown, FiChevronRight, FiMove } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface MenuItem {
  id: number;
  name: string;
  url: string;
  target: string;
  position: string;
  order: number;
  depth: number;
  parent_id: number | null;
  is_active: boolean;
  children?: MenuItem[];
}

export default function AdminMenusPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', url: '', target: '_self' });
  const [newForm, setNewForm] = useState({ name: '', url: '', target: '_self', position: 'header', parent_id: '' });
  const [showNewForm, setShowNewForm] = useState(false);
  const [position, setPosition] = useState('header');
  const [dragItem, setDragItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  useEffect(() => { loadMenus(); }, []);

  const loadMenus = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const data = await adminApi.getMenus(token);
      setMenus(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token || !newForm.name) return;
    try {
      await adminApi.createMenu(token, {
        ...newForm,
        parent_id: newForm.parent_id ? Number(newForm.parent_id) : null,
      });
      setNewForm({ name: '', url: '', target: '_self', position: 'header', parent_id: '' });
      setShowNewForm(false);
      loadMenus();
      toast.success('Đã thêm menu mới');
    } catch (err: any) { 
      console.error(err); 
      toast.error('Lỗi khi thêm menu: ' + (err.message || ''));
    }
  };

  const handleUpdate = async (id: number) => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    try {
      await adminApi.updateMenu(token, id, editForm);
      setEditingId(null);
      loadMenus();
      toast.success('Đã cập nhật menu');
    } catch (err: any) { 
      console.error(err); 
      toast.error('Lỗi cập nhật menu');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa menu này? Menu con cũng sẽ bị xóa.')) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    try {
      await adminApi.deleteMenu(token, id);
      loadMenus();
      toast.success('Đã xóa menu');
    } catch (err: any) { 
      console.error(err);
      toast.error('Lỗi khi xóa menu');
    }
  };

  const handleReorder = async (items: { id: number; order: number; parent_id: number | null; depth: number }[]) => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    try {
      await adminApi.reorderMenus(token, items);
      loadMenus();
      toast.success('Đã lưu thứ tự', { duration: 1500 });
    } catch (err: any) { 
      console.error(err);
      toast.error('Lỗi lưu thứ tự');
    }
  };

  const moveItem = (id: number, direction: 'up' | 'down') => {
    const flatMenus = flattenMenus(filterByPosition(menus));
    const index = flatMenus.findIndex(m => m.id === id);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      [flatMenus[index], flatMenus[index - 1]] = [flatMenus[index - 1], flatMenus[index]];
    } else if (direction === 'down' && index < flatMenus.length - 1) {
      [flatMenus[index], flatMenus[index + 1]] = [flatMenus[index + 1], flatMenus[index]];
    }

    const reordered = flatMenus.map((m, i) => ({
      id: m.id, order: i, parent_id: m.parent_id, depth: m.depth,
    }));
    handleReorder(reordered);
  };

  const flattenMenus = (items: MenuItem[]): MenuItem[] => {
    const result: MenuItem[] = [];
    for (const item of items) {
      result.push(item);
      if (item.children) {
        result.push(...flattenMenus(item.children));
      }
    }
    return result;
  };

  const handleDragStart = (e: React.DragEvent, item: MenuItem) => {
    setDragItem(item.id);
  };

  const handleDragOver = (e: React.DragEvent, item: MenuItem) => {
    e.preventDefault();
    setDragOverItem(item.id);
  };

  const handleDrop = (e: React.DragEvent, targetItem: MenuItem) => {
    e.preventDefault();
    if (!dragItem || dragItem === targetItem.id) {
      setDragItem(null);
      setDragOverItem(null);
      return;
    }

    const flatMenus = flattenMenus(filterByPosition(menus));
    
    // Check circular reference (prevent dropping parent onto its own child)
    let current: MenuItem | undefined = flatMenus.find(m => m.id === targetItem.id);
    while (current && current.parent_id) {
      if (current.parent_id === dragItem) {
        toast.error('Không thể di chuyển menu cha vào bên trong menu con!');
        setDragItem(null);
        setDragOverItem(null);
        return;
      }
      current = flatMenus.find(m => m.id === current?.parent_id);
    }

    const dragIndex = flatMenus.findIndex(m => m.id === dragItem);
    const dropIndex = flatMenus.findIndex(m => m.id === targetItem.id);

    if (dragIndex === -1 || dropIndex === -1) {
      setDragItem(null);
      setDragOverItem(null);
      return;
    }

    const newFlatMenus = [...flatMenus];
    const itemToMove = newFlatMenus.splice(dragIndex, 1)[0];
    
    // Chuyển menu tới vị trí mới (cùng cấp cha với target)
    itemToMove.parent_id = targetItem.parent_id;
    itemToMove.depth = targetItem.depth;
    
    newFlatMenus.splice(dropIndex, 0, itemToMove);

    const reordered = newFlatMenus.map((m, i) => ({
      id: m.id,
      order: i,
      parent_id: m.parent_id,
      depth: m.depth,
    }));

    handleReorder(reordered);
    setDragItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDragOverItem(null);
  };

  const filterByPosition = (items: MenuItem[]): MenuItem[] => {
    return items.filter(m => m.position === position && !m.parent_id);
  };

  const getRootMenus = (): MenuItem[] => {
    return menus.filter(m => m.position === position && !m.parent_id).sort((a, b) => a.order - b.order);
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => (
    <div key={item.id}>
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, item)}
        onDragOver={(e) => handleDragOver(e, item)}
        onDrop={(e) => handleDrop(e, item)}
        onDragEnd={handleDragEnd}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', marginLeft: depth * 32 + 'px',
          background: editingId === item.id 
            ? 'rgba(201,169,110,0.08)' 
            : dragOverItem === item.id 
              ? 'rgba(255,255,255,0.08)' 
              : 'rgba(255,255,255,0.02)',
          border: dragOverItem === item.id ? '1px dashed var(--color-gold)' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: '8px', marginBottom: '6px',
          opacity: dragItem === item.id ? 0.5 : 1,
          transition: 'all 0.2s',
        }}
      >
        <FiMove style={{ color: 'rgba(255,255,255,0.3)', cursor: 'grab', flexShrink: 0 }} />
        
        {depth > 0 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>└</span>}

        {editingId === item.id ? (
          <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input className="admin-form__input" style={{ flex: 1, padding: '6px 10px' }}
              value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Tên menu" />
            <input className="admin-form__input" style={{ flex: 1, padding: '6px 10px' }}
              value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} placeholder="URL" />
            <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => handleUpdate(item.id)}>
              <FiSave />
            </button>
            <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => setEditingId(null)}>
              Hủy
            </button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, color: 'var(--color-white)' }}>{item.name}</span>
              <span style={{ marginLeft: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{item.url}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="admin-table__action" onClick={() => moveItem(item.id, 'up')} title="Di chuyển lên">↑</button>
              <button className="admin-table__action" onClick={() => moveItem(item.id, 'down')} title="Di chuyển xuống">↓</button>
              <button className="admin-table__action" onClick={() => { setEditingId(item.id); setEditForm({ name: item.name, url: item.url || '', target: item.target }); }} title="Sửa">
                <FiEdit2 />
              </button>
              <button className="admin-table__action admin-table__action--danger" onClick={() => handleDelete(item.id)} title="Xóa">
                <FiTrash2 />
              </button>
            </div>
          </>
        )}
      </div>
      {item.children?.sort((a, b) => a.order - b.order).map(child => renderMenuItem(child, depth + 1))}
    </div>
  );

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Quản Lý Menu</h1>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => setShowNewForm(!showNewForm)}>
            <FiPlus /> Thêm Menu
          </button>
        </div>
      </div>
      <div className="admin-content">
        {/* Position Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['header', 'footer'].map(pos => (
            <button key={pos}
              className={`admin-btn ${position === pos ? 'admin-btn--primary' : 'admin-btn--secondary'} admin-btn--sm`}
              onClick={() => setPosition(pos)}>
              {pos === 'header' ? 'Header' : 'Footer'}
            </button>
          ))}
        </div>

        {/* New Menu Form */}
        {showNewForm && (
          <div className="admin-card" style={{ marginBottom: '20px' }}>
            <h3 className="admin-card__title" style={{ marginBottom: '16px' }}>Thêm Menu Mới</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input className="admin-form__input" style={{ flex: 1, minWidth: '150px' }}
                placeholder="Tên menu" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
              <input className="admin-form__input" style={{ flex: 1, minWidth: '150px' }}
                placeholder="URL (ví dụ: /san-pham)" value={newForm.url} onChange={(e) => setNewForm({ ...newForm, url: e.target.value })} />
              <select className="admin-form__input" value={newForm.parent_id}
                onChange={(e) => setNewForm({ ...newForm, parent_id: e.target.value })}>
                <option value="">Menu gốc (không có menu cha)</option>
                {getRootMenus().map(m => (
                  <option key={m.id} value={m.id}>↳ Con của: {m.name}</option>
                ))}
              </select>
              <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={handleCreate}>Thêm</button>
            </div>
          </div>
        )}

        {/* Menu Tree */}
        <div className="admin-card">
          <div className="admin-card__header">
            <h2 className="admin-card__title">
              <FiMenu style={{ marginRight: '8px' }} /> 
              Menu {position === 'header' ? 'Header' : 'Footer'}
            </h2>
          </div>
          
          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', padding: '24px', textAlign: 'center' }}>Đang tải...</p>
          ) : getRootMenus().length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', padding: '24px', textAlign: 'center' }}>
              Chưa có menu nào. Click "Thêm Menu" để bắt đầu.
            </p>
          ) : (
            <div>
              {getRootMenus().map(item => renderMenuItem(item))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
