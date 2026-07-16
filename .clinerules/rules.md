# ParfumScan React — Rules (v5.7)

> Référence des modèles et API : `.clinerules/reference.md`
> Environnement & commandes : `AGENTS.md` (racine)

## 1. Stack

react-native 0.86.0 · expo 57 · expo-router 57 · react 19.2.3 · typescript ~6.0
@react-native-firebase/* 25 · expo-camera 56 · expo-haptics 56 · expo-image 56 · expo-splash-screen 56
react-native-gesture-handler 2.32 · react-native-reanimated 4.5
react-native-safe-area-context 5.7 · react-native-screens 4.25 · react-native-worklets 0.10
@react-native-vector-icons/ionicons 13 · @react-native-community/netinfo 12
react-hook-form 7 · zod 4

## 2. Architecture

```
app/
├── _layout.tsx              ← GestureHandler + AuthProvider + AuthGuard (auth optionnelle) + ErrorBoundary
├── index.tsx                ← Splash → redirection
├── (tabs)/
│   ├── _layout.tsx          ← Stack layout (index + scan)
│   ├── index.tsx            ← TabPager Reanimated (Catalog ↔ Profil)
│   └── scan.tsx             ← Scanner overlay (push depuis FAB)
├── auth/login.tsx           ← Styles inlinés
├── auth/register.tsx        ← Styles inlinés
├── catalog/[id].tsx         ← Fiche détail « Luxe malin » (hub d'actions, PriceDisplay, 3 boutons)
├── settings.tsx             ← Paramètres (alertes prix, devise, notifs, compte)
├── onboarding.tsx           ← 3 slides avec PanGesture + AsyncStorage
└── admin.tsx                ← Seed + upload

src/
├── services/   (9)  ← firebase, firestore, user-data, fragella, openai-vision, haptics, fcm, catalog-bridge, storage
├── hooks/      (8)  ← useAuth, useScanReducer, useFavoris, useScans, useCatalog, useNetwork, useCollection, useWishlist
├── contexts/   (1)  ← AuthContext
├── components/ (9)  ← ParfumCard, Button, PriceDisplay, SectionHeader, EmptyState, OfflineBanner, AppLoader, ErrorBoundary, AlertPriceToggle
├── features/scan/ (8)     ← ScanScreen + 7 sous-états (Camera, Idle, Loading, Clarify, Results, NoResult, Error)
├── features/catalog/ (2)  ← CatalogPage, OlfactoryPyramid
├── features/profile/ (1)  ← ProfilePage (3 listes : Collection, Wishlist, Favoris + historique + profil olfactif)
├── models/     (7)  ← Parfum, ParfumSearchResult, UserFavori, UserScan, ScanResult, UserCollectionItem, UserWishlistItem
├── theme/      (1)  ← theme.ts (63 tokens → 26 couleurs « Luxe malin » + rétrocompatibilité)
├── config/     (3)  ← firebase.config, env, barrel
└── utils/      (2)  ← error-translator, translate-note
```

## 3. Routes

| Path | Page | Layout |
|---|---|---|
| `/` | Splash → redirect | - |
| `/(tabs)` | TabPager (Catalog ↔ Profil) | Stack + Reanimated pager |
| `/(tabs)/scan` | Scanner overlay | Stack (push depuis FAB) |
| `/catalog/[id]` | Détail parfum enrichi | Stack |
| `/auth/login`, `/auth/register` | Auth | Stack |
| `/settings` | Paramètres | Stack (slide_from_right) |
| `/onboarding` | Onboarding 3 slides | Stack (fade) |
| `/admin` | Administration | Stack (isAdmin) |

## 4. Navigation Flow

```
Pager Catalog ↔ Profil  ← swipe horizontal Reanimated (opacity + scale crossfade)
        |
        +-- FAB → router.push('/(tabs)/scan')
        |              |
        |   Scan Results → batchCacheParfums() → Tap parfum → dismissTo tabs + push detail
        |              |
        |   Scan NoResult → setPendingCatalogQuery() + router.back()
        |
        +-- CatalogPage lit consumePendingCatalogQuery() → recherche auto
              → Cache-first : Firestore gratuit
              → Cache miss  : Fragella API payante
              → Auto-cache  : batchCacheParfums()

        Profil favoris : goToDetail() avec données dénormalisées + miniature flacon → 0 appel API
        Profil historique : miniature flacon (CDN Fragella) + marque/nom séparés
```

## 5. Scan Flow (useScanReducer)

```
idle → [tap Scanner] → camera (CameraView) → [capture] → burst 3 photos (~1s, haptics×3)
  → analyzeImage (photo 1, GPT-4o, detail:auto → retry high si vide)
  → si low-confidence → analyzeMultipleImages (photos 2+3, cross-ref)
  → clarify (si low-confidence) | searchAndShow (Fragella)
  → results → [Tap parfum] → setPendingParfum() + dismissTo tabs → push /catalog/:id
  → results → [Voir catalogue] → setPendingCatalogQuery() + router.back()
  | no-result → [Chercher] → setPendingCatalogQuery() + router.back()
  | error → [Réessayer] → reset
```

Burst adaptatif : 70% des scans résolus en 1 appel GPT-4o (~2s), 30% en 2 appels (~4s).
Reducer via `useScanReducer() → { state, dispatch }` — dispatch direct, pas de wrappers.
Import depuis galerie : `expo-image-picker` → 1 photo → pipeline burst (single-photo path).

## 6. Catalog Flow (cache-first)

Saisie ≥ 3 caractères → `useCatalog()` → debounce 800ms →
  1. `searchParfumsCached(query)` → Firestore (gratuit, cache partagé, score = tokens + popularité + exact match)
  2. Si < 5 résultats → `searchFragranceByQuery()` → API payante
  3. `batchCacheParfums(results)` → Firestore (pour la prochaine fois)

Idle : si authentifié → `getPersonalizedSuggestions(uid)` → Firestore (scoring : famille×3 + marque×2 + popularité/20, exclut déjà vus). Fallback `getPopularParfums(30)` → shuffle journalier déterministe (Lehmer RNG), slice(0,8) → grille 2 colonnes ParfumCard compact.
Depuis le scan : `consumePendingCatalogQuery()` → recherche automatique.

## 7. Fiche détail parfum

Page `app/catalog/[id].tsx` — auto-suffisante :
- Bridge (preview) → Firestore always → `getFragranceById` → `searchFragranceByQuery`, `id` normalisé (`Array.isArray`)
- Sections conditionnelles (affichées uniquement si data) :
  - Badges : famille olfactive, année, genre, type (EDT/EDP/Extrait)
  - Longévité & Sillage : jauges visuelles avec labels FR
  - Prix & offre : meilleur prix, % réduction, lien affilié
  - Accords principaux : barres horizontales triées par score décroissant
  - Saisonnalité : barres triées par score, couleurs saisonnières
  - Occasions : barres triées par score
  - Pyramide olfactive : timeline interactive, accordéon exclusif Reanimated, mini-pyramide 3 triangles, composant `OlfactoryPyramid`
  - Favori : toggle cœur avec cache automatique
- Enrichissement : si fiche chargée sans seasonRanking/occasionRanking ET fragellaId → `getFragranceById(fragellaId)` → merge + persist
- `docToParfum()` explicite — chaque champ mappé nommément (pas de spread `...data`)

## 8. Auth

- **Auth optionnelle** : l'app fonctionne sans compte (scan, catalogue, fiche détail). Login proposé uniquement quand nécessaire (ajout favoris/wishlist/collection).
- AuthGuard dans `_layout.tsx` : onboarding et écrans publics exemptés, redirection login uniquement si action qui nécessite auth
- Timeout 3s sur authReady
- isAdmin vérifié via `getDoc(doc(getFirestore(), 'admins', uid))`
- Google Sign-In : `GoogleSignin.configure()` + `signIn()` + `signInWithCredential()`

## 9. Design System

- Design system « Luxe malin » : violet profond `#6C3ED9`, doré/ambré `#C8945A`, teal `#0D9488`, fond beige craie `#F8F6F2`
- **Toujours** `theme.colors.xxx` — pas de couleurs hardcodées
- **0 `fontWeight`** — tout en `fontFamily` (PlayfairDisplay ou Inter avec variantes de poids)
- iOS : `fontFamily` sans `fontWeight` (les Google Fonts incluent le poids)
- Edge-to-edge Android : status/nav bar transparentes, `WindowCompat.setDecorFitsSystemWindows(false)`
- `edges={['top', 'bottom']}` sur SafeAreaView dans pages d'un pager
- `GestureHandlerRootView` : `backgroundColor: theme.colors.background` (fond derrière barres transparentes)
- Cartes dans le pager : PAS de fond opaque + ombre → `borderWidth + borderColor` (outline)

## 10. Conventions — Must Do

1. **Composants = fonctions React** — `export default function`, pas de classes (sauf ErrorBoundary)
2. **TypeScript strict** — éviter `any`, utiliser des types précis
3. **Props typées** — `interface Props { ... }`
4. **Services = `src/services/`** — imports ES6 normaux, PAS de suffixe `.service`
5. **Hooks = `src/hooks/`** — y compris `useNetwork.ts`
6. **StyleSheet.create() au niveau module** — JAMAIS après le `return`
7. **async/await + try/catch** — pas de `.then()`
8. **Cleanup dans useEffect** — retour de fonction pour `onSnapshot`, listeners, timers
9. **Expo Router** — `Link`, `useRouter`, `useLocalSearchParams`, `useSegments`, `useFocusEffect`
10. **SafeAreaView** — importer de `react-native-safe-area-context`, PAS de `react-native`
11. **useReducer** — exposer `dispatch` directement, pas de wrappers `useCallback`
12. **Timers/Animations** — `useEffect` avec cleanup, PAS `useRef` + `setTimeout` manuels
13. **Reanimated** — `useSharedValue` (thread UI) + `useAnimatedStyle`, pas d'`Animated` natif
14. **Gesture-driven UI** — `useState` (réactif) + `useSharedValue` (thread UI, gesture callbacks)
15. **Ponts inter-écrans** — service module-level `setPending*/consumePending*` (max 3 ; au-delà → Zustand)
16. **Error Boundary** — wrapper dans `_layout.tsx`
17. **File naming** — PascalCase pour composants, camelCase pour hooks/services/utils
18. **Import order** — React → RN → Expo → libs → `~/` locaux
19. **`ParfumSearchResult` ≠ `Parfum`** — pas de `as Parfum` sur des objets incomplets
20. **`undefined` interdit dans Firestore** — tous les champs optionnels doivent avoir `?? null`

## 11. Patterns

### Service (import ES6 standard, API modulaire v25+)
```typescript
import { getFirestore, collection, doc, query, where, getDocs, writeBatch } from '@react-native-firebase/firestore';
// Pas de require() lazy-loading — on utilise des development builds
// ⚠️ API modulaire uniquement : getFirestore() au lieu de firestore(), collection() au lieu de .collection(), etc.
// Types : DocumentSnapshot, QuerySnapshot, DocumentReference (plus de FirebaseFirestoreTypes)
```

### Service avec Cloud Functions (⚠️ spécifier la région, API modulaire v25+)
```typescript
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

