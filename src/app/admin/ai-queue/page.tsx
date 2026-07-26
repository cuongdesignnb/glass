'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiLoader,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiServer,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface ArticleCategory {
  id: number;
  name: string;
  children?: ArticleCategory[];
}

interface QueueItem {
  id: number;
  topic: string;
  keywords?: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  with_images: boolean;
  image_count: number;
  auto_publish: boolean;
  attempts: number;
  max_attempts: number;
  error_message?: string | null;
  article_id?: number | null;
  article_category?: { id: number; name: string } | null;
  article?: {
    id: number;
    title: string;
    slug: string;
    is_published: boolean;
    published_at?: string | null;
    thumbnail?: string | null;
  } | null;
  scheduled_at?: string | null;
  next_attempt_at?: string | null;
  processed_at?: string | null;
  created_at: string;
}

interface QueueStatus {
  auto_enabled: boolean;
  batch_limit: number;
  scheduler_last_seen_at?: string | null;
  scheduler_last_run_at?: string | null;
  scheduler_last_success_at?: string | null;
  scheduler_online: boolean;
  pending_count: number;
  due_count: number;
  processing_count: number;
  failed_count: number;
  next_scheduled_at?: string | null;
}

const POLL_INTERVAL_MS = 15_000;

function defaultStartAt(): string {
  const date = new Date(Date.now() + 5 * 60_000);
  date.setSeconds(0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không hợp lệ';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function flattenCategories(categories: ArticleCategory[], depth = 0): Array<ArticleCategory & { label: string }> {
  return categories.flatMap((category) => [
    { ...category, label: `${'— '.repeat(depth)}${category.name}` },
    ...flattenCategories(category.children || [], depth + 1),
  ]);
}

export default function AdminAiQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [topicsText, setTopicsText] = useState('');
  const [startAt, setStartAt] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [autoPublish, setAutoPublish] = useState(true);
  const [articleCategoryId, setArticleCategoryId] = useState<number | null>(null);
  const [tone, setTone] = useState<'professional' | 'casual' | 'luxury'>('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [withImages, setWithImages] = useState(false);
  const [imageCount, setImageCount] = useState(2);
  const [keywords, setKeywords] = useState('');
  const [adding, setAdding] = useState(false);

  const [autoEnabled, setAutoEnabled] = useState(false);
  const [batchLimit, setBatchLimit] = useState(5);
  const [savingSettings, setSavingSettings] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const topicLines = useMemo(
    () => topicsText.split('\n').map((line) => line.trim()).filter(Boolean),
    [topicsText],
  );
  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);

  const schedulePreview = useMemo(() => {
    if (!startAt || topicLines.length === 0 || intervalMinutes < 1) return [];
    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) return [];
    const all = topicLines.map((topic, index) => ({
      topic,
      index,
      at: new Date(start.getTime() + index * intervalMinutes * 60_000),
    }));
    return all.length <= 4 ? all : [...all.slice(0, 3), all[all.length - 1]];
  }, [intervalMinutes, startAt, topicLines]);

  const loadQueue = useCallback(async () => {
    if (!token) return;
    const data = await adminApi.getAiQueue(token);
    setItems(Array.isArray(data?.data) ? data.data : []);
  }, [token]);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    const data = await adminApi.getAiQueueStatus(token);
    setQueueStatus(data);
  }, [token]);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    const data = await adminApi.getAiQueueSettings(token);
    setAutoEnabled(Boolean(data.auto_enabled));
    setBatchLimit(Math.max(1, Math.min(20, Number(data.batch_limit) || 5)));
  }, [token]);

  const loadCategories = useCallback(async () => {
    if (!token) return;
    const data = await adminApi.getArticleCategories(token);
    setCategories(Array.isArray(data) ? data : []);
  }, [token]);

  const loadDashboard = useCallback(async (showLoading = false) => {
    if (!token) return;
    if (showLoading) setLoading(true);
    try {
      await Promise.all([loadQueue(), loadStatus(), loadSettings()]);
    } catch {
      if (showLoading) toast.error('Không thể tải trạng thái hàng đợi.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [loadQueue, loadSettings, loadStatus, token]);

  useEffect(() => {
    setStartAt(defaultStartAt());
  }, []);

  useEffect(() => {
    loadDashboard(true);
    loadCategories().catch(() => toast.error('Không thể tải danh mục bài viết.'));
    const polling = window.setInterval(() => {
      loadDashboard(false);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(polling);
  }, [loadCategories, loadDashboard]);

  const saveSettings = async (next: { auto_enabled?: boolean; batch_limit?: number }) => {
    if (!token || savingSettings) return;
    setSavingSettings(true);
    try {
      const data = await adminApi.updateAiQueueSettings(token, {
        auto_enabled: next.auto_enabled ?? autoEnabled,
        batch_limit: next.batch_limit ?? batchLimit,
      });
      setAutoEnabled(Boolean(data.auto_enabled));
      setBatchLimit(Number(data.batch_limit) || 5);
      await loadStatus();
      toast.success(data.auto_enabled ? 'Đã bật xử lý tự động trên server.' : 'Đã tắt xử lý tự động.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể lưu cài đặt.');
    } finally {
      setSavingSettings(false);
    }
  };

  const addSchedule = async () => {
    if (!token || adding || topicLines.length === 0 || !startAt) return;
    setAdding(true);
    try {
      const data = await adminApi.addAiQueue(token, {
        topics: topicsText,
        start_at: new Date(startAt).toISOString(),
        interval: intervalMinutes,
        auto_publish: autoPublish,
        article_category_id: articleCategoryId,
        tone,
        length,
        with_images: withImages,
        image_count: withImages ? imageCount : 0,
        keywords,
      });
      toast.success(data.message || 'Đã tạo lịch viết bài.');
      setTopicsText('');
      setStartAt(defaultStartAt());
      await loadDashboard(false);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tạo lịch viết bài.');
    } finally {
      setAdding(false);
    }
  };

  const processDueItems = async () => {
    if (!token || processing) return;
    setProcessing(true);
    const toastId = toast.loading('Server đang nhận các bài đã đến giờ...');
    try {
      const stats = await adminApi.processAiQueueBatch(token, batchLimit);
      toast.success(
        `Đã nhận ${Number(stats.claimed) || 0} bài: ${Number(stats.success) || 0} thành công, ${Number(stats.retrying) || 0} chờ thử lại, ${Number(stats.failed) || 0} lỗi.`,
        { id: toastId },
      );
      await loadDashboard(false);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể xử lý hàng đợi.', { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  const retryItem = async (id: number) => {
    if (!token || actionId) return;
    setActionId(`retry-${id}`);
    try {
      await adminApi.retryAiQueueItem(token, id);
      toast.success('Đã đưa bài lỗi trở lại hàng đợi.');
      await loadDashboard(false);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể thử lại bài này.');
    } finally {
      setActionId(null);
    }
  };

  const retryAllFailed = async () => {
    if (!token || actionId) return;
    setActionId('retry-all');
    try {
      const data = await adminApi.retryAllFailedAiQueue(token);
      toast.success(data.message || 'Đã thử lại các bài lỗi.');
      await loadDashboard(false);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể thử lại các bài lỗi.');
    } finally {
      setActionId(null);
    }
  };

  const deletePendingItem = async (id: number) => {
    if (!token || actionId) return;
    setActionId(`delete-${id}`);
    try {
      await adminApi.deleteAiQueue(token, id);
      setItems((current) => current.filter((item) => item.id !== id));
      toast.success('Đã xóa mục đang chờ.');
      await loadStatus();
    } catch (error: any) {
      toast.error(error?.message || 'Không thể xóa mục này.');
    } finally {
      setActionId(null);
    }
  };

  const clearPending = async () => {
    if (!token || actionId || !window.confirm('Xóa tất cả mục đang chờ?')) return;
    setActionId('clear');
    try {
      await adminApi.clearAiQueue(token);
      toast.success('Đã xóa tất cả mục đang chờ.');
      await loadDashboard(false);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể xóa hàng đợi.');
    } finally {
      setActionId(null);
    }
  };

  const uploadTopics = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTopicsText(String(reader.result || ''));
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  const schedulerColor = !queueStatus?.scheduler_online
    ? '#f44336'
    : autoEnabled
      ? '#4caf50'
      : '#ffb300';

  const itemStatus = (item: QueueItem) => {
    if (item.status === 'processing') return { label: 'Đang xử lý', color: '#2196f3', icon: <FiLoader className="spin" /> };
    if (item.status === 'done') return { label: 'Hoàn thành', color: '#4caf50', icon: <FiCheck /> };
    if (item.status === 'failed') return { label: 'Lỗi', color: '#f44336', icon: <FiAlertCircle /> };
    if (item.next_attempt_at && new Date(item.next_attempt_at).getTime() > Date.now()) {
      return { label: 'Đang chờ thử lại', color: '#ff9800', icon: <FiRefreshCw /> };
    }
    if (!item.scheduled_at || new Date(item.scheduled_at).getTime() <= Date.now()) {
      return { label: 'Đến giờ', color: '#ffc107', icon: <FiPlay /> };
    }
    return { label: 'Đang chờ', color: '#b0bec5', icon: <FiClock /> };
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title"><FiClock /> Lên lịch viết và đăng bài AI</h1>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => loadDashboard(true)} disabled={loading}>
            <FiRefreshCw /> Làm mới
          </button>
          <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={processDueItems} disabled={processing || !queueStatus?.due_count}>
            {processing ? <FiLoader className="spin" /> : <FiPlay />} Xử lý ngay bài đến giờ
          </button>
          <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={retryAllFailed} disabled={Boolean(actionId) || !queueStatus?.failed_count}>
            <FiRefreshCw /> Thử lại tất cả bài lỗi
          </button>
          <button className="admin-btn admin-btn--danger admin-btn--sm" onClick={clearPending} disabled={Boolean(actionId) || !queueStatus?.pending_count}>
            <FiTrash2 /> Xóa mục đang chờ
          </button>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-card" style={{ marginBottom: 24, borderColor: `${schedulerColor}55` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px' }}>
              <h3 className="admin-card__title" style={{ color: schedulerColor }}>
                <FiServer /> Scheduler server: {queueStatus?.scheduler_online ? 'Online' : 'Offline'}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', margin: '8px 0 0' }}>
                Tự động xử lý: <strong>{autoEnabled ? 'Bật' : 'Tắt'}</strong>. Trình duyệt chỉ hiển thị trạng thái; queue được xử lý trên máy chủ.
              </p>
              {!queueStatus?.scheduler_online && (
                <p style={{ color: '#f44336', margin: '8px 0 0' }}>
                  Scheduler server chưa hoạt động. Vui lòng liên hệ quản trị máy chủ.
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label className="admin-form__label" style={{ margin: 0 }}>
                Batch limit
                <input
                  className="admin-form__input"
                  type="number"
                  min={1}
                  max={20}
                  value={batchLimit}
                  disabled={savingSettings}
                  onChange={(event) => setBatchLimit(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
                  onBlur={() => saveSettings({ batch_limit: batchLimit })}
                  style={{ width: 80, marginLeft: 8 }}
                />
              </label>
              <button className="admin-btn admin-btn--sm" disabled={savingSettings} onClick={() => saveSettings({ auto_enabled: !autoEnabled })}>
                {savingSettings ? <FiLoader className="spin" /> : null} {autoEnabled ? 'Tắt tự động' : 'Bật tự động'}
              </button>
            </div>
          </div>
          <div className="scheduler-grid">
            <div><span>Heartbeat gần nhất</span><strong>{formatDateTime(queueStatus?.scheduler_last_seen_at)}</strong></div>
            <div><span>Lần chạy gần nhất</span><strong>{formatDateTime(queueStatus?.scheduler_last_run_at)}</strong></div>
            <div><span>Đang chờ</span><strong>{queueStatus?.pending_count ?? 0}</strong></div>
            <div><span>Đã đến giờ</span><strong>{queueStatus?.due_count ?? 0}</strong></div>
            <div><span>Đang xử lý</span><strong>{queueStatus?.processing_count ?? 0}</strong></div>
            <div><span>Bài lỗi</span><strong>{queueStatus?.failed_count ?? 0}</strong></div>
            <div><span>Bài tiếp theo</span><strong>{formatDateTime(queueStatus?.next_scheduled_at)}</strong></div>
          </div>
        </div>

        <div className="queue-layout">
          <div className="admin-card">
            <h3 className="admin-card__title"><FiCalendar /> Tạo lịch bài viết</h3>
            <div className="admin-form">
              <div className="admin-form__group">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <label className="admin-form__label">Danh sách chủ đề, mỗi dòng một chủ đề</label>
                  <label style={{ color: 'var(--color-gold)', cursor: 'pointer', fontSize: 13 }}>
                    <FiUpload /> Tải file UTF-8
                    <input type="file" accept=".txt,.csv" onChange={uploadTopics} style={{ display: 'none' }} />
                  </label>
                </div>
                <textarea className="admin-form__input" rows={7} value={topicsText} onChange={(event) => setTopicsText(event.target.value)}
                  placeholder={'Kính mắt phù hợp với khuôn mặt tròn\nXu hướng kính mắt năm 2026\nCách bảo quản kính đúng cách'} />
                <small>{topicLines.length} chủ đề</small>
              </div>

              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Bắt đầu lúc</label>
                  <input className="admin-form__input" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Khoảng cách giữa các bài (phút)</label>
                  <input className="admin-form__input" type="number" min={1} max={10080} value={intervalMinutes}
                    onChange={(event) => setIntervalMinutes(Math.max(1, Math.min(10080, Number(event.target.value) || 1)))} />
                </div>
              </div>

              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Danh mục bài viết</label>
                  <select className="admin-form__input" value={articleCategoryId ?? ''}
                    onChange={(event) => setArticleCategoryId(event.target.value ? Number(event.target.value) : null)}>
                    <option value="">Không chọn danh mục</option>
                    {flatCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                  </select>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Chế độ sau khi tạo</label>
                  <select className="admin-form__input" value={autoPublish ? 'publish' : 'draft'}
                    onChange={(event) => setAutoPublish(event.target.value === 'publish')}>
                    <option value="publish">Tự động đăng bài</option>
                    <option value="draft">Lưu thành bản nháp</option>
                  </select>
                </div>
              </div>

              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Giọng văn</label>
                  <select className="admin-form__input" value={tone} onChange={(event) => setTone(event.target.value as typeof tone)}>
                    <option value="professional">Chuyên nghiệp</option>
                    <option value="casual">Thân thiện</option>
                    <option value="luxury">Sang trọng</option>
                  </select>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Độ dài</label>
                  <select className="admin-form__input" value={length} onChange={(event) => setLength(event.target.value as typeof length)}>
                    <option value="short">Ngắn</option>
                    <option value="medium">Trung bình</option>
                    <option value="long">Dài</option>
                  </select>
                </div>
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">Từ khóa chung</label>
                <input className="admin-form__input" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="kính mắt, thời trang" />
              </div>

              <label className="check-row">
                <input type="checkbox" checked={withImages} onChange={(event) => setWithImages(event.target.checked)} />
                Sinh ảnh minh họa
              </label>
              {withImages && (
                <div className="admin-form__group">
                  <label className="admin-form__label">Số ảnh trong bài</label>
                  <input className="admin-form__input" type="number" min={0} max={10} value={imageCount}
                    onChange={(event) => setImageCount(Math.max(0, Math.min(10, Number(event.target.value) || 0)))} />
                  <small>Ảnh đại diện được sinh riêng; số lượng này chỉ tính ảnh trong nội dung.</small>
                </div>
              )}

              {schedulePreview.length > 0 && (
                <div className="schedule-preview">
                  <strong>Xem trước lịch</strong>
                  {schedulePreview.map((entry, position) => (
                    <div key={`${entry.index}-${entry.topic}`}>
                      {position === 3 && topicLines.length > 4 ? <span>…</span> : null}
                      <span>Bài {entry.index + 1}: {formatDateTime(entry.at.toISOString())}</span>
                      <small>{entry.topic}</small>
                    </div>
                  ))}
                </div>
              )}

              <button className="admin-btn admin-btn--primary" style={{ width: '100%' }} onClick={addSchedule}
                disabled={adding || topicLines.length === 0 || !startAt}>
                {adding ? <FiLoader className="spin" /> : <FiPlus />} Tạo lịch cho {topicLines.length} bài
              </button>
            </div>
          </div>

          <div className="admin-card queue-card">
            <h3 className="admin-card__title">Hàng đợi bài viết</h3>
            {loading ? (
              <div className="empty-state"><FiLoader className="spin" /> Đang tải...</div>
            ) : items.length === 0 ? (
              <div className="empty-state"><FiClock /> Chưa có bài trong hàng đợi.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table queue-table">
                  <thead><tr><th>Chủ đề</th><th>Lịch và chế độ</th><th>Trạng thái</th><th>Bài viết</th><th></th></tr></thead>
                  <tbody>
                    {items.map((item) => {
                      const state = itemStatus(item);
                      return (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.topic}</strong>
                            <small>{item.article_category?.name || 'Không có danh mục'}</small>
                            {item.error_message ? <small style={{ color: '#f44336' }}>{item.error_message.slice(0, 120)}</small> : null}
                          </td>
                          <td>
                            <span>{formatDateTime(item.scheduled_at)}</span>
                            <small>{item.auto_publish ? 'Tự đăng' : 'Bản nháp'}</small>
                            {item.next_attempt_at ? <small>Thử lại: {formatDateTime(item.next_attempt_at)}</small> : null}
                          </td>
                          <td>
                            <span className="status-pill" style={{ color: state.color, borderColor: `${state.color}55` }}>{state.icon} {state.label}</span>
                            <small>Lần thử {item.attempts}/{item.max_attempts}</small>
                          </td>
                          <td>
                            {item.article ? (
                              <a href={`/admin/articles/${item.article.id}`} style={{ color: 'var(--color-gold)' }}>
                                {item.article.is_published ? 'Đã xuất bản' : 'Bản nháp'}
                              </a>
                            ) : <span>Chưa tạo</span>}
                          </td>
                          <td>
                            {item.status === 'failed' && !item.article_id ? (
                              <button className="icon-button" title="Thử lại" disabled={Boolean(actionId)} onClick={() => retryItem(item.id)}>
                                {actionId === `retry-${item.id}` ? <FiLoader className="spin" /> : <FiRefreshCw />}
                              </button>
                            ) : null}
                            {item.status === 'pending' ? (
                              <button className="icon-button" title="Xóa" disabled={Boolean(actionId)} onClick={() => deletePendingItem(item.id)}>
                                {actionId === `delete-${item.id}` ? <FiLoader className="spin" /> : <FiX />}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .queue-layout { display:grid; grid-template-columns:minmax(340px, 0.85fr) minmax(520px, 1.45fr); gap:24px; }
        .scheduler-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-top:20px; }
        .scheduler-grid div { display:flex; flex-direction:column; gap:4px; padding:12px; border-radius:8px; background:rgba(255,255,255,.04); }
        .scheduler-grid span, small { color:rgba(255,255,255,.5); font-size:12px; }
        .scheduler-grid strong { font-size:14px; }
        .check-row { display:flex; gap:8px; align-items:center; color:rgba(255,255,255,.8); cursor:pointer; }
        .check-row input { accent-color:var(--color-gold); }
        .schedule-preview { display:flex; flex-direction:column; gap:8px; padding:14px; background:rgba(255,255,255,.04); border-radius:8px; }
        .schedule-preview div { display:flex; flex-direction:column; gap:2px; }
        .queue-card { min-width:0; }
        .queue-table { font-size:13px; }
        .queue-table td { vertical-align:top; min-width:120px; }
        .queue-table td:first-child { min-width:220px; }
        .queue-table td small { display:block; margin-top:5px; }
        .status-pill { display:inline-flex; align-items:center; gap:5px; border:1px solid; border-radius:14px; padding:4px 8px; white-space:nowrap; }
        .icon-button { border:0; background:transparent; color:rgba(255,255,255,.65); cursor:pointer; padding:6px; }
        .icon-button:disabled { opacity:.4; cursor:not-allowed; }
        .empty-state { min-height:260px; display:flex; align-items:center; justify-content:center; gap:8px; color:rgba(255,255,255,.45); }
        .spin { animation:spin 1s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @media (max-width:1100px) { .queue-layout { grid-template-columns:1fr; } }
      `}</style>
    </>
  );
}
