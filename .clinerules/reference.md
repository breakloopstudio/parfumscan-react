# ParfumScan React — Référence technique

## §1 — Service Layer

### `src/services/firebase.ts`
```ts
// Initialise Firebase
export function isFirebaseReady(): boolean;
```

### `src/services/firestore.ts`
```ts
// CRUD Firestore — catalogue 100% autonome
export function onParfums(cb: (p: Parfum[]) => void): () => void;
export function getParfumById(id: string): Promise<Parfum | undefined>;
export function updateParfum(id: string, data: Partial<Parfum>): Promise<void>;
export function getPopularParfums(limit: number): Promise<Parfum[]>;
export function getPersonalizedSuggestions(uid: string, limit: number): Promise<Parfum[]>;
export function searchParfumsCached(query: string): Promise<Parfum[]>;
// Scoring par prefixe (startsWith) + bonus reviewCount, limit 200
export function getSimilarParfums(mainAccords: string[], excludeId: string, limit?: number): Promise<Parfum[]>;
// Scoring par nombre d'accords partages (array-contains-any) + popularityScore, shuffle journalier (Lehmer RNG)
```

### `src/utils/normalize.ts`
```ts
// Utilitaires de normalisation — extraits de l'ancien fragella.ts
export function normalize(s: string): string;
export function normalizeId(s: string): string;
export function buildSearchKeywords(marque: string, nom: string): string[];
```

