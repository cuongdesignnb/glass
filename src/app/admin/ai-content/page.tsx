'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { FiCpu, FiSend, FiCopy, FiRefreshCw, FiImage, FiFileText, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminAiContentPage() {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('article');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [keywords, setKeywords] = useState('');
  const [imageCount, setImageCount] = useState(2);
  const [fullArticle, setFullArticle] = useState(true);
  const [withImages, setWithImages] = useState(false);
  const [articleMeta, setArticleMeta] = useState<any>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setLoading(true);
    setGeneratedImages([]);
    setArticleMeta(null);
    const aiToast = toast.loading(withImages ? 'AI đang viết bài và sinh ảnh... (1-2 phút)' : 'AI đang viết bài...');
    try {
      let data: any;
      const payload = { topic, type, keywords, tone, length, full_article: fullArticle };
      if (withImages) {
        data = await adminApi.aiGenerateContentWithImages(token, { ...payload, image_count: imageCount });
      } else {
        data = await adminApi.aiGenerateContent(token, payload);
      }
      setGeneratedContent(data.content || 'Không có nội dung');
      setGeneratedImages(data.images || []);
      if (data.full_article) {
        setArticleMeta({
          title: data.title, excerpt: data.excerpt,
          meta_title: data.meta_title, meta_desc: data.meta_desc,
          meta_keywords: data.meta_keywords, tags: data.tags,
        });
      }
      const parts = ['Đã tạo xong!'];
      if (data.full_article) parts.push('(bài hoàn chỉnh)');
      if (data.images?.length) parts.push(`(${data.images.length} ảnh)`);
      toast.success(parts.join(' '), { id: aiToast });
    } catch (err: any) {
      setGeneratedContent('Lỗi: ' + (err.message || 'Không thể tạo'));
      toast.error('Lỗi: ' + (err.message || 'Không thể tạo'), { id: aiToast });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('Đã copy nội dung!');
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title"><FiCpu style={{ marginRight: '8px' }} /> AI Tạo Nội Dung</h1>
      </div>
      <div className="admin-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Input */}
          <div className="admin-card">
            <h3 className="admin-card__title" style={{ marginBottom: '20px' }}>Cấu hình nội dung</h3>
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">Chủ đề / Tiêu đề *</label>
                <input className="admin-form__input" value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ví dụ: Top 10 mẫu kính thời trang 2026" />
              </div>
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Loại nội dung</label>
                  <select className="admin-form__input" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="article">Bài Viết Blog</option>
                    <option value="product_description">Mô Tả Sản Phẩm</option>
                    <option value="seo">Nội Dung SEO</option>
                  </select>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Giọng văn</label>
                  <select className="admin-form__input" value={tone} onChange={(e) => setTone(e.target.value)}>
                    <option value="professional">Chuyên nghiệp</option>
                    <option value="casual">Thân thiện</option>
                    <option value="luxury">Sang trọng</option>
                  </select>
                </div>
              </div>
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Độ dài</label>
                  <select className="admin-form__input" value={length} onChange={(e) => setLength(e.target.value)}>
                    <option value="short">Ngắn (500-800 từ)</option>
                    <option value="medium">Trung bình (1000-1500 từ)</option>
                    <option value="long">Dài (2000-3000 từ)</option>
                  </select>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Từ khóa SEO</label>
                  <input className="admin-form__input" value={keywords} onChange={(e) => setKeywords(e.target.value)}
                    placeholder="kính mắt, thời trang, 2026" />
                </div>
              </div>

              {/* Full article toggle */}
              <div style={{
                padding: '16px', borderRadius: '10px', marginTop: '4px',
                background: fullArticle ? 'rgba(201,169,110,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${fullArticle ? 'rgba(201,169,110,0.35)' : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.3s',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={fullArticle} onChange={e => setFullArticle(e.target.checked)}
                    style={{ accentColor: 'var(--color-gold)', width: '18px', height: '18px' }} />
                  <FiZap style={{ color: 'var(--color-gold)' }} />
                  Viết bài hoàn chỉnh (tự sinh tiêu đề, tóm tắt, SEO, tags)
                </label>
              </div>

              {/* Image generation toggle */}
              <div style={{
                padding: '16px', borderRadius: '10px', marginTop: '4px',
                background: withImages ? 'rgba(201,169,110,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${withImages ? 'rgba(201,169,110,0.3)' : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.3s',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={withImages} onChange={e => setWithImages(e.target.checked)}
                    style={{ accentColor: 'var(--color-gold)', width: '18px', height: '18px' }} />
                  <FiImage style={{ color: 'var(--color-gold)' }} />
                  Tự động sinh ảnh minh họa (Gemini AI)
                </label>
                {withImages && (
                  <div style={{ marginTop: '12px', paddingLeft: '36px' }}>
                    <label className="admin-form__label" style={{ fontSize: '0.8rem' }}>Số lượng ảnh</label>
                    <select className="admin-form__input" value={imageCount}
                      onChange={e => setImageCount(Number(e.target.value))}
                      style={{ maxWidth: '160px' }}>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ảnh</option>)}
                    </select>
                  </div>
                )}
              </div>

              <button className="admin-btn admin-btn--primary" onClick={handleGenerate} disabled={loading || !topic}
                style={{ width: '100%', padding: '14px', marginTop: '8px' }}>
                {loading ? <><FiRefreshCw className="spin" /> Đang tạo...</>
                  : fullArticle
                    ? <><FiZap /> Viết Bài Hoàn Chỉnh {withImages ? '+ Ảnh' : ''}</>
                    : withImages ? <><FiImage /> Tạo Nội Dung + Ảnh AI</> : <><FiSend /> Tạo Nội Dung</>}
              </button>
            </div>
          </div>

          {/* Output */}
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="admin-card__header">
              <h3 className="admin-card__title">Kết quả</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {generatedImages.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiImage /> {generatedImages.length} ảnh
                  </span>
                )}
                {generatedContent && (
                  <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={copyToClipboard}>
                    <FiCopy /> Copy
                  </button>
                )}
              </div>
            </div>

            {articleMeta && (
              <div style={{ padding: '16px', margin: '0 0 16px', borderRadius: '8px',
                background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)' }}>
                <h4 style={{ color: 'var(--color-gold)', fontSize: '0.8rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiZap /> Thông tin bài viết đã sinh
                </h4>
                <div style={{ display: 'grid', gap: '8px', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)' }}>
                  {articleMeta.title && <div><strong style={{ color: 'rgba(255,255,255,0.4)' }}>Tiêu đề:</strong> {articleMeta.title}</div>}
                  {articleMeta.excerpt && <div><strong style={{ color: 'rgba(255,255,255,0.4)' }}>Tóm tắt:</strong> {articleMeta.excerpt}</div>}
                  {articleMeta.meta_title && <div><strong style={{ color: 'rgba(255,255,255,0.4)' }}>SEO Title:</strong> {articleMeta.meta_title}</div>}
                  {articleMeta.meta_desc && <div><strong style={{ color: 'rgba(255,255,255,0.4)' }}>SEO Desc:</strong> {articleMeta.meta_desc}</div>}
                  {articleMeta.meta_keywords && <div><strong style={{ color: 'rgba(255,255,255,0.4)' }}>Keywords:</strong> {articleMeta.meta_keywords}</div>}
                  {articleMeta.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <strong style={{ color: 'rgba(255,255,255,0.4)' }}>Tags:</strong>
                      {articleMeta.tags.map((t: string, i: number) => (
                        <span key={i} className="admin-badge admin-badge--info" style={{ fontSize: '0.7rem' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ flex: 1, padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
              overflow: 'auto', maxHeight: '600px', fontSize: '0.875rem', lineHeight: '1.8', color: 'rgba(255,255,255,0.8)' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}>
                  <FiCpu style={{ fontSize: '2rem', display: 'block', margin: '0 auto 12px' }} />
                  AI đang tạo nội dung, vui lòng chờ...
                </div>
              ) : generatedContent ? (
                <div dangerouslySetInnerHTML={{ __html: generatedContent }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}>
                  <FiFileText style={{ fontSize: '1.5rem', display: 'block', margin: '0 auto 12px' }} />
                  Nhập chủ đề và nhấn nút để bắt đầu
                </div>
              )}
            </div>
          </div>
        </div>
        <style jsx>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
}
