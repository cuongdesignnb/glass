'use client';

import { useState } from 'react';
import { publicApi } from '@/lib/api';
import { formatPrice, formatDate, ORDER_STATUSES } from '@/lib/constants';
import {
  FiSearch, FiPackage, FiTruck, FiCheckCircle, FiClock, FiXCircle,
  FiMapPin, FiPhone, FiUser, FiCreditCard, FiChevronRight,
} from 'react-icons/fi';

const VTP_STATUSES: Record<number, { label: string; color: string; icon: string }> = {
  100: { label: 'Đã tiếp nhận', color: '#3b82f6', icon: '📋' },
  101: { label: 'Đang lấy hàng', color: '#f59e0b', icon: '🏃' },
  102: { label: 'Đã nhập kho', color: '#8b5cf6', icon: '📦' },
  103: { label: 'Đang vận chuyển', color: '#6366f1', icon: '🚚' },
  104: { label: 'Đã đến kho phát', color: '#0ea5e9', icon: '🏪' },
  200: { label: 'Đang giao hàng', color: '#f97316', icon: '🛵' },
  201: { label: 'Giao lại', color: '#ef4444', icon: '🔄' },
  300: { label: 'Đang chuyển hoàn', color: '#f43f5e', icon: '↩️' },
  500: { label: 'Phát thành công', color: '#10b981', icon: '✅' },
  501: { label: 'Đã giao hàng', color: '#10b981', icon: '✅' },
  503: { label: 'Đã đối soát', color: '#059669', icon: '💰' },
  [-100]: { label: 'Đã hủy', color: '#ef4444', icon: '❌' },
};

// Internal status to step index
const STATUS_STEPS = [
  { key: 'pending', label: 'Chờ Xác Nhận', icon: <FiClock />, color: '#f59e0b' },
  { key: 'confirmed', label: 'Đã Xác Nhận', icon: <FiCheckCircle />, color: '#3b82f6' },
  { key: 'shipping', label: 'Đang Giao', icon: <FiTruck />, color: '#8b5cf6' },
  { key: 'delivered', label: 'Đã Giao', icon: <FiPackage />, color: '#10b981' },
];

