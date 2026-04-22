const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// SSR sử dụng internal URL (127.0.0.1) để tránh DNS/SSL timeout
const INTERNAL_API = process.env.INTERNAL_API_URL || "";
const API_HOST = process.env.API_HOST || "";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchApi(endpoint: string, options: FetchOptions = {}) {
  const { token, ...fetchOptions } = options;

  // Server-side: dùng internal URL, Browser: dùng public URL
  const isServer = typeof window === "undefined";
  const baseUrl = isServer && INTERNAL_API ? INTERNAL_API : API_BASE;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  // Thêm Host header cho internal calls
  if (isServer && API_HOST && INTERNAL_API) {
    headers["Host"] = API_HOST;
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData
  if (!(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
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
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/public/products${query}`);
  },
  getProduct: (slug: string) => fetchApi(`/public/products/${slug}`),
  getProductAttributes: () => fetchApi("/public/product-attributes"),

  // Search
  search: (q: string) => fetchApi(`/public/search?q=${encodeURIComponent(q)}`),

  // Categories
  getCategories: (tree = true) => fetchApi(`/public/categories?tree=${tree}`),
  getCategory: (slug: string) => fetchApi(`/public/categories/${slug}`),

  // Articles
  getArticles: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/public/articles${query}&published_only=1`);
  },
  getArticle: (slug: string) => fetchApi(`/public/articles/${slug}`),

  // Article Categories
  getArticleCategories: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/public/article-categories${query}&active_only=1`);
  },

  // Pages
  getPage: (slug: string) => fetchApi(`/public/pages/${slug}`),

  // Banners
  getBanners: (position?: string) => {
    const query = position
      ? `?position=${position}&active_only=1`
      : "?active_only=1";
    return fetchApi(`/public/banners${query}`);
  },

  // Menus
  getMenus: (position = "header") =>
    fetchApi(`/public/menus?position=${position}`),

  // Settings
  getSettings: (group?: string) => {
    const query = group ? `?group=${group}` : "";
    return fetchApi(`/public/settings${query}`);
  },

  // FAQs
  getFaqs: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/public/faqs${query}`);
  },

  // Collections
  getCollections: () => fetchApi("/public/collections"),
  getCollection: (slug: string) => fetchApi(`/public/collections/${slug}`),

  // Vouchers
  getVouchers: () => fetchApi("/public/vouchers"),

  // Orders
  createOrder: (data: any, token?: string) =>
    fetchApi("/public/orders", {
      method: "POST",
      body: JSON.stringify(data),
      ...(token ? { token } : {}),
    }),
  validateVoucher: (code: string, subtotal?: number) =>
    fetchApi("/public/orders/validate-voucher", {
      method: "POST",
      body: JSON.stringify({ code, subtotal }),
    }),
  lookupOrder: (orderNumber: string, phone: string) =>
    fetchApi("/public/orders/lookup", {
      method: "POST",
      body: JSON.stringify({ order_number: orderNumber, phone }),
    }),

  // Shipping / Viettel Post
  trackOrder: (orderNumber: string, phone: string) =>
    fetchApi("/public/shipping/track", {
      method: "POST",
      body: JSON.stringify({ order_number: orderNumber, phone }),
    }),
  calculateShippingFee: (data: {
    sender_province: number;
    sender_district: number;
    receiver_province: number;
    receiver_district: number;
    weight?: number;
    price?: number;
    money_collection?: number;
  }) =>
    fetchApi("/public/shipping/calculate-fee", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getShippingProvinces: () => fetchApi("/public/shipping/provinces"),
  getShippingDistricts: (provinceId: number) =>
    fetchApi(`/public/shipping/districts?province_id=${provinceId}`),
  getShippingWards: (districtId: number) =>
    fetchApi(`/public/shipping/wards?district_id=${districtId}`),

  // Reviews
  getProductReviews: (productId: number, params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/public/products/${productId}/reviews${query}`);
  },
  submitReview: (data: {
    product_id: number;
    customer_name: string;
    customer_phone: string;
    rating: number;
    comment?: string;
    images?: File[];
  }) => {
    const formData = new FormData();
    formData.append("product_id", String(data.product_id));
    formData.append("customer_name", data.customer_name);
    formData.append("customer_phone", data.customer_phone);
    formData.append("rating", String(data.rating));
    if (data.comment) formData.append("comment", data.comment);
    if (data.images) {
      data.images.forEach((file) => formData.append("images[]", file));
    }
    return fetch(`${API_BASE}/public/reviews`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new Error("Lỗi gửi đánh giá");
      return res.json();
    });
  },

  // AI Virtual Try-On (custom fetch to handle rate limit response)
  aiTryOn: async (data: {
    face_image: string;
    glasses_image: string;
    product_name?: string;
  }) => {
    const res = await fetch(`${API_BASE}/public/ai/try-on`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({ error: "Lỗi kết nối" }));
    if (!res.ok) {
      const err: any = new Error(
        json.error || json.message || `HTTP ${res.status}`,
      );
      err.remaining = json.remaining;
      throw err;
    }
    return json;
  },
};

// ==========================================
// USER API (customer auth)
// ==========================================

export const userApi = {
  // Auth
  login: (email: string, password: string) =>
    fetchApi("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone?: string;
    province?: string;
    ward?: string;
    address_detail?: string;
  }) =>
    fetchApi("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  logout: (token: string) =>
    fetchApi("/auth/logout", { method: "POST", token }),
  me: (token: string) => fetchApi("/auth/me", { token }),

  // Profile
  getProfile: (token: string) => fetchApi("/user/profile", { token }),
  updateProfile: (token: string, data: any) =>
    fetchApi("/user/profile", {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  changePassword: (
    token: string,
    data: {
      current_password: string;
      password: string;
      password_confirmation: string;
    },
  ) =>
    fetchApi("/user/change-password", {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  changeEmail: (token: string, data: { email: string; password: string }) =>
    fetchApi("/user/change-email", {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),

  // Orders
  getMyOrders: (token: string, params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/user/orders${query}`, { token });
  },

  // Loyalty
  getPoints: (token: string) => fetchApi("/user/points", { token }),
  redeemPoints: (token: string, points: number) =>
    fetchApi("/user/redeem", {
      method: "POST",
      body: JSON.stringify({ points }),
      token,
    }),

  // Vouchers
  getMyVouchers: (token: string) => fetchApi("/user/vouchers", { token }),

  // Notifications
  getNotifications: (token: string) =>
    fetchApi("/user/notifications", { token }),
  markNotificationRead: (token: string, id: number) =>
    fetchApi(`/user/notifications/${id}/read`, { method: "PUT", token }),
  markAllRead: (token: string) =>
    fetchApi("/user/notifications/read-all", { method: "PUT", token }),
};

