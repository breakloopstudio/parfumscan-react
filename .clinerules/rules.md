# ParfumScan React — Règles du projet

## §1 — Vue d'ensemble

Projet React Native (Expo 57, RN 0.86), ~30 écrans, design « Luxe malin ». Architecture file-based routing via Expo Router.

---

## §2 — Architecture

```
app/
├── _layout.tsx               # Root : ThemeProvider → GestureHandlerRootView → AuthProvider → AuthGuard → ErrorBoundary
├── index.tsx                 # Splash → redirection (onboarding ou tabs)
├── (tabs)/
│   ├── _layout.tsx           # Stack wrapper (pages empilées sur le pager)
│   ├── index.tsx             # TabPager PagerView 4 pages + DockBar + barre de recherche persistante
│   ├── favorites.tsx         # Page Favoris — moodboard olfactif, grille 2 colonnes, filtres famille, tri, ActionSheet
│   ├── history.tsx           # Journal olfactif — historique des scans groupé par période, cartes avec dots statut, prix, répétitions
│   ├── collection.tsx        # Page Parfumerie (grid, étagères, SOTD, quick-edit) — fichier garde le nom collection pour rétrocompatibilité expo-router
│   ├── scan.tsx              # Scanner overlay (FAB dans le DockBar → push)
│   └── search.tsx            # Overlay recherche plein écran (barre persistante → push)
├── auth/
│   ├── login.tsx             # Connexion email + Google
│   └── register.tsx          # Inscription
├── catalog/[id].tsx          # Fiche détail enrichie (HeroPriceOverlay, CollapsingHeader, StickyBottomBar, pyramide v5, NoteDetailPopup)
├── wardrobe/[parfumId].tsx    # Fiche personnelle (notes, notes, SOTD, étagères)
├── settings.tsx              # Paramètres (notifications, devise, apparence, soutien, légal, compte)
├── legal.tsx                 # Mentions légales
├── privacy.tsx               # Politique de confidentialité
├── onboarding.tsx            # 3 slides swipe + AsyncStorage
└── admin.tsx                 # Administration

src/
├── services/     (12)        # Firebase, Firestore, GPT-4o, user-data, wardrobe, theme-storage, haptics…
├── hooks/        (12)        # useAuth, useScanReducer, useCatalog, useFavoris, useCollection, useWishlist, useScans, useWardrobe, useShelves, useSotd, useNetwork, useDensityPreference
├── contexts/     (1)         # AuthContext (ThemeContext est dans src/theme/)
├── components/   (13)        # ParfumCard, Button, PriceDisplay, SectionHeader, EmptyState, OfflineBanner, AppLoader, ErrorBoundary, AlertPriceToggle, ProfileAvatar, NoteDetailPopup, ActionSheet, ImageViewerPopup
├── features/
│   ├── scan/     (8)         # ScanScreen + 7 sous-états
│   ├── catalog/  (9)         # CatalogPage, OlfactoryPyramid v5, HeroPriceOverlay, CollapsingHeader, StickyBottomBar, BrandCapsules, BrandSheet, CatalogRow, FamilyAmbianceCards
│   ├── wardrobe/ (9)         # WardrobeAddSheet, WardrobeCard, WardrobeGrid, WardrobeQuickSheet, SOTDCard, SOTDPicker, FilterBar, StarRating, ShelfManager
│   └── navigation/ (1)      # DockBar (barre flottante 5 positions + FAB, verre depoli via expo-blur, pulse ring, show/hide au scroll)
├── theme/        (2)         # theme.ts (Theme interface + light/dark), ThemeContext.tsx (useTheme + SystemUI/NavigationBar theming)
├── config/       (3)         # Firebase config, env (variables publiques), index
├── models/       (8)         # Parfum, WardrobeItem, Shelf, SotdEntry, UserFavori, UserScan, UserCollectionItem, UserWishlistItem + interfaces de scan
└── utils/        (5)         # Error translator, translate-note, note-descriptions, normalize, ownership (labels, helpers)
```

