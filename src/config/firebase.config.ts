// src/config/firebase.config.ts
// Configuration Firebase publique — ces valeurs sont exposées côté client,
// elles ne sont PAS des secrets (Firebase les expose volontairement).
// Les clés sensibles (OpenAI, FCM server key) sont dans les Cloud Functions.

export const firebaseConfig = {
  apiKey: 'AIzaSyAYY0tc75oM9CUm0BSTd-T9mF0IauRl3bc',
  authDomain: 'parfumscan-60549.firebaseapp.com',
  projectId: 'parfumscan-60549',
  storageBucket: 'parfumscan-60549.firebasestorage.app',
  messagingSenderId: '831514606817',
  appId: '1:831514606817:web:26b0b0a3ddabc0ad0bcba0',
};
