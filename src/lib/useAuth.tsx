'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userApi } from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  province?: string;
  ward?: string;
  address_detail?: string;
  avatar?: string;
  points: number;
  total_spent: number;
  unread_notifications?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User; reward?: any }>;
  register: (data: any) => Promise<{ user: User; reward?: any }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('glass_token');
    const savedUser = localStorage.getItem('glass_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('glass_token');
        localStorage.removeItem('glass_user');
      }
    }
    setLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const data = await userApi.me(token);
      setUser(data);
      localStorage.setItem('glass_user', JSON.stringify(data));
    } catch {
      // Token invalid → logout
      setUser(null);
      setToken(null);
      localStorage.removeItem('glass_token');
      localStorage.removeItem('glass_user');
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await userApi.login(email, password);
    
    // Chỉ cho customer login ở frontend
    if (response.user.role === 'admin') {
      throw new Error('Vui lòng đăng nhập admin tại trang quản trị');
    }

    setUser(response.user);
    setToken(response.token);
    localStorage.setItem('glass_token', response.token);
    localStorage.setItem('glass_user', JSON.stringify(response.user));
    return response;
  };

  const register = async (data: any) => {
    const response = await userApi.register(data);
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem('glass_token', response.token);
    localStorage.setItem('glass_user', JSON.stringify(response.user));
    return response;
  };

  const logout = () => {
    if (token) {
      userApi.logout(token).catch(() => {});
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('glass_token');
    localStorage.removeItem('glass_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
