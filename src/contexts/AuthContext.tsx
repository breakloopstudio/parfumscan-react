// src/contexts/AuthContext.tsx
// Provider d'authentification React — remplace la DI Angular AuthService

import React, { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthContextValue {
  user: any;
  authReady: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  register: (email: string, password: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  loginWithGoogle: () => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
