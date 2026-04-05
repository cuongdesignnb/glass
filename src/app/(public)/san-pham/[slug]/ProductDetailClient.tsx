'use client';

import { useState, useCallback } from 'react';
import { publicApi } from '@/lib/api';
import { formatPrice, COLORS } from '@/lib/constants';
import Link from 'next/link';
import { FiStar, FiShoppingBag, FiHeart, FiShare2, FiChevronLeft, FiChevronRight, FiCheck, FiCamera, FiX, FiCheckCircle, FiTruck, FiRefreshCw, FiShield } from 'react-icons/fi';
import { RiGlassesLine } from 'react-icons/ri';
import TryOnModal from '@/components/layout/TryOnModal';
import './product-detail.css';

interface ProductDetailClientProps {
  product: any;
  reviewData: any;
  apiMediaUrl: string;
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-rating-input">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className={`star-btn ${star <= (hover || value) ? 'star-btn--active' : ''}`}
        >
          <FiStar />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
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

export default function ProductDetailClient({ product, reviewData, apiMediaUrl }: ProductDetailClientProps) {
  const [selectedColor, setSelectedColor] = useState<string>(product.colors?.[0] || '');
  const [selectedColorName, setSelectedColorName] = useState<string>(product.color_names?.[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews' | 'faq'>('description');
  const [mainImageIndex, setMainImageIndex] = useState(0);
  
  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    customer_name: '',
    customer_phone: '',
    rating: 5,
    comment: '',
  });
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showTryOn, setShowTryOn] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<Record<number, number | null>>({});