// ==========================================
// ADMIN API (requires token)
// ==========================================

export const adminApi = {
  // Auth
  login: (email: string, password: string) =>
    fetchApi("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: (token: string) =>
    fetchApi("/auth/logout", { method: "POST", token }),

  me: (token: string) => fetchApi("/auth/me", { token }),

  // Products
  getProducts: (token: string, params?: Record<string, string>) => {
    const query = params
      ? "?" + new URLSearchParams({ ...params, show_all: "1" }).toString()
      : "?show_all=1";
    return fetchApi(`/products${query}`, { token });
  },
  getProduct: (token: string, id: number) =>
    fetchApi(`/products/${id}`, { token }),
  createProduct: (token: string, data: any) =>
    fetchApi("/products", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
  updateProduct: (token: string, id: number, data: any) =>
    fetchApi(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  deleteProduct: (token: string, id: number) =>
    fetchApi(`/products/${id}`, { method: "DELETE", token }),
  saveProductConstraints: (
    token: string,
    productId: number,
    constraints: { option_id: number; blocked_option_id: number }[],
  ) =>
    fetchApi(`/products/${productId}/constraints`, {
      method: "PUT",
      body: JSON.stringify({ constraints }),
      token,
    }),
  cloneProduct: (token: string, id: number) =>
    fetchApi(`/products/${id}/clone`, { method: "POST", token }),

  // Products Import/Export
  exportProducts: async (token: string) => {
    const res = await fetch(`${API_BASE}/products-export`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" },
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `san-pham-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
  importProducts: async (
    token: string,
    file: File,
    mode: string = "upsert",
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    return fetchApi("/products-import", {
      method: "POST",
      body: formData,
      token,
    });
  },
  downloadImportTemplate: async (token: string) => {
    const res = await fetch(`${API_BASE}/products-import-template`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau-import-san-pham.csv";
    a.click();
    URL.revokeObjectURL(url);
  },

  // Categories
  getCategories: (token: string) =>
    fetchApi("/categories?tree=true", { token }),
  createCategory: (token: string, data: any) =>
    fetchApi("/categories", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
  updateCategory: (token: string, id: number, data: any) =>
    fetchApi(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  deleteCategory: (token: string, id: number) =>
    fetchApi(`/categories/${id}`, { method: "DELETE", token }),

  // Media
  getMedia: (token: string, params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/media${query}`, { token });
  },
  uploadMedia: (token: string, formData: FormData) =>
    fetchApi("/media/upload", { method: "POST", body: formData, token }),
  deleteMedia: (token: string, id: number) =>
    fetchApi(`/media/${id}`, { method: "DELETE", token }),

  // Menus
  getMenus: (token: string) => fetchApi("/menus/all", { token }),
  createMenu: (token: string, data: any) =>
    fetchApi("/menus", { method: "POST", body: JSON.stringify(data), token }),
  updateMenu: (token: string, id: number, data: any) =>
    fetchApi(`/menus/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  reorderMenus: (token: string, items: any[]) =>
    fetchApi("/menus-reorder", {
      method: "PUT",
      body: JSON.stringify({ items }),
      token,
    }),
  deleteMenu: (token: string, id: number) =>
    fetchApi(`/menus/${id}`, { method: "DELETE", token }),

  // Banners
  getBanners: (token: string) => fetchApi("/banners", { token }),
  createBanner: (token: string, data: any) =>
    fetchApi("/banners", { method: "POST", body: JSON.stringify(data), token }),
  updateBanner: (token: string, id: number, data: any) =>
    fetchApi(`/banners/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  deleteBanner: (token: string, id: number) =>
    fetchApi(`/banners/${id}`, { method: "DELETE", token }),

  // Settings
  getSettings: (token: string) => fetchApi("/settings", { token }),
  updateSettings: (token: string, settings: any[]) =>
    fetchApi("/settings", {
      method: "PUT",
      body: JSON.stringify({ settings }),
      token,
    }),
  uploadFont: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/settings/font-upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Upload font thất bại");
    }
    return res.json();
  },
  deleteFont: (token: string) =>
    fetchApi("/settings/font-delete", { method: "DELETE", token }),

  // Articles
  getArticles: (token: string, params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/articles${query}`, { token });
  },
  createArticle: (token: string, data: any) =>
    fetchApi("/articles", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
  updateArticle: (token: string, id: number, data: any) =>
    fetchApi(`/articles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  deleteArticle: (token: string, id: number) =>
    fetchApi(`/articles/${id}`, { method: "DELETE", token }),

  // Article Categories
  getArticleCategories: (token: string) =>
    fetchApi("/article-categories?tree=true", { token }),
  createArticleCategory: (token: string, data: any) =>
    fetchApi("/article-categories", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
  updateArticleCategory: (token: string, id: number, data: any) =>
    fetchApi(`/article-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  deleteArticleCategory: (token: string, id: number) =>
    fetchApi(`/article-categories/${id}`, { method: "DELETE", token }),

  // Pages
  getPages: (token: string) => fetchApi("/pages", { token }),
  createPage: (token: string, data: any) =>
    fetchApi("/pages", { method: "POST", body: JSON.stringify(data), token }),
  updatePage: (token: string, id: number, data: any) =>
    fetchApi(`/pages/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  deletePage: (token: string, id: number) =>
    fetchApi(`/pages/${id}`, { method: "DELETE", token }),

  // FAQs
  getFaqs: (token: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/faqs${qs}`, { token });
  },
  createFaq: (token: string, data: any) =>
    fetchApi("/faqs", { method: "POST", body: JSON.stringify(data), token }),
  updateFaq: (token: string, id: number, data: any) =>
    fetchApi(`/faqs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  deleteFaq: (token: string, id: number) =>
    fetchApi(`/faqs/${id}`, { method: "DELETE", token }),

  // Collections
  getCollections: (token: string) => fetchApi("/collections?all=1", { token }),
  getCollection: (token: string, id: number) =>
    fetchApi(`/collections/${id}`, { token }),
  createCollection: (token: string, data: any) =>
    fetchApi("/collections", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
  updateCollection: (token: string, id: number, data: any) =>
    fetchApi(`/collections/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  deleteCollection: (token: string, id: number) =>
    fetchApi(`/collections/${id}`, { method: "DELETE", token }),
  reorderCollections: (token: string, items: { id: number; order: number }[]) =>
    fetchApi("/collections-reorder", {
      method: "PUT",
      body: JSON.stringify({ items }),
      token,
    }),

  // Vouchers
  getVouchers: (token: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/vouchers${qs}`, { token });
  },
  createVoucher: (token: string, data: any) =>
    fetchApi("/vouchers", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
  updateVoucher: (token: string, id: number, data: any) =>
    fetchApi(`/vouchers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  deleteVoucher: (token: string, id: number) =>
    fetchApi(`/vouchers/${id}`, { method: "DELETE", token }),

  // Orders
  getOrders: (token: string, params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/orders${query}`, { token });
  },
  getOrder: (token: string, id: number) => fetchApi(`/orders/${id}`, { token }),
  updateOrderStatus: (token: string, id: number, data: any) =>
    fetchApi(`/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),

  // Shipping / Viettel Post
  vtpGetToken: (token: string) =>
    fetchApi("/shipping/get-token", { method: "POST", token }),
  vtpTestConnection: (token: string) =>
    fetchApi("/shipping/test-connection", { token }),
  vtpPushOrder: (token: string, orderId: number, service?: string) =>
    fetchApi(`/shipping/push-order/${orderId}`, {
      method: "POST",
      body: JSON.stringify({ service }),
      token,
    }),
  vtpCancelOrder: (token: string, orderId: number, note?: string) =>
    fetchApi(`/shipping/cancel-order/${orderId}`, {
      method: "POST",
      body: JSON.stringify({ note }),
      token,
    }),

  // Google Merchant Center
  merchantStatus: (token: string) => fetchApi("/merchant/status", { token }),
  merchantSyncAll: (token: string, onlyActive = true) =>
    fetchApi("/merchant/sync-all", {
      method: "POST",
      body: JSON.stringify({ only_active: onlyActive }),
      token,
    }),
  merchantSyncOne: (token: string, productId: number) =>
    fetchApi(`/merchant/sync/${productId}`, { method: "POST", token }),
  merchantDeleteOne: (token: string, productId: number) =>
    fetchApi(`/merchant/delete/${productId}`, { method: "DELETE", token }),

  // Reviews
  getReviews: (token: string, params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/reviews${query}`, { token });
  },
  approveReview: (token: string, id: number) =>
    fetchApi(`/reviews/${id}/approve`, { method: "PUT", token }),
  replyReview: (token: string, id: number, adminReply: string) =>
    fetchApi(`/reviews/${id}/reply`, {
      method: "PUT",
      body: JSON.stringify({ admin_reply: adminReply }),
      token,
    }),
  deleteReview: (token: string, id: number) =>
    fetchApi(`/reviews/${id}`, { method: "DELETE", token }),

  // AI
  aiTryOn: (token: string, faceImage: string, glassesImage: string) =>
    fetchApi("/ai/try-on", {
      method: "POST",
      body: JSON.stringify({
        face_image: faceImage,
        glasses_image: glassesImage,
      }),
      token,
    }),
  aiGenerateContent: (
    token: string,
    data: {
      topic: string;
      type?: string;
      keywords?: string;
      tone?: string;
      length?: string;
      full_article?: boolean;
    },
  ) =>
    fetchApi("/ai/content", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
  aiGenerateContentWithImages: (
    token: string,
    data: {
      topic: string;
      type?: string;
      keywords?: string;
      tone?: string;
      length?: string;
      image_count?: number;
      full_article?: boolean;
    },
  ) =>
    fetchApi("/ai/content-with-images", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  // === AI Content Queue ===
  getAiQueue: (token: string, params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/ai/queue${query}`, { token });
  },
  addAiQueue: (token: string, data: any) =>
    fetchApi("/ai/queue", { method: "POST", body: JSON.stringify(data), token }),
  deleteAiQueue: (token: string, id: number) =>
    fetchApi(`/ai/queue/${id}`, { method: "DELETE", token }),
  clearAiQueue: (token: string) =>
    fetchApi("/ai/queue-clear", { method: "DELETE", token }),
  processAiQueue: (token: string) =>
    fetchApi("/ai/queue-process", { method: "POST", token }),

  // === Admin: Users ===
  getUsers: (token: string, params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi(`/admin/users${query}`, { token });
  },
  getUser: (token: string, id: number) =>
    fetchApi(`/admin/users/${id}`, { token }),
  adjustUserPoints: (
    token: string,
    id: number,
    data: { points: number; description: string },
  ) =>
    fetchApi(`/admin/users/${id}/points`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  toggleUserActive: (token: string, id: number) =>
    fetchApi(`/admin/users/${id}/toggle-active`, { method: "PUT", token }),
  searchUsers: (token: string, q: string) =>
    fetchApi(`/admin/users/search?q=${encodeURIComponent(q)}`, { token }),

  // === Admin: Notifications ===
  getNotifications: (token: string) =>
    fetchApi("/admin/notifications", { token }),
  createNotification: (token: string, data: any) =>
    fetchApi("/admin/notifications", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
  deleteNotification: (token: string, id: number) =>
    fetchApi(`/admin/notifications/${id}`, { method: "DELETE", token }),

  // === Admin: Addon Groups (Variants) ===
  getAddonGroups: (token: string) => fetchApi("/addon-groups", { token }),
  createAddonGroup: (token: string, data: any) =>
    fetchApi("/addon-groups", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
  updateAddonGroup: (token: string, id: number, data: any) =>
    fetchApi(`/addon-groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  deleteAddonGroup: (token: string, id: number) =>
    fetchApi(`/addon-groups/${id}`, { method: "DELETE", token }),
  saveAddonConstraints: (
    token: string,
    constraints: { option_id: number; blocked_option_id: number }[],
  ) =>
    fetchApi("/addon-constraints", {
      method: "PUT",
      body: JSON.stringify({ constraints }),
      token,
    }),

  // === Admin: Product Attributes (Filters) ===
  getProductAttributes: (token: string, type?: string) =>
    fetchApi(`/admin/product-attributes${type ? `?type=${type}` : ""}`, {
      token,
    }),
  createProductAttribute: (token: string, data: any) =>
    fetchApi("/admin/product-attributes", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
  updateProductAttribute: (token: string, id: number, data: any) =>
    fetchApi(`/admin/product-attributes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
  deleteProductAttribute: (token: string, id: number) =>
    fetchApi(`/admin/product-attributes/${id}`, { method: "DELETE", token }),
  reorderProductAttributes: (
    token: string,
    items: { id: number; sort_order: number }[],
  ) =>
    fetchApi("/admin/product-attributes/reorder", {
      method: "POST",
      body: JSON.stringify({ items }),
      token,
    }),
};
