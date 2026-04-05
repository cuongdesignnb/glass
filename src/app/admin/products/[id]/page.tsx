'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAdminCategories, invalidateAdmin } from '@/lib/useAdmin';
import { useToken } from '@/lib/useToken';
import { GENDERS, FACE_SHAPES, FRAME_STYLES, MATERIALS, COLORS } from '@/lib/constants';
import { FiSave, FiArrowLeft, FiImage, FiX, FiPlus, FiTrash2, FiLink } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import MediaPicker from '@/components/admin/MediaPicker';
import toast from 'react-hot-toast';

const RichEditor = dynamic(() => import('@/components/admin/RichEditor'), { ssr: false });

export default function ProductFormPage() {
  const router = useRouter();
  const params = useParams();
  const isEdit = params?.id && params.id !== 'new';
  const { token } = useToken();

  const { data: categoriesData } = useAdminCategories(token);
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!isEdit);
  const [activeTab, setActiveTab] = useState('basic');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'thumbnail' | 'gallery' | 'og_image' | 'editor'>('thumbnail');
  const [editorInsertFn, setEditorInsertFn] = useState<((url: string) => void) | null>(null);

  const [form, setForm] = useState({
    name: '', sku: '', description: '', content: '',
    price: '', sale_price: '', category_id: '',
    gender: 'unisex', brand: '',
    colors: [] as string[], color_names: [] as string[],
    face_shapes: [] as string[], frame_styles: [] as string[], materials: [] as string[],
    images: [] as string[], thumbnail: '',
    weight: '', frame_width: '', lens_width: '', lens_height: '', bridge_width: '', temple_length: '',
    meta_title: '', meta_desc: '', meta_keywords: '', og_image: '',
    is_active: true, is_featured: false, is_new: false, stock: '0',
    faqs: [] as { question: string, answer: string, is_active: boolean }[],
    addon_group_ids: [] as number[],
    addon_prices: {} as Record<number, { additional_price: string; is_available: boolean }>,
  });

  const [allAddonGroups, setAllAddonGroups] = useState<any[]>([]);
  const [productConstraints, setProductConstraints] = useState<{ option_id: number; blocked_option_id: number }[]>([]);
  const [globalConstraints, setGlobalConstraints] = useState<{ option_id: number; blocked_option_id: number }[]>([]);
  const [showConstraintEditor, setShowConstraintEditor] = useState(false);
  const [constraintSource, setConstraintSource] = useState<number | null>(null);

  useEffect(() => {
    if (isEdit && token) {
      loadProduct();
    }
    if (token) {
      adminApi.getAddonGroups(token).then((data: any) => {
        const groups = Array.isArray(data) ? data : (data?.groups || []);
        setAllAddonGroups(groups);
        const gc = Array.isArray(data) ? [] : (data?.constraints || []);
        setGlobalConstraints(gc);
      }).catch(() => {});
    }
  }, [isEdit, token]);

  const loadProduct = async () => {
    try {
      const product = await adminApi.getProduct(token!, Number(params?.id));
      if (product) {
        setForm({
          name: product.name || '', sku: product.sku || '',
          description: product.description || '', content: product.content || '',
          price: String(product.price || ''), sale_price: product.sale_price ? String(product.sale_price) : '',
          category_id: product.category_id ? String(product.category_id) : '',
          gender: product.gender || 'unisex', brand: product.brand || '',
          colors: product.colors || [], color_names: product.color_names || [],
          face_shapes: product.face_shapes || [], frame_styles: product.frame_styles || [],
          materials: product.materials || [],
          images: product.images || [], thumbnail: product.thumbnail || '',
          weight: product.weight || '', frame_width: product.frame_width || '',
          lens_width: product.lens_width || '', lens_height: product.lens_height || '',
          bridge_width: product.bridge_width || '', temple_length: product.temple_length || '',
          meta_title: product.meta_title || '', meta_desc: product.meta_desc || '',
          meta_keywords: product.meta_keywords || '', og_image: product.og_image || '',
          is_active: product.is_active ?? true, is_featured: product.is_featured ?? false,
          is_new: product.is_new ?? false, stock: String(product.stock || 0),
          faqs: product.faqs || [],
          addon_group_ids: (product.addon_groups || []).map((g: any) => g.id),
          addon_prices: (product.addon_prices || []).reduce((acc: any, p: any) => {
            acc[p.option_id] = { additional_price: String(p.additional_price || 0), is_available: p.is_available ?? true };
            return acc;
          }, {}),
        });
        // Load per-product constraints
        setProductConstraints(product.addon_constraints || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!token || !form.name || !form.price) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        category_id: form.category_id ? Number(form.category_id) : null,
        stock: Number(form.stock),
        addon_groups: form.addon_group_ids,
        addon_prices: Object.entries(form.addon_prices).map(([optionId, data]) => ({
          option_id: Number(optionId),
          additional_price: Number(data.additional_price || 0),
          is_available: data.is_available,
        })),
      };

      const savingToast = toast.loading('Đang lưu sản phẩm...');
      if (isEdit) {
        await adminApi.updateProduct(token, Number(params?.id), payload);
      } else {
        await adminApi.createProduct(token, payload);
      }
      toast.success('Lưu hoàn tất!', { id: savingToast });
      invalidateAdmin('/admin/products');
      router.push('/admin/products');
    } catch (err: any) { 
      toast.error('Lỗi: ' + (err.message || 'Không thể lưu sản phẩm')); 
    }
    finally { setSaving(false); }
  };

  const toggleArray = (arr: string[], value: string): string[] => {
    return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
  };

  const toggleColorWithName = (colorValue: string, colorName: string) => {
    if (form.colors.includes(colorValue)) {
      const idx = form.colors.indexOf(colorValue);
      setForm(f => ({
        ...f,
        colors: f.colors.filter((_, i) => i !== idx),
        color_names: f.color_names.filter((_, i) => i !== idx),
      }));
    } else {
      setForm(f => ({
        ...f,
        colors: [...f.colors, colorValue],
        color_names: [...f.color_names, colorName],
      }));
    }
  };

  const tabs = [
    { id: 'basic', label: 'Thông tin cơ bản' },
    { id: 'filters', label: 'Bộ lọc & Thuộc tính' },
    { id: 'specs', label: 'Thông số kỹ thuật' },
    { id: 'media', label: 'Hình ảnh' },
    { id: 'seo', label: 'SEO' },
    { id: 'faq', label: 'FAQ (Chi tiết)' },
    { id: 'addons', label: 'Biến thể / Tùy chọn' },
  ];

  if (loading) {
    return (
      <>
        <div className="admin-topbar"><h1 className="admin-topbar__title">Đang tải...</h1></div>
        <div className="admin-content"><div className="skeleton" style={{ height: '400px', borderRadius: '12px' }} /></div>
      </>
    );
  }

  return (
    <>
      <div className="admin-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/admin/products')}
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.25rem' }}><FiArrowLeft /></button>
          <h1 className="admin-topbar__title">{isEdit ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h1>
        </div>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--primary" onClick={handleSave} disabled={saving}>
            <FiSave /> {saving ? 'Đang lưu...' : 'Lưu Sản Phẩm'}
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', borderRadius: '8px 8px 0 0', fontSize: '0.875rem', fontWeight: 600,
                background: activeTab === tab.id ? 'rgba(201,169,110,0.12)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-gold)' : 'rgba(255,255,255,0.5)',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-gold)' : '2px solid transparent',
                transition: 'all 0.2s',
              }}>{tab.label}</button>
          ))}
        </div>

        <div className="admin-card" style={{ minHeight: '400px' }}>
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">Tên sản phẩm *</label>
                <input className="admin-form__input" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ví dụ: Aviator Classic Gold" />
              </div>
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Giá gốc (VNĐ) *</label>
                  <input type="number" className="admin-form__input" value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })} placeholder="2500000" />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Giá khuyến mãi (VNĐ)</label>
                  <input type="number" className="admin-form__input" value={form.sale_price}
                    onChange={e => setForm({ ...form, sale_price: e.target.value })} placeholder="1990000" />
                </div>
              </div>
              <div className="admin-form__row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                <div className="admin-form__group">
                  <label className="admin-form__label">SKU</label>
                  <input className="admin-form__input" value={form.sku}
                    onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="GLS-001" />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Danh mục</label>
                  <select className="admin-form__input" value={form.category_id}
                    onChange={e => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Thương hiệu</label>
                  <input className="admin-form__input" value={form.brand}
                    onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Glass Premium" />
                </div>
              </div>
              <div className="admin-form__row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                <div className="admin-form__group">
                  <label className="admin-form__label">Tồn kho</label>
                  <input type="number" className="admin-form__input" value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="50" />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">&nbsp;</label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                        style={{ accentColor: 'var(--color-gold)' }} /> Hiển thị
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })}
                        style={{ accentColor: 'var(--color-gold)' }} /> Nổi bật
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={form.is_new} onChange={e => setForm({ ...form, is_new: e.target.checked })}
                        style={{ accentColor: 'var(--color-gold)' }} /> Mới
                    </label>
                  </div>
                </div>
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">Mô tả ngắn</label>
                <textarea className="admin-form__input" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả ngắn gọn về sản phẩm..." rows={3} />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">Nội dung chi tiết</label>
                <RichEditor
                  content={form.content}
                  onChange={(html: string) => setForm(prev => ({ ...prev, content: html }))}
                  placeholder="Viết mô tả chi tiết sản phẩm..."
                  onMediaPick={(insertFn) => { 
                    setEditorInsertFn(() => insertFn);
                    setMediaPickerTarget('editor'); 
                    setShowMediaPicker(true); 
                  }}
                />
              </div>
            </div>
          )}

          {/* Filters Tab */}
          {activeTab === 'filters' && (
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">Giới tính</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {GENDERS.map(g => (
                    <button key={g.value} onClick={() => setForm({ ...form, gender: g.value })}
                      className={`admin-btn admin-btn--sm ${form.gender === g.value ? 'admin-btn--primary' : 'admin-btn--secondary'}`}>{g.label}</button>
                  ))}
                </div>
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">Màu sắc</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {COLORS.map(c => (
                    <button key={c.value} onClick={() => toggleColorWithName(c.value, c.name)}
                      style={{
                        width: '40px', height: '40px', borderRadius: '8px', border: '2px solid',
                        borderColor: form.colors.includes(c.value) ? 'var(--color-gold)' : 'rgba(255,255,255,0.12)',
                        backgroundColor: c.value === 'transparent' ? undefined : c.value,
                        position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: form.colors.includes(c.value) ? '0 0 0 2px rgba(201,169,110,0.3)' : 'none',
                      }} title={c.name}>
                      {form.colors.includes(c.value) && (
                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textShadow: '0 0 3px rgba(0,0,0,0.8)', fontWeight: 700, fontSize: '0.75rem' }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
                {form.color_names.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
                    Đã chọn: {form.color_names.join(', ')}
                  </div>
                )}
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">Khuôn mặt phù hợp</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {FACE_SHAPES.map(f => (
                    <button key={f.value}
                      onClick={() => setForm({ ...form, face_shapes: toggleArray(form.face_shapes, f.value) })}
                      className={`admin-btn admin-btn--sm ${form.face_shapes.includes(f.value) ? 'admin-btn--primary' : 'admin-btn--secondary'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">Kiểu gọng</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {FRAME_STYLES.map(f => (
                    <button key={f.value}
                      onClick={() => setForm({ ...form, frame_styles: toggleArray(form.frame_styles, f.value) })}
                      className={`admin-btn admin-btn--sm ${form.frame_styles.includes(f.value) ? 'admin-btn--primary' : 'admin-btn--secondary'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">Chất liệu</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {MATERIALS.map(m => (
                    <button key={m.value}
                      onClick={() => setForm({ ...form, materials: toggleArray(form.materials, m.value) })}
                      className={`admin-btn admin-btn--sm ${form.materials.includes(m.value) ? 'admin-btn--primary' : 'admin-btn--secondary'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Specs Tab */}
          {activeTab === 'specs' && (
            <div className="admin-form">
              <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '16px', fontSize: '0.875rem' }}>
                Nhập thông số kỹ thuật của gọng kính (đơn vị: mm)
              </p>
              <div className="admin-form__row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                {[
                  { key: 'weight', label: 'Trọng lượng (g)', placeholder: '25' },
                  { key: 'frame_width', label: 'Chiều rộng gọng', placeholder: '140' },
                  { key: 'lens_width', label: 'Chiều rộng tròng', placeholder: '52' },
                  { key: 'lens_height', label: 'Chiều cao tròng', placeholder: '42' },
                  { key: 'bridge_width', label: 'Chiều rộng cầu', placeholder: '18' },
                  { key: 'temple_length', label: 'Chiều dài càng', placeholder: '145' },
                ].map(spec => (
                  <div key={spec.key} className="admin-form__group">
                    <label className="admin-form__label">{spec.label}</label>
                    <input className="admin-form__input" value={(form as any)[spec.key]}
                      onChange={e => setForm({ ...form, [spec.key]: e.target.value })} placeholder={spec.placeholder} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">Ảnh đại diện (Thumbnail)</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button type="button" className="admin-btn admin-btn--secondary"
                    onClick={() => { setMediaPickerTarget('thumbnail'); setShowMediaPicker(true); }}>
                    <FiImage /> Chọn từ Media Library
                  </button>
                  {form.thumbnail && <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>{form.thumbnail}</span>}
                </div>
                {form.thumbnail && (
                  <div style={{ marginTop: '12px', position: 'relative', width: '200px' }}>
                    <img src={form.thumbnail.startsWith('http') ? form.thumbnail : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${form.thumbnail}`}
                      alt="" style={{ width: '200px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <button onClick={() => setForm({ ...form, thumbnail: '' })}
                      style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiX style={{ fontSize: '0.75rem' }} />
                    </button>
                  </div>
                )}
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">Gallery ảnh</label>
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm"
                  onClick={() => { setMediaPickerTarget('gallery'); setShowMediaPicker(true); }}>
                  <FiPlus /> Thêm ảnh từ Media Library
                </button>
                {form.images.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginTop: '12px' }}>
                    {form.images.map((url, i) => (
                      <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${url}`}
                          alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                          style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FiX style={{ fontSize: '0.625rem' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">Meta Title</label>
                <input className="admin-form__input" value={form.meta_title}
                  onChange={e => setForm({ ...form, meta_title: e.target.value })} placeholder="Tên sản phẩm - Glass Eyewear" />
                <span style={{ fontSize: '0.75rem', color: form.meta_title.length > 60 ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                  {form.meta_title.length}/60 ký tự
                </span>
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">Meta Description</label>
                <textarea className="admin-form__input" value={form.meta_desc}
                  onChange={e => setForm({ ...form, meta_desc: e.target.value })} placeholder="Mô tả ngắn cho SEO..." rows={3} />
                <span style={{ fontSize: '0.75rem', color: form.meta_desc.length > 160 ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                  {form.meta_desc.length}/160 ký tự
                </span>
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">Meta Keywords</label>
                <input className="admin-form__input" value={form.meta_keywords}
                  onChange={e => setForm({ ...form, meta_keywords: e.target.value })} placeholder="kính mắt, aviator, thời trang" />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">OG Image</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() => { setMediaPickerTarget('og_image'); setShowMediaPicker(true); }}>
                    <FiImage /> Chọn ảnh
                  </button>
                  {form.og_image && <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>{form.og_image}</span>}
                </div>
              </div>

              {/* SEO Preview */}
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', marginTop: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Xem trước trên Google:</div>
                <div style={{ fontSize: '1.125rem', color: '#8ab4f8', marginBottom: '4px' }}>
                  {form.meta_title || form.name || 'Tiêu đề sản phẩm'} - Glass Eyewear
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#bdc1c6' }}>
                  glass.vn › san-pham › {form.name ? form.name.toLowerCase().replace(/\s+/g, '-') : 'slug'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#9aa0a6', marginTop: '4px' }}>
                  {form.meta_desc || form.description || 'Mô tả sản phẩm sẽ hiện ở đây...'}
                </div>
              </div>
            </div>
          )}

          {/* FAQ Tab */}
          {activeTab === 'faq' && (
            <div className="admin-form">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', margin: 0 }}>
                  Thêm các câu hỏi thường gặp dành riêng cho sản phẩm này.
                </p>
                <button type="button" className="admin-btn admin-btn--sm admin-btn--secondary"
                  onClick={() => setForm(f => ({ ...f, faqs: [...f.faqs, { question: '', answer: '', is_active: true }] }))}>
                  <FiPlus /> Thêm câu hỏi
                </button>
              </div>

              {form.faqs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', color: 'rgba(255,255,255,0.3)' }}>
                  Sản phẩm chưa có câu hỏi thường gặp nào.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {form.faqs.map((faq, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-gold)' }}>Câu hỏi {idx + 1}</div>
                        <button type="button" onClick={() => setForm(f => ({ ...f, faqs: f.faqs.filter((_, i) => i !== idx) }))}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <FiTrash2 />
                        </button>
                      </div>
                      <div className="admin-form__group">
                        <input className="admin-form__input" placeholder="Nhập câu hỏi..." value={faq.question}
                          onChange={(e) => {
                            const newFaqs = [...form.faqs];
                            newFaqs[idx].question = e.target.value;
                            setForm(f => ({ ...f, faqs: newFaqs }));
                          }} />
                      </div>
                      <div className="admin-form__group" style={{ marginBottom: 0 }}>
                        <textarea className="admin-form__input" placeholder="Nhập câu trả lời..." value={faq.answer} rows={3}
                          onChange={(e) => {
                            const newFaqs = [...form.faqs];
                            newFaqs[idx].answer = e.target.value;
                            setForm(f => ({ ...f, faqs: newFaqs }));
                          }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ TAB: Addons ============ */}
          {activeTab === 'addons' && (
            <div className="admin-card">
              {/* Per-product Constraint Editor */}
              {isEdit && showConstraintEditor && form.addon_group_ids.length > 0 && (() => {
                const selectedGroups = allAddonGroups.filter(g => form.addon_group_ids.includes(g.id));
                const allOpts = selectedGroups.flatMap((g: any) => (g.options || []).map((o: any) => ({ ...o, groupName: g.name, groupId: g.id })));
                const isBlocked = (src: number, tgt: number) => productConstraints.some(c => c.option_id === src && c.blocked_option_id === tgt);
                const toggleC = (src: number, tgt: number) => {
                  if (src === tgt) return;
                  setProductConstraints(prev => {
                    const exists = prev.some(c => c.option_id === src && c.blocked_option_id === tgt);
                    return exists ? prev.filter(c => !(c.option_id === src && c.blocked_option_id === tgt)) : [...prev, { option_id: src, blocked_option_id: tgt }];
                  });
                };
                const handleSaveC = async () => {
                  try {
                    const t = toast.loading('Đang lưu ràng buộc...');
                    await adminApi.saveProductConstraints(token!, Number(params?.id), productConstraints);
                    toast.success('Đã lưu ràng buộc!', { id: t });
                  } catch (e: any) { toast.error('Lỗi: ' + (e.message || '')); }
                };
                return (
                  <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid rgba(201,169,110,0.3)', borderRadius: '12px', background: 'rgba(201,169,110,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiLink style={{ color: 'var(--color-gold)' }} /> Ràng buộc riêng cho sản phẩm này
                      </h4>
                      <button onClick={() => setShowConstraintEditor(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><FiX /></button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>
                      Chọn option bên trái → tick option bị <strong style={{ color: '#f87171' }}>khoá</strong> bên phải. Nếu để trống sẽ dùng ràng buộc mặc định ({globalConstraints.length} rules).
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-gold)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>Khi chọn:</div>
                        {selectedGroups.map((g: any) => (
                          <div key={g.id}>
                            <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)', padding: '4px 6px', fontWeight: 600 }}>{g.name}</div>
                            {(g.options || []).map((o: any) => {
                              const cnt = productConstraints.filter(c => c.option_id === o.id).length;
                              return (
                                <button key={o.id} onClick={() => setConstraintSource(o.id)} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left',
                                  padding: '6px 10px', borderRadius: '6px', fontSize: '0.8125rem', cursor: 'pointer', marginBottom: '2px',
                                  border: constraintSource === o.id ? '1px solid var(--color-gold)' : '1px solid rgba(255,255,255,0.06)',
                                  background: constraintSource === o.id ? 'rgba(201,169,110,0.1)' : 'rgba(255,255,255,0.02)',
                                  color: constraintSource === o.id ? '#fff' : 'rgba(255,255,255,0.7)',
                                }}>
                                  <span>{o.name}</span>
                                  {cnt > 0 && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '1px 6px', borderRadius: '99px', fontSize: '0.625rem', fontWeight: 600 }}>khoá {cnt}</span>}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6875rem', color: '#f87171', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>Sẽ bị khoá:</div>
                        {!constraintSource ? (
                          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', padding: '16px', textAlign: 'center' }}>← Chọn option</p>
                        ) : selectedGroups.map((g: any) => {
                          const srcOpt = allOpts.find(o => o.id === constraintSource);
                          if (srcOpt && g.id === srcOpt.groupId) return null;
                          const opts = (g.options || []).filter((o: any) => o.id !== constraintSource);
                          if (!opts.length) return null;
                          return (
                            <div key={g.id}>
                              <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)', padding: '4px 6px', fontWeight: 600 }}>{g.name}</div>
                              {opts.map((o: any) => {
                                const blocked = isBlocked(constraintSource, o.id);
                                return (
                                  <label key={o.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', marginBottom: '2px',
                                    border: blocked ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                    background: blocked ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                                  }}>
                                    <input type="checkbox" checked={blocked} onChange={() => toggleC(constraintSource, o.id)} style={{ accentColor: '#ef4444' }} />
                                    <span style={{ fontSize: '0.8125rem', color: blocked ? '#f87171' : 'rgba(255,255,255,0.7)', textDecoration: blocked ? 'line-through' : 'none' }}>{o.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={handleSaveC}>
                        <FiSave /> Lưu ràng buộc ({productConstraints.length} rules)
                      </button>
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', margin: 0 }}>Chọn nhóm tuỳ chọn áp dụng</h3>
                {isEdit && form.addon_group_ids.length > 1 && (
                  <button className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => setShowConstraintEditor(!showConstraintEditor)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiLink /> Ràng buộc {productConstraints.length > 0 && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '1px 6px', borderRadius: '99px', fontSize: '0.625rem' }}>{productConstraints.length}</span>}
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
                Tick chọn nhóm → nhập giá riêng cho từng tuỳ chọn. Quản lý nhóm tại <a href="/admin/addons" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>Biến thể</a>
              </p>

              {allAddonGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
                  <p>Chưa có nhóm tuỳ chọn nào.</p>
                  <a href="/admin/addons" className="admin-btn admin-btn--secondary" style={{ display: 'inline-flex', marginTop: '12px' }}>
                    <FiPlus /> Tạo nhóm tuỳ chọn
                  </a>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {allAddonGroups.map((g: any) => {
                    const isChecked = form.addon_group_ids.includes(g.id);
                    return (
                      <div key={g.id} style={{
                        background: isChecked ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.02)',
                        border: isChecked ? '1px solid rgba(201,169,110,0.25)' : '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s',
                      }}>
                        {/* Group header with checkbox */}
                        <label style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                          cursor: 'pointer', borderBottom: isChecked ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        }}>
                          <input type="checkbox" checked={isChecked}
                            onChange={() => {
                              setForm(f => {
                                const newIds = isChecked
                                  ? f.addon_group_ids.filter(id => id !== g.id)
                                  : [...f.addon_group_ids, g.id];
                                // If unchecking, remove prices for this group's options
                                const newPrices = { ...f.addon_prices };
                                if (isChecked) {
                                  (g.options || []).forEach((opt: any) => { delete newPrices[opt.id]; });
                                } else {
                                  // Init default prices (0 = free)
                                  (g.options || []).forEach((opt: any) => {
                                    if (!newPrices[opt.id]) {
                                      newPrices[opt.id] = { additional_price: '0', is_available: true };
                                    }
                                  });
                                }
                                return { ...f, addon_group_ids: newIds, addon_prices: newPrices };
                              });
                            }}
                          />
                          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>{g.name}</span>
                          {g.is_required && (
                            <span style={{ fontSize: '0.625rem', background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>Bắt buộc</span>
                          )}
                          <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                            {(g.options || []).length} tuỳ chọn
                          </span>
                        </label>

                        {/* Price table - only show when checked */}
                        {isChecked && (g.options || []).length > 0 && (
                          <div style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 60px', gap: '6px', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '8px', paddingLeft: '4px' }}>
                              <span>Tuỳ chọn</span>
                              <span>Giá thêm (đ)</span>
                              <span style={{ textAlign: 'center' }}>Bán?</span>
                            </div>
                            {(g.options || []).map((opt: any) => {
                              const price = form.addon_prices[opt.id] || { additional_price: '0', is_available: true };
                              return (
                                <div key={opt.id} style={{
                                  display: 'grid', gridTemplateColumns: '1fr 140px 60px', gap: '6px',
                                  alignItems: 'center', marginBottom: '6px',
                                }}>
                                  <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', paddingLeft: '4px' }}>{opt.name}</span>
                                  <input className="admin-form__input" type="number" value={price.additional_price} placeholder="0"
                                    style={{ padding: '6px 10px', fontSize: '0.8125rem' }}
                                    onChange={e => {
                                      setForm(f => ({
                                        ...f,
                                        addon_prices: {
                                          ...f.addon_prices,
                                          [opt.id]: { ...price, additional_price: e.target.value },
                                        },
                                      }));
                                    }}
                                  />
                                  <div style={{ textAlign: 'center' }}>
                                    <input type="checkbox" checked={price.is_available}
                                      onChange={e => {
                                        setForm(f => ({
                                          ...f,
                                          addon_prices: {
                                            ...f.addon_prices,
                                            [opt.id]: { ...price, is_available: e.target.checked },
                                          },
                                        }));
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => {
          if (mediaPickerTarget === 'thumbnail') {
            setForm(f => ({ ...f, thumbnail: url }));
          } else if (mediaPickerTarget === 'gallery') {
            setForm(f => ({ ...f, images: [...f.images, url] }));
          } else if (mediaPickerTarget === 'og_image') {
            setForm(f => ({ ...f, og_image: url }));
          } else if (mediaPickerTarget === 'editor' && editorInsertFn) {
            editorInsertFn(url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${url}`);
          }
        }}
      />
    </>
  );
}
