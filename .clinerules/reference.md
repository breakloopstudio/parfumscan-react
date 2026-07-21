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
```
→ Voir **§7 — Algorithme de recherche** pour la spécification complète.

```ts
export function searchParfumFromScan(marque: string | null, nom: string | null): Promise<Parfum[]>;
// Wrapper scan-spécifique : appelle searchParfumsCached puis rescore avec bonus nom/marque
// Bonus : +50 (nom exact), +25 (nom partiel), +15 (marque exacte), +8 (marque partielle)
// Les résultats de searchParfumsCached et searchParfumFromScan sont dédoublonnés par marque+nom normalisé.
```

```ts
export function getSimilarParfums(mainAccords: string[], excludeId: string, limit?: number): Promise<Parfum[]>;
// Scoring par nombre d'accords partagés (array-contains-any) + orderBy popularityScore, shuffle journalier (Lehmer RNG), ParfumCard compact dans UI, cache TTL 24h via similarIdsCachedAt
```

### `src/utils/normalize.ts`
```ts
// Utilitaires de normalisation des chaînes
export const STOP_WORDS: Set<string>;   // 38 mots vides FR/EN
export function normalize(s: string): string;
export function normalizeId(s: string): string;
export function generateTrigrams(word: string): string[];  // trigrammes $-padded
export function buildSearchKeywords(marque: string, nom: string, familleOlactive?: string): string[];
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
  radius: { /* sm, base, card, full */ };
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

### `Button` — `src/components/Button.tsx`

Bouton 4 variantes. Toujours en `Inter_600SemiBold`.

```ts
interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}
```

### `PriceDisplay` — `src/components/PriceDisplay.tsx`

Affichage prix avec code couleur (deal/fair/overpriced).

```ts
interface Props {
  bestPrice: number;
  referencePrice?: number;
  priceValue?: 'deal' | 'fair' | 'overpriced';
  large?: boolean;
}
```

### `EmptyState` — `src/components/EmptyState.tsx`

État vide 4 variantes : `collection | wishlist | favoris | historique`.

```ts
interface Props {
  variant: 'collection' | 'wishlist' | 'favoris' | 'historique';
  onAction?: () => void;
}
```

### `ImageViewerPopup` — `src/components/ImageViewerPopup.tsx`

Popup plein écran pour afficher la photo du parfum en grand.

```ts
interface Props {
  visible: boolean;
  imageUrl: string;
  brand?: string;
  onClose: () => void;
}
```

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
  pageWidth: SharedValue<number>;        // Largeur écran partagée pour le calcul de position
  dockTranslateY: SharedValue<number>;   // Drive le show/hide au scroll (0 visible / +120 caché)
  onTabPress: (index: number) => void;   // Callback changement d'onglet (haptics attendu par le parent)
}
```

**Caractéristiques** :
- Verre dépoli : `BlurView` (expo-blur, intensity 24) + overlay semi-transparent `rgba(background, 0.88)`
- Indicateur doré animé : `withSpring({ damping: 22, stiffness: 280, mass: 0.7 })` via `useAnimatedReaction`
- Pulse ring : halo violet autour du FAB, `withRepeat(withTiming(1.18, 2500ms), -1, true)`, opacity inversée
- Show/hide au scroll : `useAnimatedReaction` sur `scrollY` → cache si `y > prev && y > 60`, montre si `y < prev`
- Dimensions : 64px hauteur, 24px borderRadius, 88% largeur (max 380px), FAB 56×56
- Dark mode : `BlurView tint` suit `resolvedMode`, overlay couleur dynamique via `t.colors.background`
- Haptics intégrés sur le FAB, délégués au parent pour les onglets

**Dépendances** : `expo-blur`, `react-native-reanimated`, `@react-native-vector-icons/ionicons`, `react-native-safe-area-context`

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
  onHorizontalScrollActive?: (active: boolean) => void;
}
```

### `BrandSheet` — `src/features/catalog/BrandSheet.tsx`

Bottom sheet alphabétique A-Z (« Toutes les marques »). Modal avec FlatList groupée par lettre, barre de recherche, index latéral rapide.

```ts
interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectBrand: (brand: string) => void;
}
```

### `TabPager` — `app/(tabs)/index.tsx`

Pager horizontal 4 pages (Catalogue / Favoris / Historique / Parfumerie) avec `GestureDetector` + Reanimated. Gesture config : `activeOffsetX([-30, 30])`, `failOffsetY([-15, 15])`, spring animation (damping 25, stiffness 250). 4 pages rendues en `flexDirection: 'row'`, translatées via `translateX` animé. DockBar hide/show au scroll vertical, barre de recherche persistante `BlurView`.

