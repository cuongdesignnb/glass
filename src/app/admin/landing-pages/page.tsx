'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useToken } from '@/lib/useToken';
import MediaPicker from '@/components/admin/MediaPicker';
import {
  FiPlus, FiTrash2, FiEdit2, FiSave, FiX, FiCheck, FiCopy,
  FiArrowUp, FiArrowDown, FiImage, FiExternalLink,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const SHOP_ORIGIN = 'https://shop.mitoo.vn';

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

// ISO -> value for <input type="datetime-local"> in the browser's timezone.
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type Benefit = { title: string; text: string };
type Testimonial = { name: string; text: string; rating: number; variant?: string; images?: string[] };
type Faq = { question: string; answer: string };

const emptyForm = {
  title: '',
  slug: '',
  headline: '',
  subheadline: '',
  hero_image: '',
  cta_text: 'Đặt hàng ngay',
  promo_text: '',
  promo_ends_at: '',
  benefits: [] as Benefit[],
  testimonials: [] as Testimonial[],
  faqs: [] as Faq[],
  fb_pixel_id: '',
  tiktok_pixel_id: '',
  google_ads_id: '',
  is_active: false,
};

const sectionTitle: React.CSSProperties = {
  fontSize: '0.9375rem', fontWeight: 700, color: '#fff', margin: '8px 0 4px',
};
const hint: React.CSSProperties = {
  fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px',
};
const rowBox: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px',
  display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px',
};

