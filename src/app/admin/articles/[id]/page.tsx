'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { invalidateAdmin, useAdminArticleCategories } from '@/lib/useAdmin';
import { useToken } from '@/lib/useToken';
import { FiSave, FiArrowLeft, FiCpu, FiEye, FiImage, FiX, FiZap } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import MediaPicker from '@/components/admin/MediaPicker';
import toast from 'react-hot-toast';

const RichEditor = dynamic(() => import('@/components/admin/RichEditor'), { ssr: false });

export default function ArticleFormPage() {
  const router = useRouter();
  const params = useParams();
  const isEdit = params?.id && params.id !== 'new';
  const { token } = useToken();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!isEdit);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'thumbnail' | 'editor'>('thumbnail');
  const [editorInsertFn, setEditorInsertFn] = useState<((url: string) => void) | null>(null);

  const [form, setForm] = useState({
    title: '', excerpt: '', content: '', thumbnail: '',
    author: '', tags: [] as string[], is_published: false, is_featured: false,
    meta_title: '', meta_desc: '', meta_keywords: '', og_image: '',
    article_category_id: '' as string | number,
  });
  const [tagsInput, setTagsInput] = useState('');

  // Load article categories for dropdown
  const { data: articleCategories } = useAdminArticleCategories(token);
  const flattenCats = (cats: any[], depth = 0): any[] => {
    let result: any[] = [];
    for (const cat of cats) {
      result.push({ ...cat, depth });
      if (cat.children?.length) result = result.concat(flattenCats(cat.children, depth + 1));
    }
    return result;
  };
  const flatCats = flattenCats(Array.isArray(articleCategories) ? articleCategories : []);

  useEffect(() => {
    if (isEdit && token) {
      loadArticle();
    }
  }, [isEdit, token]);

  const loadArticle = async () => {
    try {
      const data = await adminApi.getArticles(token!, {});
      const article = (data.data || []).find((a: any) => a.id === Number(params?.id));
      if (article) {
        setForm({
          title: article.title || '', excerpt: article.excerpt || '',
          content: article.content || '', thumbnail: article.thumbnail || '',
          author: article.author || '', tags: article.tags || [],
          is_published: article.is_published ?? false, is_featured: article.is_featured ?? false,
          meta_title: article.meta_title || '', meta_desc: article.meta_desc || '',
          meta_keywords: article.meta_keywords || '', og_image: article.og_image || '',
          article_category_id: article.article_category_id || '',
        });
        setTagsInput((article.tags || []).join(', '));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!token || !form.title) return;
    setSaving(true);
    const savingToast = toast.loading('Đang lưu bài viết...');
    try {
      const payload = {
        ...form,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        article_category_id: form.article_category_id ? Number(form.article_category_id) : null,
      };
      if (isEdit) {
        await adminApi.updateArticle(token, Number(params?.id), payload);
      } else {
        await adminApi.createArticle(token, payload);
      }
      toast.success('Đã lưu bài viết!', { id: savingToast });
      invalidateAdmin('/admin/articles');
      router.push('/admin/articles');
    } catch (err: any) { 
      toast.error('Lỗi: ' + (err.message || 'Không thể lưu'), { id: savingToast }); 
    }
    finally { setSaving(false); }
  };

  const handleAiGenerate = async (mode: 'content' | 'images' | 'full' | 'full_images' = 'content') => {
    if (!token || !form.title) { toast.error('Vui lòng nhập tiêu đề trước'); return; }
    setGeneratingAi(true);
    const labels: Record<string, string> = {
      content: 'Đang tạo nội dung AI...',
      images: 'Đang tạo bài viết + ảnh AI... (1-2 phút)',
      full: 'Đang viết bài hoàn chỉnh (SEO, tags)...',
      full_images: 'Đang viết bài hoàn chỉnh + ảnh AI... (1-2 phút)',
    };
    const aiToast = toast.loading(labels[mode]);
    try {
      const isFullArticle = mode === 'full' || mode === 'full_images';
      const withImages = mode === 'images' || mode === 'full_images';
      const basePayload = {
        topic: form.title,
        type: 'article' as const,
        keywords: form.meta_keywords || tagsInput,
        tone: 'professional' as const,
        length: 'medium' as const,
        full_article: isFullArticle,
        category_id: form.article_category_id || undefined,
      };

      let data: any;
      if (withImages) {
        data = await adminApi.aiGenerateContentWithImages(token, { ...basePayload, image_count: 2 });
      } else {
        data = await adminApi.aiGenerateContent(token, basePayload);
      }

      if (data.content) {
        const updates: any = { content: data.content };
        if (data.full_article) {
          if (data.title) updates.title = data.title;
          if (data.excerpt) updates.excerpt = data.excerpt;
          if (data.meta_title) updates.meta_title = data.meta_title;
          if (data.meta_desc) updates.meta_desc = data.meta_desc;
          if (data.meta_keywords) updates.meta_keywords = data.meta_keywords;
          if (data.tags?.length) setTagsInput(data.tags.join(', '));
        }
        setForm(f => ({ ...f, ...updates }));
        const parts: string[] = ['Đã tạo xong'];
        if (data.full_article) parts.push('(SEO + tags)');
        if (data.images?.length) parts.push(`(${data.images.length} ảnh)`);
        toast.success(parts.join(' '), { id: aiToast });
      }
    } catch (err: any) { 
      toast.error('Lỗi AI: ' + (err.message || 'Không thể tạo'), { id: aiToast }); 
    }
    finally { setGeneratingAi(false); }
  };

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
          <button onClick={() => router.push('/admin/articles')} style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.25rem' }}><FiArrowLeft /></button>
          <h1 className="admin-topbar__title">{isEdit ? 'Sửa Bài Viết' : 'Viết Bài Mới'}</h1>
        </div>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => handleAiGenerate('content')} disabled={generatingAi}>
            <FiCpu /> {generatingAi ? 'Đang tạo...' : 'AI nội dung'}
          </button>
          <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => handleAiGenerate('images')} disabled={generatingAi}
            style={{ background: 'rgba(201,169,110,0.1)', borderColor: 'rgba(201,169,110,0.25)' }}>
            <FiImage style={{ color: 'var(--color-gold)' }} /> AI + Ảnh
          </button>
          <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => handleAiGenerate('full')} disabled={generatingAi}
            style={{ background: 'rgba(201,169,110,0.2)', borderColor: 'rgba(201,169,110,0.4)', color: 'var(--color-gold)' }}>
            <FiZap /> Viết bài hoàn chỉnh
          </button>
          <button className="admin-btn admin-btn--primary" onClick={handleSave} disabled={saving}>
            <FiSave /> {saving ? 'Đang lưu...' : 'Lưu Bài Viết'}
          </button>
        </div>
      </div>

      <div className="admin-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
          {/* Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-card">
              <div className="admin-form">
                <div className="admin-form__group">
                  <label className="admin-form__label">Tiêu đề bài viết *</label>
                  <input className="admin-form__input" value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Ví dụ: Xu hướng kính mắt 2026" style={{ fontSize: '1.125rem', padding: '14px' }} />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Tóm tắt</label>
                  <textarea className="admin-form__input" value={form.excerpt}
                    onChange={e => setForm({ ...form, excerpt: e.target.value })}
                    placeholder="Tóm tắt ngắn gọn bài viết..." rows={3} />
                </div>
                <div className="admin-form__group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="admin-form__label">Nội dung</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => handleAiGenerate('content')} disabled={generatingAi}
                        style={{ fontSize: '0.75rem' }}>
                        <FiCpu /> {generatingAi ? 'Đang tạo...' : 'AI nội dung'}
                      </button>
                      <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => handleAiGenerate('full')} disabled={generatingAi}
                        style={{ fontSize: '0.75rem', background: 'rgba(201,169,110,0.2)', borderColor: 'rgba(201,169,110,0.4)', color: 'var(--color-gold)' }}>
                        <FiZap /> Viết bài hoàn chỉnh
                      </button>
                    </div>
                  </div>
                  <RichEditor
                    content={form.content}
                    onChange={(html: string) => setForm(prev => ({ ...prev, content: html }))}
                    placeholder="Viết nội dung bài viết hoặc dùng AI tạo tự động..."
                    onMediaPick={(insertFn) => {
                      setMediaTarget('editor');
                      setEditorInsertFn(() => insertFn);
                      setShowMediaPicker(true);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Publish Settings */}
            <div className="admin-card">
              <h3 className="admin-card__title" style={{ marginBottom: '16px' }}>Xuất bản</h3>
              <div className="admin-form">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} style={{ accentColor: 'var(--color-gold)' }} />
                  Đăng bài (Published)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} style={{ accentColor: 'var(--color-gold)' }} />
                  Bài viết nổi bật
                </label>
                <div className="admin-form__group" style={{ marginTop: '12px' }}>
                  <label className="admin-form__label">Danh mục bài viết</label>
                  <select className="admin-form__input" value={form.article_category_id}
                    onChange={e => setForm({ ...form, article_category_id: e.target.value })}>
                    <option value="">— Không có danh mục —</option>
                    {flatCats.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{'—'.repeat(cat.depth)} {cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Author & Tags */}
            <div className="admin-card">
              <h3 className="admin-card__title" style={{ marginBottom: '16px' }}>Thông tin</h3>
              <div className="admin-form">
                <div className="admin-form__group">
                  <label className="admin-form__label">Tác giả</label>
                  <input className="admin-form__input" value={form.author}
                    onChange={e => setForm({ ...form, author: e.target.value })} placeholder="Tên tác giả" />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Tags (phân cách bằng dấu phẩy)</label>
                  <input className="admin-form__input" value={tagsInput}
                    onChange={e => setTagsInput(e.target.value)} placeholder="kính mắt, thời trang, 2026" />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Ảnh đại diện</label>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() => {
                      setMediaTarget('thumbnail');
                      setShowMediaPicker(true);
                    }}>
                    <FiImage /> Chọn từ Media
                  </button>
                  {form.thumbnail && (
                    <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', aspectRatio: '16/9', background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
                      <img src={form.thumbnail.startsWith('http') ? form.thumbnail : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${form.thumbnail}`}
                        alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => setForm({ ...form, thumbnail: '' })}
                        style={{ position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiX style={{ fontSize: '0.625rem' }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className="admin-card">
              <h3 className="admin-card__title" style={{ marginBottom: '16px' }}>SEO</h3>
              <div className="admin-form">
                <div className="admin-form__group">
                  <label className="admin-form__label">Meta Title</label>
                  <input className="admin-form__input" value={form.meta_title}
                    onChange={e => setForm({ ...form, meta_title: e.target.value })} placeholder="Tiêu đề SEO" />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Meta Description</label>
                  <textarea className="admin-form__input" value={form.meta_desc}
                    onChange={e => setForm({ ...form, meta_desc: e.target.value })} placeholder="Mô tả SEO" rows={3} />
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Keywords</label>
                  <input className="admin-form__input" value={form.meta_keywords}
                    onChange={e => setForm({ ...form, meta_keywords: e.target.value })} placeholder="từ khóa SEO" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => {
          if (mediaTarget === 'thumbnail') {
            setForm(f => ({ ...f, thumbnail: url }));
          } else if (mediaTarget === 'editor' && editorInsertFn) {
            editorInsertFn(url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${url}`);
          }
        }}
      />
    </>
  );
}
