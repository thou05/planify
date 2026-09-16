'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from './api-client';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('planify_token');
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient<User>('/auth/me');
      if (response.success && response.data) {
        setUser(response.data);
        setToken(savedToken);
      } else {
        logout();
      }
    } catch {
      logout();
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

  const logout = () => {
    localStorage.removeItem('planify_token');
    setToken(null);
    setUser(null);
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
      }}
    >
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
