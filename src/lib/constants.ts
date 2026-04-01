// Filter constants for eyewear products

export const GENDERS = [
  { value: 'nam', label: 'Nam' },
  { value: 'nu', label: 'Nữ' },
  { value: 'unisex', label: 'Unisex' },
] as const;

export const FACE_SHAPES = [
  { value: 'tron', label: 'Tròn' },
  { value: 'vuong', label: 'Vuông' },
  { value: 'oval', label: 'Oval' },
  { value: 'tim', label: 'Trái Tim' },
  { value: 'dai', label: 'Dài' },
] as const;

export const FRAME_STYLES = [
  { value: 'tron', label: 'Gọng Tròn' },
  { value: 'vuong', label: 'Gọng Vuông' },
  { value: 'cat-eye', label: 'Cat-Eye' },
  { value: 'aviator', label: 'Aviator' },
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'browline', label: 'Browline' },
  { value: 'rimless', label: 'Không Gọng' },
  { value: 'semi-rimless', label: 'Nửa Gọng' },
] as const;

export const MATERIALS = [
  { value: 'kim-loai', label: 'Kim Loại' },
  { value: 'nhua', label: 'Nhựa' },
  { value: 'titan', label: 'Titan' },
  { value: 'go', label: 'Gỗ' },
  { value: 'acetate', label: 'Acetate' },
  { value: 'tr90', label: 'TR90' },
  { value: 'carbon', label: 'Carbon Fiber' },
] as const;

export const COLORS = [
  { value: '#000000', name: 'Đen' },
  { value: '#FFFFFF', name: 'Trắng' },
  { value: '#C0C0C0', name: 'Bạc' },
  { value: '#FFD700', name: 'Vàng' },
  { value: '#B76E79', name: 'Rose Gold' },
  { value: '#8B4513', name: 'Nâu' },
  { value: '#000080', name: 'Navy' },
  { value: '#8B0000', name: 'Đỏ Đậm' },
  { value: '#2F4F4F', name: 'Xám Đậm' },
  { value: '#D2691E', name: 'Tortoise' },
  { value: '#FF69B4', name: 'Hồng' },
  { value: '#4169E1', name: 'Xanh Dương' },
  { value: '#228B22', name: 'Xanh Lá' },
  { value: '#800080', name: 'Tím' },
  { value: '#FF8C00', name: 'Cam' },
  { value: '#F5F5DC', name: 'Kem' },
  { value: 'transparent', name: 'Trong Suốt' },
] as const;

export const PRESCRIPTION_RANGES = [
  { value: '0', label: 'Không Cận (0)' },
  { value: '-0.25_-1.00', label: 'Cận Nhẹ (-0.25 đến -1.00)' },
  { value: '-1.25_-3.00', label: 'Cận Trung Bình (-1.25 đến -3.00)' },
  { value: '-3.25_-6.00', label: 'Cận Nặng (-3.25 đến -6.00)' },
  { value: '-6.25_-10.00', label: 'Cận Rất Nặng (-6.25 đến -10.00)' },
  { value: '-10.25_-20.00', label: 'Cận Đặc Biệt (-10.25 đến -20.00)' },
] as const;

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới Nhất' },
  { value: 'price-asc', label: 'Giá Thấp → Cao' },
  { value: 'price-desc', label: 'Giá Cao → Thấp' },
  { value: 'popular', label: 'Phổ Biến Nhất' },
  { value: 'bestselling', label: 'Bán Chạy Nhất' },
] as const;

export const BANNER_POSITIONS = [
  { value: 'hero', label: 'Hero Slider (Trang Chủ)' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'popup', label: 'Popup' },
  { value: 'footer', label: 'Footer' },
  { value: 'category', label: 'Trang Danh Mục' },
] as const;

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Chờ Xác Nhận', color: '#f59e0b' },
  { value: 'confirmed', label: 'Đã Xác Nhận', color: '#3b82f6' },
  { value: 'shipping', label: 'Đang Giao', color: '#8b5cf6' },
  { value: 'delivered', label: 'Đã Giao', color: '#10b981' },
  { value: 'cancelled', label: 'Đã Hủy', color: '#ef4444' },
] as const;

export const PAYMENT_METHODS = [
  { value: 'cod', label: 'Thanh Toán Khi Nhận Hàng (COD)' },
  { value: 'bank_transfer', label: 'Chuyển Khoản Ngân Hàng' },
] as const;

// Format price in VND
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
}

// Format date
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
