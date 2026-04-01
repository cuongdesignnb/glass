'use client';

import { useCart } from '@/lib/useCart';
import { formatPrice } from '@/lib/constants';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiArrowRight } from 'react-icons/fi';
import { RiGlassesLine } from 'react-icons/ri';
import './cart.css';

const SHIPPING_THRESHOLD = 500000;
const SHIPPING_FEE = 30000;

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, subtotal, totalItems } = useCart();

  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  const breadcrumbItems = [
    { name: 'Trang chủ', url: '/' },
    { name: 'Giỏ hàng', url: '/gio-hang' },
  ];

  if (items.length === 0) {
    return (
      <div style={{ paddingTop: 'var(--header-height)' }}>
        <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-4xl)' }}>
          <Breadcrumb items={breadcrumbItems} />
          <div className="cart-empty">
            <RiGlassesLine className="cart-empty__icon" />
            <h2>Giỏ hàng trống</h2>
            <p>Bạn chưa thêm sản phẩm nào vào giỏ hàng</p>
            <Link href="/san-pham" className="btn btn-primary btn-lg">
              <FiShoppingBag /> Mua sắm ngay
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 'var(--header-height)' }}>
      <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-4xl)' }}>
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="cart-title">Giỏ Hàng ({totalItems} sản phẩm)</h1>

        <div className="cart-layout">
          {/* Cart Items */}
          <div className="cart-items">
            {items.map((item) => (
              <div key={`${item.productId}-${item.color}`} className="cart-item">
                <Link href={`/san-pham/${item.slug}`} className="cart-item__image">
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : (
                    <div className="cart-item__placeholder"><RiGlassesLine /></div>
                  )}
                </Link>
                <div className="cart-item__info">
                  <Link href={`/san-pham/${item.slug}`} className="cart-item__name">{item.name}</Link>
                  {item.colorName && (
                    <div className="cart-item__variant">
                      <span className="cart-item__color-dot" style={{ backgroundColor: item.color }} />
                      {item.colorName}
                    </div>
                  )}
                  <div className="cart-item__price-mobile">
                    {formatPrice(item.salePrice || item.price)}
                  </div>
                </div>
                <div className="cart-item__quantity">
                  <button onClick={() => updateQuantity(item.productId, item.color, item.quantity - 1)}>
                    <FiMinus />
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, item.color, item.quantity + 1)}>
                    <FiPlus />
                  </button>
                </div>
                <div className="cart-item__price">
                  {formatPrice((item.salePrice || item.price) * item.quantity)}
                  {item.salePrice && (
                    <div className="cart-item__price-original">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  )}
                </div>
                <button className="cart-item__remove" onClick={() => removeItem(item.productId, item.color)}>
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="cart-summary">
            <h3 className="cart-summary__title">Tóm tắt đơn hàng</h3>
            <div className="cart-summary__row">
              <span>Tạm tính</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="cart-summary__row">
              <span>Phí vận chuyển</span>
              <span>{shipping === 0 ? <em style={{ color: '#10b981' }}>Miễn phí</em> : formatPrice(shipping)}</span>
            </div>
            {subtotal < SHIPPING_THRESHOLD && (
              <div className="cart-summary__shipping-note">
                Mua thêm {formatPrice(SHIPPING_THRESHOLD - subtotal)} để được miễn phí vận chuyển
              </div>
            )}
            <div className="cart-summary__divider" />
            <div className="cart-summary__row cart-summary__total">
              <span>Tổng cộng</span>
              <span>{formatPrice(total)}</span>
            </div>
            <Link href="/thanh-toan" className="btn btn-primary btn-lg cart-summary__checkout">
              Tiến hành thanh toán <FiArrowRight />
            </Link>
            <Link href="/san-pham" className="cart-summary__continue">
              ← Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
