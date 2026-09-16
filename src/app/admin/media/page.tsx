'use client';

import { useState, useCallback, useRef } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminMedia, invalidateAdmin } from '@/lib/useAdmin';
import { useToken } from '@/lib/useToken';
import { FiUploadCloud, FiTrash2, FiSearch, FiImage, FiCopy, FiCheck, FiGrid, FiList } from 'react-icons/fi';
import toast from 'react-hot-toast';

function suggestedAlt(file: File): string {
  const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return baseName || 'Hình ảnh MITOO';
}

export default function AdminMediaPage() {
  const { token } = useToken();
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const params: Record<string, string> = { per_page: '40' };
  if (search) params.search = search;

  const { data, isLoading, mutate: refresh } = useAdminMedia(token, params);
  const media = data?.data || [];
  const total = data?.total || 0;

  const stageFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const nextFiles = Array.from(files);
    setPendingFiles(prev => [...prev, ...nextFiles]);
    setUploadAlt(prev => prev || suggestedAlt(nextFiles[0]));
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0 || !token) return;
    const baseAlt = uploadAlt.trim();
    if (!baseAlt) {
      toast.error('Vui lòng nhập Alt ảnh trước khi tải lên.');
      return;
    }

    setUploading(true);
    try {
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        setUploadProgress(`Đang upload ${i + 1}/${pendingFiles.length}: ${file.name}`);
        const formData = new FormData();
        formData.append('file', file);
        const fileAlt = pendingFiles.length === 1 || baseAlt.toLowerCase() === suggestedAlt(file).toLowerCase()
          ? baseAlt
          : `${baseAlt} - ${suggestedAlt(file)}`;
        formData.append('alt', fileAlt.slice(0, 255));
        if (uploadCaption.trim()) formData.append('caption', uploadCaption.trim());
        await adminApi.uploadMedia(token, formData);
      }
      setPendingFiles([]);
      setUploadAlt('');
      setUploadCaption('');
      setUploadProgress('');
      invalidateAdmin('/admin/media');
      refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Không thể tải ảnh lên.');
    }
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
    stageFiles(e.dataTransfer.files);
  }, []);

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
          <label className="admin-btn admin-btn--primary admin-btn--sm" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
            <FiUploadCloud /> Upload
            <input ref={fileInputRef} type="file" multiple accept="image/*,.ico,image/x-icon,image/vnd.microsoft.icon" onChange={e => { stageFiles(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="admin-content">
        {/* Upload Zone */}
        <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          role="button"
          tabIndex={0}
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

        {pendingFiles.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid rgba(201,169,110,0.35)', borderRadius: '12px', background: 'rgba(201,169,110,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
              <strong style={{ color: 'var(--color-gold)', fontSize: '0.875rem' }}>{pendingFiles.length} ảnh sẵn sàng tải lên</strong>
              <button type="button" onClick={() => { setPendingFiles([]); setUploadAlt(''); setUploadCaption(''); }} className="admin-btn admin-btn--secondary admin-btn--sm">
                Bỏ chọn
              </button>
            </div>
            <div className="admin-form__row">
              <label className="admin-form__group">
                <span className="admin-form__label">Alt ảnh <span style={{ color: '#f87171' }}>*</span></span>
                <input
                  className="admin-form__input"
                  type="text"
                  value={uploadAlt}
                  onChange={e => setUploadAlt(e.target.value)}
                  maxLength={255}
                  required
                  aria-label="Alt ảnh"
                  placeholder="Mô tả nội dung ảnh"
                />
              </label>
              <label className="admin-form__group">
                <span className="admin-form__label">Chú thích ảnh <span style={{ color: 'rgba(255,255,255,0.35)' }}>(tuỳ chọn)</span></span>
                <input
                  className="admin-form__input"
                  type="text"
                  value={uploadCaption}
                  onChange={e => setUploadCaption(e.target.value)}
                  maxLength={1000}
                  aria-label="Chú thích ảnh"
                  placeholder="Ghi chú hiển thị cùng ảnh"
                />
              </label>
            </div>
            {pendingFiles.length > 1 && (
              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
                Với nhiều ảnh, tên file sẽ được thêm vào Alt để mỗi ảnh có mô tả riêng.
              </p>
            )}
            <button type="button" className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => void handleUpload()} disabled={uploading || !uploadAlt.trim()} style={{ marginTop: '12px' }}>
              <FiUploadCloud /> {uploading ? 'Đang tải lên...' : 'Tải ảnh lên'}
            </button>
          </div>
        )}

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
                        <img src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${item.url}`} alt={item.alt || item.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
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
