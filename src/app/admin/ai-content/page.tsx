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
    const label = withImages
      ? 'AI \u0111ang vi\u1ebft b\u00e0i v\u00e0 sinh \u1ea3nh minh h\u1ecda... (1-2 ph\u00fat)'
      : 'AI \u0111ang ph\u00e2n t\u00edch v\u00e0 vi\u1ebft b\u00e0i...';
    const aiToast = toast.loading(label);
    try {
      let data: any;
      const payload = { topic, type, keywords, tone, length, full_article: fullArticle };
      if (withImages) {
        data = await adminApi.aiGenerateContentWithImages(token, { ...payload, image_count: imageCount });
      } else {
        data = await adminApi.aiGenerateContent(token, payload);
      }
      setGeneratedContent(data.content || 'Kh\u00f4ng c\u00f3 n\u1ed9i dung');
      setGeneratedImages(data.images || []);
      if (data.full_article) {
        setArticleMeta({
          title: data.title, excerpt: data.excerpt,
          meta_title: data.meta_title, meta_desc: data.meta_desc,
          meta_keywords: data.meta_keywords, tags: data.tags,
        });
      }
      const parts = ['\u0110\u00e3 t\u1ea1o xong!'];
      if (data.full_article) parts.push('(b\u00e0i ho\u00e0n ch\u1ec9nh)');
      if (data.images?.length) parts.push(`(${data.images.length} \u1ea3nh)`);
      toast.success(parts.join(' '), { id: aiToast });
    } catch (err: any) {
      setGeneratedContent('L\u1ed7i: ' + (err.message || 'Kh\u00f4ng th\u1ec3 t\u1ea1o n\u1ed9i dung'));
      toast.error('L\u1ed7i: ' + (err.message || 'Kh\u00f4ng th\u1ec3 t\u1ea1o'), { id: aiToast });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('\u0110\u00e3 copy n\u1ed9i dung!');
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title"><FiCpu style={{ marginRight: '8px' }} /> AI T\u1ea1o N\u1ed9i Dung</h1>
      </div>
      <div className="admin-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Input */}
          <div className="admin-card">
            <h3 className="admin-card__title" style={{ marginBottom: '20px' }}>C\u1ea5u h\u00ecnh n\u1ed9i dung</h3>
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">Ch\u1ee7 \u0111\u1ec1 / Ti\u00eau \u0111\u1ec1 *</label>
                <input className="admin-form__input" value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="V\u00ed d\u1ee5: Top 10 m\u1eabu k\u00ednh th\u1eddi trang 2026" />
              </div>
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">Lo\u1ea1i n\u1ed9i dung</label>
                  <select className="admin-form__input" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="article">B\u00e0i Vi\u1ebft Blog</option>
                    <option value="product_description">M\u00f4 T\u1ea3 S\u1ea3n Ph\u1ea9m</option>
                    <option value="seo">N\u1ed9i Dung SEO</option>
                  </select>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">Gi\u1ecdng v\u0103n</label>
                  <select className="admin-form__input" value={tone} onChange={(e) => setTone(e.target.value)}>
                    <option value="professional">Chuy\u00ean nghi\u1ec7p</option>
                    <option value="casual">Th\u00e2n thi\u1ec7n</option>
                    <option value="luxury">Sang tr\u1ecdng</option>
                  </select>
                </div>
              </div>
              <div className="admin-form__row">
                <div className="admin-form__group">
                  <label className="admin-form__label">\u0110\u1ed9 d\u00e0i</label>
                  <select className="admin-form__input" value={length} onChange={(e) => setLength(e.target.value)}>
                    <option value="short">Ng\u1eafn (500-800 t\u1eeb)</option>
                    <option value="medium">Trung b\u00ecnh (1000-1500 t\u1eeb)</option>
                    <option value="long">D\u00e0i (2000-3000 t\u1eeb)</option>
                  </select>
                </div>
                <div className="admin-form__group">
                  <label className="admin-form__label">T\u1eeb kh\u00f3a SEO</label>
                  <input className="admin-form__input" value={keywords} onChange={(e) => setKeywords(e.target.value)}
                    placeholder="k\u00ednh m\u1eaft, th\u1eddi trang, 2026" />
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
                  Vi\u1ebft b\u00e0i ho\u00e0n ch\u1ec9nh (t\u1ef1 sinh ti\u00eau \u0111\u1ec1, t\u00f3m t\u1eaft, SEO, tags)
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
                  T\u1ef1 \u0111\u1ed9ng sinh \u1ea3nh minh h\u1ecda (Gemini AI)
                </label>
                {withImages && (
                  <div style={{ marginTop: '12px', paddingLeft: '36px' }}>
                    <label className="admin-form__label" style={{ fontSize: '0.8rem' }}>S\u1ed1 l\u01b0\u1ee3ng \u1ea3nh</label>
                    <select className="admin-form__input" value={imageCount}
                      onChange={e => setImageCount(Number(e.target.value))}
                      style={{ maxWidth: '160px' }}>
                      <option value={1}>1 \u1ea3nh</option>
                      <option value={2}>2 \u1ea3nh</option>
                      <option value={3}>3 \u1ea3nh</option>
                      <option value={4}>4 \u1ea3nh</option>
                      <option value={5}>5 \u1ea3nh</option>
                    </select>
                  </div>
                )}
              </div>

              <button className="admin-btn admin-btn--primary" onClick={handleGenerate} disabled={loading || !topic}
                style={{ width: '100%', padding: '14px', marginTop: '8px' }}>
                {loading ? <><FiRefreshCw className="spin" /> \u0110ang t\u1ea1o...</>
                  : fullArticle
                    ? <><FiZap /> Vi\u1ebft B\u00e0i Ho\u00e0n Ch\u1ec9nh {withImages ? '+ \u1ea2nh' : ''}</>
                    : withImages ? <><FiImage /> T\u1ea1o N\u1ed9i Dung + \u1ea2nh AI</> : <><FiSend /> T\u1ea1o N\u1ed9i Dung</>}
              </button>
            </div>
          </div>

          {/* Output */}
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="admin-card__header">
              <h3 className="admin-card__title">K\u1ebft qu\u1ea3</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {generatedImages.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiImage /> {generatedImages.length} \u1ea3nh
                  </span>
                )}
                {generatedContent && (
                  <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={copyToClipboard}>
                    <FiCopy /> Copy
                  </button>
                )}
              </div>
            </div>

            {/* Article metadata */}
            {articleMeta && (
              <div style={{
                padding: '16px', margin: '0 0 16px', borderRadius: '8px',
                background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)',
              }}>
                <h4 style={{ color: 'var(--color-gold)', fontSize: '0.8rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiZap /> Th\u00f4ng tin b\u00e0i vi\u1ebft \u0111\u00e3 sinh
                </h4>
                <div style={{ display: 'grid', gap: '8px', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)' }}>
                  {articleMeta.title && <div><strong style={{ color: 'rgba(255,255,255,0.4)' }}>Ti\u00eau \u0111\u1ec1:</strong> {articleMeta.title}</div>}
                  {articleMeta.excerpt && <div><strong style={{ color: 'rgba(255,255,255,0.4)' }}>T\u00f3m t\u1eaft:</strong> {articleMeta.excerpt}</div>}
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

            <div style={{
              flex: 1, padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
              overflow: 'auto', maxHeight: '600px', fontSize: '0.875rem', lineHeight: '1.8',
              color: 'rgba(255,255,255,0.8)',
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}>
                  <FiCpu style={{ fontSize: '2rem', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                  AI \u0111ang t\u1ea1o n\u1ed9i dung, vui l\u00f2ng ch\u1edd...
                </div>
              ) : generatedContent ? (
                <div dangerouslySetInnerHTML={{ __html: generatedContent }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <FiFileText style={{ fontSize: '1.5rem' }} />
                  </div>
                  Nh\u1eadp ch\u1ee7 \u0111\u1ec1 v\u00e0 nh\u1ea5n n\u00fat \u0111\u1ec3 b\u1eaft \u0111\u1ea7u
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  );
}
