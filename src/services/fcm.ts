// src/services/fcm.ts — Notifications push Firebase Cloud Messaging
// Compatible Expo Go

let _messaging: any = null;
try { _messaging = require('@react-native-firebase/messaging').default; } catch {}

export async function requestFcmPermission(): Promise<boolean> {
  if (!_messaging) return false;
  const status = await _messaging().requestPermission();
  return status === _messaging.AuthorizationStatus.AUTHORIZED || status === _messaging.AuthorizationStatus.PROVISIONAL;
}

export async function getFcmToken(): Promise<string | null> {
  if (!_messaging) return null;
  try { return await _messaging().getToken(); } catch { return null; }
}

export function onFcmTokenRefresh(cb: (token: string) => void): () => void {
  if (!_messaging) return () => {};
  return _messaging().onTokenRefresh(cb);
}

export function onFcmMessage(cb: (payload: any) => void): () => void {
  if (!_messaging) return () => {};
  return _messaging().onMessage(async (msg: any) => { cb(msg); });
}

export function onFcmNotificationOpened(cb: (payload: any) => void): () => void {
  if (!_messaging) return () => {};
  return _messaging().onNotificationOpenedApp((msg: any) => { cb(msg); });
}

export async function deleteFcmToken(): Promise<void> {
  if (!_messaging) return;
  try { await _messaging().deleteToken(); } catch {}
}