### `src/services/user-data.ts`
```ts
// Firestore — données utilisateur (favoris, collection, wishlist, scans, settings)
// Doc IDs = parfumId (déterministes, pas de doublons possibles)
export function onFavoris(uid: string, cb: (f: UserFavori[]) => void): () => void;
export function addFavori(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string, bestPrice?: number, referencePrice?: number, annee?: number): Promise<string>;
export function removeFavori(uid: string, parfumId: string): Promise<void>;
export function isParfumFavori(uid: string, parfumId: string): Promise<{ isFavori: boolean; favoriId: string | null }>;
export function onCollection(uid: string, cb: (items: UserCollectionItem[]) => void): () => void;
export function addToCollection(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string): Promise<string>;
export function removeFromCollection(uid: string, parfumId: string): Promise<void>;
export function onWishlist(uid: string, cb: (items: UserWishlistItem[]) => void): () => void;
export function addToWishlist(uid: string, parfumId: string, nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string): Promise<string>;
export function removeFromWishlist(uid: string, parfumId: string): Promise<void>;
export function onScans(uid: string, cb: (s: UserScan[]) => void): () => void;
export function saveScan(uid: string, data: Omit<UserScan, 'id' | 'scannedAt'> & { status?: 'success' | 'no-result' | 'error'; bestPrice?: number; annee?: number }): Promise<void>;
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
export function setPendingParfum(p: Parfum): void;
export function consumePendingParfum(): Parfum | null;
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

```
### `useDensityPreference()` — `src/hooks/useDensityPreference.ts`
```ts
// Persistance AsyncStorage du mode d'affichage grille — partage catalogue + recherche
export function useDensityPreference(): {
  density: CardMode;     // 'comfortable' | 'compactPlus' | 'list'
  setDensity: (mode: CardMode) => void;
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

### `src/models/user-favori.interface.ts`
```ts
interface UserFavori {
  id: string;
  parfumId: string;
  nom?: string;
  marque?: string;
  imageUrl?: string;
  familleOlactive?: string;
  bestPrice?: number;       // dénormalisé — badge promo
  referencePrice?: number;   // dénormalisé — calcul remise
  annee?: number;            // dénormalisé — chip année
  addedAt: Date;
}
```

### `src/models/user-scan.interface.ts`
```ts
interface UserScan {
  id: string;
  marque?: string;
  nom?: string;
  typeParfum?: string;
  volumeMl?: number;
  rawText?: string;
  parfumId?: string;
  imageUrl?: string;
  familleOlactive?: string;
  annee?: number;            // dénormalisé
  bestPrice?: number;        // dénormalisé
  status?: 'success' | 'no-result' | 'error';
  scannedAt: Date;
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

### `src/utils/note-descriptions.ts`
```ts
// Descriptions détaillées des notes olfactives (FR)
export const NOTE_DESCRIPTIONS: Record<string, string>;
export function getNoteDescription(note: string): string | null;
```

---

## §6 — Composants

### `NoteDetailPopup` — `src/components/NoteDetailPopup.tsx`

Popup affichant le détail d'une note olfactive (nom français, description, couche olfactive).

```ts
interface Props {
  visible: boolean;
  noteEn: string;
  layer: 'Tête' | 'Cœur' | 'Fond';
  color: string;
  onClose: () => void;
}
```

### `ActionSheet` — `src/components/ActionSheet.tsx`

Bottom sheet custom pour les menus contextuels (long-press sur favoris/scans). Animation spring + backdrop avec `withTiming`.

```ts
interface ActionItem {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  title?: string;
  actions: ActionItem[];
  onClose: () => void;
}
```

### `DockBar` — `src/features/navigation/DockBar.tsx`

Barre de navigation flottante 5 positions (Catalogue, Favoris, Scan, Historique, Parfumerie) + FAB central.

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

### `ParfumCard` — `src/components/ParfumCard.tsx`

Carte parfum 4 modes — point d'entree unique pour l'affichage catalogue, recherche, favoris, historique, wardrove.

```ts
export type CardMode = 'compact' | 'comfortable' | 'compactPlus' | 'list';

interface Props {
  parfum: Parfum;
  mode?: CardMode;         // defaut: 'comfortable'
  onPressOverride?: () => void;
}
```

| Mode | Usage | Taille image | Contenu |
|---|---|---|---|
| `compact` | Rangees horizontales | 140×186 | Marque + nom (2 lignes) + prix + badge promo (>10%) |
| `comfortable` | Grille 2 col (defaut) | ratio 3:4 | Marque + nom + tags (famille, annee) + notes de tete (3) + price dot (deal/fair/overpriced) + prix + badge promo |
| `compactPlus` | Grille 2 col dense | 90px | Marque (abregee) + nom (1 ligne) + price dot + prix |
| `list` | Liste verticale | 56×74 | Marque + nom + tags + price dot + prix + prix barre + chevron |

### `CatalogPage` — `src/features/catalog/CatalogPage.tsx`

Page catalogue principale — structure hybride rangees editoriales + grille filtrable.

```ts
interface Props {
  onScroll?: (y: number) => void;  // drive le show/hide du DockBar parent
}
```

**Structure** : capsules marques → « Pour vous » (rangee) → « Meilleures affaires » (rangee) → « Explorer par famille » (ambiance cards) → « Icones intemporelles » (rangee, repliee) → grille « Tous les parfums » avec controles densite + filtre.

### `BrandCapsules` — `src/features/catalog/BrandCapsules.tsx`

Pastilles marques rectangulaires (42px hauteur, nom complet) en scroll horizontal.

```ts
interface Props {
  onViewAll: () => void;
  onBrandTap: (brand: string) => void;
}
```

### `CatalogRow` — `src/features/catalog/CatalogRow.tsx`

Rangee editoriale horizontale avec titre Playfair Display, sous-titre optionnel, chevron collapse/expand, et action « Voir tout → ».

```ts
interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: React.ReactNode;  // cartes ParfumCard en mode compact
}
```

### `FamilyAmbianceCards` — `src/features/catalog/FamilyAmbianceCards.tsx`

6 cartes d'ambiance (140×80) pour explorer les familles olfactives. Chaque carte utilise un fond `theme.colors[*Soft]` + icone Ionicons + couleur d'accent — entierement theme-aware (light + dark).

```ts
interface Props {
  onFamilyTap: (query: string) => void;
}
```
