# ParfumScan React — Reference (v5.7)

> Règles et conventions : `.clinerules/rules.md`

## 1. Service Layer (fonctions pures — `src/services/`)

### firebase.ts — Init Firebase
```typescript
import { initializeApp, getApps } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
export function isFirebaseReady(): boolean;
```

### firestore.ts — CRUD `parfums` + cache Fragella
```typescript
// docToParfum() mappe explicitement chaque champ (Timestamp → Date)
// batchCacheParfums() = batch.set({merge:true}), pas de read préalable
// ⚠️ Tous les champs optionnels DOIVENT avoir ?? null — Firestore rejette undefined

function onParfums(cb): () => void;                       // real-time, orderBy updatedAt desc
async function getParfumById(id): Parfum|undefined;        // one-shot
function onParfumsByMarque(marque, cb): () => void;        // range query + client filter
async function createParfum(data): Promise<any>;
async function updateParfum(id, data): Promise<void>;
async function deleteParfum(id): Promise<void>;

// Cache Fragella
async function cacheParfumFromSearch(p): Promise<string>;          // upsert: get() try/catch, update partiel si existant
async function batchCacheParfums(parfums): Promise<number>;        // batch set({merge:true}), createdAt défini par cacheParfumFromSearch
async function searchParfumsCached(query): Promise<ParfumSearchResult[]>;
async function getPopularParfums(limit): Promise<ParfumSearchResult[]>;
async function getPersonalizedSuggestions(uid, limit?): Promise<ParfumSearchResult[]>;   // v5.7, read-only, client-side scoring
async function deleteAllCachedParfums(): Promise<number>;          // reset complet (batch paginé)
```

### user-data.ts — Favoris + scans + collection + wishlist
```typescript
// Favoris
function onFavoris(uid, cb): () => void;
async function addFavori(uid, parfumId, nom?, marque?, imageUrl?, familleOlactive?): Promise<string>; // dédup + dénormalisation
async function removeFavori(uid, favoriId): Promise<void>;
async function isParfumFavori(uid, parfumId): Promise<{isFavori, favoriId}>;

// Scans
function onScans(uid, cb): () => void;
async function saveScan(uid, data): Promise<void>;       // filtre undefined, stocke imageUrl + familleOlactive
async function removeScan(uid, scanId): Promise<void>;

// Collection
function onCollection(uid, cb): () => void;
async function addToCollection(uid, parfumId, nom?, marque?, imageUrl?): Promise<string>;
async function removeFromCollection(uid, itemId): Promise<void>;
async function isInCollection(uid, parfumId): Promise<{isInCollection, itemId}>;

// Wishlist
function onWishlist(uid, cb): () => void;
async function addToWishlist(uid, parfumId, nom?, marque?, imageUrl?, familleOlactive?): Promise<string>;
async function removeFromWishlist(uid, itemId): Promise<void>;
async function isInWishlist(uid, parfumId): Promise<{isInWishlist, itemId}>;

// Déplacement atomique (batch Firestore)
async function moveToCollection(uid, fromTab, fromItemId, parfumId, nom?, marque?, imageUrl?): Promise<void>;
async function moveToWishlist(uid, fromTab, fromItemId, parfumId, nom?, marque?, imageUrl?, familleOlactive?): Promise<void>;
async function moveFavori(uid, fromTab, fromItemId, parfumId, nom?, marque?, imageUrl?, familleOlactive?): Promise<void>;

// Settings
async function getUserSettings(uid): Promise<{priceAlerts, pushNotifs}>;
async function updateUserSetting(uid, key, value): Promise<void>;

// Alertes prix par parfum
async function isPriceAlertActive(uid, parfumId): Promise<boolean>;
async function setPriceAlert(uid, parfumId, active): Promise<void>;
```

### fragella.ts — API Fragella (74K parfums, appels REST directs)
```typescript
// ⚠️ Appels payants → toujours passer par le cache Firestore d'abord
interface FragranceResult { id?, fragellaId?, nom, marque, ... }
interface ParfumSearchResult { id, fragellaId?, nom, marque, ..., source: 'fragella' }

async function searchFragrance(marque, nom, typeParfum?): Promise<FragranceResult[]>;
async function searchFragranceByQuery(query): Promise<FragranceResult[]>;
async function getFragranceById(id): Promise<FragranceResult | null>;
async function getSimilarFragrances(marque, nom, limit?): Promise<FragranceResult[]>;  // /fragrances/similar
function fragellaToParfum(frag: FragranceResult): ParfumSearchResult;
function mapFragrance(raw): FragranceResult;  // _id (underscore) → fragellaId
function normalize(s: string): string;        // NFD + strip accents + lowercase + [^a-z0-9]+ → _
function buildSearchKeywords(marque, nom): string[];
```

