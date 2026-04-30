'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { FiClock, FiPlus, FiTrash2, FiPlay, FiCheck, FiX, FiAlertCircle, FiLoader, FiRefreshCw, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface QueueItem {
  id: number;
  topic: string;
  keywords: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  with_images: boolean;
  image_count: number;
  error_message?: string;
  article_id?: number;
  article?: { id: number; title: string; slug: string; is_published: boolean; thumbnail?: string };
  scheduled_at: string;
  processed_at?: string;
  created_at: string;
}

export default function AdminAiQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [topicsText, setTopicsText] = useState('');
  const [interval, setInterval_] = useState(5);
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [withImages, setWithImages] = useState(false);
  const [imageCount, setImageCount] = useState(2);
  const [keywords, setKeywords] = useState('');
  const [adding, setAdding] = useState(false);

  // Auto-scheduler settings
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [batchLimit, setBatchLimit] = useState(5);
  const [savingSettings, setSavingSettings] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  const loadQueue = useCallback(async () => {
    if (!token) return;
    try {
      const data = await adminApi.getAiQueue(token);
      setItems(data.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    try {
      const data = await adminApi.getAiQueueSettings(token);
      setAutoEnabled(!!data.auto_enabled);
      setBatchLimit(Number(data.batch_limit) || 5);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { loadQueue(); loadSettings(); }, [loadQueue, loadSettings]);

  const handleSaveSettings = async (next: { auto_enabled?: boolean; batch_limit?: number }) => {
    if (!token) return;
    setSavingSettings(true);
    try {
      const payload = {
        auto_enabled: next.auto_enabled ?? autoEnabled,
        batch_limit: next.batch_limit ?? batchLimit,
      };
      const data = await adminApi.updateAiQueueSettings(token, payload);
      setAutoEnabled(!!data.auto_enabled);
      setBatchLimit(Number(data.batch_limit) || 5);
      toast.success(payload.auto_enabled ? 'Đã bật tự động xử lý' : 'Đã tắt tự động xử lý');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu cài đặt');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAdd = async () => {
    if (!token || !topicsText.trim()) return;
    setAdding(true);
    try {
      const data = await adminApi.addAiQueue(token, {
        topics: topicsText,
        interval,
        tone,
        length,
        with_images: withImages,
        image_count: imageCount,
        keywords,
      });
      toast.success(data.message || 'Đã thêm vào hàng đợi');
      setTopicsText('');
      loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thêm hàng đợi');
    } finally {
      setAdding(false);
    }
  };

  const handleProcess = async () => {
    if (!token) return;
    setProcessing(true);
    const t = toast.loading('Đang xử lý bài viết tiếp theo...');
    try {
      const data = await adminApi.processAiQueue(token);
      if (data.processed) {
        toast.success(`Đã tạo: ${data.title}`, { id: t });
      } else {
        toast.success(data.message || 'Không có mục nào cần xử lý', { id: t });
      }
      loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xử lý', { id: t });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await adminApi.deleteAiQueue(token, id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Đã xóa');
    } catch { toast.error('Lỗi xóa'); }
  };

  const handleClear = async () => {
    if (!token || !confirm('Xóa tất cả mục đang chờ?')) return;
    try {
      await adminApi.clearAiQueue(token);
      loadQueue();
      toast.success('Đã xóa tất cả mục đang chờ');
    } catch { toast.error('Lỗi'); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTopicsText(ev.target?.result as string || '');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { bg: string; color: string; icon: any; label: string }> = {
      pending: { bg: 'rgba(255,193,7,0.15)', color: '#ffc107', icon: <FiClock />, label: 'Đang chờ' },
      processing: { bg: 'rgba(33,150,243,0.15)', color: '#2196f3', icon: <FiLoader className="spin" />, label: 'Đang xử lý' },
      done: { bg: 'rgba(76,175,80,0.15)', color: '#4caf50', icon: <FiCheck />, label: 'Hoàn thành' },
      failed: { bg: 'rgba(244,67,54,0.15)', color: '#f44336', icon: <FiAlertCircle />, label: 'Lỗi' },
    };
    const m = map[s] || map.pending;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px',
        borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600, background: m.bg, color: m.color }}>
        {m.icon} {m.label}
      </span>
    );
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const doneCount = items.filter(i => i.status === 'done').length;

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title"><FiClock style={{ marginRight: '8px' }} /> Lên Lịch Viết Bài AI</h1>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={loadQueue} disabled={loading}>
            <FiRefreshCw /> Làm mới
          </button>
          {pendingCount > 0 && (
            <>
              <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={handleProcess} disabled={processing}>
                <FiPlay /> {processing ? 'Đang xử lý...' : `Xử lý tiếp (${pendingCount} chờ)`}
              </button>
              <button className="admin-btn admin-btn--danger admin-btn--sm" onClick={handleClear}
                style={{ background: 'rgba(244,67,54,0.15)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)' }}>
                <FiTrash2 /> Xóa tất cả chờ
              </button>
            </>
          )}
        </div>
      </div>

      <div className="admin-content">
        {/* Auto-scheduler settings */}
        <div className="admin-card" style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px' }}>
          <div style={{ flex: '1 1 280px' }}>
            <h3 className="admin-card__title" style={{ marginBottom: '4px' }}>
              <FiClock style={{ marginRight: '6px' }} /> Tự động xử lý theo lịch
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              Khi bật, hệ thống tự chạy mỗi phút (qua Laravel scheduler) và xử lý các mục đã đến giờ <code>scheduled_at</code>.
              <br />
              Cron lệnh: <code>* * * * * cd /path/to/backend && php artisan schedule:run &gt;&gt; /dev/null 2&gt;&amp;1</code>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
              <span>Bài / phút:</span>
              <input type="number" min={1} max={20} value={batchLimit} disabled={savingSettings}
                onChange={e => setBatchLimit(Number(e.target.value) || 1)}
                onBlur={() => handleSaveSettings({ batch_limit: batchLimit })}
                style={{ width: '70px', padding: '6px 8px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff' }} />
            </label>
            <button
              onClick={() => handleSaveSettings({ auto_enabled: !autoEnabled })}
              disabled={savingSettings}
              className="admin-btn admin-btn--sm"
              style={{
                background: autoEnabled ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.08)',
                color: autoEnabled ? '#4caf50' : 'rgba(255,255,255,0.7)',
                border: `1px solid ${autoEnabled ? 'rgba(76,175,80,0.4)' : 'rgba(255,255,255,0.15)'}`,
                padding: '8px 16px',
                fontWeight: 600,
              }}>
              {savingSettings ? '...' : autoEnabled ? '● Đang BẬT' : '○ Đang TẮT'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Add topics form */}
          <div className="admin-card">
            <h3 className="admin-card__title" style={{ marginBottom: '16px' }}>
              <FiPlus style={{ marginRight: '6px' }} /> Thêm danh sách chủ đề
            </h3>
            <div className="admin-form">
              <div className="admin-form__group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="admin-form__label">Danh sách chủ đề (mỗi dòng 1 chủ đề) *</label>
                  <label style={{ cursor: 'pointer', color: 'var(--color-gold)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiUpload /> Tải file .txt
                    <input type="file" accept=".txt,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
                </div>
                <textarea className="admin-form__input" value={topicsText} onChange={e => setTopicsText(e.target.value)}
                  placeholder={"Kính mắt thời trang 2026\nCách chọn kính phù hợp khuôn mặt\nTop 5 thương hiệu kính cao cấp\nBảo quản kính đúng cách"}
                  rows={8} style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.6' }} />
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  {topicsText.split('\n').filter(l => l.trim()).length} chủ đề
                </p>
              </div>
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Khoảng cách (phút)</label>
                  <input className="admin-form__input" type="number" min={1} max={1440} value={interval}
                    onChange={e => setInterval_(Number(e.target.value))} />
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    Bài 1: ngay, Bài 2: +{interval}p, Bài 3: +{interval * 2}p...
                  </p>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Giọng văn</label>
                  <select className="admin-form__input" value={tone} onChange={e => setTone(e.target.value)}>
                    <option value="professional">Chuyên nghiệp</option>
                    <option value="casual">Thân thiện</option>
                    <option value="luxury">Sang trọng</option>
                  </select>
                </div>
              </div>
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Độ dài</label>
                  <select className="admin-form__input" value={length} onChange={e => setLength(e.target.value)}>
                    <option value="short">Ngắn</option>
                    <option value="medium">Trung bình</option>
                    <option value="long">Dài</option>
                  </select>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Từ khóa chung</label>
                  <input className="admin-form__input" value={keywords} onChange={e => setKeywords(e.target.value)}
                    placeholder="kính mắt, thời trang" />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '4px' }}>
                <input type="checkbox" checked={withImages} onChange={e => setWithImages(e.target.checked)}
                  style={{ accentColor: 'var(--color-gold)' }} />
                Sinh ảnh minh họa ({imageCount} ảnh/bài)
              </label>

              <button className="admin-btn admin-btn--primary" onClick={handleAdd}
                disabled={adding || !topicsText.trim()}
                style={{ width: '100%', padding: '14px', marginTop: '12px' }}>
                {adding ? <><FiRefreshCw className="spin" /> Đang thêm...</>
                  : <><FiPlus /> Thêm {topicsText.split('\n').filter(l => l.trim()).length} chủ đề vào hàng đợi</>}
              </button>
            </div>
          </div>

          {/* Queue list */}
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="admin-card__header">
              <h3 className="admin-card__title">
                Hàng đợi ({items.length} mục — {doneCount} xong, {pendingCount} chờ)
              </h3>
            </div>
            <div style={{ flex: 1, overflow: 'auto', maxHeight: '600px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}>
                  Đang tải...
                </div>
              ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}>
                  <FiClock style={{ fontSize: '1.5rem', display: 'block', margin: '0 auto 12px' }} />
                  Chưa có chủ đề nào trong hàng đợi
                </div>
              ) : (
                <table className="admin-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Chủ đề</th>
                      <th>Trạng thái</th>
                      <th>Lịch</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ maxWidth: '250px' }}>
                            <div style={{ fontWeight: 500, marginBottom: '2px' }}>{item.topic}</div>
                            {item.article && (
                              <a href={`/admin/articles/${item.article.id}`}
                                style={{ fontSize: '0.7rem', color: 'var(--color-gold)' }}>
                                → {item.article.title} ({item.article.is_published ? 'đã xuất bản' : 'nháp'})
                              </a>
                            )}
                            {item.error_message && (
                              <div style={{ fontSize: '0.7rem', color: '#f44336', marginTop: '2px' }}>
                                {item.error_message.substring(0, 80)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{statusBadge(item.status)}</td>
                        <td style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                          {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                        </td>
                        <td>
                          {item.status === 'pending' && (
                            <button onClick={() => handleDelete(item.id)}
                              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                              <FiX />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        <style jsx>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
}
