// src/hooks/useAuth.ts
// Hook d'authentification

import { useState, useEffect, useCallback } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { isFirebaseReady } from '../services/firebase';
import { translateFirebaseError } from '../utils/error-translator';

const AUTH_TIMEOUT_MS = 3000;

export function useAuth() {
  const [user, setUser] = useState<any>(null);
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

    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser: any) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const adminDoc = await firestore().collection('admins').doc(firebaseUser.uid).get();
          setIsAdmin(adminDoc.exists);
        } catch { setIsAdmin(false); }
      } else {
        setIsAdmin(false);
      }
      markReady();
    });

    return () => { clearTimeout(timeout); unsubscribe(); };
  }, []);

  const register = useCallback(async (_email: string, _password: string) => {
    try { return await auth().createUserWithEmailAndPassword(_email, _password); }
    catch (e: unknown) { throw new Error(translateFirebaseError(e)); }
  }, []);

  const login = useCallback(async (_email: string, _password: string) => {
    try { return await auth().signInWithEmailAndPassword(_email, _password); }
    catch (e: unknown) { throw new Error(translateFirebaseError(e)); }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) throw new Error('Google Sign-In annulé.');
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      return await auth().signInWithCredential(googleCredential);
    } catch (e: unknown) { throw new Error(translateFirebaseError(e)); }
  }, []);

  const logout = useCallback(async () => {
    await auth().signOut().catch(() => {});
    try { await GoogleSignin.signOut(); } catch {}
  }, []);

  return {
    user, authReady, isAdmin, isAuthenticated: user !== null,
    register, login, loginWithGoogle, logout,
  };
}