### openai-vision.ts — GPT-4o Vision (via Cloud Function)
```typescript
// firebase.app().functions('europe-west1') — région obligatoire
// v5.0 : retry auto detail:'auto' → 'high' si contenu vide, plus de response_format:json_object
// v5.7 : burst adaptatif — 3 photos, 1ère → si low → cross-ref 2+3 (analyzeMultipleImages)
async function analyzeImage(base64Image: string): Promise<ScanResult>;
async function analyzeMultipleImages(imagesBase64: string[]): Promise<ScanResult>;
```

### storage.ts — Upload images
```typescript
async function uploadParfumImage(parfumId: string, localUri: string, filename?: string): Promise<string>;
```

### haptics.ts — Retours haptiques
```typescript
function hapticsLight(): void;
function hapticsSuccess(): void;
function hapticsError(): void;
```

### fcm.ts — Notifications push
```typescript
// iOS: registerDeviceForRemoteMessages() pour le token APNs
// Android: pas d'étape supplémentaire
async function requestFcmPermission(): Promise<boolean>;
async function getFcmToken(): Promise<string|null>;
function onFcmTokenRefresh(cb): () => void;
function onFcmMessage(cb): () => void;
function onFcmNotificationOpened(cb): () => void;
```

### catalog-bridge.ts — Pont scan → catalogue + parfum → détail
```typescript
function setPendingCatalogQuery(q: string): void;
function consumePendingCatalogQuery(): string | null;      // consume-once
function setPendingParfum(p: ParfumSearchResult|Parfum): void;
function consumePendingParfum(): ParfumSearchResult|Parfum|null;
```

## 2. Hook Layer (stateful — `src/hooks/`)

```typescript
useAuth()          → { user, authReady, isAdmin, isAuthenticated, login, register, loginWithGoogle, logout }
useScanReducer()   → { state, dispatch }  // dispatch direct, pas de wrappers
useFavoris(uid)    → { favoris, loading, addFavori, removeFavori }
useScans(uid)      → { scans, loading, saveScan, removeScan }
useCollection(uid) → { items, loading, add, remove }
useWishlist(uid)   → { items, loading, add, remove }
useCatalog()       → { results, parfums, searching, search, clear }  // cache-first Firestore
useNetwork()       → { isOnline }
```

## 3. Data Models

### Parfum (`src/models/parfum.interface.ts`) — Firestore `parfums`
```typescript
interface Parfum {
  id: string; nom: string; marque: string; annee?: number;
  familleOlactive: string; notesTete: string[]; notesCoeur: string[]; notesFond: string[];
  imageUrl?: string; bestPrice?: number; referencePrice?: number; discountPct?: number;
  offers?: PriceOffer[]; typeParfum?: string | null;
  source?: 'fragella' | 'seed' | 'manual'; cachedAt?: Date; imageVerified?: boolean;
  createdAt: Date; updatedAt: Date;
  searchKeywords: string[];      // tokens normalisés (ex: ["creed","aventus","creed_aventus"])
  fragellaId?: string;           // ID original Fragella (pour endpoint /:id)
  // Métadonnées enrichies
  purchaseUrl?: string | null; mainAccords?: string[];
  longevity?: string | null; sillage?: string | null; gender?: string | null;
  rating?: string | null; popularity?: string | null; priceValue?: string | null;
  country?: string; imageUrlTransparent?: string;
  mainAccordsPercentage?: Record<string, string>; generalNotes?: string[]; confidence?: string;
  seasonRanking?: { name: string; score: number }[];
  occasionRanking?: { name: string; score: number }[];
  imageFallbacks?: string[];
}
interface PriceOffer { marchand: string; prix: number; url: string; logoUrl?: string; volumeMl?: number; }
```

### ParfumSearchResult (`src/services/fragella.ts`) — Résultat Fragella (pas de dates Firestore)
```typescript
interface ParfumSearchResult {
  id: string; fragellaId?: string;
  nom: string; marque: string; annee?: number;
  familleOlactive: string; notesTete: string[]; notesCoeur: string[]; notesFond: string[];
  imageUrl?: string; bestPrice?: number; referencePrice?: number; discountPct?: number;
  source: 'fragella'; typeParfum?: string | null;
  purchaseUrl?: string | null; mainAccords?: string[];
  longevity?: string | null; sillage?: string | null; gender?: string | null;
  rating?: string | null; popularity?: string | null; priceValue?: string | null;
  country?: string; imageUrlTransparent?: string;
  mainAccordsPercentage?: Record<string, string>; generalNotes?: string[]; confidence?: string;
  seasonRanking?: { name: string; score: number }[];
  occasionRanking?: { name: string; score: number }[];
  imageFallbacks?: string[];
}
```

