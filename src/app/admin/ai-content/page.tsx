'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { FiCpu, FiSend, FiCopy, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminAiContentPage() {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('article');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [keywords, setKeywords] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setLoading(true);
    const aiToast = toast.loading('AI đang phân tích và viết bài...');
    try {
      const data = await adminApi.aiGenerateContent(token, { topic, type, keywords, tone, length });
      setGeneratedContent(data.content || 'Không có nội dung');
      toast.success('Đã tải xong nội dung AI!', { id: aiToast });
    } catch (err: any) {
      setGeneratedContent('Lỗi: ' + (err.message || 'Không thể tạo nội dung'));
      toast.error('Lỗi khi suy nghĩ!', { id: aiToast });
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
        <h1 className="admin-topbar__title"><FiCpu style={{ marginRight: '8px' }} /> AI Tạo Nội Dung (ChatGPT)</h1>
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
              <button className="admin-btn admin-btn--primary" onClick={handleGenerate} disabled={loading || !topic}
                style={{ width: '100%', padding: '14px' }}>
                {loading ? <><FiRefreshCw className="spin" /> Đang tạo nội dung...</> : <><FiSend /> Tạo Nội Dung</>}
              </button>
            </div>
          </div>

          {/* Output */}
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="admin-card__header">
              <h3 className="admin-card__title">Kết quả</h3>
              {generatedContent && (
                <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={copyToClipboard}>
                  <FiCopy /> Copy
                </button>
              )}
            </div>
            <div style={{
              flex: 1, padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
              overflow: 'auto', maxHeight: '600px', fontSize: '0.875rem', lineHeight: '1.8',
              color: 'rgba(255,255,255,0.8)',
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}>
                  <FiCpu style={{ fontSize: '2rem', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                  AI đang tạo nội dung, vui lòng chờ...
                </div>
              ) : generatedContent ? (
                <div dangerouslySetInnerHTML={{ __html: generatedContent }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)' }}>
                  Nhập chủ đề và nhấn "Tạo Nội Dung" để bắt đầu
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
