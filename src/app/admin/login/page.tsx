"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api";
import { RiGlassesLine } from "react-icons/ri";
import { FiMail, FiLock } from "react-icons/fi";
import { useSettings } from "@/lib/useSettings";
import "../admin.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { settings } = useSettings();
  const siteLogo = settings["site_logo"];
  const siteName = settings["site_name"] || "GLASS";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await adminApi.login(email, password);
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_user", JSON.stringify(data.user));
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <div className="admin-login__logo">
          <h1>
            {siteLogo ? (
              <img
                src={siteLogo}
                alt={siteName}
                style={{
                  height: "40px",
                  width: "auto",
                  objectFit: "contain",
                  verticalAlign: "middle",
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <RiGlassesLine />
            )}
            <span>{siteName}</span>
          </h1>
          <p>Đăng nhập vào trang quản trị</p>
        </div>

        {error && <div className="admin-login__error">{error}</div>}

        <form onSubmit={handleLogin} className="admin-form">
          <div className="admin-form__group">
            <label className="admin-form__label">Email</label>
            <div style={{ position: "relative" }}>
              <FiMail
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.3)",
                }}
              />
              <input
                type="email"
                className="admin-form__input"
                style={{ paddingLeft: "40px", width: "100%" }}
                placeholder="admin@glass.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="admin-form__group">
            <label className="admin-form__label">Mật khẩu</label>
            <div style={{ position: "relative" }}>
              <FiLock
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.3)",
                }}
              />
              <input
                type="password"
                className="admin-form__input"
                style={{ paddingLeft: "40px", width: "100%" }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "0.9375rem",
              marginTop: "8px",
            }}
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "24px",
            fontSize: "0.8125rem",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          Mặc định: admin@glass.vn / password
        </p>
      </div>
    </div>
  );
}
