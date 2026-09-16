'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useToken } from '@/lib/useToken';
import { FiX, FiSearch, FiCheck, FiUploadCloud, FiTrash2, FiLoader, FiImage } from 'react-icons/fi';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, item: any) => void;
  onSelectMultiple?: (urls: string[], items: any[]) => void;
  multiple?: boolean;
}

function suggestedAlt(file: File): string {
  const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return baseName || 'Hình ảnh MITOO';
}

export default function MediaPicker({ isOpen, onClose, onSelect, onSelectMultiple, multiple = false }: MediaPickerProps) {
  const { token } = useToken();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [selectedMultiple, setSelectedMultiple] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && token) {
      loadMedia();
      setSelected('');
      setSelectedMultiple(new Set());
      setPendingFiles([]);
      setUploadAlt('');
      setUploadCaption('');
      setUploadError('');
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

  const stageFiles = useCallback((files: FileList | File[]) => {
    const nextFiles = Array.from(files);
    if (nextFiles.length === 0) return;

    setPendingFiles(prev => [...prev, ...nextFiles]);
    setUploadError('');
    setUploadAlt(prev => prev || suggestedAlt(nextFiles[0]));
  }, []);

  const handleUpload = useCallback(async () => {
    if (!token || pendingFiles.length === 0) return;
    const baseAlt = uploadAlt.trim();
    if (!baseAlt) {
      setUploadError('Vui lòng nhập Alt ảnh trước khi tải lên.');
      return;
    }

    setUploading(true);
    setUploadError('');
    const fileArr = pendingFiles;
    let count = 0;

    for (const file of fileArr) {
      count++;
      setUploadProgress(`Đang upload ${count}/${fileArr.length}: ${file.name}`);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'general');
        // Keep every uploaded media record descriptive. For a batch upload,
        // add the filename only when it differs from the shared base alt.
        const fileAlt = fileArr.length === 1 || baseAlt.toLowerCase() === suggestedAlt(file).toLowerCase()
          ? baseAlt
          : `${baseAlt} - ${suggestedAlt(file)}`;
        formData.append('alt', fileAlt.slice(0, 255));
        if (uploadCaption.trim()) formData.append('caption', uploadCaption.trim());
        await adminApi.uploadMedia(token, formData);
      } catch (err) {
        console.error(`Upload failed: ${file.name}`, err);
      }
    }

    setUploadProgress('');
    setUploading(false);
    setPendingFiles([]);
    setUploadAlt('');
    setUploadCaption('');
    loadMedia();
  }, [pendingFiles, token, uploadAlt, uploadCaption]);

  const handleDelete = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm(`Xóa "${item.original_name || item.filename}"?`)) return;
    setDeleting(item.id);
    try {
      await adminApi.deleteMedia(token, item.id);
      setMedia(prev => prev.filter(m => m.id !== item.id));
      if (selected === item.url) setSelected('');
      setSelectedMultiple(prev => { const next = new Set(prev); next.delete(item.url); return next; });
    } catch (err) { console.error(err); }
    finally { setDeleting(null); }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) stageFiles(files);
  }, [stageFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      stageFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleItemClick = (url: string) => {
    if (multiple) {
      setSelectedMultiple(prev => {
        const next = new Set(prev);
        if (next.has(url)) {
          next.delete(url);
        } else {
          next.add(url);
        }
        return next;
      });
    } else {
      setSelected(url);
    }
  };

  const handleConfirm = () => {
    if (multiple) {
      if (selectedMultiple.size > 0 && onSelectMultiple) {
        const urls = Array.from(selectedMultiple);
        onSelectMultiple(urls, urls.map(url => media.find(item => item.url === url)).filter(Boolean));
        setSelectedMultiple(new Set());
        onClose();
      }
    } else {
      if (selected) {
        onSelect(selected, media.find(item => item.url === selected));
        setSelected('');
        onClose();
      }
    }
  };

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
  const selectionCount = multiple ? selectedMultiple.size : (selected ? 1 : 0);

  if (!isOpen) return null;

  return (
    <div className="media-picker-overlay" onClick={onClose}>
      <div className="media-picker-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="media-picker-header">
          <h3>
            <FiImage style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Media Library
            {multiple && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginLeft: '8px', fontWeight: 400 }}>(chọn nhiều ảnh)</span>}
          </h3>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.25rem', background: 'none', border: 'none', cursor: 'pointer' }}><FiX /></button>
        </div>

        {/* Toolbar: Search + Upload */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 12px' }}>
            <FiSearch style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm ảnh..." style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.875rem', width: '100%' }} />
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,.ico,image/x-icon,image/vnd.microsoft.icon" multiple onChange={handleFileInput} style={{ display: 'none' }} />
          <button
            className="admin-btn admin-btn--primary admin-btn--sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {uploading ? <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> : <FiUploadCloud />}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        {/* Upload metadata */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(201,169,110,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
            <strong style={{ color: 'var(--color-gold)', fontSize: '0.8125rem' }}>
              {pendingFiles.length > 0 ? `${pendingFiles.length} ảnh sẵn sàng tải lên` : 'Thông tin ảnh tải lên'}
            </strong>
            {pendingFiles.length > 0 && (
              <button
                type="button"
                onClick={() => { setPendingFiles([]); setUploadAlt(''); setUploadCaption(''); setUploadError(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                Bỏ chọn
              </button>
            )}
          </div>
          <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.5)', fontSize: '0.6875rem' }}>
            Alt ảnh là bắt buộc cho mọi file mới. Bạn có thể nhập trước khi chọn file.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
              Alt ảnh <span style={{ color: '#f87171' }}>*</span>
              <input
                type="text"
                value={uploadAlt}
                onChange={e => { setUploadAlt(e.target.value); setUploadError(''); }}
                maxLength={255}
                required
                aria-label="Alt ảnh"
                data-testid="media-picker-upload-alt"
                placeholder="Mô tả nội dung ảnh"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '8px 10px', color: '#fff', outline: 'none' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
              Chú thích ảnh <span style={{ color: 'rgba(255,255,255,0.35)' }}>(tuỳ chọn)</span>
              <input
                type="text"
                value={uploadCaption}
                onChange={e => setUploadCaption(e.target.value)}
                maxLength={1000}
                aria-label="Chú thích ảnh"
                placeholder="Ghi chú hiển thị cùng ảnh"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '8px 10px', color: '#fff', outline: 'none' }}
              />
            </label>
          </div>
          {pendingFiles.length > 1 && (
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.6875rem' }}>
              Với nhiều ảnh, tên file sẽ được thêm vào Alt để mỗi ảnh có mô tả riêng.
            </p>
          )}
          {uploadError && <p style={{ margin: '8px 0 0', color: '#f87171', fontSize: '0.75rem' }}>{uploadError}</p>}
          {pendingFiles.length > 0 ? (
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-btn--sm"
              onClick={() => void handleUpload()}
              disabled={uploading || !uploadAlt.trim()}
              style={{ marginTop: '10px' }}
            >
              <FiUploadCloud /> {uploading ? 'Đang tải lên...' : 'Tải ảnh lên'}
            </button>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '0.6875rem' }}>
              <FiImage /> Chưa chọn file — Alt sẽ được giữ lại khi bạn chọn ảnh.
            </span>
          )}
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
                const isSelected = multiple ? selectedMultiple.has(item.url) : selected === item.url;
                const isDeleting = deleting === item.id;
                return (
                  <div key={item.id}
                    className={`media-picker-item ${isSelected ? 'media-picker-item--selected' : ''}`}
                    onClick={() => handleItemClick(item.url)}
                    style={{ opacity: isDeleting ? 0.4 : 1 }}>
                    <img src={fullUrl} alt={item.alt || item.filename} loading="lazy" />

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

                    {/* Multi-select index badge */}
                    {multiple && isSelected && (
                      <div style={{
                        position: 'absolute', top: '6px', left: '6px',
                        minWidth: '22px', height: '22px', borderRadius: '11px',
                        background: 'var(--color-gold)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6875rem', fontWeight: 700, color: '#000',
                        padding: '0 4px',
                      }}>
                        {Array.from(selectedMultiple).indexOf(item.url) + 1}
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
            {media.length} ảnh {selectionCount > 0 && `• ${selectionCount} đã chọn`}
          </span>
          <button className="admin-btn admin-btn--secondary" onClick={onClose}>Hủy</button>
          <button className="admin-btn admin-btn--primary" onClick={handleConfirm} disabled={selectionCount === 0}>
            <FiCheck /> {multiple ? `Chọn ${selectionCount} ảnh` : 'Chọn ảnh'}
          </button>
        </div>
      </div>

      {/* Inline styles for hover effects & spin animation */}
      <style>{`
        .media-picker-item:hover .media-picker-delete-btn,
        .media-picker-item:hover .media-picker-info { opacity: 1 !important; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}
      </style>
    </div>
  );
}
