'use client';

import useSWR, { mutate } from 'swr';
import { adminApi, publicApi } from './api';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

// ==========================================
// Auth Hook - manages token + user
// ==========================================
export function useAdminAuth() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    const u = localStorage.getItem('admin_user');
    if (t) {
      setToken(t);
      setUser(u ? JSON.parse(u) : null);
    }
    setReady(true);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await adminApi.login(email, password);
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = useCallback(() => {
    if (token) {
      adminApi.logout(token).catch(() => {});
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
    router.push('/admin/login');
  }, [token, router]);

  return { token, user, ready, login, logout };
}

// ==========================================
// SWR Fetcher with token
// ==========================================
function createFetcher(token: string | null) {
  return (key: string) => {
    if (!token) throw new Error('No token');
    const [endpoint, params] = key.split('?');
    const searchParams = params ? Object.fromEntries(new URLSearchParams(params)) : undefined;
    
    // Map SWR keys to API calls
    switch (endpoint) {
      case '/admin/products':
        return adminApi.getProducts(token, searchParams);
      case '/admin/categories':
        return adminApi.getCategories(token);
      case '/admin/media':
        return adminApi.getMedia(token, searchParams);
      case '/admin/menus':
        return adminApi.getMenus(token);
      case '/admin/banners':
        return adminApi.getBanners(token);
      case '/admin/settings':
        return adminApi.getSettings(token);
      case '/admin/articles':
        return adminApi.getArticles(token, searchParams);
      case '/admin/article-categories':
        return adminApi.getArticleCategories(token);
      case '/admin/orders':
        return adminApi.getOrders(token, searchParams);
      case '/admin/reviews':
        return adminApi.getReviews(token, searchParams);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  };
}

// ==========================================
// Data Hooks with SWR (stale-while-revalidate)
// ==========================================
export function useAdminProducts(token: string | null, params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return useSWR(
    token ? `/admin/products${query}` : null,
    createFetcher(token),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );
}

export function useAdminCategories(token: string | null) {
  return useSWR(
    token ? '/admin/categories' : null,
    createFetcher(token),
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );
}

export function useAdminMedia(token: string | null, params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return useSWR(
    token ? `/admin/media${query}` : null,
    createFetcher(token),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );
}

export function useAdminMenus(token: string | null) {
  return useSWR(
    token ? '/admin/menus' : null,
    createFetcher(token),
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );
}

export function useAdminBanners(token: string | null) {
  return useSWR(
    token ? '/admin/banners' : null,
    createFetcher(token),
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );
}

export function useAdminSettings(token: string | null) {
  return useSWR(
    token ? '/admin/settings' : null,
    createFetcher(token),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
}

export function useAdminArticles(token: string | null, params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return useSWR(
    token ? `/admin/articles${query}` : null,
    createFetcher(token),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );
}

export function useAdminArticleCategories(token: string | null) {
  return useSWR(
    token ? '/admin/article-categories' : null,
    createFetcher(token),
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );
}

export function useAdminOrders(token: string | null, params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return useSWR(
    token ? `/admin/orders${query}` : null,
    createFetcher(token),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );
}

export function useAdminReviews(token: string | null, params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return useSWR(
    token ? `/admin/reviews${query}` : null,
    createFetcher(token),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );
}

// ==========================================
// Mutation helpers (invalidate cache after changes)
// ==========================================
export function invalidateAdmin(key: string) {
  mutate((swrKey: string) => typeof swrKey === 'string' && swrKey.startsWith(key), undefined, { revalidate: true });
}
