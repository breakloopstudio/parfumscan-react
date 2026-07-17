# ParfumScan React — Référence technique

## §1 — Service Layer

### `src/services/firebase.ts`
```ts
// Initialise Firebase
export function isFirebaseReady(): boolean;
```

### `src/services/firestore.ts`
```ts
// CRUD Firestore avec upsert intelligent
export function onParfums(cb: (p: Parfum[]) => void): () => void;
export function getParfumById(id: string): Promise<Parfum | null>;
export function updateParfum(id: string, data: Partial<Parfum>): Promise<void>;
export function cacheParfumFromSearch(p: ParfumSearchResult): Promise<void>;
export function batchCacheParfums(parfums: Parfum[]): Promise<number>;
export function getPopularParfums(limit: number): Promise<ParfumSearchResult[]>;
export function getPersonalizedSuggestions(uid: string, limit: number): Promise<ParfumSearchResult[]>;
export function searchParfumsCached(query: string): Promise<ParfumSearchResult[]>;
```

### `src/services/fragella.ts`
```ts
// API Fragella — catalogue de parfums, via Cloud Function (clé API côté serveur uniquement)
export const FRAGELLA_BASE: string; // non utilisé (proxy Cloud Function)
export function searchFragrance(marque: string, nom: string, typeParfum?: string | null): Promise<FragranceResult[]>;
export function searchFragranceByQuery(query: string): Promise<FragranceResult[]>;
export function getFragranceById(id: string): Promise<FragranceResult | null>;
export function getSimilarFragrances(marque: string, nom: string, limit?: number): Promise<FragranceResult[]>;
export function fragellaToParfum(f: FragranceResult): ParfumSearchResult;
export function normalize(s: string): string;
export function buildSearchKeywords(marque: string, nom: string): string[];
```

### `src/services/user-data.ts`
```ts
// Firestore — données utilisateur (favoris, collection, wishlist, scans, settings)
// Doc IDs = parfumId (déterministes, pas de doublons possibles)
export function onFavoris(uid: string, cb: (f: UserFavori[]) => void): () => void;
export function addFavori(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string): Promise<string>;
export function removeFavori(uid: string, parfumId: string): Promise<void>;
export function isParfumFavori(uid: string, parfumId: string): Promise<{ isFavori: boolean; favoriId: string | null }>;
export function onCollection(uid: string, cb: (items: UserCollectionItem[]) => void): () => void;
export function addToCollection(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string): Promise<string>;
export function removeFromCollection(uid: string, parfumId: string): Promise<void>;
export function onWishlist(uid: string, cb: (items: UserWishlistItem[]) => void): () => void;
export function addToWishlist(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string): Promise<string>;
export function removeFromWishlist(uid: string, parfumId: string): Promise<void>;
export function onScans(uid: string, cb: (s: UserScan[]) => void): () => void;
export function saveScan(uid: string, data: Omit<UserScan, 'id' | 'scannedAt'>): Promise<void>;
export function removeScan(uid: string, scanId: string): Promise<void>;
export function getUserSettings(uid: string): Promise<{ priceAlerts: boolean; pushNotifs: boolean }>;
export function updateUserSetting(uid: string, key: 'priceAlerts' | 'pushNotifs', value: boolean): Promise<void>;
export function isPriceAlertActive(uid: string, parfumId: string): Promise<boolean>;
export function setPriceAlert(uid: string, parfumId: string, active: boolean, currentPrice?: number): Promise<void>;
export function moveToCollection(uid: string, from: string, itemId: string, parfumId: string, nom: string | null, marque: string | null, imageUrl: string | null): Promise<void>;
export function moveToWishlist(uid: string, from: string, itemId: string, parfumId: string, nom: string | null, marque: string | null, imageUrl: string | null, familleOlactive?: string | null): Promise<void>;
export function moveFavori(uid: string, from: string, itemId: string, parfumId: string, nom: string | null, marque: string | null, imageUrl: string | null, familleOlactive?: string | null): Promise<void>;
```

### `src/services/wardrobe.ts`
```ts
// Wardrobe — collection unifiée (ownership states + metadata)
export function onWardrobe(uid: string, cb: (items: WardrobeItem[]) => void): () => void;
export async function addToWardrobe(uid: string, parfumId: string, ownership: 'have' | 'want' | 'had' | 'sample' | 'decant', nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string, sizeMl?: number | null): Promise<void>;
export async function updateWardrobeItem(uid: string, parfumId: string, data: Partial<Pick<WardrobeItem, 'ownership' | 'rating' | 'notes' | 'shelfIds' | 'sizeMl' | 'isSignature'>>): Promise<void>;
export async function removeFromWardrobe(uid: string, parfumId: string): Promise<void>;
export async function isInWardrobe(uid: string, parfumId: string): Promise<WardrobeItem | null>;

// Shelves — étagères custom
export function onShelves(uid: string, cb: (shelves: Shelf[]) => void): () => void;
export async function createShelf(uid: string, name: string, icon?: string, color?: string): Promise<string>;
export async function updateShelf(uid: string, shelfId: string, data: Partial<Pick<Shelf, 'name' | 'icon' | 'color' | 'order'>>): Promise<void>;
export async function deleteShelf(uid: string, shelfId: string): Promise<void>;

// SOTD — Parfum du jour (stocké par date YYYY-MM-DD)
export async function getTodaySotd(uid: string): Promise<SotdEntry | null>;
export async function setSotd(uid: string, parfumId: string, nom: string, marque: string, imageUrl?: string | null): Promise<void>;
```