// Toujours spécifier la région ! getFunctions() seul = us-central1 par défaut
// Les Cloud Functions sont déployées en europe-west1
function fn() {
  return getFunctions(getApp(), 'europe-west1');
}

export async function monService(param: string) {
  const funcs = fn();
  // NE PAS utiliser le shorthand { nomProp } si la variable a un nom différent
  const result = await httpsCallable(funcs, 'nomFonction')({ nomProp: param });
  return result.data;
}
```

### Pont inter-écrans (module-level)
```typescript
// Max 3 ponts. Au-delà → Zustand (1 Ko)
let _pending: string | null = null;
export function setPending(q: string) { _pending = q; }
export function consumePending(): string | null { const q = _pending; _pending = null; return q; }
```

### Hook (stateful)
```typescript
export function useFavoris(uid: string | null) {
  const [data, setData] = useState<UserFavori[]>([]);
  useEffect(() => { if (!uid) { setData([]); return; } return onFavoris(uid, setData); }, [uid]);
  return { data, ... };
}
```

### Reducer (dispatch direct)
```typescript
const { state, dispatch } = useScanReducer();
dispatch({ type: 'OPEN_CAMERA' }); // pas de wrapper useCallback
// dispatch est stable (garanti par React). Pour ~10 actions,
// les action creators ajoutent du boilerplate sans bénéfice.
```

### Timer / Animation (useEffect + cleanup)
```typescript
useEffect(() => {
  if (state.kind !== 'scanning') return;
  const t1 = setTimeout(() => dispatch({ type: 'STEP_1' }), 1000);
  const t2 = setTimeout(() => { dispatch({ type: 'STEP_2' }); /* analyse */ }, 2500);
  return () => { clearTimeout(t1); clearTimeout(t2); };
}, [state.kind]);
```

### Pager / Gesture-driven (useState + useSharedValue)
```typescript
const [activePage, setActivePage] = useState(0);
const currentPage = useSharedValue(0);

