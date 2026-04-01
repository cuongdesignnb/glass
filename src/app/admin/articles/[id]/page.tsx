'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { invalidateAdmin } from '@/lib/useAdmin';
import { useToken } from '@/lib/useToken';
import { FiSave, FiArrowLeft, FiCpu, FiEye, FiImage, FiX } from 'react-icons/fi';
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
  });
  const [tagsInput, setTagsInput] = useState('');

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
      const payload = { ...form, tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean) };
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

  const handleAiGenerate = async () => {
    if (!token || !form.title) { toast.error('Vui lòng nhập tiêu đề trước'); return; }
    setGeneratingAi(true);
    const aiToast = toast.loading('Đang tạo nội dung AI...');
    try {
      const data = await adminApi.aiGenerateContent(token, {
        topic: form.title,
        type: 'article',
        keywords: form.meta_keywords || tagsInput,
        tone: 'professional',
        length: 'medium',
      });
      if (data.content) {
        setForm(f => ({ ...f, content: data.content }));
        toast.success('Đã tạo xong bài viết!', { id: aiToast });
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
          <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={handleAiGenerate} disabled={generatingAi}>
            <FiCpu /> {generatingAi ? 'Đang tạo AI...' : 'Tạo nội dung AI'}
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
                    <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={handleAiGenerate} disabled={generatingAi}>
                      <FiCpu /> {generatingAi ? 'Đang tạo...' : 'AI viết bài'}
                    </button>
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
