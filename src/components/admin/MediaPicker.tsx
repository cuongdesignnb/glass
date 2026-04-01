'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useToken } from '@/lib/useToken';
import { FiX, FiSearch, FiCheck, FiUploadCloud, FiTrash2, FiLoader, FiImage } from 'react-icons/fi';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  multiple?: boolean;
}

export default function MediaPicker({ isOpen, onClose, onSelect }: MediaPickerProps) {
  const { token } = useToken();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && token) {
      loadMedia();
      setSelected('');
    }
  }, [isOpen, token]);

  const loadMedia = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { per_page: '80' };
      if (search) params.search = search;
      const data = await adminApi.getMedia(token, params);
      setMedia(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen && token) loadMedia();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    if (!token || files.length === 0) return;
    setUploading(true);
    const fileArr = Array.from(files);
    let count = 0;

    for (const file of fileArr) {
      count++;
      setUploadProgress(`Đang upload ${count}/${fileArr.length}: ${file.name}`);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'general');
        await adminApi.uploadMedia(token, formData);
      } catch (err) {
        console.error(`Upload failed: ${file.name}`, err);
      }
    }

    setUploadProgress('');
    setUploading(false);
    loadMedia();
  }, [token]);

  const handleDelete = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm(`Xóa "${item.original_name || item.filename}"?`)) return;
    setDeleting(item.id);
    try {
      await adminApi.deleteMedia(token, item.id);
      setMedia(prev => prev.filter(m => m.id !== item.id));
      if (selected === item.url) setSelected('');
    } catch (err) { console.error(err); }
    finally { setDeleting(null); }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleUpload(files);
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
      e.target.value = '';
    }
  };

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      setSelected('');
      onClose();
    }
  };

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

  if (!isOpen) return null;

  return (
    <div className="media-picker-overlay" onClick={onClose}>
      <div className="media-picker-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="media-picker-header">
          <h3><FiImage style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Media Library</h3>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.25rem', background: 'none', border: 'none', cursor: 'pointer' }}><FiX /></button>
        </div>

        {/* Toolbar: Search + Upload */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 12px' }}>
            <FiSearch style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm ảnh..." style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.875rem', width: '100%' }} />
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileInput} style={{ display: 'none' }} />
          <button
            className="admin-btn admin-btn--primary admin-btn--sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {uploading ? <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> : <FiUploadCloud />}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        {/* Upload Progress */}
        {uploadProgress && (
          <div style={{ padding: '8px 24px', background: 'rgba(201,169,110,0.08)', fontSize: '0.8125rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiLoader style={{ animation: 'spin 1s linear infinite' }} />
            {uploadProgress}
          </div>
        )}

        {/* Body: Drag & Drop + Grid */}
        <div
          className="media-picker-body"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            position: 'relative',
            ...(dragOver ? { background: 'rgba(201,169,110,0.08)', outline: '2px dashed var(--color-gold)', outlineOffset: '-8px' } : {}),
          }}>

          {/* Drag overlay */}
          {dragOver && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, pointerEvents: 'none',
            }}>
              <div style={{ background: 'rgba(0,0,0,0.7)', padding: '24px 40px', borderRadius: '12px', textAlign: 'center' }}>
                <FiUploadCloud style={{ fontSize: '2rem', color: 'var(--color-gold)', marginBottom: '8px' }} />
                <p style={{ color: 'var(--color-gold)', fontWeight: 600 }}>Thả ảnh vào đây</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="media-picker-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: '10px' }} />
              ))}
            </div>
          ) : media.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}>
              <FiUploadCloud style={{ fontSize: '3rem', marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ marginBottom: '8px', fontSize: '1rem' }}>Chưa có ảnh nào</p>
              <p style={{ fontSize: '0.8125rem', marginBottom: '16px' }}>Kéo thả ảnh vào đây hoặc click Upload</p>
              <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={() => fileInputRef.current?.click()}>
                <FiUploadCloud /> Upload ảnh đầu tiên
              </button>
            </div>
          ) : (
            <div className="media-picker-grid">
              {media.map((item: any) => {
                const fullUrl = `${baseUrl}${item.url}`;
                const isSelected = selected === item.url;
                const isDeleting = deleting === item.id;
                return (
                  <div key={item.id}
                    className={`media-picker-item ${isSelected ? 'media-picker-item--selected' : ''}`}
                    onClick={() => setSelected(item.url)}
                    style={{ opacity: isDeleting ? 0.4 : 1 }}>
                    <img src={fullUrl} alt={item.filename} loading="lazy" />

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: '6px', right: '6px',
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: 'var(--color-gold)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <FiCheck style={{ color: '#000', fontSize: '0.75rem', fontWeight: 700 }} />
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, item)}
                      disabled={isDeleting}
                      style={{
                        position: 'absolute', bottom: '6px', right: '6px',
                        width: '26px', height: '26px', borderRadius: '6px',
                        background: 'rgba(0,0,0,0.7)', color: '#ef4444',
                        border: 'none', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.15s',
                        fontSize: '0.75rem',
                      }}
                      className="media-picker-delete-btn">
                      <FiTrash2 />
                    </button>

                    {/* File info on hover */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '4px 6px',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                      fontSize: '0.625rem', color: 'rgba(255,255,255,0.8)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      opacity: 0, transition: 'opacity 0.15s',
                    }}
                      className="media-picker-info">
                      {item.original_name || item.filename}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="media-picker-footer">
          <span style={{ flex: 1, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
            {media.length} ảnh {selected && '• 1 đã chọn'}
          </span>
          <button className="admin-btn admin-btn--secondary" onClick={onClose}>Hủy</button>
          <button className="admin-btn admin-btn--primary" onClick={handleConfirm} disabled={!selected}>
            <FiCheck /> Chọn ảnh
          </button>
        </div>
      </div>

      {/* Inline styles for hover effects & spin animation */}
      <style>{`
        .media-picker-item:hover .media-picker-delete-btn,
        .media-picker-item:hover .media-picker-info { opacity: 1 !important; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
