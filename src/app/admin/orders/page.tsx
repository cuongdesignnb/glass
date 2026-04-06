'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminOrders, invalidateAdmin } from '@/lib/useAdmin';
import { useToken } from '@/lib/useToken';
import { formatPrice, formatDate, ORDER_STATUSES } from '@/lib/constants';
import {
  FiSearch, FiEye, FiTruck, FiCheckCircle, FiXCircle, FiPackage, FiClock,
  FiSend, FiMapPin, FiPhone, FiUser, FiCreditCard, FiExternalLink,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// Viettel Post status mapping
const VTP_STATUS_MAP: Record<number, { label: string; color: string; icon: string }> = {
  100: { label: 'Đã tiếp nhận', color: '#3b82f6', icon: '📋' },
  101: { label: 'Đang lấy hàng', color: '#f59e0b', icon: '🏃' },
  102: { label: 'Đã nhập kho', color: '#8b5cf6', icon: '📦' },
  103: { label: 'Đang vận chuyển', color: '#6366f1', icon: '🚚' },
  104: { label: 'Đã đến kho phát', color: '#0ea5e9', icon: '🏪' },
  200: { label: 'Đang giao hàng', color: '#f97316', icon: '🛵' },
  201: { label: 'Giao lại lần 2', color: '#ef4444', icon: '🔄' },
  300: { label: 'Đang chuyển hoàn', color: '#f43f5e', icon: '↩️' },
  500: { label: 'Phát thành công', color: '#10b981', icon: '✅' },
  501: { label: 'Đã giao hàng', color: '#10b981', icon: '✅' },
  503: { label: 'Đã đối soát', color: '#059669', icon: '💰' },
  [-100]: { label: 'Đã hủy', color: '#ef4444', icon: '❌' },
};

export default function AdminOrdersPage() {
  const { token } = useToken();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [pushing, setPushing] = useState(false);

  const params: Record<string, string> = { per_page: '20' };
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading, mutate: refresh } = useAdminOrders(token, params);
  const orders = data?.data || [];
  const total = data?.total || 0;

  const updateStatus = async (orderId: number, status: string) => {
    if (!token) return;
    try {
      await adminApi.updateOrderStatus(token, orderId, { status });
      invalidateAdmin('/admin/orders');
      refresh();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    } catch (err) { console.error(err); }
  };

  const pushToVtp = async (orderId: number) => {
    if (!token || pushing) return;
    setPushing(true);
    const t = toast.loading('Đang gửi đơn sang Viettel Post...');
    try {
      const res = await adminApi.vtpPushOrder(token, orderId);
      if (res.success) {
        toast.success(res.message || 'Đã gửi đơn thành công!', { id: t });
        refresh();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(res.order || { ...selectedOrder, status: 'shipping', vtp_order_number: res.vtp_order_number });
        }
      } else {
        toast.error(res.message || 'Gửi đơn thất bại', { id: t });
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi đơn VTP', { id: t });
    }
    setPushing(false);
  };

  const cancelVtp = async (orderId: number) => {
    if (!token) return;
    if (!confirm('Xác nhận hủy vận đơn Viettel Post?')) return;
    const t = toast.loading('Đang hủy vận đơn...');
    try {
      const res = await adminApi.vtpCancelOrder(token, orderId, 'Hủy bởi admin');
      if (res.success) {
        toast.success('Đã hủy vận đơn VTP', { id: t });
        refresh();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: 'cancelled', vtp_status_code: -100, vtp_status_name: 'Đã hủy vận đơn' });
        }
      } else {
        toast.error(res.message, { id: t });
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hủy đơn', { id: t });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <FiClock />;
      case 'confirmed': return <FiCheckCircle />;
      case 'shipping': return <FiTruck />;
      case 'delivered': return <FiPackage />;
      case 'cancelled': return <FiXCircle />;
      default: return <FiClock />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'delivered': return 'admin-badge--success';
      case 'cancelled': return 'admin-badge--danger';
      case 'shipping': return 'admin-badge--info';
      case 'confirmed': return 'admin-badge--success';
      default: return 'admin-badge--warning';
    }
  };

  const parseTrackingLog = (order: any) => {
    if (!order?.vtp_tracking_log) return [];
    try {
      const log = typeof order.vtp_tracking_log === 'string'
        ? JSON.parse(order.vtp_tracking_log)
        : order.vtp_tracking_log;
      return Array.isArray(log) ? log : [];
    } catch {
      return [];
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Đơn Hàng ({total})</h1>
      </div>
      <div className="admin-content">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '8px 14px', gap: '8px', minWidth: '200px' }}>
            <FiSearch style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input type="text" placeholder="Tìm mã đơn, tên, SĐT..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.875rem', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button onClick={() => setStatusFilter('')}
              className={`admin-btn admin-btn--sm ${!statusFilter ? 'admin-btn--primary' : 'admin-btn--secondary'}`}>Tất cả</button>
            {ORDER_STATUSES.map(s => (
              <button key={s.value} onClick={() => setStatusFilter(s.value)}
                className={`admin-btn admin-btn--sm ${statusFilter === s.value ? 'admin-btn--primary' : 'admin-btn--secondary'}`}>{s.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 420px' : '1fr', gap: '24px' }}>
          {/* Orders Table */}
          <div className="admin-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã Đơn</th>
                  <th>Khách Hàng</th>
                  <th>SĐT</th>
                  <th>Tổng Tiền</th>
                  <th>Trạng Thái</th>
                  <th>VTP</th>
                  <th>Ngày Tạo</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px' }}>Đang tải...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.4)' }}>
                    Không có đơn hàng
                  </td></tr>
                ) : orders.map((order: any) => (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)}
                    style={{ cursor: 'pointer', background: selectedOrder?.id === order.id ? 'rgba(201,169,110,0.06)' : undefined }}>
                    <td><strong style={{ color: 'var(--color-gold)' }}>{order.order_number}</strong></td>
                    <td style={{ fontWeight: 600, color: 'var(--color-white)' }}>{order.customer_name}</td>
                    <td>{order.customer_phone}</td>
                    <td style={{ fontWeight: 600 }}>{formatPrice(order.total)}</td>
                    <td>
                      <span className={`admin-badge ${getStatusBadgeClass(order.status)}`}>
                        {ORDER_STATUSES.find(s => s.value === order.status)?.label || order.status}
                      </span>
                    </td>
                    <td>
                      {order.vtp_order_number ? (
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(16,185,129,0.15)',
                          color: '#10b981',
                          fontWeight: 600,
                        }}>
                          {order.vtp_order_number}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{formatDate(order.created_at)}</td>
                    <td>
                      <div className="admin-table__actions">
                        <button className="admin-table__action" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }} title="Xem"><FiEye /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Order Detail Panel */}
          {selectedOrder && (
            <div className="admin-card" style={{ position: 'sticky', top: '80px', alignSelf: 'start', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="admin-card__title" style={{ color: 'var(--color-gold)' }}>{selectedOrder.order_number}</h3>
                <button onClick={() => setSelectedOrder(null)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Customer Info */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiUser size={12} /> Khách hàng
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--color-white)' }}>{selectedOrder.customer_name}</div>
                  <div style={{ fontSize: '0.8125rem' }}>{selectedOrder.customer_phone}</div>
                  {selectedOrder.customer_email && <div style={{ fontSize: '0.8125rem' }}>{selectedOrder.customer_email}</div>}
                </div>

                {/* Address */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiMapPin size={12} /> Địa chỉ
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>{selectedOrder.address}</div>
                  {(selectedOrder.ward || selectedOrder.district || selectedOrder.city) && (
                    <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                      {[selectedOrder.ward, selectedOrder.district, selectedOrder.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>

                {/* Payment */}
                {selectedOrder.payment_method && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FiCreditCard size={12} /> Thanh toán
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      {selectedOrder.payment_method === 'bank_transfer' ? 'Chuyển khoản ngân hàng' : 'COD - Thanh toán khi nhận hàng'}
                      {selectedOrder.payment_code && (
                        <span style={{ marginLeft: '8px', color: 'var(--color-gold)', fontSize: '0.8125rem' }}>({selectedOrder.payment_code})</span>
                      )}
                    </div>
                    {selectedOrder.payment_status && (
                      <span className={`admin-badge admin-badge--${selectedOrder.payment_status === 'paid' ? 'success' : 'warning'}`} style={{ marginTop: '6px', display: 'inline-block' }}>
                        {selectedOrder.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    )}
                  </div>
                )}

                {/* Note */}
                {selectedOrder.note && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Ghi chú</div>
                    <div style={{ fontSize: '0.875rem', fontStyle: 'italic', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', borderLeft: '3px solid var(--color-gold)' }}>
                      {selectedOrder.note}
                    </div>
                  </div>
                )}

                {/* Items */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Sản phẩm</div>
                    {selectedOrder.items.map((item: any, i: number) => (
                      <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: 'var(--color-white)' }}>{item.name}</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>SL: {item.quantity}</div>
                            {item.color_name && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <span style={{ width: 14, height: 14, borderRadius: '50%', background: item.color || '#999', display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }} />
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{item.color_name}</span>
                              </div>
                            )}
                            {item.addons && item.addons.length > 0 && (
                              <div style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                                {item.addons.map((a: any, j: number) => (
                                  <div key={j} style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    {a.groupName}: <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{a.optionName}</span>
                                    {a.price > 0 && <span style={{ color: 'var(--color-gold)', marginLeft: '4px' }}>(+{formatPrice(a.price)})</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', marginLeft: '12px' }}>{formatPrice(item.price * item.quantity)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Price Summary */}
                <div style={{ padding: '12px', background: 'rgba(201,169,110,0.08)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8125rem' }}>
                    <span>Tạm tính</span><span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8125rem' }}>
                    <span>Vận chuyển</span><span>{formatPrice(selectedOrder.shipping)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8125rem', color: '#10b981' }}>
                      <span>Giảm giá</span><span>-{formatPrice(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: 'var(--color-gold)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '8px' }}>
                    <span>Tổng cộng</span><span>{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>

                {/* === VIETTEL POST SHIPPING === */}
                <div style={{
                  padding: '14px',
                  background: 'rgba(99,102,241,0.06)',
                  borderRadius: '10px',
                  border: '1px solid rgba(99,102,241,0.15)',
                }}>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 700, color: '#818cf8',
                    marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    <FiTruck size={14} /> Viettel Post
                  </div>

                  {selectedOrder.vtp_order_number ? (
                    <>
                      {/* VTP Info */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Mã vận đơn</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>
                            {selectedOrder.vtp_order_number}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Dịch vụ</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            {selectedOrder.vtp_service || '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Phí ship VTP</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            {selectedOrder.vtp_shipping_fee ? formatPrice(selectedOrder.vtp_shipping_fee) : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Trạng thái VTP</div>
                          <div style={{
                            fontSize: '0.8rem', fontWeight: 600,
                            color: VTP_STATUS_MAP[selectedOrder.vtp_status_code]?.color || 'rgba(255,255,255,0.6)',
                          }}>
                            {VTP_STATUS_MAP[selectedOrder.vtp_status_code]?.icon || '📋'}{' '}
                            {selectedOrder.vtp_status_name || VTP_STATUS_MAP[selectedOrder.vtp_status_code]?.label || `Mã ${selectedOrder.vtp_status_code}`}
                          </div>
                        </div>
                      </div>

                      {/* Tracking Log */}
                      {(() => {
                        const trackLog = parseTrackingLog(selectedOrder);
                        if (trackLog.length === 0) return null;
                        return (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>
                              Lịch sử vận chuyển ({trackLog.length})
                            </div>
                            <div style={{ maxHeight: '160px', overflow: 'auto', fontSize: '0.75rem' }}>
                              {trackLog.slice().reverse().map((log: any, idx: number) => (
                                <div key={idx} style={{
                                  padding: '6px 0',
                                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                                  display: 'flex', gap: '8px', alignItems: 'flex-start',
                                }}>
                                  <span style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: idx === 0 ? '#10b981' : 'rgba(255,255,255,0.15)',
                                    marginTop: '4px', flexShrink: 0,
                                  }} />
                                  <div>
                                    <div style={{ fontWeight: 600, color: idx === 0 ? '#10b981' : 'rgba(255,255,255,0.6)' }}>
                                      {log.status_name || `Mã ${log.status_code}`}
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                                      {log.date || log.received_at}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Cancel VTP */}
                      {selectedOrder.vtp_status_code !== -100 && selectedOrder.vtp_status_code < 500 && (
                        <button
                          onClick={() => cancelVtp(selectedOrder.id)}
                          className="admin-btn admin-btn--sm"
                          style={{
                            marginTop: '10px', width: '100%',
                            background: 'rgba(239,68,68,0.1)', color: '#f87171',
                            border: '1px solid rgba(239,68,68,0.3)',
                            fontSize: '0.75rem',
                          }}
                        >
                          <FiXCircle /> Hủy Vận Đơn VTP
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Push to VTP Button */}
                      {selectedOrder.status !== 'cancelled' && (
                        <>
                          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                            Đơn chưa được gửi sang Viettel Post.
                            {!selectedOrder.city_id && (
                              <span style={{ color: '#f59e0b', display: 'block', marginTop: '4px' }}>
                                ⚠️ Thiếu mã địa chỉ (city_id, district_id, ward_id). Cần checkout mới để có.
                              </span>
                            )}
                          </p>
                          <button
                            disabled={pushing || !selectedOrder.city_id}
                            onClick={() => pushToVtp(selectedOrder.id)}
                            className="admin-btn admin-btn--primary admin-btn--sm"
                            style={{
                              width: '100%', fontSize: '0.8125rem',
                              opacity: !selectedOrder.city_id ? 0.5 : 1,
                            }}
                          >
                            <FiSend /> {pushing ? 'Đang gửi...' : 'Gửi Đơn Sang Viettel Post'}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Status Update */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Cập nhật trạng thái</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ORDER_STATUSES.map(s => (
                      <button key={s.value}
                        onClick={() => updateStatus(selectedOrder.id, s.value)}
                        className={`admin-btn admin-btn--sm ${selectedOrder.status === s.value ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
                        style={{ fontSize: '0.75rem' }}>
                        {getStatusIcon(s.value)} {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
