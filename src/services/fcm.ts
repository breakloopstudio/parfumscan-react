// src/services/fcm.ts — Notifications push Firebase Cloud Messaging

import messaging from '@react-native-firebase/messaging';

export async function requestFcmPermission(): Promise<boolean> {
  const status = await messaging().requestPermission();
  return status === messaging.AuthorizationStatus.AUTHORIZED || status === messaging.AuthorizationStatus.PROVISIONAL;
}

export async function getFcmToken(): Promise<string | null> {
  try { return await messaging().getToken(); } catch { return null; }
}

export function onFcmTokenRefresh(cb: (token: string) => void): () => void {
  return messaging().onTokenRefresh(cb);
}

export function onFcmMessage(cb: (payload: any) => void): () => void {
  return messaging().onMessage(async (msg: any) => { cb(msg); });
}

export function onFcmNotificationOpened(cb: (payload: any) => void): () => void {
  return messaging().onNotificationOpenedApp((msg: any) => { cb(msg); });
}

export async function deleteFcmToken(): Promise<void> {
  try { await messaging().deleteToken(); } catch {}
}