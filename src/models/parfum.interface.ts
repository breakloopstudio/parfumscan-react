// Offre d'un site partenaire — préparation du comparateur de prix.
export interface PriceOffer {
  marchand: string;      // nom du site partenaire
  prix: number;          // prix TTC en euros
  url: string;           // lien vers l'offre
  logoUrl?: string;      // logo du marchand
  volumeMl?: number;     // volume concerné par l'offre
}

// Modèle Parfum — collection Firestore 'parfums'
export interface Parfum {
  id: string;
  nom: string;
  marque: string;
  annee?: number;
  familleOlactive: string;
  notesTete: string[];
  notesCoeur: string[];
  notesFond: string[];
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;

  // --- Comparateur de prix ---
  bestPrice?: number;
  referencePrice?: number;
  discountPct?: number;
  offers?: PriceOffer[];

  // --- Cache Fragella ---
  source?: 'fragella' | 'seed' | 'manual';
  cachedAt?: Date;
  imageVerified?: boolean;
  typeParfum?: string | null;
}
