'use client';

import { useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useAdminOrders, invalidateAdmin } from '@/lib/useAdmin';
import { useToken } from '@/lib/useToken';
import { formatPrice, formatDate, ORDER_STATUSES } from '@/lib/constants';
import { FiSearch, FiEye, FiTrash2, FiTruck, FiCheckCircle, FiXCircle, FiPackage, FiClock } from 'react-icons/fi';

export default function AdminOrdersPage() {
  const { token } = useToken();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

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

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa đơn hàng này?')) return;
    if (!token) return;
    try {
      await adminApi.updateOrderStatus(token, id, { status: 'cancelled' });
      invalidateAdmin('/admin/orders');
      refresh();
    } catch (err) { console.error(err); }
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
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setStatusFilter('')}
              className={`admin-btn admin-btn--sm ${!statusFilter ? 'admin-btn--primary' : 'admin-btn--secondary'}`}>Tất cả</button>
            {ORDER_STATUSES.map(s => (
              <button key={s.value} onClick={() => setStatusFilter(s.value)}
                className={`admin-btn admin-btn--sm ${statusFilter === s.value ? 'admin-btn--primary' : 'admin-btn--secondary'}`}>{s.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 400px' : '1fr', gap: '24px' }}>
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
                  <th>Ngày Tạo</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px' }}>Đang tải...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.4)' }}>
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
            <div className="admin-card" style={{ position: 'sticky', top: '80px', alignSelf: 'start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="admin-card__title" style={{ color: 'var(--color-gold)' }}>{selectedOrder.order_number}</h3>
                <button onClick={() => setSelectedOrder(null)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.25rem' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Khách hàng</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-white)' }}>{selectedOrder.customer_name}</div>
                  <div style={{ fontSize: '0.8125rem' }}>{selectedOrder.customer_phone}</div>
                  {selectedOrder.customer_email && <div style={{ fontSize: '0.8125rem' }}>{selectedOrder.customer_email}</div>}
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Địa chỉ</div>
                  <div style={{ fontSize: '0.875rem' }}>{selectedOrder.address}</div>
                  {(selectedOrder.ward || selectedOrder.district || selectedOrder.city) && (
                    <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                      {[selectedOrder.ward, selectedOrder.district, selectedOrder.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>

                {selectedOrder.payment_method && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Thanh toán</div>
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

                {selectedOrder.note && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Ghi chú</div>
                    <div style={{ fontSize: '0.875rem', fontStyle: 'italic', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', borderLeft: '3px solid var(--color-gold)' }}>
                      {selectedOrder.note}
                    </div>
                  </div>
                )}

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

                <div style={{ padding: '12px', background: 'rgba(201,169,110,0.08)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8125rem' }}>
                    <span>Tạm tính</span><span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8125rem' }}>
                    <span>Vận chuyển</span><span>{formatPrice(selectedOrder.shipping)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: 'var(--color-gold)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '8px' }}>
                    <span>Tổng cộng</span><span>{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>

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
