// src/hooks/useAuth.ts
// Hook d'authentification

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import type { User } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { isFirebaseReady } from '../services/firebase';
import { translateFirebaseError } from '../utils/error-translator';

const AUTH_TIMEOUT_MS = 3000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isFirebaseReady()) {
      const t = setTimeout(() => setAuthReady(true), 100);
      return () => clearTimeout(t);
    }

    let resolved = false;
    const markReady = () => { if (!resolved) { resolved = true; setAuthReady(true); } };
    const timeout = setTimeout(markReady, AUTH_TIMEOUT_MS);

    const a = getAuth();
    const unsubscribe = onAuthStateChanged(a, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const adminSnap = await getDoc(doc(getFirestore(), 'admins', firebaseUser.uid));
          setIsAdmin(adminSnap.exists());
        } catch { setIsAdmin(false); }
      } else {
        setIsAdmin(false);
      }
      markReady();
    });

    return () => { clearTimeout(timeout); unsubscribe(); };
  }, []);

  const register = useCallback(async (_email: string, _password: string) => {
    try { return await createUserWithEmailAndPassword(getAuth(), _email, _password); }
    catch (e: unknown) { throw new Error(translateFirebaseError(e)); }
  }, []);

  const login = useCallback(async (_email: string, _password: string) => {
    try { return await signInWithEmailAndPassword(getAuth(), _email, _password); }
    catch (e: unknown) { throw new Error(translateFirebaseError(e)); }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) throw new Error('Google Sign-In annulé.');
      const googleCredential = GoogleAuthProvider.credential(idToken);
      return await signInWithCredential(getAuth(), googleCredential);
    } catch (e: unknown) { throw new Error(translateFirebaseError(e)); }
  }, []);

  const logout = useCallback(async () => {
    await signOut(getAuth()).catch(() => {});
    try { await GoogleSignin.signOut(); } catch {}
  }, []);

  return {
    user, authReady, isAdmin, isAuthenticated: user !== null,
    register, login, loginWithGoogle, logout,
  };
}
