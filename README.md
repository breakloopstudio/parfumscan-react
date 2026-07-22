# 🧴 ParfumScan React Native

<div align="center">

**Scanner de parfums intelligent — Reconnais n'importe quel flacon en une photo**

[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-4630EB?logo=expo)](https://expo.dev)
[![React Native 0.86](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-BaaS-FFCA28?logo=firebase)](https://firebase.google.com)
[![Tests 166](https://img.shields.io/badge/Tests-166%20passed-brightgreen)](https://github.com/breakloopstudio/parfumscan-react)
[![License MIT](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

</div>

---

## ✨ Fonctionnalités

| Module | Description |
|---|---|
| 🎨 **UI/UX « Luxe malin »** | Design system violet profond + doré/ambré + teal, 0 fontWeight, Inter + Playfair Display |
| 📸 **Scan intelligent** | Burst 3 photos → GPT-4o Vision (adaptatif : 70% en 1 appel, 30% en cross-ref 2 photos) → searchParfumsCached() |
| 🖼️ **Import galerie** | Photo existante → même pipeline IA, sans permissions supplémentaires |
| 📚 **Catalogue** | Catalogue ~25K parfums (seed Firestore), navigation par familles (rangées éditoriales), capsules marques (top 10), grille 3 densités + persistance, recherche 100% Firestore avec cache + prefix cache |
| 🧪 **Parfumerie** | Parfums possédés/souhaités/échantillons/décants, étagères custom, parfum signature (max 3), SOTD compact |
| 🧪 **Décants & échantillons** | Tailles dédiées 2–30ml, distinctes des formats full-size (30–200ml) |
| ⭐ **Wishlist** | Parfums à acheter, alertes prix |
| ❤️ **Favoris** | Coups de cœur, sans obligation d'achat |
| ⚙️ **Paramètres** | Alertes prix, devise EUR, notifs push, mentions légales |
| 🧠 **Fiche détail** | Hub d'actions (3 boutons), HeroPriceOverlay, CollapsingHeader, StickyBottomBar, pyramide olfactive v5 interactive, note detail popup, image viewer popup |
| 🚀 **Onboarding** | 3 slides au premier lancement, swipe navigation, sans auth (⏸️ désactivé temporairement) |
| 🔐 **Auth optionnelle** | App utilisable sans compte, login demandé uniquement quand nécessaire |
| 📴 **Mode hors-ligne** | Bannière réseau, contenu dégradé via cache Firestore local |
| 🌓 **Dark Mode** | 3 modes (système/clair/sombre), persistance AsyncStorage, SystemUI + NavigationBar theming, keyboardAppearance adaptatif |
| 🎙️ **Recherche vocale** | Dictée vocale (expo-speech-recognition, on-device) + fallback OpenAI Whisper (Cloud Function), VoiceOverlay 5 phases avec transcript live et top résultats |
| 🌤️ **Météo & suggestions** | Widget météo (Open-Meteo, gratuit), scoring des parfums adaptés à la météo dans la parfumerie, tri "Météo", SOTDPicker pré-trié, badge de compatibilité, notification push quotidienne à 7h via Cloud Function |
| 🎮 **Flacon Runner** | Easter egg : endless runner dans Settings (5 taps version). Saut/double-saut, obstacles, combos, score lisse, milestones, skins déblocables, Reanimated UI thread |

---

## 🏗️ Stack technique

| Catégorie | Technologies |
|---|---|
| **Frontend** | React Native 0.86, Expo SDK 57, Expo Router 57 |
| **Langage** | TypeScript 6.0 (strict) |
| **Navigation** | Expo Router (file-based) + react-native-pager-view (native pan) |
| **Animations** | React Native Reanimated 4, Gesture Handler 2, react-native-svg |
| **Backend** | Firebase Auth, Firestore, Storage, Cloud Functions (europe-west1) |
| **IA** | GPT-4o Vision (analyse photo), OpenAI Whisper-1 (transcription vocale), Firestore (catalogue 25K parfums) |
| **Formulaires** | React Hook Form 7 + Zod 4 |
| **Tests** | Jest 29 + jest-expo + Testing Library — 170 tests, 13 suites |

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
│   ├── index.tsx             # TabPager PagerView 4 pages + DockBar flottant + barre de recherche persistante
│   ├── favorites.tsx         # Favoris (page standalone)
│   ├── history.tsx           # Historique des scans
│   ├── collection.tsx        # Parfumerie (grid, étagères, SOTD, parfum signature) — ex « Garde-robe »
│   ├── scan.tsx              # Scanner overlay (push FAB)
│   └── search.tsx            # Overlay recherche (résultats en grille 3 densités, recherches récentes)
├── auth/
│   ├── login.tsx             # Connexion email + Google
│   └── register.tsx          # Inscription
├── catalog/[id].tsx          # Détail enrichi : HeroPriceOverlay, CollapsingHeader, StickyBottomBar, pyramide v5, accords, saisons, ImageViewerPopup
├── wardrobe/[parfumId].tsx    # Fiche personnelle (notes, notes, SOTD, étagères, signature)
├── settings.tsx              # Paramètres : alertes prix, apparence, soutien, mentions légales, confidentialité
├── legal.tsx                 # Mentions légales
├── privacy.tsx               # Politique de confidentialité
├── onboarding.tsx            # 3 slides swipe + AsyncStorage (⏸️ désactivé temporairement)
└── admin.tsx                 # Administration (seed + reset cache + upload)

src/
├── services/     (14)        # Firebase, Firestore, GPT-4o, user-data, wardrobe, theme-storage, weather, voice-search…
├── hooks/        (14)        # useAuth, useScanReducer, useCatalog, useFavoris, useCollection, useWishlist, useScans, useWardrobe, useShelves, useSotd, useNetwork, useDensityPreference, useVoiceSearch, useWeather
├── contexts/     (1)         # AuthContext (ThemeContext est dans src/theme/)
├── components/   (13)        # ParfumCard, Button, PriceDisplay, SectionHeader, EmptyState, OfflineBanner, AlertPriceToggle, AppLoader, ErrorBoundary, ProfileAvatar, NoteDetailPopup, ImageViewerPopup, ActionSheet
├── theme/        (2)         # theme.ts (double palette light/dark), ThemeContext.tsx (SystemUI + NavigationBar theming)
├── features/
│   ├── scan/     (8)         # ScanScreen + 7 sous-états
│   ├── catalog/  (9)         # CatalogPage, BrandCapsules, BrandSheet, CatalogRow, FamilyAmbianceCards, OlfactoryPyramid v5, HeroPriceOverlay, CollapsingHeader, StickyBottomBar
│   ├── wardrobe/ (10)        # WardrobeAddSheet, WardrobeCard, WardrobeGrid, WardrobeQuickSheet, SOTDCard, SOTDPicker, FilterBar, StarRating, ShelfManager, WeatherWidget
│   ├── search/   (1)         # VoiceOverlay (panneau overlay 5 phases)
│   ├── runner/   (11)        # Flacon Runner (easter egg endless runner — game loop, sprites, sons, persistance)
│   └── navigation/ (1)       # DockBar (barre flottante 5 positions + FAB, indicateur doré, pulse ring, show/hide)
├── models/       (8)         # Parfum, WardrobeItem, Shelf, SotdEntry, UserFavori, UserScan, UserCollectionItem, UserWishlistItem
├── config/       (3)         # Firebase config, env, index
├── utils/        (7)         # Error translator, translate-note, note-descriptions, normalize, ownership, weather-codes, weather-scoring

functions/                    # Cloud Functions Firebase
├── src/index.ts              # GPT-4o Vision + Whisper transcription + sendNotification + checkPriceAlerts + sendWeatherNotifications
├── src/weather-scoring.ts    # Scoring météo côté serveur (Node.js)
└── lib/                      # Build JavaScript
```

---

## 📊 Données — Catalogue (~25 100 parfums)

Le catalogue est importé depuis un scrape Fragrantica (239 marques), nettoyé et hébergé en autonome sur Firebase — **zéro dépendance à l'API Fragella** pour le socle de données.

### Pipeline

```
data/raw/              data/clean/            Firestore + Storage
239 JSON (1.27 GB)  →  239 JSON (31 MB)   →  parfums/{id}
scrape Fragrantica      données factuelles     images hébergées
```

| Étape | Script | Action |
|---|---|---|
| 1. Nettoyage | `npm run clean-data` | `scripts/clean-apify.ts` — débruite, déduplique, strip les champs traçants |
| 2. Import | `npm run import-data` | `scripts/import-firestore.ts` — parse les titres, génère les IDs, télécharge les images → Firebase Storage, écrit dans Firestore |
| 3. WebP | `npm run migrate-webp` | `scripts/migrate-webp.ts` — conversion batch JPEG/PNG → WebP (sharp quality 82), upload Storage |
| 4. Background removal | `npm run migrate-bg` | `scripts/migrate-bgremoval.ts` — suppression de fond bouteilles (MODNet), PNG transparent → WebP alpha |

### Images

- **Format** : WebP 375×500 (converti depuis les vignettes scrape JPG)
- **Background removal** : suppression de fond via `@imgly/background-removal-node` (MODNet), sortie PNG transparent → WebP alpha
- **Stockage** : Firebase Storage → `parfums/{parfumId}/primary.webp`
- **Fallback UI** : initiale de la marque sur fond coloré (si image absente)
- **Amélioration future** : upscale IA ou re-scrape pages détail

### Mapping des données

| Champ Firestore | Source raw |
|---|---|
| `nom`, `annee`, `typeParfum` | Parsé depuis `title` |
| `notesTete/Coeur/Fond` | `pyramid.topNotes/middleNotes/baseNotes[].name` |
| `mainAccords` | `mainAccords[].accord` (noms uniquement, pas les couleurs) |
| `longevity`, `sillage`, `priceValue` | Moyennes → catégories textuelles |
| `imageUrl` | `primaryImageUrl` → téléchargé → Firebase Storage |
| `source` | `'seed'` (données importées, pas d'API live) |

---

## 📱 Flux de scan (v5.7 — burst adaptatif)

```
Idle → [Tap Scanner] → CameraView → [Capture]
  → Burst 3 photos (~1s, haptics×3) → GPT-4o Vision (photo 1, detail:auto → retry high si vide)
  → Confidence haute ? → searchParfumsCached() → Résultats (~2s)
  → Confidence basse ? → analyzeMultipleImages (photos 2+3, cross-ref) → searchParfumsCached() → Résultats (~4s)
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

La page `app/catalog/[id].tsx` affiche les métadonnées du catalogue Firestore :
- Longévité & Sillage (jauges visuelles avec labels)
- Prix, réduction, lien affilié
- Pyramide olfactive v5 (SVG unifié interactif au touch, légende 3 boutons avec compteurs, notes cliquables → popup détail)
- Photo cliquable → popup plein écran (ImageViewerPopup)
- Accords principaux (barres triees par score decroissant - traduits en francais)
- Saisonnalite
- Occasions
- Badge famille olfactive (traduit FR)
- Notes capitalisees (1ere lettre majuscule)

> **Indicateur dev** : pastille en haut a droite (visible uniquement en __DEV__)
> - Violet = donnees admin (seed/manual)
> - Rouge = source inconnue (fallback)

## 📚 Flux de recherche (cache-first v6.10)

```
Saisie ≥ 3 caractères → useCatalog() → debounce 150ms → requestIdRef anti-race
  1. Cache exact → hit instantané
  2. Prefix cache → re-score local (frappe progressive, 0 Firestore)
  3. Firestore dual-query :
     - 1 token (marque) → array-contains + orderBy reviewCount desc → limit 100
     - 2+ tokens → array-contains-any → limit 200
  4. Scoring : matchScore (prefixes, boucle for) + exactMatch (multi-token seulement) + popBonus (log(pop+1)/2)
  5. Tri : pop-first (1 token) ou score (multi-token) + tiebreak, slice 50 résultats
```

Avantage : cache + prefix cache → la plupart des frappes ne touchent plus Firestore.
Les résultats sont triés par pertinence + popularité, pas alphabétiquement.

### Catalogue idle (v5.7)

À l'ouverture (sans recherche) :
- Si authentifié → `getPersonalizedSuggestions(uid)` : scoring client-side basé sur l'historique de scans/favoris (familleOlactive×3 + marque×2 + popularityScore/20), exclut les parfums déjà vus. Section "Pour vous".
- Fallback → `getPopularParfums(30)` → Firestore (triés par popularityScore desc), shuffle journalier déterministe (Lehmer RNG). Section "Parfums populaires".
- Affichage en grille 2 colonnes avec `ParfumCard compact`.

Les miniatures sont affichées via Firebase Storage
(gratuit, pas d'appel API). Fallback automatique sur icône scan/cœur si l'image échoue.
Le bouton unfavorite utilise un cœur avec animation heartbeat (scale bounce 250ms).


### Favoris & Historique enrichis

Les documents `UserFavori` et `UserScan` stockent `imageUrl` et `familleOlactive`
dénormalisés → affichage direct sans appel API Firestore supplémentaire.

---
## v6.10 — Search v2 + Similar Parfums refonte + UI fixes (21/07/2026)

- **Search v2** : cache Map (exact + prefix cache local), dual query Firestore (1 token `array-contains` + `orderBy reviewCount`, 2+ tokens `array-contains-any`), `exactMatch` réservé aux queries multi-mots, signal composite `Math.max(reviewCount, ratingCount, popularityScore)`, bonus popularité `/2`, scoring single-pass (boucle for), tri pop-first pour 1 token, 50 résultats max, debounce 150ms, `requestIdRef` anti-race.
- **Prefix cache** : quand l'utilisateur tape progressivement ("guerlain" → "guerlain l'ho"), le résultat est re-scoré localement depuis le cache — zéro requête Firestore supplémentaire.
- **Barre de recherche fixe** : ne disparaît plus au scroll — toujours visible en haut du pager. Seul le DockBar continue de se cacher/montrer.
- **Parfums similaires** : nouvelle signature `getSimilarParfums(mainAccords: string[], ...)` utilisant `array-contains-any` sur les accords partagés + `orderBy popularityScore`. Scoring client-side (accords partagés × 10 + pop/100). UI migrée vers `ParfumCard` compact avec vraies images (plus de placeholder flask). Cache TTL 24h via `similarIdsCachedAt`.
- **Auth fix** : `KeyboardAvoidingView` sur Android pour login et register — le clavier ne recouvre plus les inputs/boutons.
- **Nouveaux index Firestore** : composites `searchKeywords` + `reviewCount` et `mainAccords` + `popularityScore` (fichier `firestore.indexes.json`, déployer avec `firebase deploy --only firestore:indexes`).
- **Nouvelles marques** : 46 marques importées → ~25 100 parfums (239 marques). `popularityScore` backporté sur tous les documents existants (`npm run import-data` avec mise à jour partielle au lieu de skip). Nouveau champ `brandLower` pour usage futur.
- **Modèles** : `similarIdsCachedAt?: Date` ajouté à l'interface `Parfum`.
- **Perf logs** : `console.log` temporaire avec temps Firestore / scoring / total sur chaque recherche.

## v6.3 — Wardrobe enrichie + OlfactoryPyramid rework (17/07/2026)

- **WardrobeAddSheet** : bottom sheet d'ajout avec sélection de taille (remplace l'ancien `Alert.alert` sur la fiche détail)
- **Parfum signature** : toggle dans la fiche personnelle, maximum 3 signatures, compteur `isSignature` sur le modèle WardrobeItem
- **Tailles décant/échantillon** : formats 2–30ml distincts des full-size (30–200ml), selon le type d'ownership
- **Ownership labels centralisés** : `src/utils/ownership.ts` — `OWNERSHIP_LABELS`, `ownershipLabel()`, `wardrobeToCardItem()`
- **Wardrobe service** : `addToWardrobe()` accepte `sizeMl` optionnel, `updateWardrobeItem()` supporte `isSignature`
- **AuthContext memoïsé** : `useMemo` sur la value du provider pour éviter les re-renders inutiles
- **OlfactoryPyramid** : retravaillé — support demi-étoiles, rendu optimisé
- **StarRating** : support demi-étoiles (notation au demi-point près)
- **react-native-svg** : ajouté aux dépendances (utilisé par OlfactoryPyramid et StarRating)
- **start.bat** : réécrit avec 2 modes — `start.bat` (Metro uniquement, fast) et `start.bat build` (Gradle + install + Metro), cleanup ADB + kill old Metro inclus

## v6.2 — Bugfixes & Search Bar (17/07/2026)

- **Barre de recherche persistante** : visible sur les 4 onglets, verre dépoli (BlurView), show/hide synchronisé avec le DockBar, navigation vers overlay recherche plein écran
- **Overlay recherche** (`search.tsx`) : autofocus, live filtering (Firestore cached), 6 filtres famille, recherches récentes persistantes
- **Catalogue simplifié** : search bar inline retirée, chips famille redirigent vers l'overlay recherche, avatar header ajouté
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

## v6.9 — Favoris + Historique refonte & Pager migration (21/07/2026)

- **Favoris** : chips famille remplacées par bouton unique « Famille » → ActionSheet + chip dismissible, densité partagée avec le catalogue (`useDensityPreference`), cartes en mode dynamique (Confort./Compact/Liste)
- **Historique** : `ScanHistoryCard` refactorée en wrapper — scans réussis → `ParfumCard` (densité partagée) + overlay (dot statut + date + compteur ×N), no-result/error → layout compact natif
- **Pager** : `react-native-pager-view` remplacé par `GestureDetector` + Reanimated — résout les conflits de swipe natifs entre le pager et les ScrollView horizontaux du catalogue (`activeOffsetX(30)` + `failOffsetY(15)`)
- **BrandSheet** : bottom sheet alphabétique A-Z (60+ marques, barre de recherche, index latéral) — ouverte depuis « Toutes → » sur les capsules marques
- **« Voir tout → »** : scroll direct vers la grille catalogue (`scrollToIndex`) au lieu de push vers l'overlay de recherche
- **GRID_MODES** : centralisé dans `useDensityPreference`, supprimé des définitions locales
- **Bug fixes** : crash `parfum.notesTete` undefined sur données dénormalisées (favoris, historique)

## v6.8 — Refonte Catalogue v2 (21/07/2026)

- **Structure hybride** : rangées éditoriales horizontales (façon Spotify/Netflix) + grille filtrable en dessous
- **Suppression chips famille olfactive** : remplacés par dilution dans sections nommées + cartes d'ambiance « Explorer par famille » (6 cartes theme-aware avec Ionicons)
- **Capsules marques** : top 10 marques en pastilles rectangulaires + bottom sheet « Toutes les marques » (A-Z, barre de recherche, index latéral)
- **ParfumCard 4 modes** : `compact` (rangées, 140px), `comfortable` (grille défaut, tags famille/année + notes de tête + price dot deal/fair/overpriced), `compactPlus` (grille dense, image 90px), `list`
- **Densité persistée** : AsyncStorage (`@parfumscan/catalog-density`), partagée entre catalogue et recherche
- **Recherche** : chips famille supprimées, contrôles de densité identiques à la grille (Confort./Compact/Liste)
- **Nouveaux composants** : `BrandCapsules`, `CatalogRow` (collapse/expand avec chevron), `FamilyAmbianceCards` (6 cartes d'ambiance avec couleurs du thème)
- **Nouveau hook** : `useDensityPreference` (lecture/écriture AsyncStorage, partagé catalogue + recherche)

## v6.7 — Pipeline seed autonome + ImageViewer + Search améliorée (20/07/2026)

- **Pipeline seed autonome** : catalogue 21K parfums importé depuis scrape Apify → `data/clean/` → Firestore. Zéro dépendance à l'API Fragella. Images hébergées sur Firebase Storage.
- **ImageViewerPopup** : tap sur la photo du parfum (fiche détail) → popup plein écran avec animation fade+scale, tap n'importe où pour fermer.
- **Recherche en grille** : `numColumns={2}` + `ParfumCard compact`, affichage 2 colonnes pour les résultats de recherche.
- **Images en `contain`** : `contentFit="contain"` sur les cartes compactes et la fiche détail — plus de crop/zoom, le flacon est visible en entier.
- **Parfums similaires** : scoring par nombre d'accords partagés (`array-contains-any`) + `popularityScore`, shuffle journalier — parfums qui partagent les mêmes accords, pas juste la même famille.
- **Recherche par préfixes** : scoring `startsWith` + bonus `reviewCount`, limit 200, génération de préfixes dans `buildSearchKeywords()`.
- **Dark mode fixes** : `extraData={resolvedMode}` et `key={resolvedMode}` dans les FlatList/PagerView pour re-render correct au changement de thème.
- **New components** : `ImageViewerPopup` (popup image plein écran)
- **New scripts** : `migrate-search-keywords` (migration des keywords de recherche avec préfixes)

## v6.6 — Parfumerie, Favoris moodboard, Historique journal (18/07/2026)

- **Parfumerie (rebrand)** : « Garde-robe » devient « Parfumerie » — icône `flask`, labels, placeholders, empty states, fiches personnelles, privacy policy. Nom de fichier `collection.tsx` conservé pour rétrocompatibilité expo-router.
- **Favoris refonte** : moodboard olfactif en grille 2 colonnes (`ParfumCard` compact), filtres famille olfactive avec compteurs, barre de recherche + toggle tri (date/A-Z/Z-A/prix), animation stagge fade-in, menu contextuel enrichi via `ActionSheet` (long-press → 5 options), pull-to-refresh. Dénormalisation `bestPrice`/`referencePrice`/`annee` dans `UserFavori` pour le badge promo.
- **Historique refonte** : journal olfactif groupé par période (Aujourd'hui/Hier/Cette semaine/Ce mois/mois année). Carte `ScanHistoryCard` avec dot statut (vert/gris/rouge), compteur répétitions `×N`, prix si capturé. Barre recherche + tri (récents/anciens), prompt "Scanner aujourd'hui ?", animation stagger, `ActionSheet` menu contextuel. Scans sauvegardés dans tous les états (`no-result`, `error`) via `saveScan()`.
- **ActionSheet** : nouveau composant bottom sheet custom (spring + backdrop `withTiming`), remplace les `Alert.alert` sur favoris et historique. Supporte actions iconées, titre optionnel, variante destructive. Utilisé par Favoris et Historique.
- **Dénormalisation étendue** : `UserFavori` (+ `bestPrice`, `referencePrice`, `annee`) et `UserScan` (+ `annee`, `bestPrice`, `status`) pour affichage direct sans appels Firestore supplémentaires.
- **Back gesture edge-pan** : gesture de retour restreint à une strip de 40px à gauche sur la fiche détail catalogue (évite les conflits avec le swipe horizontal de la pyramide).
- **SOTDPicker ancré** : positionné en `absolute` au-dessus de la carte SOTD (ancré par `anchorTop` prop), suppression de Reanimated. Hauteur max dynamique basée sur `windowHeight`.

## v6.5 — PagerView natif + Pyramide v5 + Dark mode system (18/07/2026)

- **Pager natif** : `react-native-pager-view` remplace le swipe gesture Reanimated — résout les conflits de scroll horizontal (ScrollView, pyramide touch). Swipe inter-pages natif, `scrollEnabled={!sheetOpen}` pour éviter les conflits avec les bottom sheets.
- **OlfactoryPyramid v5** : SVG unifié (triangle complet), touch-based (tap sur le triangle pour sélectionner une couche), design premium avec dégradé d'opacité. Nouvelle props `onNotePress` → ouvre `NoteDetailPopup`. Suppression des animations par couche (entry/scale/pulse).
- **NoteDetailPopup** : nouveau composant affichant le détail d'une note olfactive (nom, description, couche). Utilise `src/utils/note-descriptions.ts` pour les descriptions.
- **SOTDCard compact** : redesign complet — miniature 26×26, icône soleil inline, label "SOTD" pill, boutons icônes (swap/add) remplaçant les boutons texte "Changer"/"Choisir". Intégration plus discrète au-dessus de la grille.
- **Dark mode system UI** : `expo-system-ui` pour le fond d'écran, `expo-navigation-bar` pour la barre Android (suit le thème). Tous les `TextInput` reçoivent `keyboardAppearance` basé sur `resolvedMode`.
- **Settings "Soutenir"** : section don (cœur + description + bouton désactivé "Bientôt disponible"). Routes `/legal` et `/privacy` fonctionnelles (nouveaux écrans `legal.tsx`, `privacy.tsx`).
- **Catalogue autonome** : catalogue 100% Firestore, zéro dépendance API externe. `src/utils/normalize.ts` pour les clés Firestore cohérentes. Tous les champs enrichis (`popularityScore`, `ratingScore`, `country`, `mainAccordsPercentage`, `generalNotes`, `confidence`, `seasonRanking`, `occasionRanking`) importés via le pipeline seed.
- **Bug fixes** : NaN dans les tris rating, couleurs de fond derrière les images ParfumCard, positions badge note/signature inversées sur WardrobeCard, `contentStyle.backgroundColor` sur tous les écrans Stack, `key={resolvedMode}` sur WardrobeGrid pour re-render au changement de thème.
- **Deps** : `react-native-pager-view ^8.0.2`, `expo-navigation-bar ~57`, `expo-system-ui ~57`

## v6.4 — Refonte fiche détail prix-first (17/07/2026)

- **Prix en overlay** : `HeroPriceOverlay` — badge flottant en bas à gauche de l'image hero (prix, réduction, prix ref barré, CTA)
- **Header collapsé** : `CollapsingHeader` — marque fade-out + nom shrink au scroll via `useAnimatedReaction` + `LayoutAnimation`
- **Barre sticky bas** : `StickyBottomBar` — slide-in prix + favori + garde-robe + CTA dès que la section prix est hors écran
- **Ordre prix-first** : prix → pyramide → accords → stats (longévité/sillage/popularité) → saisons → occasions → similaires
- **Doublon fav supprimé** : le cœur disparaît du header et de l'actionRow, uniquement dans la sticky bar
- **Badges 2 lignes** : identification (type, famille, année) + contexte (saisons top 2, occasions top 2, note) avec icônes Ionicons
- **Suppression comparateur prix magasin** et état `storePrice`/`showStoreInput`
- **3 nouveaux composants** extraits : `HeroPriceOverlay` (156 lignes), `CollapsingHeader` (140 lignes), `StickyBottomBar` (189 lignes)

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
