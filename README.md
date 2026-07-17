# 🧴 ParfumScan React Native

<div align="center">

**Scanner de parfums intelligent — Reconnais n'importe quel flacon en une photo**

[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-4630EB?logo=expo)](https://expo.dev)
[![React Native 0.86](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-BaaS-FFCA28?logo=firebase)](https://firebase.google.com)
[![License MIT](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

</div>

---

## ✨ Fonctionnalités

| Module | Description |
|---|---|
| 🎨 **UI/UX « Luxe malin »** | Design system violet profond + doré/ambré + teal, 0 fontWeight, Inter + Playfair Display |
| 📸 **Scan intelligent** | Burst 3 photos → GPT-4o Vision (adaptatif : 70% en 1 appel, 30% en cross-ref 2 photos) → API Fragella |
| 🖼️ **Import galerie** | Photo existante → même pipeline IA, sans permissions supplémentaires |
| 📚 **Catalogue** | Recherche cache-first (Firestore → Fragella), navigation par famille olfactive, tri (prix/pertinence), suggestions personnalisées |
| 🗂️ **Collection** | Parfums possédés, inventaire personnel |
| ⭐ **Wishlist** | Parfums à acheter, alertes prix |
| ❤️ **Favoris** | Coups de cœur, sans obligation d'achat |
| ⚙️ **Paramètres** | Alertes prix, devise EUR, notifs push, mentions légales |
| 🧠 **Fiche détail** | Hub d'actions (3 boutons), PriceDisplay animé, tendance prix, comparateur magasin vs ligne, pyramide olfactive |
| 🚀 **Onboarding** | 3 slides au premier lancement, swipe navigation, sans auth (⏸️ désactivé temporairement) |
| 🔐 **Auth optionnelle** | App utilisable sans compte, login demandé uniquement quand nécessaire |
| 📴 **Mode hors-ligne** | Bannière réseau, contenu dégradé via cache Firestore local |
| 🌓 **Dark Mode** | 3 modes (système/clair/sombre), persistance AsyncStorage, accessible sans authentification, palette « Luxe profond » |

---

## 🏗️ Stack technique

| Catégorie | Technologies |
|---|---|
| **Frontend** | React Native 0.86, Expo SDK 57, Expo Router 57 |
| **Langage** | TypeScript 6.0 (strict) |
| **Navigation** | Expo Router (file-based) + Reanimated pager |
| **Animations** | React Native Reanimated 4, Gesture Handler 2 |
| **Backend** | Firebase Auth, Firestore, Storage, Cloud Functions (europe-west1) |
| **IA** | GPT-4o Vision (analyse photo), Fragella API (catalogue) |
| **Formulaires** | React Hook Form 7 + Zod 4 |

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js ≥ 18
- Firebase CLI (`npm i -g firebase-tools`)
- Expo CLI (`npx expo`)

### Installation

```bash
git clone https://github.com/breakloopstudio/parfumscan-react.git
cd parfumscan-react
npm install

# Cloud Functions (backend)
cd functions && npm install && cd ..
```

### Variables d'environnement

```bash
# Racine — émulateurs Firebase (optionnel)
cp .env.example .env

# Cloud Functions — clés API requis
cp functions/.env.example functions/.env
# Puis édite functions/.env avec tes vraies clés :
#   OPENAI_API_KEY=sk-...
#   FRAGELLA_API_KEY=...
```

### Lancement

```bash
npm start

npm run android   # ou npm run ios

# Émulateurs Firebase locaux
npm run emulators
```

### Build APK (installation sur téléphone)

```bash
# 1. Builder l'APK release
build_release.bat

# 2. L'APK est dans :
#    android/app/build/outputs/apk/release/app-release.apk

# 3. Transférer sur le téléphone (USB, cloud, Telegram...)
# 4. Ouvrir le fichier .apk sur le téléphone → Installer
```

---

## 🌓 Dark Mode

ParfumScan propose un mode sombre complet disponible **sans authentification**.

- **3 modes** : Système (défaut, suit les réglages du téléphone), Clair, Sombre
- **Toggle** : dans Paramètres → Apparence (segmented control Clair / Système / Sombre)
- **Persistance** : la préférence est sauvegardée dans AsyncStorage (`@parfumscan/theme`)
- **Palette « Luxe profond »** : fond violet-noir `#0B0712`, violet `#8B6CF6`, doré `#D4A960`, teal `#2DD4BF`
- **Architecture** : `ThemeProvider` → `useTheme()` hook → `getStyles(t: Theme)` + `useMemo` dans chaque composant
- **StatusBar** : automatiquement adaptée (texte clair en dark, foncé en light)
- **Ombres** : remplacées par des bordures subtiles en mode sombre (les ombres noires sont invisibles sur fond sombre)

---

## 📁 Architecture

```
app/
├── _layout.tsx               # Root : ThemeProvider → AuthProvider → AuthGuard
├── index.tsx                 # Splash → redirection
├── (tabs)/
│   ├── _layout.tsx           # Stack (pages sur le pager)
│   ├── index.tsx             # TabPager Reanimated 4 pages + DockBar flottant
│   ├── favorites.tsx         # Favoris (page standalone)
│   ├── history.tsx           # Historique des scans
│   ├── collection.tsx        # Collection + Wishlist (2 sections)
│   └── scan.tsx              # Scanner overlay (push FAB)
├── auth/
│   ├── login.tsx             # Connexion email + Google
│   └── register.tsx          # Inscription
├── catalog/[id].tsx          # Détail enrichi : PriceDisplay, 3 boutons, tendance prix, pyramide, accords, saisons, occasions
├── settings.tsx              # Paramètres : alertes prix, devise, apparence, déconnexion
├── onboarding.tsx            # 3 slides swipe + AsyncStorage (⏸️ désactivé temporairement)
└── admin.tsx                 # Administration (seed + reset cache + upload)

src/
├── services/     (11)        # Firebase, Firestore (upsert intelligent), Fragella, GPT-4o, user-data, theme-storage…
├── hooks/        (10)        # useAuth, useScanReducer, useCatalog, useFavoris, useCollection, useWishlist, useScans…
├── contexts/     (2)         # AuthContext, ThemeContext
├── components/   (9)         # ParfumCard, Button, PriceDisplay, SectionHeader, EmptyState, OfflineBanner, AlertPriceToggle, AppLoader, ErrorBoundary
├── theme/        (2)         # theme.ts (double palette light/dark), ThemeContext.tsx
├── features/
│   ├── scan/     (8)         # ScanScreen + 7 sous-états
│   ├── catalog/  (2)         # CatalogPage (navigation par famille + tri), OlfactoryPyramid
│   └── navigation/ (1)      # DockBar (barre flottante 5 positions + FAB, indicateur doré)
├── config/       (3)         # Firebase config, env, index
└── utils/        (2)         # Error translator, translate-note (traduction notes FR)

functions/                    # Cloud Functions Firebase
├── src/index.ts              # Analyse GPT-4o Vision
└── lib/                      # Build JavaScript
```

---

## 📱 Flux de scan (v5.7 — burst adaptatif)

```
Idle → [Tap Scanner] → CameraView → [Capture]
  → Burst 3 photos (~1s, haptics×3) → GPT-4o Vision (photo 1, detail:auto → retry high si vide)
  → Confidence haute ? → Fragella → batchCacheParfums() → Résultats (~2s)
  → Confidence basse ? → analyzeMultipleImages (photos 2+3, cross-ref) → Fragella → Résultats (~4s)
  → Résultat → Tap parfum → setPendingParfum() → dismissTo tabs
      → TabPager consume + re-set → push /catalog/:id
      → Fiche détail consumePendingParfum() → données enrichies affichées
  → Résultat → Voir catalogue → setPendingCatalogQuery() + router.back()

Import galerie : expo-image-picker → 1 photo → pipeline burst (single-photo path)
```

> **Pont inter-écrans** : `setPendingParfum()` stocke les données en mémoire,
> `consumePendingParfum()` les lit une seule fois. Le TabPager re-stocke
> immédiatement après consommation pour que la fiche détail les reçoive.

### Fiche détail enrichie

La page `app/catalog/[id].tsx` affiche les métadonnées de l'API Fragella :
- Longévité & Sillage (jauges visuelles avec labels)
- Prix, réduction, lien affilié
- Pyramide olfactive (timeline interactive avec mini-pyramide 3 triangles superposes vert/ambre/violet 50x36px, pastilles differenciees ○/●/◆, accordeon exclusif Reanimated, coeur ouvert par defaut, traduite FR)
- Accords principaux (barres triees par score decroissant - traduits en francais)
- Saisonnalite
- Occasions
- Badge famille olfactive (traduit FR)
- Notes capitalisees (1ere lettre majuscule)

> **Indicateur dev** : pastille en haut a droite (visible uniquement en __DEV__)
> - Vert = live API Fragella (bridge)
> - Bleu = cache Firestore
> - Violet = donnees admin (seed/manual)
> - Rouge = source inconnue (fallback)

## 📚 Flux de recherche (cache-first v5.3)

```
Saisie ≥ 3 caractères → useCatalog() → debounce 800ms
  1. searchParfumsCached(query) → Firestore (gratuit, score = tokens + popularité + exact match)
  2. Si < 5 résultats → searchFragranceByQuery() → API payante
   3. batchCacheParfums(results) → Firestore (batch.set {merge:true}, sans read préalable)

Avantage : chaque recherche n'est payée qu'une fois,
tous utilisateurs confondus. Le score intègre la popularité
→ les parfums populaires remontent naturellement.

⚠️ L'endpoint `/fragrances?search=` de Fragella retourne TOUTES les métadonnées
  (longévité, sillage, saisonnalité, occasions, accords, etc.) — identique au détail.
  → `fragellaId` = champ `_id` de l'API (⚠️ underscore, pas `Id`/`id`/`ID`).
  → La fiche détail utilise `getFragranceById()` en enrichissement si `fragellaId` disponible.
  → Les données enrichies sont mergées dans Firestore (upsert intelligent).
  → Si `fragellaId` absent → skip enrichissement.
```

### Catalogue idle (v5.7)

À l'ouverture (sans recherche) :
- Si authentifié → `getPersonalizedSuggestions(uid)` : scoring client-side basé sur l'historique de scans/favoris (familleOlactive×3 + marque×2 + popularityScore/20), exclut les parfums déjà vus. Section "Pour vous".
- Fallback → `getPopularParfums(30)` → Firestore (triés par popularityScore desc), shuffle journalier déterministe (Lehmer RNG). Section "Parfums populaires".
- Affichage en grille 2 colonnes avec `ParfumCard compact`.

Les miniatures flacon (44×44) sont affichées dans les deux onglets via le CDN Fragella
(gratuit, pas d'appel API). Fallback automatique sur icône scan/cœur si l'image échoue.
Le bouton unfavorite utilise un cœur avec animation heartbeat (scale bounce 250ms).


### Favoris & Historique enrichis

Les documents `UserFavori` et `UserScan` stockent `imageUrl` et `familleOlactive`
dénormalisés → affichage direct sans appel API Firestore ni Fragella.

---
## v6.2 — Bugfixes & Polish (17/07/2026)

- **ProfileAvatar** : composant partagé (photo Google ou initiale), dédupliqué sur Favoris/Historique/Collection
- **ThemeContext** : fix crash si AsyncStorage échoue (écran blanc → fallback system)
- **DockBar** : ombres migrées vers `t.shadow` (invisibles en dark mode → bordures adaptatives)
- **EmptyState** : typage icônes corrigé (`as never` → `as const satisfies`)
- **Favoris/Collection** : guards `uid` ajoutés sur les menus contextuels (plus de `!` non-null)
- **History** : `formatScanDate` réécrit avec type guards corrects
- **Index** : `Gesture.Pan()` memoïsé (`useMemo`) — plus de recréation à chaque render
- **Navigation** : `router.navigate` → `router.replace` sur les CTA EmptyState (évite l'empilement)

## v6.0 — Navigation Rework + Dark Mode (17/07/2026)

- **Dock flottant 5 positions** : barre verre dépoli, indicateur doré animé, FAB scan central avec pulse ring
- **4 pages** : Pager horizontal (Catalogue, Favoris, Historique, Collection) remplaçant l'ancien Catalog↔Profil
- **ProfilePage supprimé** — son contenu dispatché dans 3 écrans dédiés avec avatar header → settings
- **Dark Mode** : 3 modes (système/clair/sombre), palette « Luxe profond », persistance AsyncStorage, accessible sans auth
- **Design System** : 6 nouveaux composants (Button, PriceDisplay, SectionHeader, EmptyState, OfflineBanner, AlertPriceToggle)
- **Atomic moves** : menu contextuel "Déplacer vers…" (moveToCollection, moveToWishlist, moveFavori) en batch Firestore
- **New hooks** : `useFavoris`, `useCollection`, `useWishlist`, `useScans` — Firestore temps réel
- **0 fontWeight** : migration complète de tout le code vers `fontFamily`
- **Firebase modular API** : migration namespaced → modular (v25+)
- **Onboarding** : 3 slides swipe au 1er lancement, AsyncStorage `@parfumscan_onboarding_done` (⏸️ désactivé temporairement)

## v5.7 — Burst + Galerie + Personnalisation (16/07/2026)

- **Burst adaptatif** : 3 photos en rafale, 70% des scans résolus en 1 appel GPT-4o (~2s), 30% en 2 appels cross-ref (~4s)
- **Import galerie** : `expo-image-picker` → même pipeline IA, sans permissions supplémentaires
- **Catalogue personnalisé** : scoring client-side (famille×3 + marque×2 + popularité/20), exclut déjà vus, section "Pour vous"
- **Profil** : favoris/historique toujours montés (display:none au lieu de conditionnel), switch instantané sans rechargement d'images
- **UI** : animateShutter désactivé sur CameraView (plus de flash à la capture), galerie en bouton outline sous le CTA
- **Cloud Function** : `analyzePerfumeImage` supporte `imagesBase64[]` pour le cross-referencing multi-photo

## v5.5 — Bugfixes (16/07/2026)

- **C4** `app/catalog/[id].tsx` — `consumePendingParfum()` sorti du render (`useRef(fn())` → `useState(() => fn())`)
- **C5** `src/services/firestore.ts` — `onParfums` utilise `orderBy('updatedAt')` au lieu de `createdAt` (docs batch-cachés n'avaient pas de `createdAt`)
- **H1** `app.json` — NDK corrigé (`30.x` inexistant → `27.0.12077973` LTS)
- **H2** `app.json` — plugin `expo-build-properties` en doublon supprimé
- **H8** `src/features/profile/ProfilePage.tsx` — FavHeart migré de `Animated` natif vers Reanimated

---

## 📄 Licence

MIT — voir [LICENSE](./LICENSE)
