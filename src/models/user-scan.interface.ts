// Sous-collection 'users/{uid}/scans'
export interface UserScan {
  id: string;
  rawText: string;
  marque?: string;
  nom?: string;
  volumeMl?: number;
  typeParfum?: string;
  scannedAt: Date;
  parfumId?: string;
}
