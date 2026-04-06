'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/constants';
import { FiPackage, FiShoppingCart, FiEye, FiDollarSign, FiTrendingUp, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalViews: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const [products, orders] = await Promise.all([
        adminApi.getProducts(token, { per_page: '1000' }),
        adminApi.getOrders(token, { per_page: '5' }),
      ]);

      const totalRevenue = (orders.data || []).reduce(
        (sum: number, o: any) => sum + (o.status === 'delivered' ? Number(o.total) : 0), 0
      );

      setStats({
        totalProducts: products.total || 0,
        totalOrders: orders.total || 0,
        totalRevenue,
        totalViews: (products.data || []).reduce((sum: number, p: any) => sum + (p.views || 0), 0),
      });

      setRecentOrders(orders.data || []);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      icon: <FiPackage />,
      value: stats.totalProducts,
      label: 'Sản Phẩm',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.12)',
    },
    {
      icon: <FiShoppingCart />,
      value: stats.totalOrders,
      label: 'Đơn Hàng',
      color: '#10b981',
      bg: 'rgba(16,185,129,0.12)',
    },
    {
      icon: <FiDollarSign />,
      value: formatPrice(stats.totalRevenue),
      label: 'Doanh Thu',
      color: '#c9a96e',
      bg: 'rgba(201,169,110,0.12)',
    },
    {
      icon: <FiEye />,
      value: stats.totalViews.toLocaleString(),
      label: 'Lượt Xem',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.12)',
    },
  ];

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Dashboard</h1>
        <div className="admin-topbar__actions">
          <Link href="/admin/products/new" className="admin-btn admin-btn--primary admin-btn--sm">
            + Thêm Sản Phẩm
          </Link>
        </div>
      </div>

      <div className="admin-content">
        {/* Stats */}
        <div className="admin-stats">
          {statCards.map((card, i) => (
            <div key={i} className="admin-stat-card">
              <div
                className="admin-stat-card__icon"
                style={{ background: card.bg, color: card.color }}
              >
                {card.icon}
              </div>
              <div className="admin-stat-card__value">{card.value}</div>
              <div className="admin-stat-card__label">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="admin-card">
          <div className="admin-card__header">
            <h2 className="admin-card__title">Đơn Hàng Gần Đây</h2>
            <Link href="/admin/orders" className="admin-btn admin-btn--secondary admin-btn--sm">
              Xem tất cả <FiArrowRight />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '32px 0' }}>
              Chưa có đơn hàng nào
            </p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã Đơn</th>
                  <th>Khách Hàng</th>
                  <th>Tổng Tiền</th>
                  <th>Trạng Thái</th>
                  <th>Ngày Tạo</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order: any) => (
                  <tr key={order.id}>
                    <td><strong>{order.order_number}</strong></td>
                    <td>{order.customer_name}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${
                        order.status === 'delivered' ? 'success' :
                        order.status === 'confirmed' ? 'success' :
                        order.status === 'cancelled' ? 'danger' :
                        order.status === 'shipping' ? 'info' : 'warning'
                      }`}>
                        {order.status === 'pending' ? 'Chờ xác nhận' :
                         order.status === 'confirmed' ? 'Đã xác nhận' :
                         order.status === 'shipping' ? 'Đang giao' :
                         order.status === 'delivered' ? 'Đã giao' : 'Đã hủy'}
                      </span>
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '24px' }}>
          <Link href="/admin/products" className="admin-card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <FiPackage style={{ fontSize: '1.5rem', color: 'var(--color-gold)' }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-white)' }}>Quản lý Sản Phẩm</div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>Thêm, sửa, xóa sản phẩm</div>
            </div>
          </Link>
          <Link href="/admin/media" className="admin-card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <FiEye style={{ fontSize: '1.5rem', color: 'var(--color-gold)' }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-white)' }}>Media Library</div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>Quản lý hình ảnh</div>
            </div>
          </Link>
          <Link href="/admin/settings" className="admin-card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <FiTrendingUp style={{ fontSize: '1.5rem', color: 'var(--color-gold)' }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-white)' }}>Cài Đặt</div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>Cấu hình website</div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
