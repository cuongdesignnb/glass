"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { useToken } from "@/lib/useToken";
import toast from "react-hot-toast";
import {
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiUpload,
  FiTrash2,
  FiExternalLink,
  FiSettings,
  FiShoppingBag,
} from "react-icons/fi";

interface MerchantStatus {
  configured: boolean;
  merchant_id?: string;
  country?: string;
  language?: string;
  currency?: string;
  site_url?: string;
  token_ok?: boolean;
  token_error?: string;
}

export default function AdminMerchantPage() {
  const { token } = useToken();
  const [status, setStatus] = useState<MerchantStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [perProductLoading, setPerProductLoading] = useState<
    Record<number, string>
  >({});
  const [onlyActive, setOnlyActive] = useState(true);

  useEffect(() => {
    if (token) {
      loadStatus();
      loadProducts();
    }
  }, [token]);

  const loadStatus = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await adminApi.merchantStatus(token);
      setStatus(data);
    } catch (err: any) {
      toast.error(err.message || "Không tải được trạng thái");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    if (!token) return;
    setProductLoading(true);
    try {
      const data = await adminApi.getProducts(token, {
        per_page: "100",
        show_all: "1",
      });
      setProducts(data.data || []);
    } catch {
      // silent
    } finally {
      setProductLoading(false);
    }
  };

  const handleSyncAll = async () => {
    if (!token) return;
    if (
      !confirm(
        `Đẩy ${onlyActive ? "tất cả sản phẩm đang hoạt động" : "TẤT CẢ sản phẩm"} lên Google Merchant? Có thể mất vài phút.`,
      )
    )
      return;
    setSyncing(true);
    setSyncResult(null);
    const t = toast.loading("Đang đồng bộ lên Google Merchant...");
    try {
      const result = await adminApi.merchantSyncAll(token, onlyActive);
      setSyncResult(result);
      toast.success(
        `Xong: ${result.success}/${result.total} sản phẩm thành công`,
        { id: t },
      );
    } catch (err: any) {
      toast.error("Lỗi: " + (err.message || ""), { id: t });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncOne = async (productId: number) => {
    if (!token) return;
    setPerProductLoading((p) => ({ ...p, [productId]: "sync" }));
    const t = toast.loading("Đang đẩy lên Merchant...");
    try {
      const r = await adminApi.merchantSyncOne(token, productId);
      if (r.success) toast.success("Đã đẩy lên Merchant!", { id: t });
      else toast.error("Lỗi: " + (r.error || ""), { id: t });
    } catch (err: any) {
      toast.error(err.message || "Lỗi", { id: t });
    } finally {
      setPerProductLoading((p) => {
        const n = { ...p };
        delete n[productId];
        return n;
      });
    }
  };

  const handleDeleteOne = async (productId: number) => {
    if (!token) return;
    if (!confirm("Xóa sản phẩm này khỏi Google Merchant?")) return;
    setPerProductLoading((p) => ({ ...p, [productId]: "delete" }));
    const t = toast.loading("Đang xóa...");
    try {
      const r = await adminApi.merchantDeleteOne(token, productId);
      if (r.success) toast.success("Đã xóa khỏi Merchant", { id: t });
      else toast.error("Lỗi: " + (r.error || ""), { id: t });
    } catch (err: any) {
      toast.error(err.message || "Lỗi", { id: t });
    } finally {
      setPerProductLoading((p) => {
        const n = { ...p };
        delete n[productId];
        return n;
      });
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">
          <FiShoppingBag style={{ display: "inline", marginRight: "8px" }} />{" "}
          Google Merchant Center
        </h1>
        <Link
          href="/admin/settings"
          className="admin-btn admin-btn--secondary admin-btn--sm"
        >
          <FiSettings /> Cấu hình
        </Link>
      </div>

      <div className="admin-content">
        <p style={{ opacity: 0.7, marginBottom: "20px" }}>
          Đẩy sản phẩm lên Google Shopping để quảng cáo & hiển thị miễn phí.
        </p>

        {/* Status Card */}
        <div className="admin-card" style={{ marginBottom: "20px" }}>
          <h3
            style={{
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FiCheckCircle /> Trạng thái kết nối
          </h3>
          {loading ? (
            <div style={{ opacity: 0.6 }}>Đang kiểm tra...</div>
          ) : !status?.configured ? (
            <div
              style={{
                padding: "16px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "#ef4444",
                  marginBottom: "8px",
                }}
              >
                <FiAlertCircle /> <strong>Chưa cấu hình</strong>
              </div>
              <p
                style={{
                  fontSize: "0.875rem",
                  opacity: 0.8,
                  marginBottom: "12px",
                }}
              >
                Bạn cần nhập <strong>Merchant Center ID</strong> và{" "}
                <strong>Service Account JSON</strong> trong phần Cài Đặt → API &
                Tích hợp.
              </p>
              <Link
                href="/admin/settings"
                className="admin-btn admin-btn--primary admin-btn--sm"
              >
                <FiSettings /> Đi đến Cài Đặt
              </Link>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <StatusItem
                  label="Merchant ID"
                  value={status.merchant_id || "—"}
                />
                <StatusItem label="Quốc gia" value={status.country || "VN"} />
                <StatusItem label="Ngôn ngữ" value={status.language || "vi"} />
                <StatusItem label="Tiền tệ" value={status.currency || "VND"} />
                <StatusItem
                  label="Site URL"
                  value={status.site_url || "—"}
                  mono
                />
              </div>
              {status.token_ok ? (
                <div
                  style={{
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.875rem",
                  }}
                >
                  <FiCheckCircle /> Kết nối OAuth2 OK — sẵn sàng đồng bộ.
                </div>
              ) : (
                <div style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                  <FiAlertCircle /> Lỗi kết nối:{" "}
                  {status.token_error || "Không rõ"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bulk Sync Card */}
        {status?.configured && (
          <div className="admin-card" style={{ marginBottom: "20px" }}>
            <h3
              style={{
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FiUpload /> Đồng bộ hàng loạt
            </h3>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                marginBottom: "12px",
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={onlyActive}
                  onChange={(e) => setOnlyActive(e.target.checked)}
                />
                Chỉ đẩy sản phẩm đang hoạt động (is_active = true)
              </label>
              <button
                className="admin-btn admin-btn--primary"
                disabled={syncing || !status.token_ok}
                onClick={handleSyncAll}
              >
                <FiRefreshCw className={syncing ? "spin" : ""} />
                {syncing ? "Đang đồng bộ..." : "Đẩy tất cả lên Merchant"}
              </button>
            </div>

            {syncResult && (
              <div
                style={{
                  padding: "12px",
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  borderRadius: "8px",
                  marginTop: "12px",
                }}
              >
                <strong>Kết quả: </strong>
                <span style={{ color: "#10b981" }}>
                  {syncResult.success}
                </span> / {syncResult.total} sản phẩm thành công
                {syncResult.failed > 0 && (
                  <span style={{ color: "#ef4444" }}>
                    {" "}
                    — {syncResult.failed} lỗi
                  </span>
                )}
                {Array.isArray(syncResult.errors) &&
                  syncResult.errors.length > 0 && (
                    <details style={{ marginTop: "10px" }}>
                      <summary
                        style={{ cursor: "pointer", fontSize: "0.875rem" }}
                      >
                        Xem chi tiết lỗi ({syncResult.errors.length})
                      </summary>
                      <ul
                        style={{
                          marginTop: "8px",
                          fontSize: "0.8125rem",
                          maxHeight: "200px",
                          overflowY: "auto",
                        }}
                      >
                        {syncResult.errors.map((e: any, i: number) => (
                          <li key={i} style={{ marginBottom: "4px" }}>
                            <strong>{e.name}</strong> (ID: {e.product_id}):{" "}
                            <span style={{ color: "#ef4444" }}>{e.error}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Products Table */}
        {status?.configured && (
          <div className="admin-card">
            <h3 style={{ marginBottom: "16px" }}>Đồng bộ từng sản phẩm</h3>
            {productLoading ? (
              <div style={{ opacity: 0.6 }}>Đang tải...</div>
            ) : products.length === 0 ? (
              <div style={{ opacity: 0.6 }}>Chưa có sản phẩm.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Sản phẩm</th>
                      <th>SKU</th>
                      <th>Giá</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: "right" }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td
                          style={{
                            maxWidth: "260px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.name}
                        </td>
                        <td>
                          <code>{p.sku || `sku-${p.id}`}</code>
                        </td>
                        <td>
                          {Intl.NumberFormat("vi-VN").format(
                            p.sale_price || p.price,
                          )}{" "}
                          ₫
                        </td>
                        <td>
                          {p.is_active ? (
                            <span
                              style={{
                                color: "#10b981",
                                fontSize: "0.8125rem",
                              }}
                            >
                              ● Đang bán
                            </span>
                          ) : (
                            <span
                              style={{
                                color: "#f59e0b",
                                fontSize: "0.8125rem",
                              }}
                            >
                              ● Ẩn
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              className="admin-btn admin-btn--primary admin-btn--sm"
                              disabled={!!perProductLoading[p.id]}
                              onClick={() => handleSyncOne(p.id)}
                              title="Đẩy lên Merchant"
                            >
                              <FiUpload />{" "}
                              {perProductLoading[p.id] === "sync"
                                ? "..."
                                : "Đẩy"}
                            </button>
                            <button
                              className="admin-btn admin-btn--sm"
                              disabled={!!perProductLoading[p.id]}
                              onClick={() => handleDeleteOne(p.id)}
                              title="Xóa khỏi Merchant"
                              style={{ color: "#ef4444" }}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            opacity: 0.75,
          }}
        >
          <strong>Hướng dẫn nhanh:</strong>
          <ol
            style={{ marginTop: "8px", paddingLeft: "20px", lineHeight: 1.7 }}
          >
            <li>
              Vào{" "}
              <a
                href="https://console.cloud.google.com/iam-admin/serviceaccounts"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#c9a96e" }}
              >
                Google Cloud Console{" "}
                <FiExternalLink style={{ display: "inline" }} />
              </a>{" "}
              → tạo Service Account.
            </li>
            <li>
              Kích hoạt Content API for Shopping:{" "}
              <code>shoppingcontent.googleapis.com</code>.
            </li>
            <li>Tạo Key loại JSON, tải xuống file.</li>
            <li>
              Vào{" "}
              <a
                href="https://merchants.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#c9a96e" }}
              >
                Merchant Center <FiExternalLink style={{ display: "inline" }} />
              </a>{" "}
              → Users → thêm email service account với quyền Admin.
            </li>
            <li>
              Dán nội dung JSON và Merchant ID vào Cài Đặt → API & Tích hợp.
            </li>
            <li>Quay lại đây và bấm "Đẩy tất cả lên Merchant".</li>
          </ol>
        </div>

        <style jsx>{`
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </>
  );
}

function StatusItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: "6px",
      }}
    >
      <div style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "2px" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          fontFamily: mono ? "monospace" : undefined,
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
    </div>
  );
}
