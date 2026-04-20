'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useToken } from '@/lib/useToken';
import { adminApi } from '@/lib/api';
import { useAdminProducts, invalidateAdmin } from '@/lib/useAdmin';
import { formatPrice, formatDate } from '@/lib/constants';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye, FiStar, FiZap, FiDownload, FiUpload, FiX, FiFileText, FiCopy } from 'react-icons/fi';
import { RiGlassesLine } from 'react-icons/ri';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const { token } = useToken();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState('1');
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState('upsert');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const params: Record<string, string> = { per_page: '15', page, show_all: '1' };
  if (search) params.search = search;

  const { data, isLoading, mutate: refresh } = useAdminProducts(token, params);
  const products = data?.data || [];
  const pagination = { currentPage: data?.current_page || 1, lastPage: data?.last_page || 1, total: data?.total || 0 };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa sản phẩm này?')) return;
    if (!token) return;
    try {
      await adminApi.deleteProduct(token, id);
      toast.success('Đã xóa sản phẩm');
      invalidateAdmin('/admin/products');
      refresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi xóa sản phẩm');
    }
  };

  const handleClone = async (id: number) => {
    if (!confirm('Nhân bản sản phẩm này?')) return;
    if (!token) return;
    try {
      const result = await adminApi.cloneProduct(token, id);
      toast.success(result.message || 'Đã nhân bản sản phẩm');
      invalidateAdmin('/admin/products');
      refresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi nhân bản sản phẩm');
    }
  };

  const handleExport = async () => {
    if (!token) return;
    setExporting(true);
    try {
      await adminApi.exportProducts(token);
      toast.success('Đã xuất file Excel thành công');
    } catch (err: any) {
      toast.error('Lỗi xuất file: ' + (err.message || ''));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!token || !importFile) return;
    setImporting(true);
    try {
      const result = await adminApi.importProducts(token, importFile, importMode);
      toast.success(result.message || 'Import thành công');
      if (result.errors?.length > 0) {
        result.errors.forEach((e: string) => toast.error(e, { duration: 5000 }));
      }
      setShowImport(false);
      setImportFile(null);
      invalidateAdmin('/admin/products');
      refresh();
    } catch (err: any) {
      toast.error('Lỗi import: ' + (err.message || ''));
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!token) return;
    try {
      await adminApi.downloadImportTemplate(token);
    } catch {
      toast.error('Lỗi tải file mẫu');
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">
          <RiGlassesLine style={{ marginRight: '8px' }} /> Sản Phẩm ({pagination.total})
        </h1>
        <div className="admin-topbar__actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="admin-btn admin-btn--sm"
            onClick={handleExport}
            disabled={exporting}
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <FiDownload /> {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          <button
            className="admin-btn admin-btn--sm"
            onClick={() => setShowImport(true)}
            style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}
          >
            <FiUpload /> Nhập Excel
          </button>
          <Link href="/admin/products/new" className="admin-btn admin-btn--primary admin-btn--sm">
            <FiPlus /> Thêm Sản Phẩm
          </Link>
        </div>
      </div>
      <div className="admin-content">
        <div className="admin-card">
          {/* Search */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', padding: '10px 16px', gap: '10px' }}>
              <FiSearch style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem' }} />
              <input type="text" placeholder="Tìm sản phẩm theo tên, SKU..." value={search} onChange={e => { setSearch(e.target.value); setPage('1'); }}
                style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.875rem', width: '100%' }} />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Ảnh</th>
                  <th>Tên Sản Phẩm</th>
                  <th>Danh Mục</th>
                  <th>Giá</th>
                  <th>Kho</th>
                  <th>Lượt xem</th>
                  <th>Trạng Thái</th>
                  <th style={{ width: '100px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && products.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td><div className="skeleton" style={{ width: '50px', height: '50px', borderRadius: '8px' }} /></td>
                      <td><div className="skeleton" style={{ height: '14px', width: '70%', marginBottom: '6px' }} /><div className="skeleton" style={{ height: '10px', width: '40%' }} /></td>
                      <td><div className="skeleton" style={{ height: '12px', width: '60%' }} /></td>
                      <td><div className="skeleton" style={{ height: '14px', width: '50%' }} /></td>
                      <td><div className="skeleton" style={{ height: '12px', width: '30px' }} /></td>
                      <td><div className="skeleton" style={{ height: '12px', width: '40px' }} /></td>
                      <td><div className="skeleton" style={{ height: '20px', width: '60px', borderRadius: '10px' }} /></td>
                      <td><div className="skeleton" style={{ height: '28px', width: '80px', borderRadius: '6px' }} /></td>
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <RiGlassesLine style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.15)', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Chưa có sản phẩm nào</p>
                    <Link href="/admin/products/new" className="admin-btn admin-btn--primary admin-btn--sm"><FiPlus /> Thêm sản phẩm đầu tiên</Link>
                  </td></tr>
                ) : products.map((product: any) => (
                  <tr key={product.id}>
                    <td>
                      <div style={{ width: '50px', height: '50px', borderRadius: '10px', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(15,52,96,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {product.thumbnail ? (
                          <img src={product.thumbnail.startsWith('http') ? product.thumbnail : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${product.thumbnail}`}
                            alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <RiGlassesLine style={{ color: 'rgba(201,169,110,0.3)', fontSize: '1.5rem' }} />
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-white)' }}>{product.name}</span>
                        {product.is_featured && <FiStar style={{ color: 'var(--color-gold)', fontSize: '0.75rem' }} />}
                        {product.is_new && <FiZap style={{ color: '#10b981', fontSize: '0.75rem' }} />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                        {product.sku ? `SKU: ${product.sku}` : product.brand || '—'}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', padding: '3px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
                        {product.category?.name || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-gold)' }}>{formatPrice(product.sale_price || product.price)}</div>
                      {product.sale_price && (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>{formatPrice(product.price)}</div>
                      )}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 600,
                        color: product.stock <= 5 ? '#ef4444' : product.stock <= 20 ? '#f59e0b' : '#10b981',
                      }}>{product.stock}</span>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{(product.views || 0).toLocaleString()}</td>
                    <td>
                      <span className={`admin-badge ${product.is_active ? 'admin-badge--success' : 'admin-badge--danger'}`}>
                        {product.is_active ? 'Hoạt động' : 'Ẩn'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <Link href={`/san-pham/${product.slug}`} className="admin-table__action" target="_blank" title="Xem"><FiEye /></Link>
                        <Link href={`/admin/products/${product.id}`} className="admin-table__action" title="Sửa"><FiEdit2 /></Link>
                        <button className="admin-table__action" onClick={() => handleClone(product.id)} title="Nhân bản" style={{ color: '#3b82f6' }}><FiCopy /></button>
                        <button className="admin-table__action admin-table__action--danger" onClick={() => handleDelete(product.id)} title="Xóa"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.lastPage > 1 && (
            <div className="admin-pagination">
              <button
                className="admin-pagination__btn"
                onClick={() => setPage(String(pagination.currentPage - 1))}
                disabled={pagination.currentPage === 1}
              >
                ‹ Trước
              </button>
              
              {/* First page */}
              {pagination.currentPage > 3 && (
                <>
                  <button className="admin-pagination__btn" onClick={() => setPage('1')}>1</button>
                  {pagination.currentPage > 4 && <span className="admin-pagination__ellipsis">...</span>}
                </>
              )}
              
              {/* Pages around current */}
              {Array.from({ length: pagination.lastPage }, (_, i) => i + 1)
                .filter(p => p >= pagination.currentPage - 2 && p <= pagination.currentPage + 2)
                .map(p => (
                  <button
                    key={p}
                    className={`admin-pagination__btn ${pagination.currentPage === p ? 'admin-pagination__btn--active' : ''}`}
                    onClick={() => setPage(String(p))}
                  >
                    {p}
                  </button>
                ))}
              
              {/* Last page */}
              {pagination.currentPage < pagination.lastPage - 2 && (
                <>
                  {pagination.currentPage < pagination.lastPage - 3 && <span className="admin-pagination__ellipsis">...</span>}
                  <button className="admin-pagination__btn" onClick={() => setPage(String(pagination.lastPage))}>{pagination.lastPage}</button>
                </>
              )}
              
              <button
                className="admin-pagination__btn"
                onClick={() => setPage(String(pagination.currentPage + 1))}
                disabled={pagination.currentPage === pagination.lastPage}
              >
                Sau ›
              </button>
              
              <span className="admin-pagination__info">
                Trang {pagination.currentPage}/{pagination.lastPage} ({pagination.total} sản phẩm)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => !importing && setShowImport(false)}>
          <div style={{
            background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiUpload style={{ color: '#3b82f6' }} /> Nhập sản phẩm từ Excel
              </h3>
              <button onClick={() => !importing && setShowImport(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.25rem' }}>
                <FiX />
              </button>
            </div>

            {/* File picker */}
            <div style={{
              border: '2px dashed rgba(59,130,246,0.3)', borderRadius: '12px',
              padding: '24px', textAlign: 'center', marginBottom: '16px',
              background: importFile ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer', transition: 'all 0.2s',
            }} onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx"
                style={{ display: 'none' }}
                onChange={e => setImportFile(e.target.files?.[0] || null)} />
              {importFile ? (
                <>
                  <FiFileText style={{ fontSize: '2rem', color: '#3b82f6', marginBottom: '8px' }} />
                  <div style={{ color: '#fff', fontWeight: 600 }}>{importFile.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '4px' }}>
                    {(importFile.size / 1024).toFixed(1)} KB
                  </div>
                </>
              ) : (
                <>
                  <FiUpload style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }} />
                  <div style={{ color: 'rgba(255,255,255,0.5)' }}>Nhấn để chọn file CSV</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '4px' }}>
                    Hỗ trợ: .csv (UTF-8)
                  </div>
                </>
              )}
            </div>

            {/* Import mode */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem', marginBottom: '8px' }}>
                Chế độ import:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { value: 'upsert', label: 'Tạo mới & Cập nhật', desc: 'Theo SKU/ID' },
                  { value: 'create', label: 'Chỉ tạo mới', desc: 'Bỏ qua trùng' },
                  { value: 'update', label: 'Chỉ cập nhật', desc: 'Không tạo mới' },
                ].map(m => (
                  <button key={m.value} onClick={() => setImportMode(m.value)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: '8px', border: 'none',
                      background: importMode === m.value ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                      color: importMode === m.value ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer', fontSize: '0.75rem', fontWeight: importMode === m.value ? 700 : 400,
                      outline: importMode === m.value ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                      transition: 'all 0.2s',
                    }}>
                    <div>{m.label}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '2px' }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Template download */}
            <div style={{
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '20px',
              fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)',
            }}>
              💡 Chưa có file mẫu?{' '}
              <button onClick={handleDownloadTemplate}
                style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.8rem' }}>
                Tải file mẫu CSV
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="admin-btn admin-btn--sm"
                onClick={() => { setShowImport(false); setImportFile(null); }}
                disabled={importing}
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                Hủy
              </button>
              <button className="admin-btn admin-btn--primary admin-btn--sm"
                onClick={handleImport}
                disabled={!importFile || importing}
                style={{ opacity: !importFile || importing ? 0.5 : 1 }}>
                {importing ? (
                  <><span className="spinner" style={{ width: '14px', height: '14px', marginRight: '6px' }} /> Đang import...</>
                ) : (
                  <><FiUpload /> Import</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