export default function TraCuuDonHangPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
      setError('Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await publicApi.trackOrder(orderNumber.trim(), phone.trim());
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Không tìm thấy đơn hàng');
    }
    setLoading(false);
  };

  const getStepIndex = (status: string) => {
    if (status === 'cancelled') return -1;
    return STATUS_STEPS.findIndex(s => s.key === status);
  };

  const parseTrackingLog = (tracking: any) => {
    if (!tracking?.tracking_log) return [];
    const log = Array.isArray(tracking.tracking_log) ? tracking.tracking_log : [];
    return log;
  };

  return (
    <div className="tracking-page">
      {/* Hero Section */}
      <section className="tracking-hero">
        <div className="tracking-hero__bg" />
        <div className="tracking-hero__content">
          <div className="tracking-hero__icon">
            <FiPackage size={36} />
          </div>
          <h1 className="tracking-hero__title">Tra Cứu Đơn Hàng</h1>
          <p className="tracking-hero__subtitle">
            Nhập mã đơn hàng và số điện thoại để theo dõi tình trạng giao hàng
          </p>

          <form onSubmit={handleSearch} className="tracking-form">
            <div className="tracking-form__group">
              <div className="tracking-form__field">
                <FiPackage className="tracking-form__icon" />
                <input
                  type="text"
                  placeholder="Mã đơn hàng (VD: GLS20260406XXXX)"
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  className="tracking-form__input"
                />
              </div>
              <div className="tracking-form__field">
                <FiPhone className="tracking-form__icon" />
                <input
                  type="tel"
                  placeholder="Số điện thoại đặt hàng"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="tracking-form__input"
                />
              </div>
              <button type="submit" disabled={loading} className="tracking-form__btn">
                {loading ? (
                  <span className="tracking-form__spinner" />
                ) : (
                  <FiSearch size={18} />
                )}
                {loading ? 'Đang tìm...' : 'Tra Cứu'}
              </button>
            </div>
          </form>

          {error && (
            <div className="tracking-error">
              <FiXCircle /> {error}
            </div>
          )}
        </div>
      </section>

      {/* Result Section */}
      {result && (
        <section className="tracking-result">
          <div className="tracking-result__container">
            {/* Order Status Steps */}
            {result.order.status !== 'cancelled' ? (
              <div className="tracking-steps">
                {STATUS_STEPS.map((step, i) => {
                  const currentIdx = getStepIndex(result.order.status);
                  const isActive = i <= currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={step.key} className={`tracking-step ${isActive ? 'tracking-step--active' : ''} ${isCurrent ? 'tracking-step--current' : ''}`}>
                      <div className="tracking-step__dot" style={{ borderColor: isActive ? step.color : undefined, background: isActive ? step.color : undefined }}>
                        {step.icon}
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className="tracking-step__line" style={{ background: i < currentIdx ? step.color : undefined }} />
                      )}
                      <div className="tracking-step__label">{step.label}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="tracking-cancelled">
                <FiXCircle size={32} />
                <span>Đơn hàng đã bị hủy</span>
              </div>
            )}

            <div className="tracking-grid">
              {/* Left: Order Info */}
              <div className="tracking-card">
                <h3 className="tracking-card__title">
                  <FiPackage /> Thông Tin Đơn Hàng
                </h3>
                <div className="tracking-info">
                  <div className="tracking-info__row">
                    <span className="tracking-info__label">Mã đơn hàng</span>
                    <span className="tracking-info__value tracking-info__value--gold">{result.order.order_number}</span>
                  </div>
                  <div className="tracking-info__row">
                    <span className="tracking-info__label">Trạng thái</span>
                    <span className={`tracking-badge tracking-badge--${result.order.status}`}>
                      {ORDER_STATUSES.find(s => s.value === result.order.status)?.label || result.order.status}
                    </span>
                  </div>
                  <div className="tracking-info__row">
                    <span className="tracking-info__label">Ngày đặt</span>
                    <span className="tracking-info__value">{formatDate(result.order.created_at)}</span>
                  </div>
                  <div className="tracking-info__row">
                    <span className="tracking-info__label">Thanh toán</span>
                    <span className="tracking-info__value">
                      {result.order.payment_method === 'bank_transfer' ? 'Chuyển khoản' : 'COD'}
                      {result.order.payment_status === 'paid' && (
                        <span className="tracking-badge tracking-badge--delivered" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>
                          Đã thanh toán
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Products */}
                <div className="tracking-items">
                  <h4 className="tracking-items__title">Sản phẩm</h4>
                  {result.order.items?.map((item: any, i: number) => (
                    <div key={i} className="tracking-item">
                      {item.image && (
                        <img
                          src={item.image.startsWith('http') ? item.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${item.image}`}
                          alt={item.name}
                          className="tracking-item__img"
                        />
                      )}
                      <div className="tracking-item__info">
                        <div className="tracking-item__name">{item.name}</div>
                        <div className="tracking-item__meta">
                          SL: {item.quantity}
                          {item.color_name && (
                            <>
                              {' · '}
                              <span style={{
                                width: 10, height: 10, borderRadius: '50%',
                                background: item.color || '#999',
                                display: 'inline-block', verticalAlign: 'middle',
                                marginRight: '4px',
                              }} />
                              {item.color_name}
                            </>
                          )}
                        </div>
                        {item.addons && item.addons.length > 0 && (
                          <div className="tracking-item__addons">
                            {item.addons.map((a: any, j: number) => (
                              <span key={j}>{a.groupName}: {a.optionName}{a.price > 0 ? ` (+${formatPrice(a.price)})` : ''}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="tracking-item__price">{formatPrice(item.price * item.quantity)}</div>
                    </div>
                  ))}
                </div>

                {/* Price Summary */}
                <div className="tracking-summary">
                  <div className="tracking-summary__row">
                    <span>Tạm tính</span>
                    <span>{formatPrice(result.order.subtotal)}</span>
                  </div>
                  <div className="tracking-summary__row">
                    <span>Vận chuyển</span>
                    <span>{formatPrice(result.order.shipping)}</span>
                  </div>
                  {result.order.discount > 0 && (
                    <div className="tracking-summary__row tracking-summary__row--discount">
                      <span>Giảm giá</span>
                      <span>-{formatPrice(result.order.discount)}</span>
                    </div>
                  )}
                  <div className="tracking-summary__row tracking-summary__row--total">
                    <span>Tổng cộng</span>
                    <span>{formatPrice(result.order.total)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Shipping Info */}
              <div className="tracking-card">
                <h3 className="tracking-card__title">
                  <FiTruck /> Thông Tin Vận Chuyển
                </h3>

                {result.tracking?.vtp_order_number ? (
                  <>
                    <div className="tracking-info">
                      <div className="tracking-info__row">
                        <span className="tracking-info__label">Mã vận đơn</span>
                        <span className="tracking-info__value" style={{ fontFamily: 'monospace', color: '#818cf8', fontWeight: 700 }}>
                          {result.tracking.vtp_order_number}
                        </span>
                      </div>
                      <div className="tracking-info__row">
                        <span className="tracking-info__label">Dịch vụ</span>
                        <span className="tracking-info__value">{result.tracking.vtp_service || 'Tiêu chuẩn'}</span>
                      </div>
                      <div className="tracking-info__row">
                        <span className="tracking-info__label">Trạng thái</span>
                        <span className="tracking-info__value" style={{
                          color: VTP_STATUSES[result.tracking.vtp_status_code]?.color || '#fff',
                          fontWeight: 600,
                        }}>
                          {VTP_STATUSES[result.tracking.vtp_status_code]?.icon || '📋'}{' '}
                          {result.tracking.vtp_status_name || VTP_STATUSES[result.tracking.vtp_status_code]?.label || 'Đang xử lý'}
                        </span>
                      </div>
                      {result.tracking.vtp_shipping_fee > 0 && (
                        <div className="tracking-info__row">
                          <span className="tracking-info__label">Phí vận chuyển</span>
                          <span className="tracking-info__value">{formatPrice(result.tracking.vtp_shipping_fee)}</span>
                        </div>
                      )}
                    </div>

                    {/* Tracking Timeline */}
                    {(() => {
                      const logs = parseTrackingLog(result.tracking);
                      if (logs.length === 0) return null;
                      return (
                        <div className="tracking-timeline">
                          <h4 className="tracking-timeline__title">Hành Trình Đơn Hàng</h4>
                          <div className="tracking-timeline__list">
                            {logs.slice().reverse().map((log: any, idx: number) => (
                              <div key={idx} className={`tracking-timeline__item ${idx === 0 ? 'tracking-timeline__item--active' : ''}`}>
                                <div className="tracking-timeline__dot" />
                                <div className="tracking-timeline__content">
                                  <div className="tracking-timeline__status">
                                    {VTP_STATUSES[log.status_code]?.icon || '📋'} {log.status_name || `Mã ${log.status_code}`}
                                  </div>
                                  <div className="tracking-timeline__date">
                                    {log.date || log.received_at}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="tracking-no-shipping">
                    <FiTruck size={32} />
                    <p>Đơn hàng chưa được gửi đi hoặc đang được xử lý</p>
                    <p className="tracking-no-shipping__hint">
                      Vui lòng đợi cửa hàng xác nhận và giao cho đơn vị vận chuyển
                    </p>
                  </div>
                )}

                {/* Delivery Address */}
                <div className="tracking-address">
                  <h4 className="tracking-address__title">
                    <FiMapPin /> Địa Chỉ Nhận Hàng
                  </h4>
                  <div className="tracking-address__name">{result.order.customer_name}</div>
                  <div className="tracking-address__phone">{result.order.customer_phone}</div>
                  <div className="tracking-address__detail">
                    {result.order.address}
                    {(result.order.ward || result.order.district || result.order.city) && (
                      <>, {[result.order.ward, result.order.district, result.order.city].filter(Boolean).join(', ')}</>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <style jsx>{`
        .tracking-page {
          min-height: 70vh;
        }

        /* Hero */
        .tracking-hero {
          position: relative;
          padding: 60px 20px 40px;
          text-align: center;
          overflow: hidden;
        }
        .tracking-hero__bg {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          z-index: 0;
        }
        .tracking-hero__bg::after {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 120%, rgba(201,169,110,0.08) 0%, transparent 60%);
        }
        .tracking-hero__content {
          position: relative; z-index: 1;
          max-width: 640px;
          margin: 0 auto;
        }
        .tracking-hero__icon {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(201,169,110,0.2), rgba(201,169,110,0.05));
          border: 1px solid rgba(201,169,110,0.3);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
          color: #c9a96e;
        }
        .tracking-hero__title {
          font-size: 2rem; font-weight: 800;
          color: #fff;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }
        .tracking-hero__subtitle {
          font-size: 1rem;
          color: rgba(255,255,255,0.5);
          margin: 0 0 32px;
        }

        /* Form */
        .tracking-form {
          width: 100%;
        }
        .tracking-form__group {
          display: flex; gap: 10px;
          flex-wrap: wrap;
        }
        .tracking-form__field {
          flex: 1;
          min-width: 200px;
          position: relative;
        }
        .tracking-form__icon {
          position: absolute;
          left: 14px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.3);
          font-size: 1rem;
        }
        .tracking-form__input {
          width: 100%;
          padding: 14px 14px 14px 42px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          color: #fff;
          font-size: 0.9375rem;
          outline: none;
          transition: all 0.2s;
        }
        .tracking-form__input:focus {
          border-color: rgba(201,169,110,0.5);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 3px rgba(201,169,110,0.1);
        }
        .tracking-form__input::placeholder {
          color: rgba(255,255,255,0.3);
        }
        .tracking-form__btn {
          display: flex; align-items: center; gap: 8px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #c9a96e, #b8943f);
          color: #fff;
          border: none; border-radius: 12px;
          font-size: 0.9375rem; font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .tracking-form__btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(201,169,110,0.3);
        }
        .tracking-form__btn:disabled {
          opacity: 0.6; cursor: not-allowed;
        }
        .tracking-form__spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .tracking-error {
          display: flex; align-items: center; gap: 8px; justify-content: center;
          margin-top: 16px;
          padding: 12px 20px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px;
          color: #f87171;
          font-size: 0.875rem;
        }

        /* Result */
        .tracking-result {
          padding: 0 20px 60px;
          background: linear-gradient(180deg, #0f3460 0%, #1a1a2e 100%);
        }
        .tracking-result__container {
          max-width: 1000px;
          margin: 0 auto;
        }

        /* Steps */
        .tracking-steps {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: 0;
          padding: 32px 0 40px;
          position: relative;
        }
        .tracking-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 1;
          max-width: 160px;
        }
        .tracking-step__dot {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.05);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.3);
          font-size: 1.1rem;
          transition: all 0.3s;
          z-index: 2;
        }
        .tracking-step--active .tracking-step__dot {
          color: #fff;
          box-shadow: 0 0 20px rgba(201,169,110,0.2);
        }
        .tracking-step--current .tracking-step__dot {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,169,110,0.4); }
          50% { box-shadow: 0 0 0 10px rgba(201,169,110,0); }
        }
        .tracking-step__line {
          position: absolute;
          top: 22px; left: calc(50% + 22px);
          width: calc(100% - 44px);
          height: 2px;
          background: rgba(255,255,255,0.1);
          z-index: 1;
        }
        .tracking-step__label {
          margin-top: 10px;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-align: center;
        }
        .tracking-step--active .tracking-step__label {
          color: rgba(255,255,255,0.8);
        }

        .tracking-cancelled {
          display: flex; align-items: center; gap: 12px; justify-content: center;
          padding: 28px;
          color: #ef4444;
          font-size: 1.125rem; font-weight: 700;
        }

        /* Grid */
        .tracking-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        /* Card */
        .tracking-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
        }
        .tracking-card__title {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.9375rem; font-weight: 700;
          color: #c9a96e;
          margin: 0 0 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        /* Info rows */
        .tracking-info { margin-bottom: 20px; }
        .tracking-info__row {
          display: flex; justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 0.875rem;
        }
        .tracking-info__label { color: rgba(255,255,255,0.4); }
        .tracking-info__value { color: rgba(255,255,255,0.9); font-weight: 500; }
        .tracking-info__value--gold { color: #c9a96e; font-weight: 700; }

        /* Badge */
        .tracking-badge {
          display: inline-block;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.75rem; font-weight: 600;
        }
        .tracking-badge--pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .tracking-badge--confirmed { background: rgba(59,130,246,0.15); color: #3b82f6; }
        .tracking-badge--shipping { background: rgba(139,92,246,0.15); color: #8b5cf6; }
        .tracking-badge--delivered { background: rgba(16,185,129,0.15); color: #10b981; }
        .tracking-badge--cancelled { background: rgba(239,68,68,0.15); color: #ef4444; }

        /* Items */
        .tracking-items { margin-bottom: 16px; }
        .tracking-items__title {
          font-size: 0.8125rem; font-weight: 600;
          color: rgba(255,255,255,0.5);
          margin: 0 0 10px;
        }
        .tracking-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .tracking-item__img {
          width: 48px; height: 48px;
          border-radius: 8px;
          object-fit: cover;
          background: rgba(255,255,255,0.05);
        }
        .tracking-item__info { flex: 1; }
        .tracking-item__name { font-size: 0.875rem; font-weight: 600; color: #fff; }
        .tracking-item__meta { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 2px; }
        .tracking-item__addons {
          display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;
        }
        .tracking-item__addons span {
          font-size: 0.7rem; color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.04);
          padding: 2px 8px; border-radius: 4px;
        }
        .tracking-item__price {
          font-weight: 600; color: rgba(255,255,255,0.8);
          font-size: 0.875rem; white-space: nowrap;
        }

        /* Summary */
        .tracking-summary {
          padding: 14px;
          background: rgba(201,169,110,0.05);
          border-radius: 10px;
          border: 1px solid rgba(201,169,110,0.1);
        }
        .tracking-summary__row {
          display: flex; justify-content: space-between;
          font-size: 0.875rem;
          padding: 4px 0;
          color: rgba(255,255,255,0.6);
        }
        .tracking-summary__row--discount { color: #10b981; }
        .tracking-summary__row--total {
          font-weight: 700; font-size: 1.05rem;
          color: #c9a96e;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 10px; margin-top: 8px;
        }

        /* Timeline */
        .tracking-timeline { margin: 20px 0; }
        .tracking-timeline__title {
          font-size: 0.8125rem; font-weight: 600;
          color: rgba(255,255,255,0.5);
          margin: 0 0 14px;
        }
        .tracking-timeline__list {
          max-height: 300px; overflow-y: auto;
          padding-right: 8px;
        }
        .tracking-timeline__item {
          display: flex; gap: 12px;
          padding-bottom: 16px;
          position: relative;
        }
        .tracking-timeline__item::before {
          content: '';
          position: absolute;
          left: 5px; top: 14px;
          width: 1px; height: calc(100% - 8px);
          background: rgba(255,255,255,0.08);
        }
        .tracking-timeline__item:last-child::before { display: none; }
        .tracking-timeline__dot {
          width: 11px; height: 11px; min-width: 11px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          margin-top: 4px;
        }
        .tracking-timeline__item--active .tracking-timeline__dot {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16,185,129,0.4);
        }
        .tracking-timeline__content { flex: 1; }
        .tracking-timeline__status {
          font-size: 0.8125rem; font-weight: 600;
          color: rgba(255,255,255,0.7);
        }
        .tracking-timeline__item--active .tracking-timeline__status {
          color: #10b981;
        }
        .tracking-timeline__date {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
        }

        /* No Shipping */
        .tracking-no-shipping {
          text-align: center;
          padding: 32px 20px;
          color: rgba(255,255,255,0.3);
        }
        .tracking-no-shipping p {
          margin: 8px 0 0;
          font-size: 0.875rem;
        }
        .tracking-no-shipping__hint {
          font-size: 0.75rem !important;
          color: rgba(255,255,255,0.2) !important;
        }

        /* Address */
        .tracking-address {
          margin-top: 20px;
          padding: 16px;
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .tracking-address__title {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.8125rem; font-weight: 600;
          color: rgba(255,255,255,0.5);
          margin: 0 0 10px;
        }
        .tracking-address__name { font-weight: 600; color: #fff; font-size: 0.9375rem; }
        .tracking-address__phone { font-size: 0.8125rem; color: rgba(255,255,255,0.5); margin-top: 2px; }
        .tracking-address__detail { font-size: 0.8125rem; color: rgba(255,255,255,0.4); margin-top: 6px; line-height: 1.5; }

        /* Responsive */
        @media (max-width: 768px) {
          .tracking-hero { padding: 40px 16px 28px; }
          .tracking-hero__title { font-size: 1.5rem; }
          .tracking-form__group { flex-direction: column; }
          .tracking-form__field { min-width: unset; }
          .tracking-grid { grid-template-columns: 1fr; }
          .tracking-steps { gap: 0; padding: 20px 8px 28px; }
          .tracking-step__dot { width: 36px; height: 36px; font-size: 0.9rem; }
          .tracking-step__line { top: 18px; left: calc(50% + 18px); width: calc(100% - 36px); }
          .tracking-step__label { font-size: 0.65rem; }
          .tracking-result { padding: 0 12px 40px; }
        }
      `}</style>
    </div>
  );
}
