import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('ftwin_access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.getMe();
      if (res.success) {
        setUser(res.data);
      }
    } catch {
      api.clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    api.setOnAuthError(() => {
      setUser(null);
    });
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (res.success) {
      api.setTokens(res.data.accessToken, res.data.refreshToken);
      setUser(res.data.user);
    } else {
      throw new Error(res.error || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await api.register(email, password, name);
    if (res.success) {
      api.setTokens(res.data.accessToken, res.data.refreshToken);
      setUser(res.data.user);
    } else {
      throw new Error(res.error || 'Registration failed');
    }
  };

  const logout = () => {
    api.clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
