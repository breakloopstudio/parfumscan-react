// src/contexts/AuthContext.tsx
// Provider d'authentification React

import React, { createContext, useContext, type ReactNode } from 'react';
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
  return <AuthContext.Provider value={auth as AuthContextValue}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