// width dans useSharedValue pour les worklets Reanimated
const pageWidth = useSharedValue(windowWidth || 400);
useEffect(() => { if (windowWidth > 0) pageWidth.value = windowWidth; }, [windowWidth]);

// Éviter interpolate() → préférer math simple. Diviseur = w (pas w*0.6)
const catStyle = useAnimatedStyle(() => {
  const x = translateX.value;
  const w = pageWidth.value;
  const progress = Math.max(-1, Math.min(1, 1 + x / w));
  return {
    transform: [{ translateX: x }, { scale: 0.94 + progress * 0.06 }],
    opacity: Math.max(0, progress), // 0→1 sur 100% du swipe
  };
});

const proStyle = useAnimatedStyle(() => {
  const x = translateX.value + pageWidth.value;
  const w = pageWidth.value;
  const progress = Math.max(-1, Math.min(1, 1 - x / w));
  return {
    transform: [{ translateX: x }, { scale: 0.94 + progress * 0.06 }],
    opacity: Math.max(0, progress),
  };
});

if (windowWidth === 0) return <View style={s.root} />;
```

### Focus-driven (useFocusEffect)
```typescript
// Pour réagir au retour de focus (ex: dismissTo) — PAS useEffect([], [])
useFocusEffect(useCallback(() => {
  const data = consumePendingSomething();
  if (data) { /* ... */ }
  return () => { /* cleanup */ };
}, []));
```

## 12. Cache Strategy

```
Recherche catalogue:
  1. searchParfumsCached(query) → Firestore (gratuit)
  2. Si < 5 résultats → searchFragranceByQuery() → API payante
  3. batchCacheParfums(results) → Firestore (batch.set {merge:true})