### `src/services/theme-storage.ts`
```ts
// Persistance de la préférence de thème dans AsyncStorage
export type ThemeMode = 'system' | 'light' | 'dark';
export function getThemeMode(): Promise<ThemeMode>;
export function setThemeMode(mode: ThemeMode): Promise<void>;
```

### `src/services/openai-vision.ts`
```ts
// Analyse d'image via GPT-4o Vision (Cloud Function)
export function analyzeImage(base64: string): Promise<ScanResult>;
export function analyzeMultipleImages(imagesBase64: string[]): Promise<ScanResult>;
```

### `src/services/storage.ts`
```ts
// Firebase Storage — upload d'images parfum
export function uploadParfumImage(parfumId: string, localUri: string): Promise<string>;
```

### `src/services/fcm.ts`
```ts
// Firebase Cloud Messaging — notifications push
export function requestFcmPermission(): Promise<boolean>;
export function deleteFcmToken(): Promise<void>;
```

### `src/services/haptics.ts`
```ts
// Retours haptiques
export function hapticsLight(): void;
export function hapticsSuccess(): void;
export function hapticsError(): void;
```

### `src/services/catalog-bridge.ts`
```ts
// Pont mémoire inter-écrans (scan → détail)
export function setPendingParfum(p: Parfum | ParfumSearchResult): void;
export function consumePendingParfum(): Parfum | ParfumSearchResult | null;
export function setPendingCatalogQuery(q: string): void;
export function consumePendingCatalogQuery(): string | null;
```

---

## §2 — Hooks

### `useTheme()` — `src/theme/ThemeContext.tsx`
```ts
interface ThemeContextValue {
  theme: Theme;           // Objet thème actif (lightTheme ou darkTheme)
  mode: ThemeMode;        // 'system' | 'light' | 'dark'
  resolvedMode: 'light' | 'dark';  // Mode effectif
  setMode: (m: ThemeMode) => void;
}
export function useTheme(): ThemeContextValue;
```

### `useAuthContext()` — `src/contexts/AuthContext.tsx`
```ts
interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  register(email: string, password: string): Promise<UserCredential>;
  login(email: string, password: string): Promise<UserCredential>;
  loginWithGoogle(): Promise<UserCredential>;
  logout(): Promise<void>;
}
```

### `useFavoris(uid)` — `src/hooks/useFavoris.ts`
```ts
// Hook Firestore temps réel pour les favoris
export function useFavoris(uid: string | null): {
  favoris: UserFavori[];
  loading: boolean;
  removeFavori: (id: string) => Promise<void>;
};
```

### `useCollection(uid)` — `src/hooks/useCollection.ts`
```ts
// Hook Firestore temps réel pour la collection
export function useCollection(uid: string | null): {
  items: UserCollectionItem[];
  loading: boolean;
  remove: (id: string) => Promise<void>;
};
```

### `useWishlist(uid)` — `src/hooks/useWishlist.ts`
```ts
// Hook Firestore temps réel pour la wishlist
export function useWishlist(uid: string | null): {
  items: UserWishlistItem[];
  loading: boolean;
  remove: (id: string) => Promise<void>;
};
```

### `useScans(uid)` — `src/hooks/useScans.ts`
```ts
// Hook Firestore temps réel pour l'historique des scans
export function useScans(uid: string | null): {
  scans: UserScan[];
  loading: boolean;
  removeScan: (id: string) => Promise<void>;
};
```

### `useWardrobe(uid)` — `src/hooks/useWardrobe.ts`
```ts
// Hook Firestore temps réel pour la garde-robe
export function useWardrobe(uid: string | null): {
  items: WardrobeItem[];
  loading: boolean;
  add: (parfumId: string, ownership: WardrobeItem['ownership'], nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string) => Promise<void>;
  update: (parfumId: string, data: Partial<Pick<WardrobeItem, 'ownership' | 'rating' | 'notes' | 'shelfIds' | 'sizeMl'>>) => Promise<void>;
  remove: (parfumId: string) => Promise<void>;
  checkInWardrobe: (parfumId: string) => Promise<WardrobeItem | null>;
};
```

### `useShelves(uid)` — `src/hooks/useShelves.ts`
```ts
// Hook CRUD étagères (Firestore temps réel)
export function useShelves(uid: string | null): {
  shelves: Shelf[];
  create: (name: string, icon?: string, color?: string) => Promise<void>;
  update: (shelfId: string, data: Partial<Pick<Shelf, 'name' | 'icon' | 'color' | 'order'>>) => Promise<void>;
  remove: (shelfId: string) => Promise<void>;
};
```

