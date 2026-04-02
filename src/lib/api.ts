const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// SSR sử dụng internal URL (127.0.0.1) để tránh DNS/SSL timeout
const INTERNAL_API = process.env.INTERNAL_API_URL || '';
const API_HOST = process.env.API_HOST || '';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchApi(endpoint: string, options: FetchOptions = {}) {
  const { token, ...fetchOptions } = options;
  
  // Server-side: dùng internal URL, Browser: dùng public URL
  const isServer = typeof window === 'undefined';
  const baseUrl = (isServer && INTERNAL_API) ? INTERNAL_API : API_BASE;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  // Thêm Host header cho internal calls
  if (isServer && API_HOST && INTERNAL_API) {
    headers['Host'] = API_HOST;
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData
  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==========================================
// PUBLIC API
// ==========================================

export const publicApi = {
  // Products
  getProducts: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi(`/public/products${query}`);
  },
  getProduct: (slug: string) => fetchApi(`/public/products/${slug}`),

  // Categories
  getCategories: (tree = true) => fetchApi(`/public/categories?tree=${tree}`),
  getCategory: (slug: string) => fetchApi(`/public/categories/${slug}`),

  // Articles
  getArticles: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi(`/public/articles${query}&published_only=1`);
  },
  getArticle: (slug: string) => fetchApi(`/public/articles/${slug}`),

  // Pages
  getPage: (slug: string) => fetchApi(`/public/pages/${slug}`),

  // Banners
  getBanners: (position?: string) => {
    const query = position ? `?position=${position}&active_only=1` : '?active_only=1';
    return fetchApi(`/public/banners${query}`);
  },

  // Menus
  getMenus: (position = 'header') => fetchApi(`/public/menus?position=${position}`),

  // Settings
  getSettings: (group?: string) => {
    const query = group ? `?group=${group}` : '';
    return fetchApi(`/public/settings${query}`);
  },

  // FAQs
  getFaqs: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi(`/public/faqs${query}`);
  },

  // Orders
  createOrder: (data: any) => fetchApi('/public/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Reviews
  getProductReviews: (productId: number, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi(`/public/products/${productId}/reviews${query}`);
  },
  submitReview: (data: {
    product_id: number;
    customer_name: string;
    customer_phone: string;
    rating: number;
    comment?: string;
    images?: string[];
  }) => fetchApi('/public/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // AI Virtual Try-On
  aiTryOn: (data: {
    face_image: string;
    glasses_image: string;
    product_name?: string;
  }) => fetchApi('/public/ai/try-on', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// ==========================================
// ADMIN API (requires token)
// ==========================================

export const adminApi = {
  // Auth
  login: (email: string, password: string) =>
    fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: (token: string) =>
    fetchApi('/auth/logout', { method: 'POST', token }),

  me: (token: string) =>
    fetchApi('/auth/me', { token }),

  // Products
  getProducts: (token: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams({ ...params, show_all: '1' }).toString() : '?show_all=1';
    return fetchApi(`/products${query}`, { token });
  },
  createProduct: (token: string, data: any) =>
    fetchApi('/products', { method: 'POST', body: JSON.stringify(data), token }),
  updateProduct: (token: string, id: number, data: any) =>
    fetchApi(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  deleteProduct: (token: string, id: number) =>
    fetchApi(`/products/${id}`, { method: 'DELETE', token }),

  // Products Import/Export
  exportProducts: async (token: string) => {
    const res = await fetch(`${API_BASE}/products-export`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'text/csv' },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `san-pham-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
  importProducts: async (token: string, file: File, mode: string = 'upsert') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    return fetchApi('/products-import', { method: 'POST', body: formData, token });
  },
  downloadImportTemplate: async (token: string) => {
    const res = await fetch(`${API_BASE}/products-import-template`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau-import-san-pham.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  // Categories
  getCategories: (token: string) =>
    fetchApi('/categories?tree=true', { token }),
  createCategory: (token: string, data: any) =>
    fetchApi('/categories', { method: 'POST', body: JSON.stringify(data), token }),
  updateCategory: (token: string, id: number, data: any) =>
    fetchApi(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  deleteCategory: (token: string, id: number) =>
    fetchApi(`/categories/${id}`, { method: 'DELETE', token }),

  // Media
  getMedia: (token: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi(`/media${query}`, { token });
  },
  uploadMedia: (token: string, formData: FormData) =>
    fetchApi('/media/upload', { method: 'POST', body: formData, token }),
  deleteMedia: (token: string, id: number) =>
    fetchApi(`/media/${id}`, { method: 'DELETE', token }),

  // Menus
  getMenus: (token: string) =>
    fetchApi('/menus/all', { token }),
  createMenu: (token: string, data: any) =>
    fetchApi('/menus', { method: 'POST', body: JSON.stringify(data), token }),
  updateMenu: (token: string, id: number, data: any) =>
    fetchApi(`/menus/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  reorderMenus: (token: string, items: any[]) =>
    fetchApi('/menus-reorder', { method: 'PUT', body: JSON.stringify({ items }), token }),
  deleteMenu: (token: string, id: number) =>
    fetchApi(`/menus/${id}`, { method: 'DELETE', token }),

  // Banners
  getBanners: (token: string) =>
    fetchApi('/banners', { token }),
  createBanner: (token: string, data: any) =>
    fetchApi('/banners', { method: 'POST', body: JSON.stringify(data), token }),
  updateBanner: (token: string, id: number, data: any) =>
    fetchApi(`/banners/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  deleteBanner: (token: string, id: number) =>
    fetchApi(`/banners/${id}`, { method: 'DELETE', token }),

  // Settings
  getSettings: (token: string) =>
    fetchApi('/settings', { token }),
  updateSettings: (token: string, settings: any[]) =>
    fetchApi('/settings', { method: 'PUT', body: JSON.stringify({ settings }), token }),
  uploadFont: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/settings/font-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Upload font thất bại');
    }
    return res.json();
  },
  deleteFont: (token: string) =>
    fetchApi('/settings/font-delete', { method: 'DELETE', token }),

  // Articles
  getArticles: (token: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi(`/articles${query}`, { token });
  },
  createArticle: (token: string, data: any) =>
    fetchApi('/articles', { method: 'POST', body: JSON.stringify(data), token }),
  updateArticle: (token: string, id: number, data: any) =>
    fetchApi(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  deleteArticle: (token: string, id: number) =>
    fetchApi(`/articles/${id}`, { method: 'DELETE', token }),

  // Pages
  getPages: (token: string) =>
    fetchApi('/pages', { token }),
  createPage: (token: string, data: any) =>
    fetchApi('/pages', { method: 'POST', body: JSON.stringify(data), token }),
  updatePage: (token: string, id: number, data: any) =>
    fetchApi(`/pages/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  deletePage: (token: string, id: number) =>
    fetchApi(`/pages/${id}`, { method: 'DELETE', token }),

  // FAQs
  getFaqs: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi(`/faqs${qs}`, { token });
  },
  createFaq: (token: string, data: any) =>
    fetchApi('/faqs', { method: 'POST', body: JSON.stringify(data), token }),
  updateFaq: (token: string, id: number, data: any) =>
    fetchApi(`/faqs/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
  deleteFaq: (token: string, id: number) =>
    fetchApi(`/faqs/${id}`, { method: 'DELETE', token }),

  // Orders
  getOrders: (token: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi(`/orders${query}`, { token });
  },
  getOrder: (token: string, id: number) =>
    fetchApi(`/orders/${id}`, { token }),
  updateOrderStatus: (token: string, id: number, data: any) =>
    fetchApi(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify(data), token }),

  // Reviews
  getReviews: (token: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi(`/reviews${query}`, { token });
  },
  approveReview: (token: string, id: number) =>
    fetchApi(`/reviews/${id}/approve`, { method: 'PUT', token }),
  replyReview: (token: string, id: number, adminReply: string) =>
    fetchApi(`/reviews/${id}/reply`, { method: 'PUT', body: JSON.stringify({ admin_reply: adminReply }), token }),
  deleteReview: (token: string, id: number) =>
    fetchApi(`/reviews/${id}`, { method: 'DELETE', token }),

  // AI
  aiTryOn: (token: string, faceImage: string, glassesImage: string) =>
    fetchApi('/ai/try-on', {
      method: 'POST',
      body: JSON.stringify({ face_image: faceImage, glasses_image: glassesImage }),
      token,
    }),
  aiGenerateContent: (token: string, data: { topic: string; type?: string; keywords?: string; tone?: string; length?: string }) =>
    fetchApi('/ai/content', { method: 'POST', body: JSON.stringify(data), token }),
};
