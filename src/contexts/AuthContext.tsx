// src/contexts/AuthContext.tsx
// Provider d'authentification React — remplace la DI Angular AuthService

import React, { createContext, useContext, type ReactNode } from 'react';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useAuth } from '../hooks/useAuth';

interface AuthContextValue {
  user: FirebaseAuthTypes.User | null;
  authReady: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  register: (email: string, password: string) => Promise<FirebaseAuthTypes.UserCredential>;
  login: (email: string, password: string) => Promise<FirebaseAuthTypes.UserCredential>;
  loginWithGoogle: () => Promise<FirebaseAuthTypes.UserCredential>;
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
