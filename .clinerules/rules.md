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
│   ├── index.tsx             # TabPager Reanimated 4 pages + DockBar (Catalog, Favoris, Historique, Collection)
│   ├── favorites.tsx         # Page Favoris (standalone, appelée depuis pager + Stack)
│   ├── history.tsx           # Page Historique des scans
│   ├── collection.tsx        # Page Collection + Wishlist (2 sections)
│   └── scan.tsx              # Scanner overlay (FAB dans le DockBar → push)
├── auth/
│   ├── login.tsx             # Connexion email + Google
│   └── register.tsx          # Inscription
├── catalog/[id].tsx          # Fiche détail enrichie
├── settings.tsx              # Paramètres (notifications, devise, apparence, compte)
├── onboarding.tsx            # 3 slides swipe + AsyncStorage
└── admin.tsx                 # Administration

src/
├── services/     (10)        # Firebase, Firestore, Fragella (via Cloud Function), GPT-4o, user-data, theme-storage, haptics…
├── hooks/        (8)         # useAuth, useScanReducer, useCatalog, useFavoris, useCollection, useWishlist, useScans, useNetwork
├── contexts/     (1)         # AuthContext (ThemeContext est dans src/theme/)
├── components/   (9)         # ParfumCard, Button, PriceDisplay, SectionHeader, EmptyState, OfflineBanner, AppLoader, ErrorBoundary, AlertPriceToggle
├── features/
│   ├── scan/     (8)         # ScanScreen + 7 sous-états
│   ├── catalog/  (2)         # CatalogPage, OlfactoryPyramid
│   └── navigation/ (1)      # DockBar (barre flottante 5 positions + FAB, verre depoli via expo-blur, pulse ring, show/hide au scroll)
├── theme/        (2)         # theme.ts (Theme interface + light/dark), ThemeContext.tsx (useTheme + export Theme)
├── config/       (3)         # Firebase config, env (variables publiques), index
└── utils/        (2)         # Error translator, translate-note
```

> **Note v6.1** : `src/features/profile/ProfilePage.tsx` a été supprimé en v6.0. La cle API Fragella est maintenant côté serveur uniquement (Cloud Function `searchFragrance`), le client appelle via `httpsCallable`. Les doc IDs utilisateur (favoris, collection, wishlist, priceAlerts) sont déterministes (`= parfumId`).

---

## §3 — Langage

- TypeScript strict, pas de `any` (sauf exceptions justifiées par un commentaire)
- Composants = fonctions React, pas de classes (sauf `ErrorBoundary`)

---

## §4 — Style

- `StyleSheet.create()` interdit au niveau module pour les styles thématiques
- Pattern obligatoire : `getStyles(t: Theme)` → objet plain retourné dans un `useMemo`
- 0 `fontWeight` — tout en `fontFamily` (Inter_400Regular, Inter_600SemiBold, etc.)
- Pas de couleurs hardcodées hors du thème
- Toujours `useTheme()` dans les composants — jamais `import { theme } from '.../theme/theme'`

---

## §5 — Navigation

- Expo Router file-based
- `router.push()` pour navigation avant, `router.back()` / `router.dismissTo()` pour retour
- `setPendingParfum()` / `consumePendingParfum()` pour le pont inter-écrans scan → détail

---

## §6 — Authentification

- Firebase Auth (email + Google Sign-In)
- Auth optionnelle — l'app fonctionne sans compte
- `AuthContext` fournit `user`, `authReady`, `isAuthenticated`, `isAdmin`, `login`, `register`, `logout`
- L'onboarding est exempté de l'AuthGuard
- Les routes `/auth/*` sont inaccessibles si déjà connecté

---

## §7 — Scan

- Flux : Idle → Camera → Burst (3 photos) → GPT-4o Vision → Fragella → Résultats
- Import galerie : même pipeline, sans permission caméra
- États : `idle | camera | scanning | results | no-result | clarify | error`
- Reducer géré par `useScanReducer`

---

## §8 — Catalogue

- Recherche cache-first : Firestore → Fragella (si < 5 résultats)
- Navigation par famille olfactive (chips horizontaux)
- Tri : pertinence / prix croissant / prix décroissant
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

---

## §11 — Firebase

- Auth, Firestore, Storage, Cloud Functions, FCM
- `src/services/firebase.ts` initialise l'app
- `src/services/firestore.ts` — upsert intelligent, `merge: true`, pas de read préalable
- Règles Firestore dans `firestore.rules`

---

## §12 — API Fragella (via Cloud Function)

- `src/services/fragella.ts` — appelle la Cloud Function `searchFragrance` (via `httpsCallable`)
- La clé API Fragella est **côté serveur uniquement** (dans `functions/.env`)
- `searchFragrance`, `searchFragranceByQuery`, `getFragranceById`, `getSimilarFragrances`
- Cache Firestore automatique via `batchCacheParfums`
- `fragellaId` = champ `_id` (⚠️ underscore)
- Auth optionnelle pour les recherches (limité à 5/jour en anonyme, 10/jour connecté)

---

## §13 — Tests

- Pas de suite de tests automatisée actuellement
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
- ✅ Onboarding au 1er lancement, sans demande de compte
- ✅ 0 `fontWeight` — tout en `fontFamily`

---

## §16 — Règles cross-platform

- iOS : `Platform.OS === 'ios'` pour les comportements spécifiques (KeyboardAvoidingView padding)
- Android : `Platform.OS === 'android'` + `UIManager.setLayoutAnimationEnabledExperimental(true)`
- SafeAreaView de `react-native-safe-area-context` (pas celui de React Native)
- `expo-camera` pour la caméra (pas `react-native-camera`)
- `expo-image` pour les images (pas `react-native-fast-image`)