export default function AdminLandingPagesPage() {
  const { token } = useToken();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showReviewMedia, setShowReviewMedia] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);

  // Product picker (ordered list)
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);

  useEffect(() => { if (token) load(); }, [token]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await adminApi.getLandingPages(token);
      setPages(Array.isArray(res) ? res : (res?.data || []));
    } catch {
      toast.error('Lỗi khi tải danh sách landing page');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || productSearch.trim().length < 2) {
      setProductResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await adminApi.getProducts(token, { search: productSearch, per_page: '10' });
        const data = res?.data || res || [];
        setProductResults(Array.isArray(data) ? data : []);
      } catch { setProductResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch, token]);

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setForm(emptyForm);
    setSelectedProducts([]);
    setProductSearch('');
    setProductResults([]);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = async (row: any) => {
    if (!token) return;
    try {
      const p = await adminApi.getLandingPage(token, row.id);
      setEditingId(p.id);
      setForm({
        title: p.title || '',
        slug: p.slug || '',
        headline: p.headline || '',
        subheadline: p.subheadline || '',
        hero_image: p.hero_image || '',
        cta_text: p.cta_text || '',
        promo_text: p.promo_text || '',
        promo_ends_at: toLocalInput(p.promo_ends_at),
        benefits: p.benefits || [],
        testimonials: (p.testimonials || []).map((t: any) => ({ ...t, rating: t.rating || 5 })),
        faqs: p.faqs || [],
        fb_pixel_id: p.fb_pixel_id || '',
        tiktok_pixel_id: p.tiktok_pixel_id || '',
        google_ads_id: p.google_ads_id || '',
        is_active: !!p.is_active,
      });
      setSelectedProducts(p.products || []);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error('Không tải được landing page');
    }
  };

  const handleSave = async () => {
    if (!token) return;
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề');
      return;
    }
    setSaving(true);
    const tid = toast.loading('Đang lưu...');
    try {
      const payload: any = {
        ...form,
        promo_ends_at: form.promo_ends_at ? new Date(form.promo_ends_at).toISOString() : null,
        product_ids: selectedProducts.map((p) => p.id),
      };
      if (editingId) await adminApi.updateLandingPage(token, editingId, payload);
      else await adminApi.createLandingPage(token, payload);
      toast.success(editingId ? 'Đã cập nhật' : 'Đã tạo landing page', { id: tid });
      resetForm();
      load();
    } catch (err: any) {
      toast.error('Lỗi: ' + (err.message || 'không lưu được'), { id: tid });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: any) => {
    if (!token || !confirm(`Xóa landing page "${row.title}"? Không thể hoàn tác.`)) return;
    try {
      await adminApi.deleteLandingPage(token, row.id);
      toast.success('Đã xóa');
      load();
    } catch {
      toast.error('Lỗi khi xóa');
    }
  };

  const toggleActive = async (row: any) => {
    if (!token) return;
    try {
      await adminApi.updateLandingPage(token, row.id, { is_active: !row.is_active });
      toast.success(row.is_active ? 'Đã tắt landing page' : 'Đã bật landing page');
      load();
    } catch {
      toast.error('Lỗi khi đổi trạng thái');
    }
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${SHOP_ORIGIN}/${slug}`);
    toast.success('Đã copy link');
  };

  // ----- product list helpers -----
  const addProduct = (p: any) => {
    if (selectedProducts.some((x) => x.id === p.id)) return;
    if (selectedProducts.length >= 60) {
      toast.error('Tối đa 60 sản phẩm');
      return;
    }
    setSelectedProducts([...selectedProducts, p]);
    setProductSearch('');
    setProductResults([]);
  };
  const removeProduct = (id: number) =>
    setSelectedProducts(selectedProducts.filter((p) => p.id !== id));
  const moveProduct = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= selectedProducts.length) return;
    const next = [...selectedProducts];
    [next[i], next[j]] = [next[j], next[i]];
    setSelectedProducts(next);
  };

  // ----- generic list helpers -----
  const updateItem = <K extends 'benefits' | 'testimonials' | 'faqs'>(key: K, i: number, patch: any) =>
    setForm({ ...form, [key]: (form[key] as any[]).map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  const removeItem = (key: 'benefits' | 'testimonials' | 'faqs', i: number) =>
    setForm({ ...form, [key]: (form[key] as any[]).filter((_, idx) => idx !== i) });

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Landing Page Bán Hàng</h1>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={openNew}>
            <FiPlus /> Tạo Landing Page
          </button>
        </div>
      </div>

      <div className="admin-content">
        {showForm && (
          <div className="admin-card" style={{ marginBottom: '24px' }}>
            <div className="admin-card__header">
              <h3 className="admin-card__title">{editingId ? 'Sửa Landing Page' : 'Tạo Landing Page Mới'}</h3>
              <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={resetForm}><FiX /> Đóng</button>
            </div>

            <div className="admin-form">
              {/* Basics */}
              <div className="admin-form__row">
                <div className="admin-form__group" style={{ flex: 2 }}>
                  <label className="admin-form__label">Tiêu đề (nội bộ) *</label>
                  <input className="admin-form__input" value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="VD: Kính mát mùa hè 2026" />
                </div>
                <div className="admin-form__group" style={{ flex: 1 }}>
                  <label className="admin-form__label">Đường dẫn (slug)</label>
                  <input className="admin-form__input" value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                    placeholder="để trống = tự tạo từ tiêu đề" />
                  <span style={hint}>Link: {SHOP_ORIGIN}/{form.slug || '...'}</span>
                </div>
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">Tiêu đề lớn (headline)</label>
                <input className="admin-form__input" value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  placeholder="VD: Kính mát chính hãng, giảm đến 40%" />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">Mô tả ngắn</label>
                <textarea className="admin-form__input" rows={2} value={form.subheadline}
                  onChange={(e) => setForm({ ...form, subheadline: e.target.value })}
                  placeholder="1–2 câu dưới tiêu đề" />
              </div>

              <div className="admin-form__row">
                <div className="admin-form__group" style={{ flex: 2 }}>
                  <label className="admin-form__label">Ảnh đầu trang (hero)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input className="admin-form__input" style={{ flex: 1 }} value={form.hero_image}
                      onChange={(e) => setForm({ ...form, hero_image: e.target.value })}
                      placeholder="URL ảnh hoặc chọn từ thư viện" />
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm"
                      onClick={() => setShowMedia(true)}><FiImage /> Chọn ảnh</button>
                  </div>
                  {form.hero_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.hero_image} alt="" style={{ marginTop: '8px', maxHeight: '120px', borderRadius: '8px' }} />
                  )}
                </div>
                <div className="admin-form__group" style={{ flex: 1 }}>
                  <label className="admin-form__label">Chữ trên nút đặt hàng</label>
                  <input className="admin-form__input" value={form.cta_text}
                    onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
                </div>
              </div>

              {/* Promo */}
              <div className="admin-form__row">
                <div className="admin-form__group" style={{ flex: 2 }}>
                  <label className="admin-form__label">Thông điệp ưu đãi</label>
                  <input className="admin-form__input" value={form.promo_text}
                    onChange={(e) => setForm({ ...form, promo_text: e.target.value })}
                    placeholder="VD: Freeship đơn từ 500K – tặng hộp kính cao cấp" />
                </div>
                <div className="admin-form__group" style={{ flex: 1 }}>
                  <label className="admin-form__label">Đếm ngược đến</label>
                  <input type="datetime-local" className="admin-form__input" value={form.promo_ends_at}
                    onChange={(e) => setForm({ ...form, promo_ends_at: e.target.value })} />
                  <span style={hint}>Để trống = không hiện đồng hồ đếm ngược</span>
                </div>
              </div>

              {/* Products */}
              <div className="admin-form__group">
                <div style={sectionTitle}>Sản phẩm bán trên trang ({selectedProducts.length})</div>
                <span style={hint}>
                  Giá luôn lấy trực tiếp từ sản phẩm, đổi giá ở trang Sản Phẩm là landing page đổi theo. Thứ tự bên dưới là thứ tự hiển thị.
                </span>
                <div style={{ position: 'relative', marginTop: '8px' }}>
                  <input className="admin-form__input" value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Tìm sản phẩm theo tên để thêm..." />
                  {productResults.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      background: '#1a1a3a', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px', maxHeight: '240px', overflowY: 'auto',
                    }}>
                      {productResults.map((p) => (
                        <div key={p.id} onClick={() => addProduct(p)}
                          style={{
                            padding: '10px 16px', cursor: 'pointer', display: 'flex',
                            justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)',
                            opacity: selectedProducts.some((x) => x.id === p.id) ? 0.4 : 1,
                          }}>
                          <span style={{ color: '#fff' }}>{p.name}</span>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>
                            {formatVND(Number(p.sale_price) > 0 ? p.sale_price : p.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ marginTop: '10px' }}>
                  {selectedProducts.map((p, i) => (
                    <div key={p.id} style={{ ...rowBox, flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)', width: '20px' }}>{i + 1}</span>
                      {p.thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnail} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                      )}
                      <span style={{ flex: 1, color: '#fff' }}>
                        {p.name}
                        {p.is_active === false && (
                          <span style={{ color: '#f87171', fontSize: '0.75rem', marginLeft: '8px' }}>
                            (đang ẩn, sẽ không hiện trên trang)
                          </span>
                        )}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem' }}>
                        {formatVND(Number(p.sale_price) > 0 ? p.sale_price : p.price)}
                      </span>
                      <button type="button" className="admin-table__action" onClick={() => moveProduct(i, -1)} title="Lên"><FiArrowUp /></button>
                      <button type="button" className="admin-table__action" onClick={() => moveProduct(i, 1)} title="Xuống"><FiArrowDown /></button>
                      <button type="button" className="admin-table__action admin-table__action--danger" onClick={() => removeProduct(p.id)} title="Bỏ"><FiTrash2 /></button>
                    </div>
                  ))}
                  {selectedProducts.length === 0 && (
                    <div style={hint}>Chưa chọn sản phẩm nào.</div>
                  )}
                </div>
              </div>

              {/* Benefits */}
              <div className="admin-form__group">
                <div style={sectionTitle}>Điểm nổi bật / cam kết ({form.benefits.length}/8)</div>
                {form.benefits.map((b, i) => (
                  <div key={i} style={rowBox}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input className="admin-form__input" style={{ flex: 1 }} value={b.title}
                        onChange={(e) => updateItem('benefits', i, { title: e.target.value })}
                        placeholder="VD: Chính hãng 100%" />
                      <button type="button" className="admin-table__action admin-table__action--danger" onClick={() => removeItem('benefits', i)}><FiTrash2 /></button>
                    </div>
                    <input className="admin-form__input" value={b.text}
                      onChange={(e) => updateItem('benefits', i, { text: e.target.value })}
                      placeholder="Mô tả ngắn (không bắt buộc)" />
                  </div>
                ))}
                {form.benefits.length < 8 && (
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() => setForm({ ...form, benefits: [...form.benefits, { title: '', text: '' }] })}>
                    <FiPlus /> Thêm điểm nổi bật
                  </button>
                )}
              </div>

              {/* Testimonials */}
              <div className="admin-form__group">
                <div style={sectionTitle}>Đánh giá khách hàng ({form.testimonials.length}/30)</div>
                {form.testimonials.map((t, i) => (
                  <div key={i} style={rowBox}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input className="admin-form__input" style={{ flex: 1 }} value={t.name}
                        onChange={(e) => updateItem('testimonials', i, { name: e.target.value })}
                        placeholder="Tên khách" />
                      <select className="admin-form__input" style={{ width: '110px' }} value={t.rating}
                        onChange={(e) => updateItem('testimonials', i, { rating: Number(e.target.value) })}>
                        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
                      </select>
                      <button type="button" className="admin-table__action admin-table__action--danger" onClick={() => removeItem('testimonials', i)}><FiTrash2 /></button>
                    </div>
                    <textarea className="admin-form__input" rows={2} value={t.text}
                      onChange={(e) => updateItem('testimonials', i, { text: e.target.value })}
                      placeholder="Nội dung đánh giá" />
                    <input className="admin-form__input" value={t.variant || ''}
                      onChange={(e) => updateItem('testimonials', i, { variant: e.target.value })}
                      placeholder="Khách đã mua (VD: Gọng TR1264, 1 cái) - không bắt buộc" />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {(t.images || []).map((src, k) => (
                        <div key={k} style={{ position: 'relative' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px' }} />
                          <button type="button" title="Bỏ ảnh"
                            onClick={() => updateItem('testimonials', i, { images: (t.images || []).filter((_, x) => x !== k) })}
                            style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', border: 0, background: '#ef4444', color: '#fff', fontSize: '11px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                      {(t.images || []).length < 4 && (
                        <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm"
                          onClick={() => { setReviewIdx(i); setShowReviewMedia(true); }}>
                          <FiImage /> Ảnh khách gửi
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {form.testimonials.length < 30 && (
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() => setForm({ ...form, testimonials: [...form.testimonials, { name: '', text: '', rating: 5 }] })}>
                    <FiPlus /> Thêm đánh giá
                  </button>
                )}
                <span style={hint}>Chỉ nhập đánh giá và ảnh có thật từ khách của bạn (nên lưu lại tin nhắn gốc làm bằng chứng).</span>
              </div>

              {/* FAQ */}
              <div className="admin-form__group">
                <div style={sectionTitle}>Câu hỏi thường gặp ({form.faqs.length}/12)</div>
                {form.faqs.map((f, i) => (
                  <div key={i} style={rowBox}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input className="admin-form__input" style={{ flex: 1 }} value={f.question}
                        onChange={(e) => updateItem('faqs', i, { question: e.target.value })}
                        placeholder="Câu hỏi" />
                      <button type="button" className="admin-table__action admin-table__action--danger" onClick={() => removeItem('faqs', i)}><FiTrash2 /></button>
                    </div>
                    <textarea className="admin-form__input" rows={2} value={f.answer}
                      onChange={(e) => updateItem('faqs', i, { answer: e.target.value })}
                      placeholder="Trả lời" />
                  </div>
                ))}
                {form.faqs.length < 12 && (
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() => setForm({ ...form, faqs: [...form.faqs, { question: '', answer: '' }] })}>
                    <FiPlus /> Thêm câu hỏi
                  </button>
                )}
              </div>

              {/* Pixels */}
              <div className="admin-form__group">
                <div style={sectionTitle}>Mã theo dõi quảng cáo (Pixel)</div>
                <div className="admin-form__row">
                  <div className="admin-form__group">
                    <label className="admin-form__label">Facebook Pixel ID</label>
                    <input className="admin-form__input" value={form.fb_pixel_id}
                      onChange={(e) => setForm({ ...form, fb_pixel_id: e.target.value.trim() })}
                      placeholder="VD: 1234567890123456" />
                    <span style={hint}>Chỉ gồm chữ số</span>
                  </div>
                  <div className="admin-form__group">
                    <label className="admin-form__label">TikTok Pixel ID</label>
                    <input className="admin-form__input" value={form.tiktok_pixel_id}
                      onChange={(e) => setForm({ ...form, tiktok_pixel_id: e.target.value.trim() })}
                      placeholder="VD: C1A2B3D4E5F6" />
                  </div>
                  <div className="admin-form__group">
                    <label className="admin-form__label">Google Ads ID</label>
                    <input className="admin-form__input" value={form.google_ads_id}
                      onChange={(e) => setForm({ ...form, google_ads_id: e.target.value.trim() })}
                      placeholder="VD: AW-123456789" />
                    <span style={hint}>Bắt đầu bằng AW- hoặc G-</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="admin-form__group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                  <input type="checkbox" checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    style={{ accentColor: 'var(--color-gold)' }} />
                  {form.is_active ? 'Đang bật (khách vào được link)' : 'Đang tắt (khách vào link sẽ thấy 404)'}
                </label>
              </div>

              <button className="admin-btn admin-btn--primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
                <FiSave /> {editingId ? 'Cập Nhật' : 'Tạo Landing Page'}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Landing page</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Sản phẩm</th>
                <th style={{ width: '140px' }}>Đếm ngược</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '150px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</td></tr>
              ) : pages.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                  Chưa có landing page nào. Nhấn "Tạo Landing Page" để bắt đầu.
                </td></tr>
              ) : pages.map((p, idx) => (
                <tr key={p.id}>
                  <td style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{p.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <code style={{ fontSize: '0.8125rem', color: 'var(--color-gold)' }}>
                        {SHOP_ORIGIN.replace('https://', '')}/{p.slug}
                      </code>
                      <FiCopy style={{ cursor: 'pointer', opacity: 0.4, fontSize: '0.75rem' }} onClick={() => copyLink(p.slug)} />
                      <a href={`${SHOP_ORIGIN}/${p.slug}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', opacity: 0.4 }}>
                        <FiExternalLink style={{ fontSize: '0.75rem' }} />
                      </a>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#fff' }}>{p.products_count ?? 0}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
                    {p.promo_ends_at ? new Date(p.promo_ends_at).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" onClick={() => toggleActive(p)}
                      className={`admin-badge ${p.is_active ? 'admin-badge--success' : 'admin-badge--danger'}`}
                      style={{ cursor: 'pointer', border: 'none' }} title="Bấm để bật/tắt">
                      {p.is_active ? <FiCheck /> : <FiX />} {p.is_active ? 'Đang bật' : 'Đang tắt'}
                    </button>
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <button className="admin-table__action" onClick={() => handleEdit(p)} title="Sửa"><FiEdit2 /></button>
                      <button className="admin-table__action admin-table__action--danger" onClick={() => handleDelete(p)} title="Xóa"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <MediaPicker
        isOpen={showReviewMedia}
        multiple
        onClose={() => setShowReviewMedia(false)}
        onSelect={() => setShowReviewMedia(false)}
        onSelectMultiple={(urls) => {
          setForm((f) => ({
            ...f,
            testimonials: f.testimonials.map((t, i) =>
              i === reviewIdx ? { ...t, images: [...(t.images || []), ...urls].slice(0, 4) } : t),
          }));
          setShowReviewMedia(false);
        }}
        uploadFolder="landing-reviews"
      />
      <MediaPicker
        isOpen={showMedia}
        onClose={() => setShowMedia(false)}
        onSelect={(url) => { setForm((f) => ({ ...f, hero_image: url })); setShowMedia(false); }}
        uploadFolder="landing"
      />
    </>
  );
}
