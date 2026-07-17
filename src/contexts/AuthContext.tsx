// src/contexts/AuthContext.tsx
// Provider d'authentification React

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { User, UserCredential } from '@react-native-firebase/auth';
import { useAuth } from '../hooks/useAuth';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  register: (email: string, password: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  loginWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const value = useMemo<AuthContextValue>(() => ({
    user: auth.user,
    authReady: auth.authReady,
    isAdmin: auth.isAdmin,
    isAuthenticated: auth.isAuthenticated,
    register: auth.register,
    login: auth.login,
    loginWithGoogle: auth.loginWithGoogle,
    logout: auth.logout,
  }), [auth.user, auth.authReady, auth.isAdmin, auth.isAuthenticated, auth.register, auth.login, auth.loginWithGoogle, auth.logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
