// src/services/storage.ts
// Upload d'images vers Firebase Storage pour les parfums
// Compatible Expo Go (dégradé si Firebase natif non dispo)

let _storage: any = null;
try { _storage = require('@react-native-firebase/storage').default; } catch {}

export async function uploadParfumImage(
  parfumId: string,
  localUri: string,
  filename?: string,
): Promise<string> {
  if (!_storage) throw new Error('Firebase Storage non disponible (Expo Go ?).');

  const name = filename || `image_${Date.now()}.jpg`;
  const path = `parfums/${parfumId}_${Date.now()}_${name}`;
  const ref = _storage().ref(path);

  await ref.putFile(localUri);
  const downloadUrl: string = await ref.getDownloadURL();
  return downloadUrl;
}
