'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { loginWithEmail, storeAuth, clearAuth, getStoredAuth } from '../lib/api';
import type { AuthState } from '../types';

interface AuthContextValue {
  auth: AuthState | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAuth();
    setAuth(stored);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string) => {
    const data = await loginWithEmail(email);
    storeAuth(data);
    setAuth(data);
    router.push(data.user.role === 'admin' ? '/dashboard/organizations' : '/dashboard/customers');
  }, [router]);

  const logout = useCallback(() => {
    clearAuth();
    setAuth(null);
    router.push('/login');
  }, [router]);

  const isAdmin = auth?.user.role === 'admin';

  return (
    <AuthContext.Provider value={{ auth, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
