// src/services/fcm.ts — Notifications push Firebase Cloud Messaging

import { Platform } from 'react-native';
import { getMessaging, requestPermission, registerDeviceForRemoteMessages, getToken, deleteToken, onTokenRefresh, onMessage, onNotificationOpenedApp, AuthorizationStatus } from '@react-native-firebase/messaging';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

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
  try { await deleteToken(getMessaging()); } catch {}
}
