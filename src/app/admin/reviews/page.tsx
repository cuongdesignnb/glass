'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminReviews, invalidateAdmin } from '@/lib/useAdmin';
import { useToken } from '@/lib/useToken';
import { formatDate } from '@/lib/constants';
import { FiSearch, FiCheck, FiTrash2, FiStar, FiImage, FiMessageCircle, FiX, FiFilter } from 'react-icons/fi';

const API_MEDIA_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '');

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <FiStar
          key={star}
          style={{
            fontSize: `${size}px`,
            color: star <= rating ? '#f59e0b' : 'rgba(255,255,255,0.15)',
            fill: star <= rating ? '#f59e0b' : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const { token } = useToken();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingId, setReplyingId] = useState<number | null>(null);

  const params: Record<string, string> = { per_page: '20' };
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;
  if (ratingFilter) params.rating = ratingFilter;

  const { data, isLoading, mutate: refresh } = useAdminReviews(token, params);
  const reviews = data?.data || [];
  const total = data?.total || 0;

  const handleApprove = async (id: number) => {
    if (!token) return;
    try {
      await adminApi.approveReview(token, id);
      invalidateAdmin('/admin/reviews');
      refresh();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa đánh giá này?')) return;
    if (!token) return;
    try {
      await adminApi.deleteReview(token, id);
      invalidateAdmin('/admin/reviews');
      refresh();
      if (selectedReview?.id === id) setSelectedReview(null);
    } catch (err) { console.error(err); }
  };

  const handleReply = async (id: number) => {
    if (!token || !replyText.trim()) return;
    try {
      await adminApi.replyReview(token, id, replyText.trim());
      invalidateAdmin('/admin/reviews');
      refresh();
      setReplyingId(null);
      setReplyText('');
    } catch (err) { console.error(err); }
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Đánh Giá ({total})</h1>
      </div>
      <div className="admin-content">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '8px 14px', gap: '8px', minWidth: '200px' }}>
            <FiSearch style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input type="text" placeholder="Tìm tên, SĐT, nội dung..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.875rem', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setStatusFilter('')}
              className={`admin-btn admin-btn--sm ${!statusFilter ? 'admin-btn--primary' : 'admin-btn--secondary'}`}>Tất cả</button>
            <button onClick={() => setStatusFilter('pending')}
              className={`admin-btn admin-btn--sm ${statusFilter === 'pending' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}>Chờ duyệt</button>
            <button onClick={() => setStatusFilter('approved')}
              className={`admin-btn admin-btn--sm ${statusFilter === 'approved' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}>Đã duyệt</button>
          </div>
          <select
            value={ratingFilter}
            onChange={e => setRatingFilter(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '0.875rem' }}
          >
            <option value="">Tất cả sao</option>
            {[5, 4, 3, 2, 1].map(r => (
              <option key={r} value={String(r)}>{r} sao</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selectedReview ? '1fr 420px' : '1fr', gap: '24px' }}>
          {/* Reviews Table */}
          <div className="admin-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Khách Hàng</th>
                  <th>Sản Phẩm</th>
                  <th>Rating</th>
                  <th>Nội dung</th>
                  <th>Trạng Thái</th>
                  <th>Ngày</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px' }}>Đang tải...</td></tr>
                ) : reviews.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.4)' }}>
                    Không có đánh giá
                  </td></tr>
                ) : reviews.map((review: any) => (
                  <tr key={review.id} onClick={() => setSelectedReview(review)}
                    style={{ cursor: 'pointer', background: selectedReview?.id === review.id ? 'rgba(201,169,110,0.06)' : undefined }}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-white)' }}>{review.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{review.customer_phone}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {review.product?.name || '—'}
                      </div>
                    </td>
                    <td><StarRating rating={review.rating} /></td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {review.comment || '—'}
                      </div>
                      {review.images && review.images.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                          <FiImage /> {review.images.length} ảnh
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge ${review.is_approved ? 'admin-badge--success' : 'admin-badge--warning'}`}>
                        {review.is_approved ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{formatDate(review.created_at)}</td>
                    <td>
                      <div className="admin-table__actions">
                        {!review.is_approved && (
                          <button className="admin-table__action" onClick={(e) => { e.stopPropagation(); handleApprove(review.id); }} title="Duyệt"
                            style={{ color: '#10b981' }}>
                            <FiCheck />
                          </button>
                        )}
                        <button className="admin-table__action" onClick={(e) => { e.stopPropagation(); handleDelete(review.id); }} title="Xóa"
                          style={{ color: '#ef4444' }}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Review Detail Panel */}
          {selectedReview && (
            <div className="admin-card" style={{ position: 'sticky', top: '80px', alignSelf: 'start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="admin-card__title">Chi tiết đánh giá</h3>
                <button onClick={() => setSelectedReview(null)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.25rem' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Customer info */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Khách hàng</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-white)' }}>{selectedReview.customer_name}</div>
                  <div style={{ fontSize: '0.8125rem' }}>{selectedReview.customer_phone}</div>
                </div>

                {/* Product */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Sản phẩm</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                    {selectedReview.product?.name || 'N/A'}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Đánh giá</div>
                  <StarRating rating={selectedReview.rating} size={20} />
                </div>

                {/* Comment */}
                {selectedReview.comment && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Nội dung</div>
                    <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--color-white)', background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px' }}>
                      {selectedReview.comment}
                    </div>
                  </div>
                )}

                {/* Images */}
                {selectedReview.images && selectedReview.images.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Ảnh đánh giá</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {selectedReview.images.map((img: string, i: number) => (
                        <div key={i} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                          <img src={img.startsWith('http') ? img : `${API_MEDIA_URL}${img}`} alt={`Review ${i + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Reply */}
                {selectedReview.admin_reply && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Phản hồi Admin</div>
                    <div style={{ fontSize: '0.8125rem', background: 'rgba(201,169,110,0.08)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--color-gold)' }}>
                      {selectedReview.admin_reply}
                    </div>
                  </div>
                )}

                {/* Reply form */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                    {selectedReview.admin_reply ? 'Cập nhật phản hồi' : 'Trả lời đánh giá'}
                  </div>
                  <textarea
                    value={replyingId === selectedReview.id ? replyText : (selectedReview.admin_reply || '')}
                    onChange={e => { setReplyingId(selectedReview.id); setReplyText(e.target.value); }}
                    onFocus={() => { if (replyingId !== selectedReview.id) { setReplyingId(selectedReview.id); setReplyText(selectedReview.admin_reply || ''); } }}
                    placeholder="Nhập phản hồi..."
                    style={{ width: '100%', minHeight: '80px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '0.8125rem', resize: 'vertical' }}
                  />
                  <button
                    className="admin-btn admin-btn--primary admin-btn--sm"
                    style={{ marginTop: '8px' }}
                    onClick={() => handleReply(selectedReview.id)}
                  >
                    <FiMessageCircle /> Gửi phản hồi
                  </button>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                  {!selectedReview.is_approved && (
                    <button className="admin-btn admin-btn--sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                      onClick={() => handleApprove(selectedReview.id)}>
                      <FiCheck /> Duyệt
                    </button>
                  )}
                  <button className="admin-btn admin-btn--sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                    onClick={() => handleDelete(selectedReview.id)}>
                    <FiTrash2 /> Xóa
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
