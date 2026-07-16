// src/services/fcm.ts — Notifications push Firebase Cloud Messaging

import { Platform } from 'react-native';
import messaging, { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';

export async function requestFcmPermission(): Promise<boolean> {
  const status = await messaging().requestPermission();
  const granted = status === messaging.AuthorizationStatus.AUTHORIZED || status === messaging.AuthorizationStatus.PROVISIONAL;
  if (granted && Platform.OS === 'ios') {
    await messaging().registerDeviceForRemoteMessages();
  }
  return granted;
}

export async function getFcmToken(): Promise<string | null> {
  try { return await messaging().getToken(); } catch { return null; }
}

export function onFcmTokenRefresh(cb: (token: string) => void): () => void {
  return messaging().onTokenRefresh(cb);
}

export function onFcmMessage(cb: (payload: FirebaseMessagingTypes.RemoteMessage) => void): () => void {
  return messaging().onMessage(async (msg: FirebaseMessagingTypes.RemoteMessage) => { cb(msg); });
}

export function onFcmNotificationOpened(cb: (payload: FirebaseMessagingTypes.RemoteMessage) => void): () => void {
  return messaging().onNotificationOpenedApp((msg: FirebaseMessagingTypes.RemoteMessage) => { cb(msg); });
}

export async function deleteFcmToken(): Promise<void> {
  try { await messaging().deleteToken(); } catch {}
}