---

## §7 — Algorithme de recherche

### Vue d'ensemble

La recherche est 100 % Firestore, sans API externe. Chaque parfum (~25 100 documents dans `parfums/{id}`) possède un champ `searchKeywords: string[]` pré-calculé à l'import. L'utilisateur tape → debounce 150ms → requête Firestore → scoring local → top 50 résultats.

### Couche 1 — Indexation (`buildSearchKeywords`, `src/utils/normalize.ts`)

Pour un parfum donné (marque, nom, famille olfactive), la fonction génère un tableau de tokens :

| Étape | Description | Exemple pour "Jean Paul Gaultier" / "Le Mâle" |
|---|---|---|
| **Normalisation** | NFD → strip accents → lowercase → `[^a-z0-9]` → `_` | `jean_paul_gaultier`, `le_male` |
| **Stop words** | 38 mots vides FR/EN filtrés (`de`, `la`, `le`, `eau`, `the`, `of`…) | `le` est exclu |
| **Mots complets** | Chaque mot non-stop ajouté tel quel | `jean`, `paul`, `gaultier`, `male` |
| **Préfixes (≥3)** | Tous les préfixes de chaque mot | `jea`, `jean`, `pau`, `paul`, `gau`, `gaul`, `gault`… |
| **Trigrammes (~)** | Trigrammes $-padded pour fuzzy matching | `~$je`, `~jea`, `~ean`, `~an$`, `~$pa`, `~pau`… |
| **Token marque** | Marque normalisée complète | `jean_paul_gaultier` |
| **Token nom** | Nom normalisé complet | `le_male` |
| **Token combiné** | `marque_nom` pour l'exact match | `jean_paul_gaultier_le_male` |
| **Famille olfactive** | Mots de la famille ajoutés avec trigrammes | `oriental`, `floral`, `~$or`, `~ori`… |

Total : ~20–50 tokens par parfum selon la longueur des noms.

### Couche 2 — Tokenisation de la requête (`searchParfumsCached`)

```
"Guerlain L'Homme Idéal Parfum"
  → lowercased: "guerlain l'homme idéal parfum"
  → split whitespace: ["guerlain", "l'homme", "idéal", "parfum"]
  → normalize chaque token + split sur _ + filtre stop words + min 2 chars
  → searchTokens: ["guerlain", "homme", "ideal", "parfum"]
```

### Couche 3 — Requêtes Firestore (dual mode)

| Mode | Condition | Requête | Limite |
|---|---|---|---|
| **Mono-token** | `searchTokens.length === 1` | `where('searchKeywords', 'array-contains', token)` + `orderBy('reviewCount', 'desc')` | 100 docs |
| **Multi-token** | `searchTokens.length ≥ 2` | N queries `array-contains` en parallèle, déduplication par ID | 300 docs/token |

Index composite requis : `searchKeywords ARRAY-CONTAINS` + `reviewCount DESC` + `__name__ DESC`.

### Couche 4 — Scoring local (`_scoreDocs`)

Chaque document candidat reçoit un score composite :

```
matchScore  = Σ (token.length / bestKeyword.length)  pour chaque token
              ex: token "jea" → keyword "jean" → 3/4 = 0.75
              ex: token "homme" → keyword "homme" → 5/5 = 1.0

exactMatch  = 10 si multi-token ET la query normalisée complète est dans searchKeywords

popBonus    = log(max(reviewCount, ratingCount, popularityScore) + 1) / 2

score       = matchScore + exactMatch + popBonus
```

Règle importante : le scoring ignore les trigrammes (tokens préfixés `~`) — ils ne sont utilisés que par le fuzzy fallback.

### Couche 5 — Tri

Score de pertinence **toujours** primaire, popularité en tiebreaker (quel que soit le nombre de tokens).

```
.sort((a, b) => {
  const diff = b._score - a._score;
  if (Math.abs(diff) < 0.001) return b._pop - a._pop;  // tiebreaker
  return diff;
})
```

Top 50 résultats retournés.

### Couche 6 — Caches

#### Cache exact (LRU, max 200 entrées)
`Map<string, Parfum[]>` — chaque requête exacte est cachée. Éviction LRU : l'entrée la plus ancienne est supprimée quand la limite est atteinte.

