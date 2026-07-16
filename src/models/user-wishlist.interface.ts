// src/models/user-wishlist.interface.ts

export interface UserWishlistItem {
  id: string;
  parfumId: string;
  nom: string | null;
  marque: string | null;
  imageUrl: string | null;
  familleOlactive: string | null;
  addedAt: Date;
}
