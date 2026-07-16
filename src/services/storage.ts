// src/services/storage.ts — Upload d'images vers Firebase Storage

import { getStorage, ref } from '@react-native-firebase/storage';

export async function uploadParfumImage(
  parfumId: string,
  localUri: string,
  filename?: string,
): Promise<string> {
  const name = filename || `image_${Date.now()}.jpg`;
  const path = `parfums/${parfumId}_${Date.now()}_${name}`;
  const storageRef = ref(getStorage(), path) as unknown as {
    putFile: (uri: string) => Promise<void>;
    getDownloadURL: () => Promise<string>;
  };

  await storageRef.putFile(localUri);
  const downloadUrl: string = await storageRef.getDownloadURL();
  return downloadUrl;
}
