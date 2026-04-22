"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RiGlassesLine } from "react-icons/ri";
import {
  FiGrid,
  FiPackage,
  FiTag,
  FiImage,
  FiMenu,
  FiLayout,
  FiSettings,
  FiFileText,
  FiShoppingCart,
  FiUsers,
  FiLogOut,
  FiCpu,
  FiFile,
  FiChevronLeft,
  FiStar,
  FiHelpCircle,
  FiBell,
  FiLayers,
  FiGift,
  FiSliders,
  FiDatabase,
  FiFolder,
} from "react-icons/fi";
import { Toaster } from "react-hot-toast";
import { useSettings } from "@/lib/useSettings";
import "./admin.css";

const adminMenuItems = [
  { section: "Tổng Quan" },
  { name: "Dashboard", icon: <FiGrid />, href: "/admin" },
  { section: "Quản Lý Nội Dung" },
  { name: "Sản Phẩm", icon: <FiPackage />, href: "/admin/products" },
  { name: "Danh Mục", icon: <FiTag />, href: "/admin/categories" },
  { name: "Bài Viết", icon: <FiFileText />, href: "/admin/articles" },
  { name: "DM Bài Viết", icon: <FiFolder />, href: "/admin/article-categories" },
  { name: "Trang Tĩnh", icon: <FiFile />, href: "/admin/pages" },
  { name: "FAQ", icon: <FiHelpCircle />, href: "/admin/faqs" },
  { section: "Giao Diện" },
  { name: "Media Library", icon: <FiImage />, href: "/admin/media" },
  { name: "Menu", icon: <FiMenu />, href: "/admin/menus" },
  { name: "Banner", icon: <FiLayout />, href: "/admin/banners" },
  { name: "Bộ Sưu Tập", icon: <FiLayers />, href: "/admin/collections" },
  { name: "Biến Thể", icon: <FiSliders />, href: "/admin/addons" },
  {
    name: "Thuộc Tính SP",
    icon: <FiDatabase />,
    href: "/admin/product-attributes",
  },
  { section: "Kinh Doanh" },
  { name: "Đơn Hàng", icon: <FiShoppingCart />, href: "/admin/orders" },
  { name: "Đánh Giá", icon: <FiStar />, href: "/admin/reviews" },
  { name: "Khách Hàng", icon: <FiUsers />, href: "/admin/users" },
  { name: "Voucher", icon: <FiGift />, href: "/admin/vouchers" },
  { name: "Thông Báo", icon: <FiBell />, href: "/admin/notifications" },
  { section: "AI & Công Cụ" },
  { name: "AI Content", icon: <FiCpu />, href: "/admin/ai-content" },
  { name: "Google Merchant", icon: <FiDatabase />, href: "/admin/merchant" },
  { section: "Hệ Thống" },
  { name: "Cài Đặt", icon: <FiSettings />, href: "/admin/settings" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { settings } = useSettings();
  const siteLogo = settings["site_logo"];
  const siteName = settings["site_name"] || "GLASS";

  useEffect(() => {
    if (pathname === "/admin/login") return;

    const token = localStorage.getItem("admin_token");
    const userData = localStorage.getItem("admin_user");

    if (!token) {
      router.push("/admin/login");
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [pathname, router]);

  // Don't show layout on login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    router.push("/admin/login");
  };

  return (
    <div className="admin-layout">
      <aside
        className={`admin-sidebar ${sidebarOpen ? "" : "admin-sidebar--collapsed"}`}
      >
        <Link href="/admin" className="admin-sidebar__logo">
          {siteLogo ? (
            <img
              src={siteLogo}
              alt={siteName}
              style={{ height: "32px", width: "auto", objectFit: "contain" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <RiGlassesLine />
          )}
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {siteName}{" "}
            <span
              style={{
                fontSize: "0.625rem",
                color: "rgba(255,255,255,0.3)",
                fontWeight: 400,
              }}
            >
              Admin
            </span>
          </span>
        </Link>
        <nav className="admin-sidebar__nav">
          {adminMenuItems.map((item, i) => {
            if ("section" in item && item.section) {
              return (
                <div key={i} className="admin-nav__section">
                  {item.section}
                </div>
              );
            }
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname?.startsWith(item.href || ""));
            return (
              <Link
                key={i}
                href={item.href || "#"}
                className={`admin-nav__link ${isActive ? "admin-nav__link--active" : ""}`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__avatar">
              {user?.name?.charAt(0) || "A"}
            </div>
            <div style={{ flex: 1 }}>
              <div className="admin-sidebar__user-name">
                {user?.name || "Admin"}
              </div>
              <div className="admin-sidebar__user-role">
                {user?.role || "admin"}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.125rem" }}
              title="Đăng xuất"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">{children}</main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1a1a3a",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
          },
          success: {
            iconTheme: { primary: "#10b981", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#fff" },
          },
        }}
      />
    </div>
  );
}