> **Note v6.7** : Parfumerie (ex « Garde-robe ») — icône `flask`. Favoris en grille (filtres famille, tri, ActionSheet). Historique groupé par période (Aujourd'hui/Hier/Cette semaine...), scans sauvegardés dans tous les états (no-result, error). `ActionSheet` bottom sheet custom. Dénormalisation `bestPrice`/`referencePrice`/`annee` dans UserFavori/UserScan. Back gesture edge-pan (40px strip gauche) sur fiche détail catalog. SOTDPicker ancré au-dessus de la carte (position absolute, sans Reanimated). `ImageViewerPopup` : tap sur la photo du parfum → popup plein écran. Recherche en grille 2 colonnes (`compact`). Images en `contain` (pas de crop). Parfums similaires triés par popularité + shuffle journalier. Recherche par préfixes (scoring `startsWith` + bonus `reviewCount`).

---

## §3 — Langage

- TypeScript strict, pas de `any` (sauf exceptions justifiées par un commentaire)
- Composants = fonctions React, pas de classes (sauf `ErrorBoundary`)

---

## §4 — Style

- `StyleSheet.create()` autorisé uniquement pour les styles **statiques** (layout pur, pas de couleurs thème). Pour les styles thématiques, utiliser `getStyles(t: Theme)` + `useMemo`.
- Pattern obligatoire : `getStyles(t: Theme)` (fonction pure hors composant) → `useMemo(() => getStyles(theme), [theme])` dans le composant
- 0 `fontWeight` — tout en `fontFamily` (Inter_400Regular, Inter_600SemiBold, etc.)
- Pas de couleurs hardcodées hors du thème (exceptions documentées dans le design guide §2.3 : `#FFFFFF`, `#1F1A2E`, overlays)
- Toujours `useTheme()` dans les composants — jamais `import { theme } from '.../theme/theme'`

---

## §5 — Navigation

- Expo Router file-based
- `router.push()` pour navigation avant, `router.back()` / `router.dismissTo()` pour retour
- `setPendingParfum()` / `consumePendingParfum()` pour le pont inter-écrans scan → détail

---

## §6 — Authentification

- Firebase Auth (email + Google Sign-In)
- Auth optionnelle — l'app fonctionne sans compte, aucune redirection forcée vers `/auth/login`
- `AuthContext` fournit `user`, `authReady`, `isAuthenticated`, `isAdmin`, `login`, `register`, `logout`
- `AuthGuard` bloque uniquement l'accès aux routes `/auth/*` si déjà connecté (`isAuthenticated && inAuth → /(tabs)`)
- Les écrans protégés (admin, actions favoris/collection/wishlist) ont leurs propres vérifications inline

---

## §7 — Scan

- Flux : Idle → Camera → Burst (3 photos) → GPT-4o Vision → `searchParfumFromScan()` (wrapper scan-spécifique avec bonus nom/marque structurés) → Résultats
- `searchParfumFromScan` score : +50 nom exact, +25 nom partiel, +15 marque exacte, +8 marque partielle (écrase le scoring catalogue pour garantir le match exact en tête)
- `ScanResults` affiche les résultats dans l'ordre de pertinence (pas de tri par prix)
- Import galerie : même pipeline, sans permission caméra
- États : `idle | camera | scanning | results | no-result | clarify | error`
- Reducer géré par `useScanReducer`

---

## §8 — Catalogue

- Recherche 100% Firestore (searchParfumsCached, ~25K parfums seed, cache Map + prefix cache, debounce 150ms)
- Navigation par famille olfactive (chips horizontaux)
- Tri : pertinence / prix croissant / prix décroissant
- Dédoublonnage automatique par `marque+nom` normalisé (élimine les doublons Firestore)
- Suggestions personnalisées (si connecté) ou populaires (fallback)

---

## §9 — Design System

> **Guide détaillé** : `.clinerules/design-guide.md` — mapping token→contexte, hiérarchie typo, patterns UI, spec animations, dark mode, checklist conformité.
> En cas de conflit, le guide de design prime sur cette section.

### Palette « Luxe malin »

| Token | Light | Dark | Usage |
|---|---|---|---|
| `background` | `#F8F6F2` | `#0B0712` | Fond principal |
| `surface` | `#FFFFFF` | `#15101E` | Carte, modale |
| `surface2` | `#F3F1ED` | `#1D1728` | Fond secondaire |
| `border` | `#E8E4DE` | `#2A2238` | Bordures |
| `text` | `#1A1520` | `#EDE8F5` | Texte principal |
| `textMuted` | `#8B8580` | `#988EA8` | Texte secondaire |
| `primary` | `#6C3ED9` | `#8B6CF6` | Violet |
| `secondary` | `#C8945A` | `#D4A960` | Doré |
| `deal` | `#0D9488` | `#2DD4BF` | Teal (bonne affaire) |
| `overpriced` | `#E04444` | `#EF4444` | Rouge (trop cher) |
| `fair` | `#D97706` | `#F59E0B` | Orange (prix correct) |

**Polices** : Playfair Display (display) + Inter (body). Pas de 3e police.

### Dark Mode

- **Architecture** : `src/theme/ThemeContext.tsx` — `ThemeProvider` + `useTheme()` hook
- **Double palette** : `src/theme/theme.ts` exporte `lightTheme` et `darkTheme` (objets complets identiques, seuls `colors` et `shadow` diffèrent)
- **Persistance** : `src/services/theme-storage.ts` — AsyncStorage, clé `@parfumscan/theme`
- **3 modes** : `system` (défaut, suit `Appearance`/`useColorScheme()`), `light`, `dark`
- **Pattern composant** : `getStyles(t: Theme)` (fonction pure hors composant) + `const s = useMemo(() => getStyles(theme), [theme])` dans le composant
- **Ombres** : remplacées par des bordures subtiles en dark mode (`borderWidth` + `borderColor` rgba)
- **StatusBar** : gérée automatiquement par `ThemeProvider` (texte clair en dark, foncé en light)
- **Toggle UI** : segmented control 3 segments (Clair / Système / Sombre) dans `app/settings.tsx`
- **Règle** : pas de couleurs hardcodées hors du thème — tout passe par `t.colors.xxx`

---

## §10 — Conventions React

- Toujours `useTheme()` dans les composants — jamais `import { theme } from '.../theme/theme'`
- `export const theme = lightTheme` dans `theme.ts` est un alias de rétrocompatibilité — à ne plus utiliser dans le nouveau code
- Composants = fonctions nommées (pas de `export default function()`, pas de classes sauf `ErrorBoundary`)
- Hooks personnalisés préfixés par `use`
- `useMemo` pour les styles dynamiques quand le thème est impliqué
- Pas de `StyleSheet.create()` au niveau module pour les styles dépendant du thème
- `StyleSheet.hairlineWidth` est autorisé (valeur statique)
- `useCallback` obligatoire sur tous les handlers passés en props à des enfants (évite les re-renders cascade)
- Appels async Firestore protégés par `try/catch` + `console.warn` (couche service) ou `.catch(() => {})` (écrans)

---

## §11 — Firebase

- Auth, Firestore, Storage, Cloud Functions, FCM
- `src/services/firebase.ts` initialise l'app
- `src/services/firestore.ts` — upsert intelligent, `merge: true`, pas de read préalable
- Règles Firestore dans `firestore.rules`

---

## §12 — Catalogue de données

- Catalogue 100% autonome : ~25 100 parfums importés dans Firestore via `scripts/import-firestore.ts`
- `src/utils/normalize.ts` — `normalize()`, `normalizeId()`, `buildSearchKeywords()` pour le cache Firestore
- Règles Firestore : `parfums` en lecture publique, écriture réservée aux admins (vérification `admins/{uid}`)
- Images hébergées sur Firebase Storage : `parfums/{parfumId}/primary.jpg`
- `source: 'seed'` — distingue les données importées des données saisies manuellement (`'manual'`)
- Pas d'API externe pour les données de catalogue

---

## §13 — Tests

- Suite de tests automatisée : Jest 29 + `jest-expo` + mock Firestore in-memory
- 166 tests, 13 suites, ~6s : `npm test` (watch) / `npm run test:ci` (CI + couverture)
- Les fichiers de test sont dans `__tests__/` (hors `src/` et `app/`)
- Les mocks Firebase sont dans `__mocks__/@react-native-firebase/`
- Tests manuels sur émulateur Android (`Pixel_7_Pro`) et device physique
- Build debug : `npx expo run:android`
- Build release : `.\build_release.bat`

---

## §14 — Environnement

- Windows 11, PowerShell 5.1
- ANDROID_HOME = `C:\Users\Pierre-Louis\AppData\Local\Android\Sdk`
- Émulateur AVD : `Pixel_7_Pro`
- Variables d'environnement dans `.env` et `functions/.env`

---

## §15 — Contraintes verrouillées

- ✅ JetBrains Mono retiré — Inter uniquement, `tabular-nums` pour les prix
- ✅ Pas de gamification dans le profil
- ✅ Scan = FAB (pas un onglet)
- ✅ Pas de swipe/drag — menu contextuel "Déplacer vers…"
- ✅ Auth optionnelle (app fonctionne sans login)
- ✅ EUR uniquement en V1
- ✅ 3 boutons distincts sur fiche détail
- ⏸️ Onboarding désactivé (route contournée, index → tabs directement)
- ✅ 0 `fontWeight` — tout en `fontFamily`
- ✅ `allowFontScaling={false}` sur badges/chips, `maxFontSizeMultiplier={1.3}` sur descriptions
- ✅ Cibles tactiles ≥ 44 px (ou `hitSlop` explicite)
- ✅ Appels async protégés (`try/catch` services, `.catch()` écrans)
- ✅ `useCallback` systématique sur handlers passés aux enfants

---

## §16 — Règles cross-platform

- iOS : `Platform.OS === 'ios'` pour les comportements spécifiques (KeyboardAvoidingView padding)
- Android : `Platform.OS === 'android'` + `UIManager.setLayoutAnimationEnabledExperimental(true)`
- SafeAreaView de `react-native-safe-area-context` (pas celui de React Native)
- `expo-camera` pour la caméra (pas `react-native-camera`)
- `expo-image` pour les images (pas `react-native-fast-image`)