Scan:
  1. searchFragrance() → API payante
  2. batchCacheParfums(results) → Firestore (cache immédiat)
  3. saveScan() avec imageUrl + familleOlactive dénormalisés

Favori:
  1. cacheParfumFromSearch() → Firestore (set avec tous les champs)
  2. addFavori() avec nom, marque, imageUrl, familleOlactive dénormalisés

Enrichissement:
  1. Si fiche détail sans seasonRanking/occasionRanking ET fragellaId dispo
  2. → getFragranceById(fragellaId) → endpoint /fragrances/:id
  3. → merge métadonnées manquantes, cacheParfumFromSearch() → persist
  4. Si fragellaId absent → skip

Catalogue idle:
  → getPopularParfums(30) → Firestore (triés popularityScore desc)
  → Shuffle journalier déterministe, slice(0,8) → grille 2 colonnes ParfumCard compact
```

## 13. Firestore Rules

- `onSnapshot()` pour temps réel → retourne cleanup
- `getDoc()` / `getDocs()` pour one-shot
- `undefined` interdit → filtrer avant `.add()` / `.set()` (tous champs optionnels → `?? null`)
- `batch.set()` avec `{ merge: true }` → pas de `docRef.get()` préalable (évite `[firestore/not-found]`)
- `batchCacheParfums()` utilise `{merge:true}`, pas de read préalable. `createdAt` défini uniquement par `cacheParfumFromSearch` (1ère insertion)
- `cacheParfumFromSearch()` wrappe `docRef.get()` dans try/catch (si throw → traité comme inexistant)
- Collections : `parfums`, `users/{uid}/favoris`, `users/{uid}/scans`, `admins`, `rateLimits`
- `deleteAllCachedParfums()` pour reset complet du cache (batch paginé)

## 14. Types

- `ParfumSearchResult` — résultats Fragella (pas de `createdAt`/`updatedAt`, source = `'fragella'`)
- `Parfum` — documents Firestore (avec `createdAt`/`updatedAt`)
- `FragranceResult` — brut API Fragella, mappé vers `ParfumSearchResult` via `fragellaToParfum()`
- `UserFavori` — dénormalisé (nom, marque, imageUrl, familleOlactive)
- `UserScan` — dénormalisé (imageUrl, familleOlactive), `scannedAt: Date | FirestoreDate` (duck typing)
- `ScanResult` — GPT-4o, local, non stocké

Pas de `as Parfum` sur des objets incomplets → toujours utiliser `docToParfum()` ou `fragellaToParfum()`.

## 15. Build & Setup

### Développement
```bash
# Android : script tout-en-un (recommandé)
start.bat

# Android : manuel
npx expo run:android