### `useSotd(uid)` — `src/hooks/useSotd.ts`
```ts
// Hook Parfum du jour (lecture/écriture + état local optimiste)
export function useSotd(uid: string | null): {
  sotd: SotdEntry | null;
  setTodaySotd: (item: WardrobeItem) => Promise<void>;
  refresh: () => Promise<void>;
};
```

---

## §3 — Theme Reference

### `src/theme/theme.ts`

```ts
// Double palette light/dark
export const lightTheme: Theme;
export const darkTheme: Theme;
export type Theme = typeof lightTheme;

// Alias de rétrocompatibilité (à ne plus utiliser)
export const theme = lightTheme;

interface Theme {
  colors: { /* 28 tokens couleur */ };
  fonts: { /* display, body, sizes */ };
  radius: { /* sm, base, card, lg, xl, full */ };
  spacing: { /* xs → 3xl */ };
  shadow: { /* card, elevated, button, scanCircle */ };
}
```

### Pattern de consommation obligatoire

```tsx
import { useTheme, type Theme } from '../theme/ThemeContext';

function getStyles(t: Theme) {
  return {
    container: { backgroundColor: t.colors.background },
    title: { color: t.colors.text, fontFamily: t.fonts.display.fontFamily },
  } as const;
}

export default function MonComposant() {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  // ...
}
```

---

## §4 — Modèles

### `src/models/parfum.interface.ts`
```ts
interface Parfum {
  id: string;
  marque: string;
  nom: string;
  annee?: number;
  familleOlactive: string;
  notesTete: string[];
  notesCoeur: string[];
  notesFond: string[];
  imageUrl?: string;
  // ...
}
```

### `src/models/user-collection.interface.ts`
```ts
interface UserCollectionItem {
  id: string;
  parfumId: string;
  marque?: string;
  nom?: string;
  imageUrl?: string;
  addedAt: Date;
}
```

### `src/models/user-wishlist.interface.ts`
```ts
interface UserWishlistItem {
  id: string;
  parfumId: string;
  marque?: string;
  nom?: string;
  imageUrl?: string;
  familleOlactive?: string;
  addedAt: Date;
}
```

### `src/models/wardrobe.interface.ts`
```ts
interface WardrobeItem {
  parfumId: string;
  nom: string | null;
  marque: string | null;
  imageUrl: string | null;
  familleOlactive: string | null;
  ownership: 'have' | 'want' | 'had' | 'sample' | 'decant';
  rating: number | null;
  notes: string | null;
  shelfIds: string[];
  sizeMl: number | null;
  sotdCount: number;
  isSignature: boolean;
  addedAt: Date;
  updatedAt: Date;
}

interface Shelf {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  order: number;
  createdAt: Date;
}

interface SotdEntry {
  parfumId: string;
  nom: string;
  marque: string;
  imageUrl: string | null;
}
```

---

## §5 — Utilitaires

### `src/utils/ownership.ts`
```ts
// Labels centralisés pour les états de garde-robe
export const OWNERSHIP_LABELS: Record<WardrobeItem['ownership'], string>;
export function ownershipLabel(o: WardrobeItem['ownership']): string;
export function wardrobeToCardItem(item: WardrobeItem): { id, nom, marque, imageUrl, familleOlactive, source };
```

### `src/utils/translate-note.ts`
```ts
export function translateNote(note: string): string;
// Traduit les noms de notes olfactives EN → FR
```

### `src/utils/error-translator.ts`
```ts
export function translateFirebaseError(e: unknown): string;
// Traduit les erreurs Firebase en messages FR
```

---

## §6 — Composants

### `DockBar` — `src/features/navigation/DockBar.tsx`

Barre de navigation flottante 5 positions (Catalogue, Favoris, Scan, Historique, Collection) + FAB central.

```ts
interface Props {
  activeIndex: number;                    // 0=Catalogue, 1=Favoris, 3=Historique, 4=Collection (2=FAB)
  pageWidth: SharedValue<number>;        // Largeur ecran partagee pour le calcul de position
  dockTranslateY: SharedValue<number>;   // Drive le show/hide au scroll (0 visible / +120 cache)
  onTabPress: (index: number) => void;   // Callback changement d'onglet (haptics attendu par le parent)
}
```

**Caracteristiques** :
- Verre depoli : `BlurView` (expo-blur, intensity 24) + overlay semi-transparent `rgba(background, 0.88)`
- Indicateur dore anime : `withSpring({ damping: 22, stiffness: 280, mass: 0.7 })` via `useAnimatedReaction`
- Pulse ring : halo violet autour du FAB, `withRepeat(withTiming(1.18, 2500ms), -1, true)`, opacity inversee
- Show/hide au scroll : `useAnimatedReaction` sur `scrollY` → cache si `y > prev && y > 60`, montre si `y < prev`
- Dimensions : 64px hauteur, 24px borderRadius, 88% largeur (max 380px), FAB 56×56
- Dark mode : `BlurView tint` suit `resolvedMode`, overlay couleur dynamique via `t.colors.background`
- Haptics integres sur le FAB, delegues au parent pour les onglets

**Dependances** : `expo-blur`, `react-native-reanimated`, `@react-native-vector-icons/ionicons`, `react-native-safe-area-context`
