'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useToken } from '@/lib/useToken';
import MediaPicker from '@/components/admin/MediaPicker';
import {
  FiSave, FiGlobe, FiMail, FiPhone, FiMapPin, FiSearch, FiShare2,
  FiKey, FiImage, FiX, FiHome, FiToggleLeft, FiToggleRight, FiEye, FiEyeOff,
  FiCreditCard, FiType, FiUpload, FiTrash2, FiGift,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { invalidateSettings } from '@/lib/useSettings';

export default function AdminSettingsPage() {
  const { token } = useToken();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaTarget, setMediaTarget] = useState('');
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (token) loadSettings();
    else setLoading(false); // token chưa có → không loading mãi
  }, [token]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSettings(token!);
      const flat: Record<string, string> = {};
      Object.values(data).forEach((group: any) => {
        if (typeof group === 'object') {
          Object.entries(group).forEach(([key, value]) => {
            flat[key] = value as string;
          });
        }
      });
      setSettings(flat);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleSetting = (key: string) => {
    updateSetting(key, settings[key] === '1' ? '0' : '1');
  };

  const toggleReveal = (key: string) => {
    setRevealedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    const savingToast = toast.loading('Đang lưu cài đặt...');
    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key, value, group: getGroup(key),
      }));
      await adminApi.updateSettings(token, settingsArray);
      invalidateSettings();
      toast.success('Đã lưu thay đổi!', { id: savingToast });
    } catch (err: any) { 
      console.error(err);
      toast.error('Lỗi khi lưu: ' + (err.message || ''), { id: savingToast });
    }
    finally { setSaving(false); }
  };

  const getGroup = (key: string): string => {
    if (key.startsWith('seo_')) return 'seo';
    if (key.startsWith('social_')) return 'social';
    if (key.startsWith('contact_')) return 'contact';
    if (key.startsWith('hero_') || key.startsWith('stat_') || key.startsWith('homepage_')) return 'homepage';
    if (key.startsWith('payment_')) return 'payment';
    if (key.startsWith('font_') || key.startsWith('custom_font_')) return 'font';
    if (key.startsWith('gemini_') || key.startsWith('openai_') || key.startsWith('google_') || key.startsWith('facebook_')) return 'api';
    if (key.includes('api_key') || key.includes('analytics') || key.includes('pixel')) return 'api';
    if (key.startsWith('reward_') || key.startsWith('voucher_') || key.startsWith('points_') || key.startsWith('register_') || key.startsWith('min_redeem')) return 'rewards';
    return 'general';
  };

  const tabs = [
    { id: 'general',  label: 'Chung',          icon: <FiGlobe /> },
    { id: 'homepage', label: 'Trang Chủ',      icon: <FiHome /> },
    { id: 'contact',  label: 'Liên hệ',        icon: <FiPhone /> },
    { id: 'seo',      label: 'SEO',            icon: <FiSearch /> },
    { id: 'social',   label: 'Mạng xã hội',   icon: <FiShare2 /> },
    { id: 'payment',  label: 'Thanh toán',     icon: <FiCreditCard /> },
    { id: 'rewards',   label: 'Phần thưởng',    icon: <FiGift /> },
    { id: 'font',     label: 'Font chữ',       icon: <FiType /> },
    { id: 'api',      label: 'API & Tích hợp', icon: <FiKey /> },
  ];

  type SettingField = {
    key: string;
    label: string;
    type?: string;
    placeholder?: string;
    isImage?: boolean;
    isToggle?: boolean;
    isTextarea?: boolean;
    isPassword?: boolean;
    hint?: string;
    section?: string;
  };

  const settingFields: Record<string, SettingField[]> = {
    general: [
      { key: 'site_name',        label: 'Tên Website',   placeholder: 'Glass Eyewear' },
      { key: 'site_description', label: 'Mô tả Website', placeholder: 'Cửa hàng kính mắt...', isTextarea: true },
      { key: 'site_logo',        label: 'Logo',          isImage: true },
      { key: 'site_favicon',     label: 'Favicon',       isImage: true },
    ],
    homepage: [
      { key: 'hero_image',    label: 'Ảnh Hero (nền)',          isImage: true, section: 'Hero Section' },
      { key: 'hero_title',    label: 'Tiêu đề Hero',            placeholder: 'Phong Cách Đẳng Cấp Qua Mỗi Ánh Nhìn' },
      { key: 'hero_subtitle', label: 'Mô tả Hero',              placeholder: 'Khám phá bộ sưu tập kính mắt cao cấp...', isTextarea: true },
      { key: 'hero_cta_text', label: 'Nội dung nút CTA chính',  placeholder: 'Khám Phá Ngay' },
      { key: 'hero_tag',      label: 'Tag nhỏ trên tiêu đề',   placeholder: 'Bộ Sưu Tập Mới 2026' },
      { key: 'stat_customers', label: 'Số khách hàng',          placeholder: '10,000+', section: 'Thống Kê' },
      { key: 'stat_products',  label: 'Số mẫu kính',           placeholder: '500+' },
      { key: 'stat_brands',    label: 'Số thương hiệu',         placeholder: '50+' },
      { key: 'stat_rating',    label: 'Đánh giá trung bình',    placeholder: '4.9 ★' },
      { key: 'homepage_services',         label: 'Hiển thị section Dịch Vụ',                    isToggle: true, section: 'Hiển Thị Section' },
      { key: 'homepage_testimonials',     label: 'Hiển thị section Đánh Giá Khách Hàng',        isToggle: true },
      { key: 'homepage_face_finder',      label: 'Hiển thị section Chọn Kính Theo Khuôn Mặt',  isToggle: true },
      { key: 'homepage_style_collection', label: 'Hiển thị section Bộ Sưu Tập Theo Phong Cách', isToggle: true },
    ],
    contact: [
      { key: 'contact_phone',   label: 'Số điện thoại', placeholder: '0123 456 789' },
      { key: 'contact_email',   label: 'Email', type: 'email', placeholder: 'info@glass.vn' },
      { key: 'contact_address', label: 'Địa chỉ', placeholder: '123 Nguyễn Huệ, Q.1, TP.HCM' },
    ],
    seo: [
      { key: 'seo_title',       label: 'SEO Title mặc định',      placeholder: 'Glass Eyewear - Kính Mắt Cao Cấp' },
      { key: 'seo_description', label: 'SEO Description mặc định', placeholder: 'Cửa hàng kính mắt thời trang...', isTextarea: true },
      { key: 'seo_keywords',    label: 'SEO Keywords',             placeholder: 'kính mắt, kính thời trang, kính cận' },
    ],
    social: [
      { key: 'social_facebook',  label: 'Facebook URL',  placeholder: 'https://facebook.com/glass' },
      { key: 'social_instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/glass' },
      { key: 'social_youtube',   label: 'YouTube URL',   placeholder: 'https://youtube.com/glass' },
      { key: 'social_tiktok',    label: 'TikTok URL',    placeholder: 'https://tiktok.com/@glass' },
    ],

    // ── Thanh toán ───────────────────────────────────────────────────────
    payment: [
      {
        key: 'payment_sepay_bank_name',
        label: 'Tên ngân hàng (mã VietQR)',
        placeholder: 'vcb',
        section: 'SePay – Thông tin tài khoản nhận tiền',
        hint: 'Mã ngắn theo danh sách VietQR: vcb, mbbank, techcombank, acb, bidv, vietinbank, tpbank...',
      },
      {
        key: 'payment_sepay_account_number',
        label: 'Số tài khoản nhận tiền',
        placeholder: '0123456789',
      },
      {
        key: 'payment_sepay_account_name',
        label: 'Tên chủ tài khoản',
        placeholder: 'NGUYEN VAN A',
        hint: 'Viết IN HOA không dấu để hiển thị đúng trên QR',
      },
      {
        key: 'payment_sepay_api_key',
        label: 'SePay API Key (Webhook Auth)',
        placeholder: 'Apikey từ dashboard SePay...',
        isPassword: true,
        section: 'SePay – Cấu hình Webhook',
        hint: 'Lấy tại: my.sepay.vn → Webhooks → Cấu hình chứng thực → API Key. Để trống nếu không dùng xác thực.',
      },
      {
        key: 'payment_sepay_webhook_url_note',
        label: 'URL Webhook cần đăng ký tại SePay',
        placeholder: 'https://your-domain.com/api/webhook/sepay',
        hint: 'Đây là đường dẫn bạn điền vào dashboard SePay. Không cần lưu vào DB.',
      },
      {
        key: 'payment_cod_enabled',
        label: 'Bật thanh toán COD (tiền mặt khi nhận hàng)',
        isToggle: true,
        section: 'Phương thức thanh toán',
      },
      {
        key: 'payment_bank_transfer_enabled',
        label: 'Bật thanh toán chuyển khoản ngân hàng',
        isToggle: true,
      },
      {
        key: 'payment_free_shipping_threshold',
        label: 'Miễn phí vận chuyển từ (VNĐ)',
        placeholder: '500000',
        section: 'Vận chuyển',
        hint: 'Đơn hàng đạt giá trị này sẽ miễn phí ship. Nhập 0 để luôn tính phí.',
      },
      {
        key: 'payment_shipping_fee',
        label: 'Phí vận chuyển cố định (VNĐ)',
        placeholder: '30000',
      },
    ],

    // ── API & Tích hợp ───────────────────────────────────────────────────
    api: [
      // Gemini AI — quan trọng nhất
      {
        key: 'gemini_api_key',
        label: 'Gemini API Key',
        placeholder: 'AIzaSy...',
        isPassword: true,
        section: 'Google Gemini AI – Thử kính ảo (Try-on)',
        hint: 'Lấy tại: aistudio.google.com → Get API key. Dùng cho tính năng Thử Kính AI trên website.',
      },
      {
        key: 'gemini_model',
        label: 'Gemini Model',
        placeholder: 'gemini-2.5-flash-image',
        hint: 'Model thử kính ảo. Mặc định: gemini-2.5-flash-image. Hệ thống tự chuyển model nếu bị quota (gemini-3.1-flash-image-preview, etc).',
      },

      // OpenAI
      {
        key: 'openai_api_key',
        label: 'OpenAI API Key',
        placeholder: 'sk-proj-...',
        isPassword: true,
        section: 'OpenAI – Tạo nội dung AI (Bài viết, Mô tả sản phẩm)',
        hint: 'Lấy tại: platform.openai.com → API Keys. Dùng để tự động tạo bài viết và mô tả sản phẩm.',
      },
      {
        key: 'openai_model',
        label: 'OpenAI Model',
        placeholder: 'gpt-4o-mini',
        hint: 'Gợi ý: gpt-4o-mini (rẻ, nhanh) | gpt-4o (chất lượng cao) | gpt-3.5-turbo (cũ, rẻ nhất)',
      },
      {
        key: 'openai_max_tokens',
        label: 'Max Tokens mỗi request',
        placeholder: '4096',
        hint: 'Giới hạn độ dài output. 1 token ≈ 3/4 từ tiếng Anh. Tối đa tuỳ model.',
      },

      // Google
      {
        key: 'google_analytics_id',
        label: 'Google Analytics Measurement ID',
        placeholder: 'G-XXXXXXXXXX',
        section: 'Google Analytics & Tag Manager',
        hint: 'Tìm tại: analytics.google.com → Admin → Data Streams → Measurement ID',
      },
      {
        key: 'google_tag_manager_id',
        label: 'Google Tag Manager Container ID',
        placeholder: 'GTM-XXXXXXX',
        hint: 'Tìm tại: tagmanager.google.com → chọn container → Container ID',
      },
      {
        key: 'google_search_console',
        label: 'Google Search Console Verification',
        placeholder: 'abc123xyz...',
        hint: 'Chỉ cần dán phần content của meta tag verification (không cần dán cả thẻ <meta>)',
      },

      // Facebook
      {
        key: 'facebook_pixel_id',
        label: 'Facebook Pixel ID',
        placeholder: '1234567890123456',
        section: 'Meta / Facebook Ads',
        hint: 'Tìm tại: business.facebook.com → Events Manager → Pixel → Pixel ID',
      },
      {
        key: 'facebook_access_token',
        label: 'Facebook Conversions API Token',
        placeholder: 'EAAxxxxxxxx...',
        isPassword: true,
        hint: 'Dùng để tracking server-side, giúp tăng độ chính xác cho Facebook Ads. Nâng cao.',
      },
    ],
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <div className="admin-topbar"><h1 className="admin-topbar__title">Cài Đặt</h1></div>
        <div className="admin-content"><p style={{ color: 'rgba(255,255,255,0.4)' }}>Đang tải...</p></div>
      </>
    );
  }

  const currentFields = settingFields[activeTab] || [];

  // Group fields by section
  const grouped: { section?: string; fields: SettingField[] }[] = [];
  currentFields.forEach(f => {
    if (f.section) {
      grouped.push({ section: f.section, fields: [f] });
    } else {
      const last = grouped[grouped.length - 1];
      if (last) last.fields.push(f);
      else grouped.push({ fields: [f] });
    }
  });

  const renderField = (field: SettingField) => {
    if (field.isToggle) {
      return (
        <button
          type="button"
          onClick={() => toggleSetting(field.key)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: settings[field.key] === '1' ? 'var(--color-gold)' : 'rgba(255,255,255,0.3)',
            fontSize: '1.5rem', transition: 'color 0.2s ease', padding: 0,
          }}
        >
          {settings[field.key] === '1' ? <FiToggleRight /> : <FiToggleLeft />}
          <span style={{ fontSize: '0.875rem' }}>
            {settings[field.key] === '1' ? 'Đang bật' : 'Đang tắt'}
          </span>
        </button>
      );
    }
    if (field.isImage) {
      return (
        <>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={() => { setMediaTarget(field.key); setShowMediaPicker(true); }}>
            <FiImage /> Chọn từ Media
          </button>
          {settings[field.key] && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src={settings[field.key].startsWith('http') ? settings[field.key] : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${settings[field.key]}`}
                alt="" style={{ height: '40px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{settings[field.key]}</span>
              <button onClick={() => updateSetting(field.key, '')} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <FiX />
              </button>
            </div>
          )}
        </>
      );
    }
    if (field.isTextarea) {
      return (
        <textarea className="admin-form__input" rows={3}
          value={settings[field.key] || ''}
          onChange={(e) => updateSetting(field.key, e.target.value)}
          placeholder={field.placeholder} style={{ resize: 'vertical' }}
        />
      );
    }
    if (field.isPassword) {
      const revealed = revealedKeys.has(field.key);
      return (
        <div style={{ position: 'relative' }}>
          <input
            type={revealed ? 'text' : 'password'}
            className="admin-form__input"
            value={settings[field.key] || ''}
            onChange={(e) => updateSetting(field.key, e.target.value)}
            placeholder={field.placeholder}
            style={{ paddingRight: '44px' }}
          />
          <button type="button" onClick={() => {
            setRevealedKeys(prev => {
              const next = new Set(prev);
              next.has(field.key) ? next.delete(field.key) : next.add(field.key);
              return next;
            });
          }} style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', fontSize: '1rem',
          }} title={revealed ? 'Ẩn' : 'Hiện'}>
            {revealed ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
      );
    }
    return (
      <input
        type={field.type || 'text'}
        className="admin-form__input"
        value={settings[field.key] || ''}
        onChange={(e) => updateSetting(field.key, e.target.value)}
        placeholder={field.placeholder}
      />
    );
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Cài Đặt Hệ Thống</h1>
        <div className="admin-topbar__actions">
          <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={handleSave} disabled={saving}>
            <FiSave /> {saving ? 'Đang lưu...' : 'Lưu Cài Đặt'}
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab.id}
              className={`admin-btn ${activeTab === tab.id ? 'admin-btn--primary' : 'admin-btn--secondary'} admin-btn--sm`}
              onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Fields */}
        {grouped.map((group, gi) => (
          <div key={gi} className="admin-card" style={{ marginBottom: '20px' }}>
            {group.section && (
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontSize: '0.8125rem', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--color-gold)',
              }}>
                {group.section}
              </div>
            )}
            <div className="admin-form">
              {group.fields.map(field => (
                <div key={field.key} className="admin-form__group">
                  <label className="admin-form__label">{field.label}</label>
                  {renderField(field)}
                  {field.hint && (
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px', lineHeight: 1.5 }}>
                      Gợi ý: {field.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Font Upload Section */}
        {activeTab === 'font' && (
          <div className="admin-card" style={{ marginBottom: '20px' }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.8125rem', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--color-gold)',
            }}>
              Tải Lên Font Chữ Tùy Chỉnh
            </div>
            <div className="admin-form">
              {/* Current font info */}
              {settings['custom_font_name'] && (
                <div className="admin-form__group">
                  <label className="admin-form__label">Font hiện tại</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '8px 16px',
                      background: 'rgba(212,175,55,0.1)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      borderRadius: '8px',
                      color: 'var(--color-gold)',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                    }}>
                      {settings['custom_font_name']}.{settings['custom_font_format'] || 'ttf'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSetting('custom_font_enabled')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: settings['custom_font_enabled'] === '1' ? '#10b981' : 'rgba(255,255,255,0.3)',
                        fontSize: '1.3rem', transition: 'color 0.2s',
                      }}
                    >
                      {settings['custom_font_enabled'] === '1' ? <FiToggleRight /> : <FiToggleLeft />}
                      <span style={{ fontSize: '0.8125rem' }}>
                        {settings['custom_font_enabled'] === '1' ? 'Đang bật' : 'Đang tắt'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--sm"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                      onClick={async () => {
                        if (!confirm('Xóa font tùy chỉnh? Website sẽ dùng font mặc định.')) return;
                        try {
                          await adminApi.deleteFont(token!);
                          updateSetting('custom_font_name', '');
                          updateSetting('custom_font_url', '');
                          updateSetting('custom_font_format', '');
                          updateSetting('custom_font_enabled', '0');
                          toast.success('Đã xóa font');
                        } catch (err: any) {
                          toast.error(err.message);
                        }
                      }}
                    >
                      <FiTrash2 /> Xóa font
                    </button>
                  </div>
                  {/* Preview */}
                  {settings['custom_font_url'] && settings['custom_font_enabled'] === '1' && (
                    <div style={{
                      marginTop: '12px',
                      padding: '16px 20px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Xem trước (sau khi build lại):</p>
                      <p style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.8)' }}>
                        Kính Mắt Thời Trang Cao Cấp - Glass Eyewear
                      </p>
                      <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)' }}>
                        ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Upload */}
              <div className="admin-form__group">
                <label className="admin-form__label">
                  {settings['custom_font_name'] ? 'Thay đổi font' : 'Chọn file font'}
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    id="font-upload-input"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const maxSize = 5 * 1024 * 1024;
                      if (file.size > maxSize) {
                        toast.error('File font không được vượt quá 5MB');
                        return;
                      }
                      const loadingToast = toast.loading('Đang upload font...');
                      try {
                        const res = await adminApi.uploadFont(token!, file);
                        updateSetting('custom_font_name', res.font_name);
                        updateSetting('custom_font_url', res.font_url);
                        updateSetting('custom_font_enabled', '1');
                        const ext = file.name.split('.').pop() || 'ttf';
                        updateSetting('custom_font_format', ext);
                        toast.success('Upload font thành công!', { id: loadingToast });
                      } catch (err: any) {
                        toast.error(err.message || 'Upload thất bại', { id: loadingToast });
                      }
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() => document.getElementById('font-upload-input')?.click()}
                  >
                    <FiUpload /> Chọn File Font
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                    Hỗ trợ: .ttf, .otf, .woff, .woff2 (tối đa 5MB)
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px', lineHeight: 1.5 }}>
                  Gợi ý: Font sẽ được áp dụng cho toàn bộ website sau khi bật. Cần build lại trên server để có hiệu lực hoàn toàn.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rewards Config Section */}
        {activeTab === 'rewards' && (
          <div className="admin-card" style={{ marginBottom: '20px' }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.8125rem', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--color-gold)',
            }}>
              Phần Thưởng Đăng Ký
            </div>
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">Loại phần thưởng</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['none', 'voucher', 'product', 'points'].map(t => (
                    <button key={t} type="button"
                      onClick={() => updateSetting('reward_type', t)}
                      className={`admin-btn admin-btn--sm ${settings['reward_type'] === t ? 'admin-btn--primary' : 'admin-btn--secondary'}`}>
                      {t === 'none' ? 'Không' : t === 'voucher' ? '🎟️ Voucher' : t === 'product' ? '🎁 Sản phẩm' : '⭐ Điểm'}
                    </button>
                  ))}
                </div>
              </div>

              {settings['reward_type'] === 'voucher' && (
                <>
                  <div className="admin-form__group">
                    <label className="admin-form__label">Loại voucher</label>
                    <select className="admin-form__input" value={settings['voucher_type'] || 'percent'}
                      onChange={e => updateSetting('voucher_type', e.target.value)}>
                      <option value="percent">Giảm theo %</option>
                      <option value="fixed">Giảm cố định (VNĐ)</option>
                    </select>
                  </div>
                  <div className="admin-form__group">
                    <label className="admin-form__label">Giá trị giảm</label>
                    <input className="admin-form__input" type="number" value={settings['voucher_discount'] || ''}
                      onChange={e => updateSetting('voucher_discount', e.target.value)}
                      placeholder={settings['voucher_type'] === 'percent' ? 'VD: 10 (%)' : 'VD: 50000 (VNĐ)'} />
                  </div>
                  <div className="admin-form__group">
                    <label className="admin-form__label">Đơn hàng tối thiểu (VNĐ)</label>
                    <input className="admin-form__input" type="number" value={settings['voucher_min_order'] || ''}
                      onChange={e => updateSetting('voucher_min_order', e.target.value)} placeholder="0 = không giới hạn" />
                  </div>
                </>
              )}

              {settings['reward_type'] === 'product' && (
                <div className="admin-form__group">
                  <label className="admin-form__label">ID sản phẩm tặng</label>
                  <input className="admin-form__input" type="number" value={settings['reward_product_id'] || ''}
                    onChange={e => updateSetting('reward_product_id', e.target.value)}
                    placeholder="Nhập ID sản phẩm muốn tặng" />
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>
                    Vào trang Sản phẩm để lấy ID sản phẩm
                  </p>
                </div>
              )}

              {settings['reward_type'] === 'points' && (
                <div className="admin-form__group">
                  <label className="admin-form__label">Số điểm thưởng đăng ký</label>
                  <input className="admin-form__input" type="number" value={settings['register_bonus_points'] || ''}
                    onChange={e => updateSetting('register_bonus_points', e.target.value)} placeholder="VD: 50" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loyalty Points Config */}
        {activeTab === 'rewards' && (
          <div className="admin-card" style={{ marginBottom: '20px' }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.8125rem', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--color-gold)',
            }}>
              Cài Đặt Tích Điểm
            </div>
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">Tỷ lệ tích điểm: X VNĐ = 1 điểm</label>
                <input className="admin-form__input" type="number" value={settings['points_per_vnd'] || ''}
                  onChange={e => updateSetting('points_per_vnd', e.target.value)} placeholder="VD: 10000 (mỗi 10.000đ = 1 điểm)" />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">Quy đổi: 1 điểm = X VNĐ</label>
                <input className="admin-form__input" type="number" value={settings['vnd_per_point'] || ''}
                  onChange={e => updateSetting('vnd_per_point', e.target.value)} placeholder="VD: 1000 (1 điểm = 1.000đ)" />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">Tối thiểu điểm để đổi thưởng</label>
                <input className="admin-form__input" type="number" value={settings['min_redeem_points'] || ''}
                  onChange={e => updateSetting('min_redeem_points', e.target.value)} placeholder="VD: 100" />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', padding: '0 20px 16px', lineHeight: 1.5 }}>
                💡 Điểm được cộng tự động khi đơn hàng có trạng thái "Đã giao". Khách hàng có thể đổi điểm → voucher giảm giá.
              </p>
            </div>
          </div>
        )}
      </div>

      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => { updateSetting(mediaTarget, url); }}
      />
    </>
  );
}
