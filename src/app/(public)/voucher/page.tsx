'use client';

import { useState, useEffect } from 'react';
import { publicApi } from '@/lib/api';
import { FiCopy, FiCheck, FiGift } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './voucher.css';

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(n) + 'đ';

export default function VoucherPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    publicApi.getVouchers()
      .then((data: any) => {
        setVouchers(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyCode = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success(`Đã sao chép mã ${code}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <section className="voucher-hero">
        <div className="container">
          <span className="voucher-hero__tag"><FiGift /> Ưu đãi dành cho bạn</span>
          <h1 className="voucher-hero__title">Mã Giảm Giá</h1>
          <p className="voucher-hero__subtitle">
            Sao chép mã và sử dụng khi thanh toán để nhận ưu đãi
          </p>
        </div>
      </section>

      <section className="voucher-section">
        <div className="container">
          {loading ? (
            <div className="voucher-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="voucher-card voucher-card--skeleton">
                  <div className="voucher-card__value-area">
                    <div style={{ width: '60%', height: '20px', background: 'rgba(0,0,0,0.06)', borderRadius: '6px' }} />
                    <div style={{ width: '40%', height: '40px', background: 'rgba(0,0,0,0.06)', borderRadius: '6px', marginTop: '8px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : vouchers.length === 0 ? (
            <div className="voucher-empty">
              <FiGift style={{ fontSize: '3rem', opacity: 0.3 }} />
              <p>Hiện chưa có mã giảm giá nào</p>
              <p style={{ fontSize: '0.875rem', opacity: 0.5 }}>Hãy quay lại sau nhé!</p>
            </div>
          ) : (
            <div className="voucher-grid">
              {vouchers.map((v: any) => (
                <div key={v.id} className="voucher-card">
                  {/* Left: Discount Value */}
                  <div className="voucher-card__left">
                    <span className="voucher-card__value-prefix">Giảm</span>
                    {v.type === 'percent' ? (
                      <span className="voucher-card__value-number">{v.value}<span className="voucher-card__value-unit">%</span></span>
                    ) : (
                      <span className="voucher-card__value-number">
                        {v.value >= 1000000
                          ? (v.value / 1000000).toFixed(v.value % 1000000 === 0 ? 0 : 1) + 'M'
                          : Math.round(v.value / 1000) + 'K'
                        }
                      </span>
                    )}
                  </div>

                  {/* Cut line with scissors */}
                  <div className="voucher-card__cutline">
                    <span className="voucher-card__scissors">✂</span>
                  </div>

                  {/* Right: Info + Copy */}
                  <div className="voucher-card__right">
                    <div className="voucher-card__code-label">
                      Mã: <strong>{v.code}</strong>
                    </div>
                    <p className="voucher-card__condition">
                      {v.description
                        ? v.description
                        : v.min_order > 0
                          ? `Cho đơn từ ${formatVND(v.min_order)}`
                          : 'Không yêu cầu đơn tối thiểu'}
                    </p>
                    {v.type === 'percent' && v.max_discount > 0 && (
                      <p className="voucher-card__max-discount">
                        Tối đa {formatVND(v.max_discount)}
                      </p>
                    )}
                    {v.expires_at && (
                      <p className="voucher-card__expires">
                        HSD: {new Date(v.expires_at).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                    <div className="voucher-card__actions">
                      <button className="voucher-card__terms">
                        Điều kiện áp dụng
                      </button>
                      <button
                        className={`voucher-card__copy ${copiedId === v.id ? 'voucher-card__copy--copied' : ''}`}
                        onClick={() => copyCode(v.code, v.id)}
                      >
                        {copiedId === v.id ? <><FiCheck /> Đã sao chép</> : <><FiCopy /> Sao chép mã</>}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