### FragranceResult (`src/services/fragella.ts`) — Brut API Fragella
```typescript
interface FragranceResult {
  id?, fragellaId?, nom, marque, annee?, imageUrl?, bestPrice?, typeParfum?,
  familleOlactive, notesTete[], notesCoeur[], notesFond[], longevity?, sillage?, gender?,
  purchaseUrl?, priceValue?, mainAccords[], rating?, popularity?, source?,
  country?, imageUrlTransparent?, mainAccordsPercentage?, generalNotes?, confidence?,
  seasonRanking?, occasionRanking?, imageFallbacks?
}
```

### UserFavori (`src/models/user-favori.interface.ts`) — `users/{uid}/favoris`
```typescript
interface UserFavori {
  id: string; parfumId: string; addedAt: Date;
  nom?: string; marque?: string; imageUrl?: string; familleOlactive?: string;
}
// Dénormalisé pour affichage sans appel API
```

### UserScan (`src/models/user-scan.interface.ts`) — `users/{uid}/scans`
```typescript
type FirestoreDate = { toDate(): Date; toMillis(): number };
interface UserScan {
  id: string; rawText: string; marque?: string; nom?: string;
  volumeMl?: number; typeParfum?: string; scannedAt: Date | FirestoreDate; parfumId?: string;
  imageUrl?: string; familleOlactive?: string;
}
// imageUrl + familleOlactive dénormalisés, FirestoreDate = duck typing pour Timestamp (compatible Expo Go)
```

### ScanResult (`src/models/scan-result.interface.ts`) — GPT-4o, local
```typescript
interface ScanResult {
  marque: string|null; nom: string|null; volumeMl: number|null;
  typeParfum: string|null; confidence?: 'high'|'low';
}
```

### UserCollectionItem (`src/models/user-collection.interface.ts`) — `users/{uid}/collection`
```typescript
interface UserCollectionItem {
  id: string; parfumId: string; addedAt: Date;
  nom?: string; marque?: string; imageUrl?: string;
}
```

### UserWishlistItem (`src/models/user-wishlist.interface.ts`) — `users/{uid}/wishlist`
```typescript
interface UserWishlistItem {
  id: string; parfumId: string; addedAt: Date;
  nom?: string; marque?: string; imageUrl?: string; familleOlactive?: string;
}
```

## 4. Fragella API

> Docs officielles : https://api.fragella.com/docs.html
> Base URL : `https://api.fragella.com/api/v1`
> Auth : `x-api-key` header (stocké dans `.env` → `EXPO_PUBLIC_FRAGELLA_API_KEY`)
> ⚠️ Ne JAMAIS exposer la clé secrète dans le frontend. Pour un usage public, utiliser une `pub_` key.

### Endpoints

| Endpoint | Usage | Appels |
|---|---|---|
| `GET /fragrances?search={q}&limit={n}` | Recherche (scan + catalogue) | `searchFragrance()`, `searchFragranceByQuery()` |
| `GET /fragrances/:id` | Détail complet | `getFragranceById()` (enrichissement) |
| `GET /brands/:brandName?limit={n}` | Tous les parfums d'une marque | Cloud Function uniquement |
| `GET /fragrances/similar?name={q}&limit={n}` | Parfums similaires | `getSimilarFragrances()` (carrousel fiche détail) |
| `GET /fragrances/match?accords=...&top=...&base=...` | Match accords/notes | Non utilisé |

