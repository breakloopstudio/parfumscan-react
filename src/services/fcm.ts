// src/services/fcm.ts — Notifications push Firebase Cloud Messaging

import { Platform } from 'react-native';
import { getMessaging, requestPermission, registerDeviceForRemoteMessages, getToken, deleteToken, onTokenRefresh, onMessage, onNotificationOpenedApp, AuthorizationStatus } from '@react-native-firebase/messaging';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc } from '@react-native-firebase/firestore';

const db = getFirestore();

export async function requestFcmPermission(): Promise<boolean> {
  const msg = getMessaging();
  const status = await requestPermission(msg);
  const granted = status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
  if (granted && Platform.OS === 'ios') {
    registerDeviceForRemoteMessages(msg);
  }
  return granted;
}

export async function getFcmToken(): Promise<string | null> {
  try { return await getToken(getMessaging()); } catch { return null; }
}

export function onFcmTokenRefresh(cb: (token: string) => void): () => void {
  return onTokenRefresh(getMessaging(), cb);
}

export function onFcmMessage(cb: (payload: FirebaseMessagingTypes.RemoteMessage) => void): () => void {
  return onMessage(getMessaging(), async (msg: FirebaseMessagingTypes.RemoteMessage) => { cb(msg); });
}

export function onFcmNotificationOpened(cb: (payload: FirebaseMessagingTypes.RemoteMessage) => void): () => void {
  return onNotificationOpenedApp(getMessaging(), (msg: FirebaseMessagingTypes.RemoteMessage) => { cb(msg); });
}

export async function deleteFcmToken(): Promise<void> {
  try { await deleteToken(getMessaging()); } catch (e: unknown) { console.warn('[fcm] deleteToken failed:', (e as Error)?.message ?? String(e)); }
}

export async function createNotificationChannels(): Promise<void> {
  const msg = getMessaging();
  // @react-native-firebase/messaging v25 ne type pas createChannel (hors scope selon la doc —
  // recommandation officielle : Notifee). Mais l'implémentation native sous-jacente l'expose
  // via la propriete android. Cast justifie.
  const android = (msg as unknown as { android?: { createChannel?: (c: Record<string, unknown>) => Promise<void> } }).android;
  if (!android?.createChannel) {
    if (__DEV__) console.log('[fcm] createChannel not available — skipping (likely iOS)');
    return;
  }
  try {
    await android.createChannel({
      id: 'weather_suggestions',
      name: 'Suggestions météo',
      description: 'Suggestions de parfum adaptées à la météo du jour',
      importance: 4,
    });
    await android.createChannel({
      id: 'price_alerts',
      name: 'Alertes prix',
      description: 'Alertes de baisse de prix sur vos parfums suivis',
      importance: 4,
    });
  } catch (e: unknown) {
    console.warn('[fcm] createChannel failed:', (e as Error)?.message ?? String(e));
  }
}

async function saveTokenToFirestore(uid: string, token: string): Promise<void> {
  try {
    const col = collection(db, `users/${uid}/fcmTokens`);
    await setDoc(doc(col), { token, createdAt: new Date() });
  } catch (e: unknown) {
    console.warn('[fcm] saveTokenToFirestore failed:', (e as Error)?.message ?? String(e));
  }
}

async function removeOldTokens(uid: string, currentToken: string): Promise<void> {
  try {
    const col = collection(db, `users/${uid}/fcmTokens`);
    const snap = await getDocs(col);
    const batch: Promise<void>[] = [];
    snap.forEach((d) => {
      if (d.data().token === currentToken) return;
      batch.push(deleteDoc(d.ref).catch(() => {}));
    });
    await Promise.all(batch);
  } catch (e: unknown) {
    console.warn('[fcm] removeOldTokens failed:', (e as Error)?.message ?? String(e));
  }
}

export function startFcmRegistration(uid: string): () => void {
  let cancelled = false;

  async function register(initial: boolean) {
    if (cancelled) return;
    const granted = await requestFcmPermission();
    if (!granted) return;
    const token = await getFcmToken();
    if (!token || cancelled) return;
    await saveTokenToFirestore(uid, token);
    if (!initial) return;
    await removeOldTokens(uid, token);
  }

  register(true);

  const unsubRefresh = onFcmTokenRefresh((newToken) => {
    if (cancelled) return;
    saveTokenToFirestore(uid, newToken);
  });

  return () => {
    cancelled = true;
    unsubRefresh();
  };
}