  // Reviews pagination (client-side load more)
  const [reviews, setReviews] = useState(reviewData?.reviews?.data || []);
  const stats = reviewData?.stats || { count: 0, average: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

  const images = product.images?.map((img: string) =>
    img.startsWith('http') ? img : `${apiMediaUrl}${img}`
  ) || [];

  const thumbnail = product.thumbnail
    ? (product.thumbnail.startsWith('http') ? product.thumbnail : `${apiMediaUrl}${product.thumbnail}`)
    : null;

  const allImages = images.length > 0 ? images : (thumbnail ? [thumbnail] : []);

  const handleColorSelect = (color: string, index: number) => {
    setSelectedColor(color);
    setSelectedColorName(product.color_names?.[index] || '');
  };

  const handleAddToCart = () => {
    // Validate required addon groups
    if (product.addon_groups && product.addon_groups.length > 0) {
      const missing = product.addon_groups.filter(
        (g: any) => g.is_required && !selectedAddons[g.id]
      );
      if (missing.length > 0) {
        alert(`Vui lòng chọn: ${missing.map((g: any) => g.name).join(', ')}`);
        return;
      }
    }

    // Build addon details from selected addons
    const addonDetails: { groupName: string; optionName: string; price: number }[] = [];
    let addonTotal = 0;

    if (product.addon_groups && product.addon_prices) {
      const priceMap: Record<number, number> = {};
      (product.addon_prices || []).forEach((p: any) => {
        priceMap[p.option_id] = p.additional_price || 0;
      });

      product.addon_groups.forEach((group: any) => {
        const selectedOptionId = selectedAddons[group.id];
        if (selectedOptionId) {
          const opt = (group.options || []).find((o: any) => o.id === selectedOptionId);
          if (opt) {
            const price = priceMap[opt.id] || 0;
            addonDetails.push({
              groupName: group.name,
              optionName: opt.name,
              price,
            });
            addonTotal += price;
          }
        }
      });
    }

    const cartItem = {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: allImages[0] || '',
      price: Number(product.price),
      salePrice: product.sale_price ? Number(product.sale_price) : null,
      quantity,
      color: selectedColor,
      colorName: selectedColorName,
      addons: addonDetails,
      addonTotal,
    };

    // Get existing cart
    const cart = JSON.parse(localStorage.getItem('glass_cart') || '[]');
    // Match by product + color + same addons
    const addonKey = JSON.stringify(addonDetails.map(a => `${a.groupName}:${a.optionName}`).sort());
    const existingIndex = cart.findIndex((item: any) => {
      const itemAddonKey = JSON.stringify((item.addons || []).map((a: any) => `${a.groupName}:${a.optionName}`).sort());
      return item.productId === cartItem.productId && item.color === cartItem.color && itemAddonKey === addonKey;
    });

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push(cartItem);
    }

    localStorage.setItem('glass_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    alert(`Đã thêm ${product.name} vào giỏ hàng!`);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.customer_name || !reviewForm.customer_phone || !reviewForm.rating) return;

    setSubmitting(true);
    try {
      await publicApi.submitReview({
        product_id: product.id,
        ...reviewForm,
        images: reviewImages.length > 0 ? reviewImages : undefined,
      });
      setSubmitted(true);
      setShowReviewForm(false);
    } catch (err) {
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const specs = [
    { label: 'Thương hiệu', value: product.brand },
    { label: 'SKU', value: product.sku },
    { label: 'Giới tính', value: product.gender === 'nam' ? 'Nam' : product.gender === 'nu' ? 'Nữ' : 'Unisex' },
    { label: 'Trọng lượng', value: product.weight },
    { label: 'Độ rộng gọng', value: product.frame_width },
    { label: 'Độ rộng mắt kính', value: product.lens_width },
    { label: 'Chiều cao mắt kính', value: product.lens_height },
    { label: 'Độ rộng cầu mũi', value: product.bridge_width },
    { label: 'Chiều dài gọng tai', value: product.temple_length },
  ].filter(s => s.value);

  return (
    <div className="product-detail">
      {/* Main Section: Gallery + Info */}
      <div className="product-detail__main">
        {/* Gallery */}
        <div className="product-gallery">
          <div className="product-gallery__main">
            {allImages.length > 0 ? (
              <img src={allImages[mainImageIndex]} alt={product.name} />
            ) : (
              <div className="product-gallery__placeholder">
                <RiGlassesLine />
              </div>
            )}
            {allImages.length > 1 && (
              <>
                <button
                  className="product-gallery__nav product-gallery__nav--prev"
                  onClick={() => setMainImageIndex(i => (i > 0 ? i - 1 : allImages.length - 1))}
                >
                  <FiChevronLeft />
                </button>
                <button
                  className="product-gallery__nav product-gallery__nav--next"
                  onClick={() => setMainImageIndex(i => (i < allImages.length - 1 ? i + 1 : 0))}
                >
                  <FiChevronRight />
                </button>
              </>
            )}
            <div className="product-gallery__badges">
              {product.is_new && <span className="badge-new">Mới</span>}
              {product.sale_price && <span className="badge-sale">Sale</span>}
              {product.is_featured && <span className="badge-featured">Hot</span>}
            </div>
          </div>
          {allImages.length > 1 && (
            <div className="product-gallery__thumbs">
              {allImages.map((img: string, i: number) => (
                <button
                  key={i}
                  className={`product-gallery__thumb ${i === mainImageIndex ? 'product-gallery__thumb--active' : ''}`}
                  onClick={() => setMainImageIndex(i)}
                >
                  <img src={img} alt={`${product.name} ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="product-info">
          {product.category && (
            <Link href={`/san-pham?category_id=${product.category.id}`} className="product-info__category">
              {product.category.name}
            </Link>
          )}
          <h1 className="product-info__name">{product.name}</h1>

          {/* Rating summary */}
          {stats.count > 0 && (
            <div className="product-info__rating" onClick={() => setActiveTab('reviews')}>
              <StarDisplay rating={Math.round(stats.average)} />
              <span className="product-info__rating-text">{stats.average} ({stats.count} đánh giá)</span>
            </div>
          )}

          {/* Price */}
          <div className="product-info__price">
            <span className="product-info__price-current">
              {formatPrice(product.sale_price || product.price)}
            </span>
            {product.sale_price && (
              <>
                <span className="product-info__price-original">{formatPrice(product.price)}</span>
                <span className="product-info__discount">
                  -{Math.round(((product.price - product.sale_price) / product.price) * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Short description */}
          {product.description && (
            <p className="product-info__desc">{product.description}</p>
          )}

          {/* Color Selection */}
          {product.colors && product.colors.length > 0 && (
            <div className="product-info__variant">
              <label className="product-info__variant-label">
                Màu sắc: <strong>{selectedColorName || selectedColor}</strong>
              </label>
              <div className="product-info__colors">
                {product.colors.map((color: string, i: number) => (
                  <button
                    key={i}
                    className={`color-swatch ${selectedColor === color ? 'color-swatch--active' : ''}`}
                    style={{ backgroundColor: color === 'transparent' ? '#f5f5dc' : color }}
                    onClick={() => handleColorSelect(color, i)}
                    title={product.color_names?.[i] || color}
                  >
                    {selectedColor === color && <FiCheck />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="product-info__variant">
            <label className="product-info__variant-label">Số lượng:</label>
            <div className="quantity-selector">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
              <input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" />
              <button onClick={() => setQuantity(q => q + 1)}>+</button>
            </div>
          </div>

          {/* Stock status */}
          <div className="product-info__stock">
            {product.stock > 0 ? (
              <span className="stock-badge stock-badge--in">Còn hàng ({product.stock})</span>
            ) : (
              <span className="stock-badge stock-badge--out">Hết hàng</span>
            )}
          </div>

          {/* Actions */}
          <div className="product-info__actions">
            <button
              className="btn btn-primary btn-lg product-info__cart-btn"
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
            >
              <FiShoppingBag /> Thêm vào giỏ hàng
            </button>
            <button
              className="btn btn-accent product-info__tryon-btn"
              onClick={() => setShowTryOn(true)}
            >
              <FiCamera /> Đeo thử kính
            </button>
          </div>

          {/* Product Addons / Variants */}
          {product.addon_groups && product.addon_groups.length > 0 && (() => {
            // Build price map from product-specific prices
            const priceMap: Record<number, { additional_price: number; is_available: boolean }> = {};
            (product.addon_prices || []).forEach((p: any) => {
              priceMap[p.option_id] = { additional_price: p.additional_price || 0, is_available: p.is_available ?? true };
            });

            // Build blocked set from constraints + selected options
            const addonConstraints: { option_id: number; blocked_option_id: number }[] = product.addon_constraints || [];
            const blockedOptionIds = new Set<number>();
            const blockReasons: Record<number, string> = {};

            // For each selected option, find what it blocks
            Object.values(selectedAddons).forEach(selectedOptId => {
              if (!selectedOptId) return;
              addonConstraints.forEach(c => {
                if (c.option_id === selectedOptId) {
                  blockedOptionIds.add(c.blocked_option_id);
                  // Find source option name for tooltip
                  const sourceOpt = product.addon_groups?.flatMap((g: any) => g.options || [])
                    .find((o: any) => o.id === selectedOptId);
                  if (sourceOpt) {
                    blockReasons[c.blocked_option_id] = sourceOpt.name;
                  }
                }
              });
            });

            return (
              <div className="product-addons">
                <h4 className="product-addons__title">Tuỳ chọn thêm</h4>
                {product.addon_groups.map((group: any) => {
                  // Filter to only available options
                  const availableOptions = (group.options || []).filter(
                    (opt: any) => priceMap[opt.id]?.is_available !== false
                  );
                  if (availableOptions.length === 0) return null;

                  return (
                    <div key={group.id} className="product-addon-group">
                      <label className="product-addon-group__label">
                        {group.name}
                        {group.is_required && <span className="addon-required">*</span>}
                      </label>
                      <div className="product-addon-group__options">
                        {availableOptions.map((opt: any) => {
                          const isSelected = selectedAddons[group.id] === opt.id;
                          const isBlocked = blockedOptionIds.has(opt.id);
                          const price = priceMap[opt.id]?.additional_price || 0;
                          const groupHasPricing = availableOptions.some((o: any) => (priceMap[o.id]?.additional_price || 0) > 0);

                          return (
                            <button
                              key={opt.id}
                              className={`addon-option ${isSelected ? 'addon-option--active' : ''} ${isBlocked ? 'addon-option--blocked' : ''}`}
                              disabled={isBlocked}
                              title={isBlocked ? `Không khả dụng khi chọn "${blockReasons[opt.id]}"` : ''}
                              onClick={() => {
                                if (isBlocked) return;
                                const newAddons = { ...selectedAddons, [group.id]: isSelected ? null : opt.id };

                                // Auto-deselect options that become blocked by this selection
                                if (!isSelected) {
                                  const newlyBlocked = new Set<number>();
                                  addonConstraints.forEach(c => {
                                    if (c.option_id === opt.id) newlyBlocked.add(c.blocked_option_id);
                                  });
                                  // Check all other groups
                                  product.addon_groups.forEach((otherGroup: any) => {
                                    if (otherGroup.id === group.id) return;
                                    const selectedInOther = newAddons[otherGroup.id];
                                    if (selectedInOther && newlyBlocked.has(selectedInOther)) {
                                      newAddons[otherGroup.id] = null;
                                    }
                                  });
                                }

                                setSelectedAddons(newAddons);
                              }}
                            >
                              <span className="addon-option__name">{opt.name}</span>
                              {isBlocked ? (
                                <span className="addon-option__price" style={{ color: 'rgba(200,50,50,0.7)', fontSize: '0.65rem' }}>
                                  Không khả dụng
                                </span>
                              ) : groupHasPricing ? (
                                <span className="addon-option__price">
                                  {price > 0 ? `+${formatPrice(price)}` : 'Miễn phí'}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Trust badges inline */}
          <div className="product-info__trust">
            <div className="product-trust-item"><FiCheckCircle /> Hàng chính hãng 100%</div>
            <div className="product-trust-item"><FiTruck /> Miễn phí vận chuyển</div>
            <div className="product-trust-item"><FiRefreshCw /> Đổi trả 30 ngày</div>
            <div className="product-trust-item"><FiShield /> Bảo hành 12 tháng</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="product-tabs">
        <div className="product-tabs__header">
          <button
            className={`product-tabs__tab ${activeTab === 'description' ? 'product-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('description')}
          >
            Mô tả
          </button>
          <button
            className={`product-tabs__tab ${activeTab === 'specs' ? 'product-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('specs')}
          >
            Thông số
          </button>
          <button
            className={`product-tabs__tab ${activeTab === 'reviews' ? 'product-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Đánh giá ({stats.count})
          </button>
          {product.faqs && product.faqs.length > 0 && (
            <button
              className={`product-tabs__tab ${activeTab === 'faq' ? 'product-tabs__tab--active' : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              FAQ Hỏi Đáp
            </button>
          )}
        </div>

        <div className="product-tabs__content">
          {/* Description Tab */}
          {activeTab === 'description' && (
            <div className="product-tab-content">
              {product.content ? (
                <div className="rich-content" dangerouslySetInnerHTML={{ __html: product.content }} />
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Chưa có mô tả chi tiết.</p>
              )}
            </div>
          )}

          {/* Specs Tab */}
          {activeTab === 'specs' && (
            <div className="product-tab-content">
              {specs.length > 0 ? (
                <table className="specs-table">
                  <tbody>
                    {specs.map((spec, i) => (
                      <tr key={i}>
                        <td className="specs-table__label">{spec.label}</td>
                        <td className="specs-table__value">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Chưa có thông số kỹ thuật.</p>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="product-tab-content">
              {/* Review Stats */}
              <div className="review-stats">
                <div className="review-stats__summary">
                  <div className="review-stats__avg">{stats.average || '0'}</div>
                  <StarDisplay rating={Math.round(stats.average)} size={20} />
                  <div className="review-stats__count">{stats.count} đánh giá</div>
                </div>
                <div className="review-stats__bars">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = stats.distribution?.[star] || 0;
                    const percent = stats.count > 0 ? (count / stats.count) * 100 : 0;
                    return (
                      <div key={star} className="review-bar">
                        <span className="review-bar__label">{star} ★</span>
                        <div className="review-bar__track">
                          <div className="review-bar__fill" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="review-bar__count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Write review button */}
              {!showReviewForm && !submitted && (
                <button
                  className="btn btn-primary"
                  style={{ marginBottom: '24px' }}
                  onClick={() => setShowReviewForm(true)}
                >
                  <FiStar /> Viết đánh giá
                </button>
              )}

              {submitted && (
                <div className="review-success">
                  <FiCheck /> Cảm ơn bạn! Đánh giá đã được gửi và đang chờ duyệt.
                </div>
              )}

              {/* Review Form */}
              {showReviewForm && (
                <form className="review-form" onSubmit={handleSubmitReview}>
                  <h3 className="review-form__title">Viết đánh giá của bạn</h3>

                  <div className="review-form__group">
                    <label>Đánh giá *</label>
                    <StarRatingInput
                      value={reviewForm.rating}
                      onChange={rating => setReviewForm(f => ({ ...f, rating }))}
                    />
                  </div>

                  <div className="review-form__row">
                    <div className="review-form__group">
                      <label>Họ tên *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nhập họ tên"
                        value={reviewForm.customer_name}
                        onChange={e => setReviewForm(f => ({ ...f, customer_name: e.target.value }))}
                      />
                    </div>
                    <div className="review-form__group">
                      <label>Số điện thoại *</label>
                      <input
                        type="tel"
                        required
                        placeholder="Nhập SĐT"
                        value={reviewForm.customer_phone}
                        onChange={e => setReviewForm(f => ({ ...f, customer_phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="review-form__group">
                    <label>Nội dung đánh giá</label>
                    <textarea
                      placeholder="Chia sẻ trải nghiệm của bạn với sản phẩm..."
                      rows={4}
                      value={reviewForm.comment}
                      onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                    />
                  </div>

                  <div className="review-form__group">
                    <label>Ảnh đánh giá</label>
                    <div className="review-form__images">
                      {reviewImages.map((file, i) => (
                        <div key={i} className="review-form__image-preview">
                          <img src={URL.createObjectURL(file)} alt="" />
                          <button type="button" onClick={() => setReviewImages(imgs => imgs.filter((_, idx) => idx !== i))}>
                            <FiX />
                          </button>
                        </div>
                      ))}
                      {reviewImages.length < 5 && (
                        <>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            multiple
                            id="review-image-upload"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              const remaining = 5 - reviewImages.length;
                              const toAdd = files.slice(0, remaining);
                              if (toAdd.length > 0) {
                                setReviewImages(prev => [...prev, ...toAdd]);
                              }
                              e.target.value = '';
                            }}
                          />
                          <button
                            type="button"
                            className="review-form__add-image"
                            onClick={() => document.getElementById('review-image-upload')?.click()}
                          >
                            <FiCamera />
                            <span>Thêm ảnh</span>
                          </button>
                        </>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: '4px' }}>Tối đa 5 ảnh, mỗi ảnh không quá 5MB</span>
                  </div>

                  <div className="review-form__actions">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowReviewForm(false)}>
                      Hủy
                    </button>
                  </div>
                </form>
              )}

              {/* Review List */}
              <div className="review-list">
                {reviews.length === 0 && !submitted ? (
                  <div className="review-empty">
                    <p>Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
                  </div>
                ) : (
                  reviews.map((review: any) => (
                    <div key={review.id} className="review-item">
                      <div className="review-item__header">
                        <div className="review-item__author">
                          <div className="review-item__avatar">{review.customer_name.charAt(0)}</div>
                          <div>
                            <div className="review-item__name">{review.customer_name}</div>
                            <StarDisplay rating={review.rating} />
                          </div>
                        </div>
                        <div className="review-item__date">
                          {new Date(review.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="review-item__comment">{review.comment}</p>
                      )}
                      {review.images && review.images.length > 0 && (
                        <div className="review-item__images">
                          {review.images.map((img: string, i: number) => (
                            <img
                              key={i}
                              src={img.startsWith('http') ? img : `${apiMediaUrl}${img}`}
                              alt={`Review ${i + 1}`}
                              className="review-item__image"
                            />
                          ))}
                        </div>
                      )}
                      {review.admin_reply && (
                        <div className="review-item__reply">
                          <strong>Glass Eyewear:</strong> {review.admin_reply}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* FAQ Tab */}
          {activeTab === 'faq' && (
            <div className="product-tab-content">
              {product.faqs && product.faqs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {product.faqs.map((faq: any, idx: number) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
                      <h4 style={{ color: 'var(--color-gold)', fontSize: '1.125rem', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ fontSize: '1.25rem', opacity: 0.5 }}>Q:</span>
                        {faq.question}
                      </h4>
                      <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0, display: 'flex', gap: '8px' }}>
                        <strong style={{ color: '#fff', opacity: 0.3 }}>A:</strong>
                        <span>{faq.answer}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.5)' }}>Không có câu hỏi thường gặp nào cho sản phẩm này.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Try-On Modal */}
      <TryOnModal
        isOpen={showTryOn}
        onClose={() => setShowTryOn(false)}
        product={{
          id: product.id,
          name: product.name,
          thumbnail: allImages[0] || '',
          price: Number(product.price),
          sale_price: product.sale_price ? Number(product.sale_price) : null,
          colors: product.colors || [],
          color_names: product.color_names || [],
        }}
        selectedColor={selectedColor}
      />
    </div>
  );
}