# iOS : manuel (macOS + Xcode requis)
npx expo run:ios
```

### Expo Go (mode dégradé — Firebase OFF)
```bash
npx expo start
```

### Build Release
```bash
# Android : build local
.\build_release.bat
# → APK : android/app/build/outputs/apk/release/app-release.apk

# iOS : build nécessite macOS + Xcode ou EAS Build cloud
npx expo run:ios --configuration Release
```
→ APK : `android/app/build/outputs/apk/release/app-release.apk`

### Téléphone (USB)
```bash
adb devices
npx expo run:android                                          # build + install direct
adb install android/app/build/outputs/apk/release/app-release.apk  # APK existant
```

### Cloud Functions
```bash
npm run functions:build
npm run functions:deploy   # → europe-west1
```

### Émulateur
```powershell
Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList "-avd Pixel_7_Pro"
adb wait-for-device
adb shell getprop sys.boot_completed  # doit = "1"
```

⚠️ **PowerShell** : ExecutionPolicy restreinte → utiliser `cmd /c` ou `Start-Process` pour lancer expo. Pas de `&&` dans `cmd /c` depuis PowerShell — utiliser un `.bat` ou `Start-Process`.

⚠️ **Expo Go vs Dev Build** : Expo Go = Firebase/Fragella/GPT-4o Vision/FCM **non disponibles**, auth bypassée. Dev Build (`npx expo run:android`) = modules natifs complets, Fast Refresh après le 1er build (~3-5 min).

⚠️ **Worklets bundle mode** : activé dans `react-native.config.js` pour contourner la régression mémoire Reanimated + Hermes V1 (+25-30%). Ne pas supprimer ce fichier. Voir https://docs.swmansion.com/react-native-worklets/docs/bundleMode/

## 16. Cross-Platform (iOS / Android)

### Code unique, comportement adapté
- **Tout le code est dans `app/` et `src/`** — pas de dossiers séparés par plateforme
- Pas de fichiers `*.ios.*` / `*.android.*` sauf cas extrême
- `Platform.OS` / `Platform.select()` au cas par cas (actuellement 4 usages)

### Différences clés par plateforme

| Fonctionnalité | iOS | Android |
|---|---|---|
| **Swipe-back détail** | Natif `UINavigationController` (bord gauche, reveal parfait) | Custom `Gesture.Pan()` full-screen via Reanimated |
| **TabPager swipe** | Identique (Reanimated custom) | Identique (Reanimated custom) |
| **Google Sign-In** | `iosClientId` + URL scheme callback | `hasPlayServices()` + `webClientId` |
| **Notifications** | APNs obligatoire (`registerDeviceForRemoteMessages`) | FCM direct |
| **SafeArea** | Notch / Dynamic Island via `useSafeAreaInsets()` | Status bar via `useSafeAreaInsets()` |
| **Polices** | `fontFamily` uniquement (pas de `fontWeight`) | Tolère `fontWeight` |
| **Ombres** | `shadowColor/Offset/Opacity/Radius` uniquement | `elevation` + `shadow*` |
| **KeyboardAvoidingView** | `behavior="padding"` | `behavior="height"` |

### Règles cross-platform
- **`useSafeAreaInsets()` partout** — jamais de `paddingTop: 60` en dur
- **`fontFamily` sans `fontWeight`** — les variantes Google Fonts incluent déjà le poids
- **Ombres : toujours les 4 props iOS** (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`), `elevation` en bonus Android
- **APIs Android-only** (ex: `hasPlayServices`) → wrapper dans `if (Platform.OS === 'android')`

### Configuration iOS requise (app.json)
```json
"ios": {
  "googleServicesFile": "./GoogleService-Info.plist",
  "infoPlist": {
    "CFBundleURLTypes": [{ "CFBundleURLSchemes": ["com.googleusercontent.apps.XXX"] }],
    "UIBackgroundModes": ["remote-notification"],
    "NSCameraUsageDescription": "...",
    "NSPhotoLibraryUsageDescription": "..."
  }
}
```

### Variables d'environnement
- `EXPO_PUBLIC_FRAGELLA_API_KEY` — les deux plateformes
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — iOS uniquement (Google Sign-In)

## 17. Tests (si applicable)

- **Unitaires** : `scanReducer`, `fragellaToParfum`, `translateNote`, `normalize`, `translateFirebaseError`
- **Composants** : React Native Testing Library
- **E2E** : Detox ou Maestro pour flows critiques (scan, auth, catalogue)
