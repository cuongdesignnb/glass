import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: 'linear-gradient(160deg, #faf9f7 0%, #f5f0eb 100%)',
          color: '#1a1a2e',
        }}
      >
        <div style={{ textAlign: 'center', padding: '40px 24px', maxWidth: '520px' }}>
          <div
            style={{
              fontSize: '7rem',
              fontWeight: 800,
              lineHeight: 1,
              background: 'linear-gradient(135deg, #d4567a 0%, #e8a87c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '16px',
            }}
          >
            404
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '12px',
              color: '#1a1a2e',
            }}
          >
            Không tìm thấy trang
          </h1>
          <p
            style={{
              fontSize: '1.0625rem',
              color: '#6b7280',
              lineHeight: 1.7,
              marginBottom: '32px',
            }}
          >
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
            Hãy quay lại trang chủ để tiếp tục mua sắm.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #d4567a 0%, #c2475e 100%)',
                color: '#fff',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem',
                transition: 'transform 0.2s',
              }}
            >
              ← Trang Chủ
            </Link>
            <Link
              href="/san-pham"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                background: '#fff',
                color: '#1a1a2e',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem',
                border: '1.5px solid #e5e7eb',
              }}
            >
              Xem Sản Phẩm
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
