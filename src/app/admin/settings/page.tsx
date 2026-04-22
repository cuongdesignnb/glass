"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";
import { useToken } from "@/lib/useToken";
import MediaPicker from "@/components/admin/MediaPicker";
import {
  FiSave,
  FiGlobe,
  FiMail,
  FiPhone,
  FiMapPin,
  FiSearch,
  FiShare2,
  FiKey,
  FiImage,
  FiX,
  FiHome,
  FiToggleLeft,
  FiToggleRight,
  FiEye,
  FiEyeOff,
  FiCreditCard,
  FiType,
  FiUpload,
  FiTrash2,
  FiGift,
  FiTruck,
  FiRefreshCw,
  FiCheckCircle,
  FiZap,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { invalidateSettings } from "@/lib/useSettings";

export default function AdminSettingsPage() {
  const { token } = useToken();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaTarget, setMediaTarget] = useState("");
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
        if (typeof group === "object") {
          Object.entries(group).forEach(([key, value]) => {
            flat[key] = value as string;
          });
        }
      });
      setSettings(flat);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSetting = (key: string) => {
    updateSetting(key, settings[key] === "1" ? "0" : "1");
  };

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    const savingToast = toast.loading("Đang lưu cài đặt...");
    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        group: getGroup(key),
      }));
      await adminApi.updateSettings(token, settingsArray);
      invalidateSettings();
      toast.success("Đã lưu thay đổi!", { id: savingToast });
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi khi lưu: " + (err.message || ""), { id: savingToast });
    } finally {
      setSaving(false);
    }
  };

  const getGroup = (key: string): string => {
    if (key.startsWith("seo_")) return "seo";
    if (key.startsWith("social_")) return "social";
    if (key.startsWith("contact_")) return "contact";
    if (
      key.startsWith("hero_") ||
      key.startsWith("stat_") ||
      key.startsWith("homepage_")
    )
      return "homepage";
    if (key.startsWith("brand_")) return "general";
    if (key.startsWith("payment_")) return "payment";
    if (key.startsWith("font_") || key.startsWith("custom_font_"))
      return "font";
    if (
      key.startsWith("gemini_") ||
      key.startsWith("openai_") ||
      key.startsWith("google_") ||
      key.startsWith("facebook_") ||
      key.startsWith("merchant_")
    )
      return "api";
    if (
      key.includes("api_key") ||
      key.includes("analytics") ||
      key.includes("pixel")
    )
      return "api";
    if (
      key.startsWith("reward_") ||
      key.startsWith("voucher_") ||
      key.startsWith("points_") ||
      key.startsWith("register_") ||
      key.startsWith("min_redeem")
    )
      return "rewards";
    if (key.startsWith("vtp_")) return "shipping";
    return "general";
  };

  const tabs = [
    { id: "general", label: "Chung", icon: <FiGlobe /> },
    { id: "homepage", label: "Trang Chủ", icon: <FiHome /> },
    { id: "contact", label: "Liên hệ", icon: <FiPhone /> },
    { id: "seo", label: "SEO", icon: <FiSearch /> },
    { id: "social", label: "Mạng xã hội", icon: <FiShare2 /> },
    { id: "payment", label: "Thanh toán", icon: <FiCreditCard /> },
    { id: "shipping", label: "Vận chuyển", icon: <FiTruck /> },
    { id: "rewards", label: "Phần thưởng", icon: <FiGift /> },
    { id: "font", label: "Font chữ", icon: <FiType /> },
    { id: "api", label: "API & Tích hợp", icon: <FiKey /> },
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
    isColor?: boolean;
    hint?: string;
    section?: string;
  };

  const settingFields: Record<string, SettingField[]> = {
    general: [
      { key: "site_name", label: "Tên Website", placeholder: "Glass Eyewear" },
      {
        key: "site_description",
        label: "Mô tả Website",
        placeholder: "Cửa hàng kính mắt...",
        isTextarea: true,
      },
      { key: "site_logo", label: "Logo", isImage: true },
      { key: "site_favicon", label: "Favicon", isImage: true },
      {
        key: "brand_color",
        label: "Màu chủ đạo",
        isColor: true,
        section: "Giao Diện",
        hint: "Chọn màu chủ đạo cho website. Màu này sẽ áp dụng cho tất cả nút bấm, link, accent trên toàn bộ trang.",
      },
    ],
    homepage: [
      {
        key: "hero_image",
        label: "Ảnh Hero PC (nền)",
        isImage: true,
        section: "Hero Section",
        hint: "Kích thước khuyến nghị: 1920 × 800px (tỷ lệ ngang 2.4:1)",
      },
      {
        key: "hero_image_mobile",
        label: "Ảnh Hero Mobile",
        isImage: true,
        hint: "Kích thước khuyến nghị: 750 × 1000px (tỷ lệ dọc 3:4). Nếu để trống sẽ dùng ảnh PC.",
      },
      {
        key: "hero_title",
        label: "Tiêu đề Hero",
        placeholder: "Phong Cách Đẳng Cấp Qua Mỗi Ánh Nhìn",
      },
      {
        key: "hero_subtitle",
        label: "Mô tả Hero",
        placeholder: "Khám phá bộ sưu tập kính mắt cao cấp...",
        isTextarea: true,
      },
      {
        key: "hero_cta_text",
        label: "Nội dung nút CTA chính",
        placeholder: "Khám Phá Ngay",
      },
      {
        key: "hero_tag",
        label: "Tag nhỏ trên tiêu đề",
        placeholder: "Bộ Sưu Tập Mới 2026",
      },
      {
        key: "hero_text_color",
        label: "Màu chữ Hero",
        isColor: true,
        hint: "Chọn màu chữ tiêu đề Hero. Nên chọn màu sáng nếu ảnh nền tối và ngược lại.",
      },
      {
        key: "hero_desc_color",
        label: "Màu mô tả Hero",
        isColor: true,
        hint: "Chọn màu chữ mô tả phụ.",
      },
      {
        key: "hero_overlay",
        label: "Overlay Hero",
        placeholder: "left-dark",
        hint: "Kiểu overlay: left-dark, left-light, full-dark, full-light, none. Giúp text nổi bật trên ảnh nền.",
      },
      {
        key: "stat_customers",
        label: "Số khách hàng",
        placeholder: "10,000+",
        section: "Thống Kê",
      },
      { key: "stat_products", label: "Số mẫu kính", placeholder: "500+" },
      { key: "stat_brands", label: "Số thương hiệu", placeholder: "50+" },
      {
        key: "stat_rating",
        label: "Đánh giá trung bình",
        placeholder: "4.9 ★",
      },
      {
        key: "homepage_services",
        label: "Hiển thị section Dịch Vụ",
        isToggle: true,
        section: "Hiển Thị Section",
      },
      {
        key: "homepage_testimonials",
        label: "Hiển thị section Đánh Giá Khách Hàng",
        isToggle: true,
      },
      {
        key: "homepage_face_finder",
        label: "Hiển thị section Chọn Kính Theo Khuôn Mặt",
        isToggle: true,
      },
      {
        key: "homepage_style_collection",
        label: "Hiển thị section Bộ Sưu Tập Theo Phong Cách",
        isToggle: true,
      },
    ],
    contact: [
      {
        key: "contact_phone",
        label: "Số điện thoại",
        placeholder: "0123 456 789",
      },
      {
        key: "contact_email",
        label: "Email",
        type: "email",
        placeholder: "info@glass.vn",
      },
      {
        key: "contact_address",
        label: "Địa chỉ",
        placeholder: "123 Nguyễn Huệ, Q.1, TP.HCM",
      },
    ],
    seo: [
      {
        key: "seo_title",
        label: "SEO Title mặc định",
        placeholder: "Glass Eyewear - Kính Mắt Cao Cấp",
      },
      {
        key: "seo_description",
        label: "SEO Description mặc định",
        placeholder: "Cửa hàng kính mắt thời trang...",
        isTextarea: true,
      },
      {
        key: "seo_keywords",
        label: "SEO Keywords",
        placeholder: "kính mắt, kính thời trang, kính cận",
      },
    ],
    social: [
      {
        key: "social_facebook",
        label: "Facebook URL",
        placeholder: "https://facebook.com/glass",
      },
      {
        key: "social_instagram",
        label: "Instagram URL",
        placeholder: "https://instagram.com/glass",
      },
      {
        key: "social_youtube",
        label: "YouTube URL",
        placeholder: "https://youtube.com/glass",
      },
      {
        key: "social_tiktok",
        label: "TikTok URL",
        placeholder: "https://tiktok.com/@glass",
      },
    ],

    // ── Thanh toán ───────────────────────────────────────────────────────
    payment: [
      {
        key: "payment_sepay_bank_name",
        label: "Tên ngân hàng (mã VietQR)",
        placeholder: "vcb",
        section: "SePay – Thông tin tài khoản nhận tiền",
        hint: "Mã ngắn theo danh sách VietQR: vcb, mbbank, techcombank, acb, bidv, vietinbank, tpbank...",
      },
      {
        key: "payment_sepay_account_number",
        label: "Số tài khoản nhận tiền",
        placeholder: "0123456789",
      },
      {
        key: "payment_sepay_account_name",
        label: "Tên chủ tài khoản",
        placeholder: "NGUYEN VAN A",
        hint: "Viết IN HOA không dấu để hiển thị đúng trên QR",
      },
      {
        key: "payment_sepay_api_key",
        label: "SePay API Key (Webhook Auth)",
        placeholder: "Apikey từ dashboard SePay...",
        isPassword: true,
        section: "SePay – Cấu hình Webhook",
        hint: "Lấy tại: my.sepay.vn → Webhooks → Cấu hình chứng thực → API Key. Để trống nếu không dùng xác thực.",
      },
      {
        key: "payment_sepay_webhook_url_note",
        label: "URL Webhook cần đăng ký tại SePay",
        placeholder: "https://your-domain.com/api/webhook/sepay",
        hint: "Đây là đường dẫn bạn điền vào dashboard SePay. Không cần lưu vào DB.",
      },
      {
        key: "payment_cod_enabled",
        label: "Bật thanh toán COD (tiền mặt khi nhận hàng)",
        isToggle: true,
        section: "Phương thức thanh toán",
      },
      {
        key: "payment_bank_transfer_enabled",
        label: "Bật thanh toán chuyển khoản ngân hàng",
        isToggle: true,
      },
      {
        key: "payment_free_shipping_threshold",
        label: "Miễn phí vận chuyển từ (VNĐ)",
        placeholder: "500000",
        section: "Vận chuyển",
        hint: "Đơn hàng đạt giá trị này sẽ miễn phí ship. Nhập 0 để luôn tính phí.",
      },
      {
        key: "payment_shipping_fee",
        label: "Phí vận chuyển cố định (VNĐ)",
        placeholder: "30000",
      },
    ],

    // ── API & Tích hợp ───────────────────────────────────────────────────
    api: [
      // Gemini AI — quan trọng nhất
      {
        key: "gemini_api_key",
        label: "Gemini API Key",
        placeholder: "AIzaSy...",
        isPassword: true,
        section: "Google Gemini AI – Thử kính ảo (Try-on)",
        hint: "Lấy tại: aistudio.google.com → Get API key. Dùng cho tính năng Thử Kính AI trên website.",
      },
      {
        key: "gemini_model",
        label: "Gemini Model (Thử kính)",
        placeholder: "gemini-2.5-flash-image",
        hint: "Model thử kính ảo. Mặc định: gemini-2.5-flash-image. Hệ thống tự chuyển model nếu bị quota.",
      },
      {
        key: "gemini_image_model",
        label: "Gemini Model (Sinh ảnh bài viết)",
        placeholder: "gemini-2.5-flash-image",
        hint: "Dùng cùng model với Thử Kính. Mặc định: gemini-2.5-flash-image. Hệ thống tự fallback qua nhiều model.",
      },

      // OpenAI
      {
        key: "openai_api_key",
        label: "OpenAI API Key",
        placeholder: "sk-proj-...",
        isPassword: true,
        section: "OpenAI – Tạo nội dung AI (Bài viết, Mô tả sản phẩm)",
        hint: "Lấy tại: platform.openai.com → API Keys. Dùng để tự động tạo bài viết và mô tả sản phẩm.",
      },
      {
        key: "openai_model",
        label: "OpenAI Model",
        placeholder: "gpt-4o-mini",
        hint: "Gợi ý: gpt-4o-mini (rẻ, nhanh) | gpt-4o (chất lượng cao) | gpt-3.5-turbo (cũ, rẻ nhất)",
      },
      {
        key: "openai_max_tokens",
        label: "Max Tokens mỗi request",
        placeholder: "4096",
        hint: "Giới hạn độ dài output. 1 token ≈ 3/4 từ tiếng Anh. Tối đa tuỳ model.",
      },

      // Google
      {
        key: "google_analytics_id",
        label: "Google Analytics Measurement ID",
        placeholder: "G-XXXXXXXXXX",
        section: "Google Analytics & Tag Manager",
        hint: "Tìm tại: analytics.google.com → Admin → Data Streams → Measurement ID",
      },
      {
        key: "google_tag_manager_id",
        label: "Google Tag Manager Container ID",
        placeholder: "GTM-XXXXXXX",
        hint: "Tìm tại: tagmanager.google.com → chọn container → Container ID",
      },
      {
        key: "google_search_console",
        label: "Google Search Console Verification",
        placeholder: "abc123xyz...",
        hint: "Chỉ cần dán phần content của meta tag verification (không cần dán cả thẻ <meta>)",
      },

      // Facebook
      {
        key: "facebook_pixel_id",
        label: "Facebook Pixel ID",
        placeholder: "1234567890123456",
        section: "Meta / Facebook Ads",
        hint: "Tìm tại: business.facebook.com → Events Manager → Pixel → Pixel ID",
      },
      {
        key: "facebook_access_token",
        label: "Facebook Conversions API Token",
        placeholder: "EAAxxxxxxxx...",
        isPassword: true,
        hint: "Dùng để tracking server-side, giúp tăng độ chính xác cho Facebook Ads. Nâng cao.",
      },

      // Google Merchant Center
      {
        key: "merchant_center_id",
        label: "Merchant Center ID",
        placeholder: "123456789",
        section: "Google Merchant Center – Đẩy sản phẩm lên Google Shopping",
        hint: "Lấy tại: merchants.google.com → Cài đặt → Mã người bán (Merchant ID). Cần cấu hình Service Account có quyền Content API.",
      },
      {
        key: "merchant_service_account_json",
        label: "Service Account JSON",
        placeholder:
          '{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n..."}',
        isTextarea: true,
        isPassword: true,
        hint: "Dán toàn bộ nội dung file JSON của Service Account. Tạo tại: console.cloud.google.com → IAM & Admin → Service Accounts → Create Key (JSON). Cấp quyền Content API (shoppingcontent.googleapis.com) và add email service account vào Merchant Center với quyền Admin.",
      },
      {
        key: "merchant_country",
        label: "Target Country",
        placeholder: "VN",
        hint: "Mã quốc gia ISO 3166-1 alpha-2 (VD: VN, US, JP). Mặc định: VN",
      },
      {
        key: "merchant_language",
        label: "Content Language",
        placeholder: "vi",
        hint: "Mã ngôn ngữ ISO 639-1 (VD: vi, en). Mặc định: vi",
      },
      {
        key: "merchant_currency",
        label: "Currency",
        placeholder: "VND",
        hint: "Mã tiền tệ ISO 4217. Mặc định: VND",
      },
      {
        key: "merchant_brand_default",
        label: "Brand mặc định",
        placeholder: "Glass Eyewear",
        hint: "Dùng khi sản phẩm không có trường Brand. Mặc định: tên website.",
      },
      {
        key: "site_url",
        label: "URL Website (dùng cho sitemap & Merchant)",
        placeholder: "https://glass.example.com",
        hint: "URL đầy đủ của website (không có / ở cuối). Dùng để tạo link sản phẩm gửi lên Google Merchant.",
      },
    ],

    // ── Vận chuyển (Viettel Post) ─────────────────────────────────────────
    shipping: [
      {
        key: "vtp_username",
        label: "Email / Username Viettel Post",
        placeholder: "email@example.com",
        section: "Tài khoản Viettel Post",
        hint: "Email đăng ký tài khoản đối tác trên partner.viettelpost.vn",
      },
      {
        key: "vtp_password",
        label: "Mật khẩu Viettel Post",
        placeholder: "••••••••",
        isPassword: true,
        hint: "Mật khẩu tài khoản đối tác Viettel Post",
      },
      {
        key: "vtp_environment",
        label: "Môi trường",
        placeholder: "production",
        hint: 'Nhập "dev" để dùng sandbox (test), để trống hoặc "production" cho thực tế',
      },
      {
        key: "vtp_sender_name",
        label: "Tên người gửi",
        placeholder: "Glass Eyewear",
        section: "Thông tin người gửi (Cửa hàng)",
      },
      {
        key: "vtp_sender_phone",
        label: "Số điện thoại người gửi",
        placeholder: "0123456789",
      },
      {
        key: "vtp_sender_address",
        label: "Địa chỉ người gửi",
        placeholder: "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1",
        hint: "Địa chỉ chi tiết kho hàng/cửa hàng",
      },
      {
        key: "vtp_sender_province_id",
        label: "Province ID (Tỉnh/TP)",
        placeholder: "VD: 2 (TP.HCM)",
        hint: "ID tỉnh/thành phố theo hệ thống Viettel Post. Xem danh sách tại Hướng dẫn VTP.",
      },
      {
        key: "vtp_sender_district_id",
        label: "District ID (Quận/Huyện)",
        placeholder: "VD: 38",
      },
      {
        key: "vtp_sender_wards_id",
        label: "Wards ID (Phường/Xã)",
        placeholder: "VD: 622",
      },
      {
        key: "vtp_default_service",
        label: "Dịch vụ mặc định",
        placeholder: "LCOD",
        section: "Cấu hình giao hàng",
        hint: "VCN (Nhanh), VHT (Hỏa tốc), LCOD (COD thường), VCBO (Bộ), SCOD (Economy), PHS (Phát hàng nhanh)",
      },
      {
        key: "vtp_default_weight",
        label: "Khối lượng mặc định (gram)",
        placeholder: "500",
        hint: "Khối lượng mặc định cho 1 đơn hàng nếu không chỉ định",
      },
      {
        key: "vtp_order_payment",
        label: "Bên trả phí ship",
        placeholder: "3",
        hint: "1 = Người gửi trả | 2 = Người nhận trả | 3 = Không thu tiền COD | 4 = Nhận hàng trả tiền",
      },
      {
        key: "vtp_group_address_id",
        label: "Group Address ID",
        placeholder: "0",
        hint: "ID nhóm địa chỉ từ Viettel Post (nếu có). Mặc định: 0",
      },
      {
        key: "vtp_customer_id",
        label: "Customer ID (VTP)",
        placeholder: "0",
        hint: "Mã khách hàng trên hệ thống Viettel Post (CUS_ID)",
      },
      {
        key: "vtp_auto_push",
        label: "Tự động gửi đơn sang VTP khi xác nhận",
        isToggle: true,
        section: "Tự động hóa",
        hint: "Khi bật, đơn hàng sẽ tự động được gửi sang Viettel Post khi admin xác nhận đơn.",
      },
    ],
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <div className="admin-topbar">
          <h1 className="admin-topbar__title">Cài Đặt</h1>
        </div>
        <div className="admin-content">
          <p style={{ color: "rgba(255,255,255,0.4)" }}>Đang tải...</p>
        </div>
      </>
    );
  }

  const currentFields = settingFields[activeTab] || [];

  // Group fields by section
  const grouped: { section?: string; fields: SettingField[] }[] = [];
  currentFields.forEach((f) => {
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
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color:
              settings[field.key] === "1"
                ? "var(--color-gold)"
                : "rgba(255,255,255,0.3)",
            fontSize: "1.5rem",
            transition: "color 0.2s ease",
            padding: 0,
          }}
        >
          {settings[field.key] === "1" ? <FiToggleRight /> : <FiToggleLeft />}
          <span style={{ fontSize: "0.875rem" }}>
            {settings[field.key] === "1" ? "Đang bật" : "Đang tắt"}
          </span>
        </button>
      );
    }
    if (field.isImage) {
      return (
        <>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={() => {
              setMediaTarget(field.key);
              setShowMediaPicker(true);
            }}
          >
            <FiImage /> Chọn từ Media
          </button>
          {settings[field.key] && (
            <div
              style={{
                marginTop: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <img
                src={
                  settings[field.key].startsWith("http")
                    ? settings[field.key]
                    : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}${settings[field.key]}`
                }
                alt=""
                style={{
                  height: "40px",
                  borderRadius: "4px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
              <span
                style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}
              >
                {settings[field.key]}
              </span>
              <button
                onClick={() => updateSetting(field.key, "")}
                style={{
                  color: "rgba(255,255,255,0.3)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <FiX />
              </button>
            </div>
          )}
        </>
      );
    }
    if (field.isTextarea) {
      const revealed = revealedKeys.has(field.key);
      const isSensitive = !!field.isPassword;
      return (
        <div style={{ position: "relative" }}>
          <textarea
            className="admin-form__input"
            rows={field.isPassword ? 6 : 3}
            value={settings[field.key] || ""}
            onChange={(e) => updateSetting(field.key, e.target.value)}
            placeholder={field.placeholder}
            style={{
              resize: "vertical",
              fontFamily: isSensitive ? "monospace" : undefined,
              filter:
                isSensitive && !revealed && settings[field.key]
                  ? "blur(4px)"
                  : undefined,
              transition: "filter 0.2s",
            }}
          />
          {isSensitive && (
            <button
              type="button"
              onClick={() => toggleReveal(field.key)}
              style={{
                position: "absolute",
                right: "12px",
                top: "12px",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.8)",
                fontSize: "1rem",
                padding: "4px 8px",
                borderRadius: "6px",
              }}
              title={revealed ? "Ẩn" : "Hiện"}
            >
              {revealed ? <FiEyeOff /> : <FiEye />}
            </button>
          )}
        </div>
      );
    }
    if (field.isPassword) {
      const revealed = revealedKeys.has(field.key);
      return (
        <div style={{ position: "relative" }}>
          <input
            type={revealed ? "text" : "password"}
            className="admin-form__input"
            value={settings[field.key] || ""}
            onChange={(e) => updateSetting(field.key, e.target.value)}
            placeholder={field.placeholder}
            style={{ paddingRight: "44px" }}
          />
          <button
            type="button"
            onClick={() => {
              setRevealedKeys((prev) => {
                const next = new Set(prev);
                next.has(field.key)
                  ? next.delete(field.key)
                  : next.add(field.key);
                return next;
              });
            }}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.4)",
              fontSize: "1rem",
            }}
            title={revealed ? "Ẩn" : "Hiện"}
          >
            {revealed ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
      );
    }
    if (field.isColor) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            type="color"
            value={settings[field.key] || "#c9a96e"}
            onChange={(e) => updateSetting(field.key, e.target.value)}
            style={{
              width: "48px",
              height: "40px",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px",
              cursor: "pointer",
              padding: "2px",
              background: "rgba(255,255,255,0.06)",
            }}
          />
          <input
            type="text"
            className="admin-form__input"
            value={settings[field.key] || "#c9a96e"}
            onChange={(e) => updateSetting(field.key, e.target.value)}
            placeholder="#c9a96e"
            style={{ maxWidth: "180px", fontFamily: "monospace" }}
          />
          <div
            style={{
              width: "100px",
              height: "36px",
              borderRadius: "8px",
              background: settings[field.key] || "#c9a96e",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
          <button
            type="button"
            onClick={() => updateSetting(field.key, "#c9a96e")}
            style={{
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.4)",
              background: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Mặc định
          </button>
        </div>
      );
    }
    return (
      <input
        type={field.type || "text"}
        className="admin-form__input"
        value={settings[field.key] || ""}
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
          <button
            className="admin-btn admin-btn--primary admin-btn--sm"
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave /> {saving ? "Đang lưu..." : "Lưu Cài Đặt"}
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`admin-btn ${activeTab === tab.id ? "admin-btn--primary" : "admin-btn--secondary"} admin-btn--sm`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Fields */}
        {grouped.map((group, gi) => (
          <div key={gi} className="admin-card" style={{ marginBottom: "20px" }}>
            {group.section && (
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--color-gold)",
                }}
              >
                {group.section}
              </div>
            )}
            <div className="admin-form">
              {group.fields.map((field) => (
                <div key={field.key} className="admin-form__group">
                  <label className="admin-form__label">{field.label}</label>
                  {renderField(field)}
                  {field.hint && (
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "rgba(255,255,255,0.3)",
                        marginTop: "5px",
                        lineHeight: 1.5,
                      }}
                    >
                      Gợi ý: {field.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Viettel Post Token & Test Section */}
        {activeTab === "shipping" && (
          <div className="admin-card" style={{ marginBottom: "20px" }}>
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: "0.8125rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-gold)",
              }}
            >
              Kết Nối & Token
            </div>
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">Token hiện tại</label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {settings["vtp_token"] ? (
                    <span
                      style={{
                        padding: "8px 16px",
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.3)",
                        borderRadius: "8px",
                        color: "#10b981",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        fontFamily: "monospace",
                      }}
                    >
                      <FiCheckCircle
                        style={{ marginRight: "6px", verticalAlign: "middle" }}
                      />
                      {settings["vtp_token"].substring(0, 30)}...
                    </span>
                  ) : (
                    <span
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: "0.875rem",
                      }}
                    >
                      Chưa có token. Nhấn &quot;Lấy Token&quot; để kết nối.
                    </span>
                  )}
                </div>
              </div>

              <div className="admin-form__group">
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary admin-btn--sm"
                    onClick={async () => {
                      if (!token) return;
                      const t = toast.loading("Đang lấy token Viettel Post...");
                      try {
                        // Cần lưu username/password trước
                        const settingsArr = Object.entries(settings).map(
                          ([key, value]) => ({
                            key,
                            value,
                            group: getGroup(key),
                          }),
                        );
                        await adminApi.updateSettings(token, settingsArr);
                        const res = await adminApi.vtpGetToken(token);
                        if (res.success) {
                          toast.success(res.message, { id: t });
                          loadSettings();
                        } else {
                          toast.error(res.message, { id: t });
                        }
                      } catch (err: any) {
                        toast.error(err.message || "Lỗi lấy token", { id: t });
                      }
                    }}
                  >
                    <FiRefreshCw /> Lấy Token (1 năm)
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={async () => {
                      if (!token) return;
                      const t = toast.loading("Đang kiểm tra kết nối...");
                      try {
                        const res = await adminApi.vtpTestConnection(token);
                        if (res.success) {
                          toast.success(res.message, { id: t });
                        } else {
                          toast.error(res.message, { id: t });
                        }
                      } catch (err: any) {
                        toast.error(err.message || "Lỗi kết nối", { id: t });
                      }
                    }}
                  >
                    <FiZap /> Kiểm Tra Kết Nối
                  </button>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.3)",
                    marginTop: "8px",
                    lineHeight: 1.5,
                  }}
                >
                  💡 Hệ thống sẽ lưu cài đặt trước khi lấy token. Token có hiệu
                  lực 1 năm. Khi hết hạn, nhấn lấy lại.
                </p>
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">
                  URL Webhook (đăng ký tại Viettel Post)
                </label>
                <div
                  style={{
                    padding: "10px 16px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontFamily: "monospace",
                    fontSize: "0.8125rem",
                    color: "var(--color-gold)",
                    wordBreak: "break-all",
                  }}
                >
                  {typeof window !== "undefined"
                    ? `${window.location.origin.replace(":3000", ":8000").replace(":13000", ":8000")}/api/webhook/viettelpost`
                    : "https://your-domain.com/api/webhook/viettelpost"}
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.3)",
                    marginTop: "5px",
                    lineHeight: 1.5,
                  }}
                >
                  Đăng ký URL này tại partner.viettelpost.vn → Webhook Settings.
                  VTP sẽ gửi cập nhật trạng thái đơn hàng tự động.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Font Upload Section */}
        {activeTab === "font" && (
          <div className="admin-card" style={{ marginBottom: "20px" }}>
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: "0.8125rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-gold)",
              }}
            >
              Tải Lên Font Chữ Tùy Chỉnh
            </div>
            <div className="admin-form">
              {/* Current font info */}
              {settings["custom_font_name"] && (
                <div className="admin-form__group">
                  <label className="admin-form__label">Font hiện tại</label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        padding: "8px 16px",
                        background: "rgba(212,175,55,0.1)",
                        border: "1px solid rgba(212,175,55,0.3)",
                        borderRadius: "8px",
                        color: "var(--color-gold)",
                        fontWeight: 600,
                        fontSize: "0.95rem",
                      }}
                    >
                      {settings["custom_font_name"]}.
                      {settings["custom_font_format"] || "ttf"}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSetting("custom_font_enabled")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color:
                          settings["custom_font_enabled"] === "1"
                            ? "#10b981"
                            : "rgba(255,255,255,0.3)",
                        fontSize: "1.3rem",
                        transition: "color 0.2s",
                      }}
                    >
                      {settings["custom_font_enabled"] === "1" ? (
                        <FiToggleRight />
                      ) : (
                        <FiToggleLeft />
                      )}
                      <span style={{ fontSize: "0.8125rem" }}>
                        {settings["custom_font_enabled"] === "1"
                          ? "Đang bật"
                          : "Đang tắt"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--sm"
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        color: "#f87171",
                        border: "1px solid rgba(239,68,68,0.3)",
                      }}
                      onClick={async () => {
                        if (
                          !confirm(
                            "Xóa font tùy chỉnh? Website sẽ dùng font mặc định.",
                          )
                        )
                          return;
                        try {
                          await adminApi.deleteFont(token!);
                          updateSetting("custom_font_name", "");
                          updateSetting("custom_font_url", "");
                          updateSetting("custom_font_format", "");
                          updateSetting("custom_font_enabled", "0");
                          toast.success("Đã xóa font");
                        } catch (err: any) {
                          toast.error(err.message);
                        }
                      }}
                    >
                      <FiTrash2 /> Xóa font
                    </button>
                  </div>
                  {/* Preview */}
                  {settings["custom_font_url"] &&
                    settings["custom_font_enabled"] === "1" && (
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "16px 20px",
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "rgba(255,255,255,0.3)",
                            marginBottom: "8px",
                          }}
                        >
                          Xem trước (sau khi build lại):
                        </p>
                        <p
                          style={{
                            fontSize: "1.5rem",
                            color: "rgba(255,255,255,0.8)",
                          }}
                        >
                          Kính Mắt Thời Trang Cao Cấp - Glass Eyewear
                        </p>
                        <p
                          style={{
                            fontSize: "1rem",
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz
                          0123456789
                        </p>
                      </div>
                    )}
                </div>
              )}

              {/* Upload */}
              <div className="admin-form__group">
                <label className="admin-form__label">
                  {settings["custom_font_name"]
                    ? "Thay đổi font"
                    : "Chọn file font"}
                </label>
                <div
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  <input
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    id="font-upload-input"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const maxSize = 5 * 1024 * 1024;
                      if (file.size > maxSize) {
                        toast.error("File font không được vượt quá 5MB");
                        return;
                      }
                      const loadingToast = toast.loading("Đang upload font...");
                      try {
                        const res = await adminApi.uploadFont(token!, file);
                        updateSetting("custom_font_name", res.font_name);
                        updateSetting("custom_font_url", res.font_url);
                        updateSetting("custom_font_enabled", "1");
                        const ext = file.name.split(".").pop() || "ttf";
                        updateSetting("custom_font_format", ext);
                        toast.success("Upload font thành công!", {
                          id: loadingToast,
                        });
                      } catch (err: any) {
                        toast.error(err.message || "Upload thất bại", {
                          id: loadingToast,
                        });
                      }
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() =>
                      document.getElementById("font-upload-input")?.click()
                    }
                  >
                    <FiUpload /> Chọn File Font
                  </button>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    Hỗ trợ: .ttf, .otf, .woff, .woff2 (tối đa 5MB)
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.3)",
                    marginTop: "8px",
                    lineHeight: 1.5,
                  }}
                >
                  Gợi ý: Font sẽ được áp dụng cho toàn bộ website sau khi bật.
                  Cần build lại trên server để có hiệu lực hoàn toàn.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rewards Config Section */}
        {activeTab === "rewards" && (
          <div className="admin-card" style={{ marginBottom: "20px" }}>
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: "0.8125rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-gold)",
              }}
            >
              Phần Thưởng Đăng Ký
            </div>
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">Loại phần thưởng</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["none", "voucher", "product", "points"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateSetting("reward_type", t)}
                      className={`admin-btn admin-btn--sm ${settings["reward_type"] === t ? "admin-btn--primary" : "admin-btn--secondary"}`}
                    >
                      {t === "none"
                        ? "Không"
                        : t === "voucher"
                          ? "🎟️ Voucher"
                          : t === "product"
                            ? "🎁 Sản phẩm"
                            : "⭐ Điểm"}
                    </button>
                  ))}
                </div>
              </div>

              {settings["reward_type"] === "voucher" && (
                <>
                  <div className="admin-form__group">
                    <label className="admin-form__label">Loại voucher</label>
                    <select
                      className="admin-form__input"
                      value={settings["voucher_type"] || "percent"}
                      onChange={(e) =>
                        updateSetting("voucher_type", e.target.value)
                      }
                    >
                      <option value="percent">Giảm theo %</option>
                      <option value="fixed">Giảm cố định (VNĐ)</option>
                    </select>
                  </div>
                  <div className="admin-form__group">
                    <label className="admin-form__label">Giá trị giảm</label>
                    <input
                      className="admin-form__input"
                      type="number"
                      value={settings["voucher_discount"] || ""}
                      onChange={(e) =>
                        updateSetting("voucher_discount", e.target.value)
                      }
                      placeholder={
                        settings["voucher_type"] === "percent"
                          ? "VD: 10 (%)"
                          : "VD: 50000 (VNĐ)"
                      }
                    />
                  </div>
                  <div className="admin-form__group">
                    <label className="admin-form__label">
                      Đơn hàng tối thiểu (VNĐ)
                    </label>
                    <input
                      className="admin-form__input"
                      type="number"
                      value={settings["voucher_min_order"] || ""}
                      onChange={(e) =>
                        updateSetting("voucher_min_order", e.target.value)
                      }
                      placeholder="0 = không giới hạn"
                    />
                  </div>
                </>
              )}

              {settings["reward_type"] === "product" && (
                <div className="admin-form__group">
                  <label className="admin-form__label">ID sản phẩm tặng</label>
                  <input
                    className="admin-form__input"
                    type="number"
                    value={settings["reward_product_id"] || ""}
                    onChange={(e) =>
                      updateSetting("reward_product_id", e.target.value)
                    }
                    placeholder="Nhập ID sản phẩm muốn tặng"
                  />
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "rgba(255,255,255,0.3)",
                      marginTop: "5px",
                    }}
                  >
                    Vào trang Sản phẩm để lấy ID sản phẩm
                  </p>
                </div>
              )}

              {settings["reward_type"] === "points" && (
                <div className="admin-form__group">
                  <label className="admin-form__label">
                    Số điểm thưởng đăng ký
                  </label>
                  <input
                    className="admin-form__input"
                    type="number"
                    value={settings["register_bonus_points"] || ""}
                    onChange={(e) =>
                      updateSetting("register_bonus_points", e.target.value)
                    }
                    placeholder="VD: 50"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loyalty Points Config */}
        {activeTab === "rewards" && (
          <div className="admin-card" style={{ marginBottom: "20px" }}>
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: "0.8125rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-gold)",
              }}
            >
              Cài Đặt Tích Điểm
            </div>
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">
                  Tỷ lệ tích điểm: X VNĐ = 1 điểm
                </label>
                <input
                  className="admin-form__input"
                  type="number"
                  value={settings["points_per_vnd"] || ""}
                  onChange={(e) =>
                    updateSetting("points_per_vnd", e.target.value)
                  }
                  placeholder="VD: 10000 (mỗi 10.000đ = 1 điểm)"
                />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">
                  Quy đổi: 1 điểm = X VNĐ
                </label>
                <input
                  className="admin-form__input"
                  type="number"
                  value={settings["vnd_per_point"] || ""}
                  onChange={(e) =>
                    updateSetting("vnd_per_point", e.target.value)
                  }
                  placeholder="VD: 1000 (1 điểm = 1.000đ)"
                />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">
                  Tối thiểu điểm để đổi thưởng
                </label>
                <input
                  className="admin-form__input"
                  type="number"
                  value={settings["min_redeem_points"] || ""}
                  onChange={(e) =>
                    updateSetting("min_redeem_points", e.target.value)
                  }
                  placeholder="VD: 100"
                />
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.3)",
                  padding: "0 20px 16px",
                  lineHeight: 1.5,
                }}
              >
                💡 Điểm được cộng tự động khi đơn hàng có trạng thái "Đã giao".
                Khách hàng có thể đổi điểm → voucher giảm giá.
              </p>
            </div>
          </div>
        )}
      </div>

      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => {
          updateSetting(mediaTarget, url);
        }}
      />
    </>
  );
}
