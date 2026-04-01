'use client';

import { useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useAdminArticles, invalidateAdmin } from '@/lib/useAdmin';
import { useToken } from '@/lib/useToken';
import { formatDate } from '@/lib/constants';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye, FiStar, FiCpu } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminArticlesPage() {
  const { token } = useToken();
  const [search, setSearch] = useState('');

  const params: Record<string, string> = { per_page: '15' };
  if (search) params.search = search;

  const { data, isLoading, mutate: refresh } = useAdminArticles(token, params);
  const articles = data?.data || [];
  const total = data?.total || 0;

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa bài viết này?')) return;
    if (!token) return;
    try {
      await adminApi.deleteArticle(token, id);
      invalidateAdmin('/admin/articles');
      refresh();
      toast.success('Đã xóa bài viết');
    } catch (err: any) { 
      console.error(err);
      toast.error('Lỗi khi xóa bài viết');
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-topbar__title">Bài Viết ({total})</h1>
        <div className="admin-topbar__actions">
          <Link href="/admin/ai-content" className="admin-btn admin-btn--secondary admin-btn--sm">
            <FiCpu /> Tạo bài bằng AI
          </Link>
          <Link href="/admin/articles/new" className="admin-btn admin-btn--primary admin-btn--sm">
            <FiPlus /> Thêm Bài Viết
          </Link>
        </div>
      </div>
      <div className="admin-content">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '8px 14px', gap: '8px' }}>
            <FiSearch style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input type="text" placeholder="Tìm bài viết..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.875rem', width: '100%' }} />
          </div>
        </div>

        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tiêu đề</th>
                <th>Tác giả</th>
                <th>Trạng thái</th>
                <th>Lượt xem</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px' }}>Đang tải...</td></tr>
              ) : articles.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.4)' }}>
                  Chưa có bài viết. <Link href="/admin/articles/new" style={{ color: 'var(--color-gold)' }}>Thêm bài mới</Link> hoặc <Link href="/admin/ai-content" style={{ color: 'var(--color-gold)' }}>tạo bằng AI</Link>
                </td></tr>
              ) : articles.map((article: any) => (
                <tr key={article.id}>
                  <td>
                    <div style={{ width: '60px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                      {article.thumbnail && <img src={article.thumbnail.startsWith('http') ? article.thumbnail : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${article.thumbnail}`}
                        alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {article.title}
                      {article.is_featured && <FiStar style={{ color: 'var(--color-gold)', fontSize: '0.75rem' }} />}
                    </div>
                    {article.excerpt && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{article.excerpt}</div>}
                  </td>
                  <td>{article.author || '—'}</td>
                  <td>
                    <span className={`admin-badge ${article.is_published ? 'admin-badge--success' : 'admin-badge--warning'}`}>
                      {article.is_published ? 'Đã đăng' : 'Nháp'}
                    </span>
                  </td>
                  <td>{article.views?.toLocaleString() || 0}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{formatDate(article.created_at)}</td>
                  <td>
                    <div className="admin-table__actions">
                      <Link href={`/bai-viet/${article.slug}`} className="admin-table__action" target="_blank" title="Xem"><FiEye /></Link>
                      <Link href={`/admin/articles/${article.id}`} className="admin-table__action" title="Sửa"><FiEdit2 /></Link>
                      <button className="admin-table__action admin-table__action--danger" onClick={() => handleDelete(article.id)} title="Xóa"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
