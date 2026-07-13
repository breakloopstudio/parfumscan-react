// src/hooks/useAuth.ts
// Hook d'authentification — remplace AuthService Angular
// Compatible Expo Go (Firebase natif non dispo → mode dégradé)

import { useState, useEffect, useCallback } from 'react';
import { isFirebaseReady } from '../services/firebase';
import { translateFirebaseError } from '../utils/error-translator';

const AUTH_TIMEOUT_MS = 3000;

let _auth: any = null;
let _firestore: any = null;
let _GoogleSignin: any = null;

try { _auth = require('@react-native-firebase/auth').default; } catch {}
try { _firestore = require('@react-native-firebase/firestore').default; } catch {}
try { _GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin; } catch {}

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isFirebaseReady() || !_auth) {
      const t = setTimeout(() => setAuthReady(true), 100);
      return () => clearTimeout(t);
    }

    let resolved = false;
    const markReady = () => { if (!resolved) { resolved = true; setAuthReady(true); } };
    const timeout = setTimeout(markReady, AUTH_TIMEOUT_MS);

    const unsubscribe = _auth().onAuthStateChanged(async (firebaseUser: any) => {
      setUser(firebaseUser);
      if (firebaseUser && _firestore) {
        try {
          const adminDoc = await _firestore().collection('admins').doc(firebaseUser.uid).get();
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
    if (!_auth) throw new Error('Firebase non disponible dans Expo Go.');
    try { return await _auth().createUserWithEmailAndPassword(_email, _password); }
    catch (e: unknown) { throw new Error(translateFirebaseError(e)); }
  }, []);

  const login = useCallback(async (_email: string, _password: string) => {
    if (!_auth) throw new Error('Firebase non disponible dans Expo Go.');
    try { return await _auth().signInWithEmailAndPassword(_email, _password); }
    catch (e: unknown) { throw new Error(translateFirebaseError(e)); }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!_auth || !_GoogleSignin) throw new Error('Google Sign-In non disponible dans Expo Go.');
    try {
      await _GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await _GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) throw new Error('Google Sign-In annulé.');
      const googleCredential = _auth.GoogleAuthProvider.credential(idToken);
      return await _auth().signInWithCredential(googleCredential);
    } catch (e: unknown) { throw new Error(translateFirebaseError(e)); }
  }, []);

  const logout = useCallback(async () => {
    if (_auth) await _auth().signOut().catch(() => {});
    if (_GoogleSignin) {
      try { if (await _GoogleSignin.isSignedIn()) await _GoogleSignin.signOut(); } catch {}
    }
  }, []);

  return {
    user, authReady, isAdmin, isAuthenticated: user !== null,
    register, login, loginWithGoogle, logout,
  };
}
