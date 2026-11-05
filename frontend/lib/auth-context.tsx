'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, ApiError } from './api-client';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  cover_image?: string | null;
  job_title?: string | null;
  department?: string | null;
  location?: string | null;
  website?: string | null;
  social_links?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  } | null;
  work_status?: 'WORKING' | 'BUSY' | 'AWAY' | string;
  bio?: string | null;
  timezone?: string;
  language?: string;
  phone?: string | null;
  theme?: string;
  status: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionError, setSessionError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    setSessionError('');
    const savedToken = localStorage.getItem('planify_token');
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient<User>('/users/profile');
      if (response.success && response.data) {
        setUser(response.data);
        setToken(savedToken);
      } else {
        // Fallback to /auth/me if needed
        const authMeRes = await apiClient<User>('/auth/me');
        if (authMeRes.success && authMeRes.data) {
          setUser(authMeRes.data);
          setToken(savedToken);
        } else {
          logout();
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) logout();
      else { setToken(savedToken); setSessionError('Không thể kết nối máy chủ. Vui lòng thử lại.'); }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiClient<{ user: User; accessToken: string }>('/auth/login', {
      data: { email, password },
    });

    if (res.data?.accessToken) {
      localStorage.setItem('planify_token', res.data.accessToken);
      setToken(res.data.accessToken);
      setUser(res.data.user);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await apiClient<{ user: User; accessToken: string }>('/auth/register', {
      data: { name, email, password },
    });

    if (res.data?.accessToken) {
      localStorage.setItem('planify_token', res.data.accessToken);
      setToken(res.data.accessToken);
      setUser(res.data.user);
    }
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  const logout = () => {
    localStorage.removeItem('planify_token');
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register') && !window.location.pathname.startsWith('/invite')) {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {sessionError ? <div role="alert" className="m-6 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-slate-900">{sessionError}<button className="ml-4 underline" onClick={() => { void refreshUser(); }}>Thử lại</button></div> : children}
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