Paramètres : `search` (min 2 caractères), `limit` (défaut ~10), `page` (pagination → wrap `{ data, pagination }` au lieu d'un array).

### Schéma de réponse — mapping complet

⚠️ **CRITIQUE** : Les noms de champs sont case-sensitive et contiennent des espaces. Utiliser les clés exactes dans `mapFragrance()`.

| Champ API (JSON) | Type | Champ interne | Notes |
|---|---|---|---|
| `_id` | string | `fragellaId` | ⚠️ **`_id`** (underscore), pas `Id`/`id`/`ID` |
| `Name` | string | `nom` | Retire le préfixe marque si présent |
| `Brand` | string | `marque` | |
| `Year` | string | `annee` | Parsé en `number` |
| `rating` | string | `rating` + `ratingScore` | `"4.19"` → `parseFloat()` |
| `Country` | string | `country` | |
| `Popularity` | string | `popularity` + `popularityScore` | `"Very high"` → `popScore()` |
| `Price Value` | string | `priceValue` | `"good_value"`, `"overpriced"`, `"okay"`, `"fair"` |
| `Confidence` | string | `confidence` | `"high"`, `"medium"`, `"low"` |
| `Image URL` | string | `imageUrl` | URL du flacon (jpg) |
| `Image URL Transparent` | string | `imageUrlTransparent` | URL fond transparent (webp) |
| `Gender` | string | `gender` | `"men"`, `"women"`, `"unisex"` |
| `Price` | string | `bestPrice` | Parsé en `number` |
| `Longevity` | string | `longevity` | `"Long Lasting"`, `"Moderate"`, `"Weak"`, `"Very Long Lasting"` |
| `Sillage` | string | `sillage` | `"Strong"`, `"Moderate"`, `"Intimate"`, `"Enormous"`, `"Heavy"` |
| `OilType` | string | `typeParfum` | `"Eau de Parfum"`, `"Eau de Toilette"`, `""` (parfois vide) |
| `Season Ranking` | `Array<{name, score}>` | `seasonRanking` | `name` = `"spring"`/`"summer"`/`"fall"`/`"winter"` |
| `Occasion Ranking` | `Array<{name, score}>` | `occasionRanking` | `name` = `"casual"`/`"night out"`/`"professional"`/etc. |
| `General Notes` | `string[]` | `generalNotes` | Liste plate (pas structurée) |
| `Main Accords` | `string[]` | `mainAccords` | Triés par importance |
| `Main Accords Percentage` | `Record<string, string>` | `mainAccordsPercentage` | `"Dominant"`, `"Prominent"`, `"Moderate"`, `"Subtle"`, `"Faint"` |
| `Notes.Top` | `Array<{name, imageUrl}>` | `notesTete` | |
| `Notes.Middle` | `Array<{name, imageUrl}>` | `notesCoeur` | |
| `Notes.Base` | `Array<{name, imageUrl}>` | `notesFond` | |
| `Image Fallbacks` | `string[]` | `imageFallbacks` | URLs alternatives |
| `Purchase URL` | string | `purchaseUrl` | Lien affilié |

### Les deux endpoints retournent les MÊMES champs

L'endpoint search (`/fragrances?search=`) retourne TOUTES les métadonnées (Longevity, Sillage, Season Ranking, Occasion Ranking, Main Accords Percentage, etc.). L'endpoint détail (`/fragrances/:id`) n'est nécessaire que pour obtenir/rafraîchir des données hors search.

### Pièges connus

1. **`_id` n'est PAS `Id`/`id`/`ID`** : l'API retourne `_id` (underscore). Le code cherche `raw['_id']` en premier. Corrigé le 15/07/2026 dans `mapFragrance()`.

2. **`OilType` peut être une string vide** : quand `OilType: ""`, `??` ne déclenche pas → `typeParfum` vaut `""`. L'UI vérifie `parfum.typeParfum &&` (falsy pour `""`).

3. **`Popularity` et `rating` sont des strings** : `"Very high"`, `"4.19"` — pas des nombres. `popScore()` et `rateScore()` convertissent en nombres 0-100.

4. **Format de réponse variable** : la plupart des endpoints retournent un array `[...]`, mais certains (`/fragrances/similar`, ou avec `?page=X`) retournent `{ data: [...], pagination: {...} }`. Toujours défendre avec `Array.isArray(raw) ? raw : raw?.data ?? []`. Ne pas utiliser `page`.

5. **`Name` inclut parfois la marque** : ex `"Chanel Bleu De Chanel"` → retrait du préfixe dans `mapFragrance()` via `startsWith(brand + ' ')`.

6. **Rate limiting** : max ~10 appels/jour/utilisateur (géré par Cloud Function), max ~200/jour global. L'API Fragella a aussi ses propres limites.

### Fonctions de mapping

**`mapFragrance(raw)` → `FragranceResult`**
- Extrait `Notes.Top/Middle/Base[].name` → `notesTete/Coeur/Fond`
- Calcule `popularityScore` via `popScore()` (Very high=100, High=75, Medium=50, Low=25, Very low=0)
- Calcule `ratingScore` via `rateScore()` (`parseFloat`)
- Génère `id` via `normalize(marque) + '_' + normalize(nom)`
- Capture `fragellaId` depuis `raw['_id']`

**`fragellaToParfum(frag)` → `ParfumSearchResult`**
- Ajoute `source: 'fragella'`
- Calcule `referencePrice = bestPrice * 1.3`

**`normalize(s)` → `string`**
- NFD + strip accents
- lowercase
- `[^a-z0-9]+` → `_`
- Strip leading/trailing `_`
