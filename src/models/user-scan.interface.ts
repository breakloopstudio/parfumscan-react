// Sous-collection 'users/{uid}/scans'

// Timestamp Firestore (compatible Expo Go via duck typing)
export type FirestoreDate = { toDate(): Date; toMillis(): number };

export interface UserScan {
  id: string;
  rawText: string;
  marque?: string;
  nom?: string;
  volumeMl?: number;
  typeParfum?: string;
  scannedAt: Date | FirestoreDate;
  parfumId?: string;
  imageUrl?: string;      // dénormalisé pour affichage sans appel API
  familleOlactive?: string; // dénormalisé pour affichage sans appel API
}
