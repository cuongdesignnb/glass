'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/useCart';
import { useAuth } from '@/lib/useAuth';
import { useSettings } from '@/lib/useSettings';
import { publicApi, userApi } from '@/lib/api';
import { formatPrice, PAYMENT_METHODS } from '@/lib/constants';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Link from 'next/link';
import { FiCheck, FiArrowLeft, FiShoppingBag, FiCopy, FiRefreshCw, FiClock, FiTag, FiX, FiTruck } from 'react-icons/fi';
import { RiGlassesLine } from 'react-icons/ri';
import './checkout.css';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { user, token, refreshUser } = useAuth();
  const { settings } = useSettings();
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const [copied, setCopied] = useState<string | null>(null);
  const pollingRef = useRef<any>(null);
  const [userPrefilled, setUserPrefilled] = useState(false);

  // Shipping from settings (fallback to defaults)
  const SHIPPING_THRESHOLD = Number(settings['payment_free_shipping_threshold']) || 500000;
  const SHIPPING_FEE = Number(settings['payment_shipping_fee']) || 30000;

  // Cleanup polling khi unmount tránh memory leak
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    address: '',
    city: '',
    district: '',
    ward: '',
    payment_method: 'cod',
    note: '',
  });

  // Location data
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  // Voucher
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherError, setVoucherError] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);

  useEffect(() => {
    fetch('/locations.json')
      .then(r => r.json())
      .then(data => setProvinces(data?.provinces || []))
      .catch(() => {});
  }, []);

  // Auto-fill from user profile — waits for both user AND provinces to be ready
  useEffect(() => {
    if (!user || userPrefilled) return;

    const userProvince = user.province || '';
    const userWard = user.ward || '';

    // Find matching province and its wards
    let wardsList: any[] = [];
    if (userProvince && provinces.length > 0) {
      const prov = provinces.find((p: any) => p.fullname === userProvince);
      if (prov) {
        wardsList = prov.wards || [];
        setWards(wardsList);
      }
    }

    // If user has a province but provinces haven't loaded yet, wait
    if (userProvince && provinces.length === 0) return;

    // Check if ward exists in the list
    const wardValue = wardsList.some((w: any) => w.fullname === userWard) ? userWard : '';

    setForm(prev => ({
      ...prev,
      customer_name: prev.customer_name || user.name || '',
      customer_email: prev.customer_email || user.email || '',
      customer_phone: prev.customer_phone || user.phone || '',
      address: prev.address || user.address_detail || '',
      city: prev.city || userProvince,
      ward: prev.ward || wardValue,
    }));
    setUserPrefilled(true);
  }, [user, userPrefilled, provinces]);

  // When user manually changes city, load wards for the new city
  useEffect(() => {
    if (userPrefilled && provinces.length > 0 && form.city) {
      const prov = provinces.find((p: any) => p.fullname === form.city);
      if (prov) {
        setWards(prov.wards || []);
      }
    }
  }, [form.city, provinces, userPrefilled]);

  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = Math.max(0, subtotal + shipping - voucherDiscount);

  const updateForm = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    setVoucherError('');
    try {
      const result = await publicApi.validateVoucher(voucherCode.trim(), subtotal);
      if (result.valid) {
        setAppliedVoucher(result.voucher);
        setVoucherDiscount(result.discount || 0);
      } else {
        setVoucherError(result.message || 'Mã không hợp lệ');
      }
    } catch (err: any) {
      setVoucherError(err.message || 'Mã không hợp lệ hoặc đã hết hạn');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherDiscount(0);
    setVoucherCode('');
    setVoucherError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setSubmitting(true);
    setError('');

    try {
      const orderData = {
        ...form,
        subtotal,
        shipping,
        discount: voucherDiscount,
        total,
        voucher_code: appliedVoucher?.code || null,
        items: items.map(item => ({
          product_id: item.productId,
          name: item.name,
          slug: item.slug,
          image: item.image,
          price: (item.salePrice || item.price) + (item.addonTotal || 0),
          quantity: item.quantity,
          color: item.color,
          color_name: item.colorName,
          addons: item.addons || [],
          addon_total: item.addonTotal || 0,
        })),
      };

      const result = await publicApi.createOrder(orderData, token || undefined);
      setOrderSuccess(result);
      clearCart();

      // If user is logged in, update their profile with checkout info
      if (token && user) {
        try {
          await userApi.updateProfile(token, {
            name: form.customer_name,
            phone: form.customer_phone,
            province: form.city,
            ward: form.ward,
            address_detail: form.address,
          });
          refreshUser();
        } catch {} // Don't block checkout on profile update failure
      }

      // Nếu là bank_transfer → bắt đầu polling kiểm tra thanh toán
      if (form.payment_method === 'bank_transfer' && result?.id) {
        pollingRef.current = setInterval(async () => {
          try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
            const res = await fetch(`${API}/public/orders/${result.id}/payment-status`);
            if (res.ok) {
              const data = await res.json();
              if (data.payment_status === 'paid') {
                setPaymentStatus('paid');
                clearInterval(pollingRef.current);
              }
            }
          } catch {}
        }, 5000); // Check every 5 seconds
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbItems = [
    { name: 'Trang chủ', url: '/' },
    { name: 'Giỏ hàng', url: '/gio-hang' },
    { name: 'Thanh toán', url: '/thanh-toan' },
  ];

  // Order success state
  if (orderSuccess) {
    const isBankTransfer = orderSuccess.payment_method === 'bank_transfer';
    const bankInfo = orderSuccess.bank_info || {};
    const bankName    = bankInfo.bank_name    || process.env.NEXT_PUBLIC_SEPAY_BANK_NAME    || '';
    const accountNo   = bankInfo.account_number || process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NUMBER || '';
    const accountName = bankInfo.account_name   || process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NAME  || '';
    const paymentCode = bankInfo.transfer_content || orderSuccess.payment_code || orderSuccess.order_number;
    const amount      = orderSuccess.total;

    // VietQR URL — nội dung CK phải bắt đầu bằng SEVQR để SePay nhận diện
    const qrUrl = accountNo && bankName
      ? `https://img.vietqr.io/image/${bankName}-${accountNo}-compact.png?amount=${amount}&addInfo=${paymentCode}&accountName=${encodeURIComponent(accountName)}`
      : null;

    const copyToClipboard = (text: string, key: string) => {
      navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    };

    return (
      <div style={{ paddingTop: 'var(--header-height)' }}>
        <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-4xl)', maxWidth: '760px' }}>

          {paymentStatus === 'paid' ? (
            /* Đã thanh toán */
            <div className="order-success">
              <div className="order-success__icon"><FiCheck /></div>
              <h1>Thanh toán thành công!</h1>
              <p>Chúng tôi đã nhận được tiền của bạn. Đơn hàng đang được xử lý.</p>
              <div className="order-success__number">Mã đơn: <strong>{orderSuccess.order_number}</strong></div>
              <div className="order-success__actions">
                <Link href="/san-pham" className="btn btn-primary btn-lg"><FiShoppingBag /> Tiếp tục mua sắm</Link>
                <Link href="/tra-cuu-don-hang" className="btn btn-secondary btn-lg"><FiTruck /> Tra cứu đơn hàng</Link>
              </div>
            </div>
          ) : isBankTransfer ? (
            /* Hướng dẫn chuyển khoản */
            <div className="order-success">
              <div className="order-success__icon" style={{ background: 'rgba(212,86,122,0.1)', color: 'var(--color-rose)', border: '2px solid var(--color-rose)' }}>
                <FiClock />
              </div>
              <h1>Đặt hàng thành công!</h1>
              <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-xl)' }}>Vui lòng chuyển khoản để hoàn tất đơn hàng</p>

              {/* QR Code */}
              {qrUrl && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-xl)' }}>
                  <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display: 'inline-block' }}>
                    <img src={qrUrl} alt="QR Chuyển khoản" style={{ width: '220px', height: '220px', display: 'block' }} />
                    <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#666', marginTop: '8px' }}>Quét mã để chuyển khoản</p>
                  </div>
                </div>
              )}

              {/* Thông tin chuyển khoản */}
              <div style={{ background: 'var(--color-gray-50)', border: '1.5px solid var(--color-gray-200)', borderRadius: '12px', padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)', width: '100%', textAlign: 'left' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-lg)', color: 'var(--color-gray-900)' }}>Thông tin chuyển khoản</h3>

                {[{ label: 'Ngân hàng', value: bankName }, { label: 'Số tài khoản', value: accountNo }, { label: 'Tên tài khoản', value: accountName }].filter(r => r.value).map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-gray-200)' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>{row.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.9375rem', color: 'var(--color-gray-900)' }}>{row.value}</strong>
                      <button onClick={() => copyToClipboard(row.value, row.label)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === row.label ? 'var(--color-rose)' : 'var(--color-gray-400)', fontSize: '0.875rem' }}>
                        <FiCopy />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Số tiền */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-gray-200)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Số tiền</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '1.0625rem', color: 'var(--color-rose)', fontWeight: 700 }}>{amount?.toLocaleString('vi-VN')}đ</strong>
                    <button onClick={() => copyToClipboard(String(amount), 'amount')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'amount' ? 'var(--color-rose)' : 'var(--color-gray-400)', fontSize: '0.875rem' }}>
                      <FiCopy />
                    </button>
                  </div>
                </div>

                {/* Mã thanh toán — quan trọng nhất */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', background: 'rgba(212,86,122,0.04)', borderRadius: '8px', marginTop: '4px' }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginBottom: '2px' }}>Nội dung chuyển khoản</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-rose)', letterSpacing: '0.05em' }}>{paymentCode}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: '2px' }}>Chú ý: Điền đúng nội dung để tự động xác nhận</div>
                  </div>
                  <button onClick={() => copyToClipboard(paymentCode, 'code')} style={{ padding: '8px 14px', background: copied === 'code' ? 'var(--color-rose)' : 'var(--color-gray-100)', color: copied === 'code' ? 'white' : 'var(--color-gray-600)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiCopy /> {copied === 'code' ? 'Đã sao chép!' : 'Sao chép'}
                  </button>
                </div>
              </div>

              {/* Trạng thái chờ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-gray-500)', fontSize: '0.875rem', marginBottom: 'var(--space-xl)' }}>
                <FiRefreshCw style={{ animation: 'spin 2s linear infinite' }} />
                Đang chờ xác nhận thanh toán tự động...
              </div>

              <div className="order-success__actions">
                <Link href="/san-pham" className="btn btn-primary btn-lg"><FiShoppingBag /> Tiếp tục mua sắm</Link>
                <Link href="/tra-cuu-don-hang" className="btn btn-secondary btn-lg"><FiTruck /> Tra cứu đơn hàng</Link>
              </div>
            </div>
          ) : (
            /* COD success */
            <div className="order-success">
              <div className="order-success__icon"><FiCheck /></div>
              <h1>Đặt hàng thành công!</h1>
              <p>Cảm ơn bạn đã mua sắm tại Glass Eyewear</p>
              <div className="order-success__number">Mã đơn hàng: <strong>{orderSuccess.order_number}</strong></div>
              <p className="order-success__note">Chúng tôi sẽ liên hệ với bạn qua số điện thoại để xác nhận đơn hàng.</p>
              <div className="order-success__actions">
                <Link href="/san-pham" className="btn btn-primary btn-lg"><FiShoppingBag /> Tiếp tục mua sắm</Link>
                <Link href="/tra-cuu-don-hang" className="btn btn-secondary btn-lg"><FiTruck /> Tra cứu đơn hàng</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Empty cart redirect
  if (items.length === 0 && !orderSuccess) {
    return (
      <div style={{ paddingTop: 'var(--header-height)' }}>
        <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-4xl)' }}>
          <Breadcrumb items={breadcrumbItems} />
          <div className="cart-empty">
            <RiGlassesLine style={{ fontSize: '64px', color: 'rgba(201,169,110,0.2)', marginBottom: '24px' }} />
            <h2>Giỏ hàng trống</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán</p>
            <Link href="/san-pham" className="btn btn-primary">Mua sắm ngay</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 'var(--header-height)' }}>
      <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-4xl)' }}>
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="checkout-title">Thanh Toán</h1>

        <form onSubmit={handleSubmit} className="checkout-layout">
          {/* Checkout Form */}
          <div className="checkout-form">
            {/* Customer Info */}
            <div className="checkout-section">
              <h2 className="checkout-section__title">Thông tin người nhận</h2>
              <div className="checkout-grid">
                <div className="checkout-field">
                  <label>Họ và tên *</label>
                  <input type="text" required placeholder="Nguyễn Văn A"
                    value={form.customer_name} onChange={e => updateForm('customer_name', e.target.value)} />
                </div>
                <div className="checkout-field">
                  <label>Số điện thoại *</label>
                  <input type="tel" required placeholder="0901234567"
                    value={form.customer_phone} onChange={e => updateForm('customer_phone', e.target.value)} />
                </div>
                <div className="checkout-field checkout-field--full">
                  <label>Email</label>
                  <input type="email" placeholder="email@example.com"
                    value={form.customer_email} onChange={e => updateForm('customer_email', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="checkout-section">
              <h2 className="checkout-section__title">Địa chỉ giao hàng</h2>
              <div className="checkout-grid">
                <div className="checkout-field checkout-field--full">
                  <label>Địa chỉ *</label>
                  <input type="text" required placeholder="Số nhà, đường"
                    value={form.address} onChange={e => updateForm('address', e.target.value)} />
                </div>
                <div className="checkout-field">
                  <label>Tỉnh / Thành phố *</label>
                  <select required value={form.city}
                    onChange={e => {
                      const prov = provinces.find(p => p.fullname === e.target.value);
                      setForm(prev => ({ ...prev, city: e.target.value, ward: '' }));
                      setWards(prov?.wards || []);
                    }}
                    className="checkout-select">
                    <option value="">-- Chọn tỉnh/TP --</option>
                    {provinces.map(p => (
                      <option key={p.code} value={p.fullname}>{p.fullname}</option>
                    ))}
                  </select>
                </div>
                <div className="checkout-field">
                  <label>Phường / Xã *</label>
                  <select required value={form.ward}
                    onChange={e => updateForm('ward', e.target.value)}
                    className="checkout-select"
                    disabled={!form.city}>
                    <option value="">-- Chọn phường/xã --</option>
                    {wards.map(w => (
                      <option key={w.code} value={w.fullname}>{w.fullname}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="checkout-section">
              <h2 className="checkout-section__title">Phương thức thanh toán</h2>
              {(() => {
                const COD_LIMIT = 250000;
                const isBankOnly = total >= COD_LIMIT;
                const availableMethods = isBankOnly
                  ? PAYMENT_METHODS.filter(m => m.value !== 'cod')
                  : PAYMENT_METHODS;

                // Auto-switch to bank_transfer if COD no longer available
                if (isBankOnly && form.payment_method === 'cod') {
                  updateForm('payment_method', 'bank_transfer');
                }

                return (
                  <>
                    {isBankOnly && (
                      <div style={{
                        padding: '10px 14px', borderRadius: '8px', marginBottom: '12px',
                        background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)',
                        fontSize: '0.8125rem', color: 'var(--color-gray-600)',
                      }}>
                        💳 Đơn hàng từ {formatPrice(COD_LIMIT)} chỉ hỗ trợ thanh toán chuyển khoản.
                      </div>
                    )}
                    <div className="checkout-payment-methods">
                      {availableMethods.map(method => (
                        <label key={method.value} className={`payment-method ${form.payment_method === method.value ? 'payment-method--active' : ''}`}>
                          <input
                            type="radio"
                            name="payment_method"
                            value={method.value}
                            checked={form.payment_method === method.value}
                            onChange={e => updateForm('payment_method', e.target.value)}
                          />
                          <div className="payment-method__radio" />
                          <span>{method.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Voucher */}
            <div className="checkout-section">
              <h2 className="checkout-section__title">Mã giảm giá</h2>
              {appliedVoucher ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FiTag style={{ color: '#10b981', fontSize: '1.125rem' }} />
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--color-gray-900)', fontSize: '0.9375rem' }}>{appliedVoucher.code}</div>
                      <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
                        {appliedVoucher.type === 'percent'
                          ? `Giảm ${appliedVoucher.value}%${appliedVoucher.max_discount > 0 ? ` (tối đa ${formatPrice(appliedVoucher.max_discount)})` : ''}`
                          : `Giảm ${formatPrice(appliedVoucher.value)}`
                        }
                        {appliedVoucher.min_order > 0 && ` • Đơn từ ${formatPrice(appliedVoucher.min_order)}`}
                      </div>
                    </div>
                  </div>
                  <button onClick={handleRemoveVoucher} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-gray-400)', padding: '4px',
                  }}>
                    <FiX size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Nhập mã giảm giá"
                      value={voucherCode}
                      onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleApplyVoucher())}
                      style={{
                        flex: 1, padding: '10px 14px',
                        background: 'var(--color-white)', border: '1px solid var(--color-gray-300)',
                        borderRadius: '8px', color: 'var(--color-gray-900)',
                        fontSize: '0.9375rem', fontFamily: 'monospace', fontWeight: 600,
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyVoucher}
                      disabled={voucherLoading || !voucherCode.trim()}
                      className="btn btn-secondary"
                      style={{ whiteSpace: 'nowrap', padding: '10px 20px' }}
                    >
                      {voucherLoading ? 'Đang kiểm tra...' : 'Áp dụng'}
                    </button>
                  </div>
                  {voucherError && (
                    <div style={{
                      marginTop: '8px', fontSize: '0.8125rem',
                      color: 'var(--color-error)', padding: '8px 12px',
                      background: 'rgba(239,68,68,0.06)', borderRadius: '6px',
                    }}>
                      {voucherError}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Note */}
            <div className="checkout-section">
              <h2 className="checkout-section__title">Ghi chú</h2>
              <textarea
                placeholder="Ghi chú cho đơn hàng (không bắt buộc)"
                rows={3}
                value={form.note}
                onChange={e => updateForm('note', e.target.value)}
                className="checkout-textarea"
              />
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="checkout-summary">
            <h3 className="checkout-summary__title">Đơn hàng của bạn</h3>
            <div className="checkout-summary__items">
              {items.map(item => (
                <div key={`${item.productId}-${item.color}`} className="checkout-summary__item">
                  <div className="checkout-summary__item-image">
                    {item.image ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <RiGlassesLine />
                    )}
                    <span className="checkout-summary__item-qty">{item.quantity}</span>
                  </div>
                  <div className="checkout-summary__item-info">
                    <div className="checkout-summary__item-name">{item.name}</div>
                    {item.colorName && (
                      <div className="checkout-summary__item-variant">
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }} />
                        {item.colorName}
                      </div>
                    )}
                    {item.addons && item.addons.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                        {item.addons.map((a: any, j: number) => (
                          <div key={j}>
                            {a.groupName}: {a.optionName}
                            {a.price > 0 && <span style={{ color: 'var(--color-gold)' }}> (+{formatPrice(a.price)})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="checkout-summary__item-price">
                    {formatPrice(((item.salePrice || item.price) + (item.addonTotal || 0)) * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-summary__divider" />

            <div className="checkout-summary__row">
              <span>Tạm tính</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="checkout-summary__row">
              <span>Phí vận chuyển</span>
              <span>{shipping === 0 ? <em style={{ color: '#10b981' }}>Miễn phí</em> : formatPrice(shipping)}</span>
            </div>
            {voucherDiscount > 0 && (
              <div className="checkout-summary__row" style={{ color: '#10b981' }}>
                <span>Giảm giá ({appliedVoucher?.code})</span>
                <span>-{formatPrice(voucherDiscount)}</span>
              </div>
            )}
            <div className="checkout-summary__divider" />
            <div className="checkout-summary__row checkout-summary__total">
              <span>Tổng cộng</span>
              <span>{formatPrice(total)}</span>
            </div>

            {error && (
              <div className="checkout-error">{error}</div>
            )}

            <button type="submit" className="btn btn-primary btn-lg checkout-summary__submit" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : `Đặt hàng — ${formatPrice(total)}`}
            </button>

            <Link href="/gio-hang" className="checkout-summary__back">
              <FiArrowLeft /> Quay lại giỏ hàng
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
