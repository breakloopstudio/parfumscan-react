// Sous-collection 'users/{uid}/favoris'
export interface UserFavori {
  id: string;
  parfumId: string;
  addedAt: Date;
  nom?: string;    // dénormalisé pour résilience
  marque?: string; // dénormalisé pour résilience
}
