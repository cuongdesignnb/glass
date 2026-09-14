'use client';

type SlugChangeConfirmProps = {
  currentSlug: string;
  nextSlug: string;
  pathPrefix: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function SlugChangeConfirm({
  currentSlug,
  nextSlug,
  pathPrefix,
  onCancel,
  onConfirm,
}: SlugChangeConfirmProps) {
  const currentUrl = `${pathPrefix}/${currentSlug}`;
  const nextUrl = `${pathPrefix}/${nextSlug}`;

  return (
    <div
      role="alertdialog"
      aria-labelledby="slug-change-warning-title"
      style={{
        marginTop: '12px',
        padding: '14px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(234,179,8,0.45)',
        background: 'rgba(234,179,8,0.08)',
      }}
    >
      <strong id="slug-change-warning-title" style={{ color: 'var(--color-gold)', display: 'block', marginBottom: '8px' }}>
        Bạn đang thay đổi URL
      </strong>
      <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', wordBreak: 'break-word' }}>
        URL hiện tại: {currentUrl}
      </p>
      <p style={{ margin: '4px 0 10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', wordBreak: 'break-word' }}>
        URL mới: {nextUrl}
      </p>
      <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
        Thay đổi URL có thể ảnh hưởng SEO và các liên kết cũ. Chỉ tiếp tục nếu bạn thực sự muốn đổi đường dẫn.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={onCancel}>
          Hủy
        </button>
        <button type="button" className="admin-btn admin-btn--primary admin-btn--sm" onClick={onConfirm}>
          Xác nhận đổi URL
        </button>
      </div>
    </div>
  );
}
