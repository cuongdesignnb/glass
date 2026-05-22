import Link from 'next/link';
import { FiArrowLeft, FiSearch } from 'react-icons/fi';
import { RiGlassesLine } from 'react-icons/ri';

export default function PublicNotFound() {
  return (
    <div
      style={{
        paddingTop: 'var(--header-height)',
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ textAlign: 'center', padding: '60px 24px', maxWidth: '560px' }}>
        {/* Icon */}
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(212,86,122,0.08) 0%, rgba(232,168,124,0.08) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '2.5rem',
            color: 'var(--color-rose, #d4567a)',
          }}
        >
          <RiGlassesLine />
        </div>

        {/* 404 number */}
        <div
          style={{
            fontSize: '5rem',
            fontWeight: 800,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #d4567a 0%, #e8a87c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '16px',
            fontFamily: 'var(--font-display, Inter)',
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display, Inter)',
            color: 'var(--color-text-heading, #1a1a2e)',
            marginBottom: '12px',
          }}
        >
          Oops! Không tìm thấy trang
        </h1>

        <p
          style={{
            fontSize: '1.0625rem',
            color: 'var(--color-text-light, #6b7280)',
            lineHeight: 1.7,
            marginBottom: '36px',
          }}
        >
          Trang bạn đang tìm kiếm có thể đã bị xóa, đổi tên hoặc tạm thời không khả dụng.
          Hãy thử tìm kiếm hoặc quay lại trang chủ.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary btn-lg">
            <FiArrowLeft /> Về Trang Chủ
          </Link>
          <Link href="/san-pham" className="btn btn-secondary btn-lg">
            <FiSearch /> Tìm Sản Phẩm
          </Link>
        </div>

        {/* Suggestion links */}
        <div
          style={{
            marginTop: '48px',
            padding: '24px',
            background: 'var(--color-bg-warm, #faf9f7)',
            borderRadius: 'var(--radius-xl, 16px)',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-text-heading, #1a1a2e)',
              marginBottom: '12px',
            }}
          >
            Bạn có thể thử:
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <li>
              <Link
                href="/san-pham"
                style={{
                  color: 'var(--color-rose, #d4567a)',
                  textDecoration: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                }}
              >
                → Xem tất cả sản phẩm kính mắt
              </Link>
            </li>
            <li>
              <Link
                href="/bai-viet"
                style={{
                  color: 'var(--color-rose, #d4567a)',
                  textDecoration: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                }}
              >
                → Đọc bài viết & tư vấn
              </Link>
            </li>
            <li>
              <Link
                href="/thu-kinh-ao"
                style={{
                  color: 'var(--color-rose, #d4567a)',
                  textDecoration: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                }}
              >
                → Thử kính ảo với AI
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
