// src/services/storage.ts — Upload d'images vers Firebase Storage

import storage from '@react-native-firebase/storage';

export async function uploadParfumImage(
  parfumId: string,
  localUri: string,
  filename?: string,
): Promise<string> {
  const name = filename || `image_${Date.now()}.jpg`;
  const path = `parfums/${parfumId}_${Date.now()}_${name}`;
  const ref = storage().ref(path);

  await ref.putFile(localUri);
  const downloadUrl: string = await ref.getDownloadURL();
  return downloadUrl;
}