#### Prefix cache
Si la query est une extension d'une query déjà en cache (ex: `"jean paul"` → `"jean paul gau"`), les résultats cachés sont re-scorés localement avec les nouveaux tokens — aucun appel Firestore.

**Garde-fou** : le prefix cache est désactivé quand la nouvelle query a **plus de mots** que la query cachée. Ex : cache `"l'homme"` (1 mot) → query `"l'homme idéal parfum"` (3 mots) → pas de prefix cache → Firestore direct. Cela évite qu'un cache mono-token masque des résultats qui nécessitent les tokens supplémentaires.

#### Cache des recherches récentes (AsyncStorage)
Les 5 dernières recherches sont persistées dans `@parfumscan/recent-searches` et survivent aux redémarrages de l'app.

### Couche 7 — Fuzzy fallback (trigrammes)

Déclenché quand la recherche primaire retourne **< 5 résultats** :

1. Générer les trigrammes $-padded de chaque mot de la query
2. Requête Firestore : `array-contains-any` avec les trigrammes préfixés `~` (max 30), `orderBy reviewCount DESC`, limit 200
3. Pour chaque doc candidat, calculer le **score de Jaccard** entre les trigrammes de la query et les trigrammes du doc
4. Garder les docs avec Jaccard > 0.25, triés par score décroissant, top 10
5. Ajouter aux résultats primaires (hors doublons)

**Exemple** : query `"chanell"` (typo) → trigrammes `$ch, cha, han, ane, nel, ell, ll$` → matche `"Chanel"` (trigrammes `$ch, cha, han, ane, nel, el$`) → Jaccard = 5/8 = 0.625 → trouvé.

### Couche 8 — Debounce et anti-race (`useCatalog`)

| Mécanisme | Détail |
|---|---|
| **Debounce** | 150ms avant d'appeler `searchParfumsCached` |
| **Seuil** | Query < 3 caractères → pas de requête |
| **Anti-race** | `requestIdRef` incrémenté à chaque nouvelle frappe ; seuls les résultats du dernier ID sont appliqués |
| **Unmount safety** | `mountedRef` empêche `setState` après démontage du composant |

### Flux complet (catalogue)

```
Frappe utilisateur
  → useCatalog.search() [debounce 150ms, requestIdRef anti-race]
    → searchParfumsCached(query)
      → Cache exact (LRU) ? return
      → Tokenisation + filtrage stop words
      → Prefix cache (si même nombre de mots) ? re-score local → return
      → Firestore : array-contains (mono/multi token)
      → Scoring local (matchScore + exactMatch + popBonus)
      → Tri (pertinence primaire, popularité tiebreaker)
      → < 5 résultats ? Fuzzy fallback trigrammes (Jaccard)
      → Dédoublonnage par marque+nom normalisé (garde le 1er = meilleur score)
      → Cache (LRU) + return top 50
    → setParfums(results)
```

### Couche 9 — Dédoublonnage marque+nom (`_dedupByMarqueNom`)

Après scoring et tri, les résultats sont filtrés par clé `normalize(marque) + '_' + normalize(nom)` pour éliminer les documents Firestore en doublon (même parfum importé plusieurs fois avec des IDs différents). Le premier résultat (meilleur score) est conservé.

Appliqué dans 3 points :
- Fin de `searchParfumsCached` (catalogue + scan)
- Après re-scoring du prefix cache
- En sortie de `searchParfumFromScan` (sécurité)

### `searchParfumFromScan` — Recherche optimisée scan

Le scan GPT-4o Vision fournit la marque et le nom de façon **structurée** (champs séparés), contrairement à la recherche catalogue (texte libre). `searchParfumFromScan` exploite cette structure :

```
searchParfumFromScan(marque, nom)
  → Construit query = [marque, nom].join(' ')
  → searchParfumsCached(query)     // scoring catalogue (matchScore + exactMatch + popBonus)
  → Rescoring scan-spécifique :
      Bonus nom exact      = +50   (doc.nom normalisé === gptNom normalisé)
      Bonus nom partiel    = +25   (l'un contient l'autre)
      Bonus marque exacte  = +15   (doc.marque normalisée === gptMarque normalisée)
      Bonus marque partiel = +8    (l'un contient l'autre)
  → Tri par bonus scan décroissant, tiebreaker bestPrice croissant
  → Dédoublonnage marque+nom
  → Return
```

**Pourquoi** : contrairement au catalogue (exploration), le scan est de l'**identification** — l'utilisateur sait déjà quel parfum il scanne. Le bonus +50 garantit que le match de nom exact écrase systématiquement les variants/flankers plus populaires.
```
