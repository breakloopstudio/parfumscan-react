// src/models/user-collection.interface.ts

export interface UserCollectionItem {
  id: string;
  parfumId: string;
  nom: string | null;
  marque: string | null;
  imageUrl: string | null;
  addedAt: Date;
}
