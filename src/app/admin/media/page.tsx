'use client';

import { useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminMedia, invalidateAdmin } from '@/lib/useAdmin';
import { useToken } from '@/lib/useToken';
import { FiUploadCloud, FiTrash2, FiSearch, FiImage, FiCopy, FiCheck, FiGrid, FiList } from 'react-icons/fi';

export default function AdminMediaPage() {
  const { token } = useToken();
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const params: Record<string, string> = { per_page: '40' };
  if (search) params.search = search;

  const { data, isLoading, mutate: refresh } = useAdminMedia(token, params);
  const media = data?.data || [];
  const total = data?.total || 0;

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !token) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Đang upload ${i + 1}/${files.length}: ${files[i].name}`);
        const formData = new FormData();
        formData.append('file', files[i]);
        await adminApi.uploadMedia(token, formData);
      }
      setUploadProgress('');
      invalidateAdmin('/admin/media');
      refresh();
    } catch (err) { console.error(err); }
    finally { setUploading(false); setUploadProgress(''); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa?')) return;
    if (!token) return;
    try {
      await adminApi.deleteMedia(token, id);
      invalidateAdmin('/admin/media');
      refresh();
    } catch (err) { console.error(err); }
  };

  const copyUrl = (item: any) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${item.url}`;
    navigator.clipboard.writeText(url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  }, [token]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title"><FiImage style={{ marginRight: '8px' }} /> Media Library ({total})</h1>
        <div className="admin-topbar__actions">
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('grid')}
              style={{ padding: '6px 10px', background: viewMode === 'grid' ? 'rgba(201,169,110,0.2)' : 'transparent', color: viewMode === 'grid' ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)' }}>
              <FiGrid />
            </button>
            <button onClick={() => setViewMode('list')}
              style={{ padding: '6px 10px', background: viewMode === 'list' ? 'rgba(201,169,110,0.2)' : 'transparent', color: viewMode === 'list' ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)' }}>
              <FiList />
            </button>
          </div>
          <label className="admin-btn admin-btn--primary admin-btn--sm" style={{ cursor: 'pointer' }}>
            <FiUploadCloud /> Upload
            <input type="file" multiple accept="image/*" onChange={e => handleUpload(e.target.files)} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div className="admin-content">
        {/* Upload Zone */}
        <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '16px', padding: '40px', textAlign: 'center',
            background: dragActive ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.02)',
            transition: 'all 0.3s ease', cursor: 'pointer', marginBottom: '24px',
          }}>
          <FiUploadCloud style={{ fontSize: '2.5rem', color: dragActive ? 'var(--color-gold)' : 'rgba(255,255,255,0.2)', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
          <p style={{ color: uploading ? 'var(--color-gold)' : 'rgba(255,255,255,0.5)', fontWeight: uploading ? 600 : 400 }}>
            {uploadProgress || (uploading ? 'Đang xử lý...' : 'Kéo thả hình ảnh vào đây hoặc click Upload')}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8125rem', marginTop: '6px' }}>
            Tự động chuyển đổi sang WebP & tối ưu kích thước
          </p>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', padding: '10px 16px', gap: '10px' }}>
            <FiSearch style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input type="text" placeholder="Tìm theo tên file..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.875rem', width: '100%' }} />
          </div>
        </div>

        {/* Media Grid */}
        {isLoading && media.length === 0 ? (
          <div className="admin-media-grid">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: '12px' }} />
            ))}
          </div>
        ) : media.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>
            <FiImage style={{ fontSize: '3rem', marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
            <p style={{ fontSize: '1rem', marginBottom: '8px' }}>Chưa có hình ảnh nào</p>
            <p style={{ fontSize: '0.8125rem' }}>Upload hình ảnh để bắt đầu quản lý media</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="admin-media-grid">
            {media.map((item: any) => (
              <div key={item.id} className="admin-media-item" style={{ borderRadius: '12px' }}>
                <img src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${item.url}`} alt={item.alt || item.filename} loading="lazy" />
                <div className="admin-media-item__info">
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.filename}</div>
                  <div style={{ opacity: 0.7 }}>{formatSize(item.size)}{item.width ? ` · ${item.width}×${item.height}` : ''}</div>
                </div>
                {/* Hover Actions */}
                <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.2s' }} className="media-actions">
                  <button onClick={() => copyUrl(item)}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', background: copiedId === item.id ? 'rgba(16,185,129,0.9)' : 'rgba(201,169,110,0.9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                    {copiedId === item.id ? <FiCheck /> : <FiCopy />}
                  </button>
                  <button onClick={() => handleDelete(item.id)}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(239,68,68,0.9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                    <FiTrash2 />
                  </button>
                </div>
                <style>{`.admin-media-item:hover .media-actions { opacity: 1 !important; }`}</style>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="admin-card">
            <table className="admin-table">
              <thead>
                <tr><th>Ảnh</th><th>Tên File</th><th>Kích thước</th><th>Dimensions</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {media.map((item: any) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden' }}>
                        <img src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${item.url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-white)' }}>{item.filename}</td>
                    <td>{formatSize(item.size)}</td>
                    <td>{item.width ? `${item.width}×${item.height}` : '—'}</td>
                    <td>
                      <div className="admin-table__actions">
                        <button className="admin-table__action" onClick={() => copyUrl(item)} title="Copy URL">
                          {copiedId === item.id ? <FiCheck style={{ color: '#10b981' }} /> : <FiCopy />}
                        </button>
                        <button className="admin-table__action admin-table__action--danger" onClick={() => handleDelete(item.id)} title="Xóa"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
