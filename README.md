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
| 📸 **Scan intelligent** | Burst 3 photos → GPT-4o Vision (adaptatif : 70% en 1 appel, 30% en cross-ref 2 photos) → searchParfumsCached() |
| 🖼️ **Import galerie** | Photo existante → même pipeline IA, sans permissions supplémentaires |
| 📚 **Catalogue** | Recherche 100% Firestore (21K parfums seed), navigation par famille olfactive, tri (prix/pertinence), suggestions personnalisées |
| 🧪 **Parfumerie** | Parfums possédés/souhaités/échantillons/décants, étagères custom, parfum signature (max 3), SOTD compact |
| 🧪 **Décants & échantillons** | Tailles dédiées 2–30ml, distinctes des formats full-size (30–200ml) |
| ⭐ **Wishlist** | Parfums à acheter, alertes prix |
| ❤️ **Favoris** | Coups de cœur, sans obligation d'achat |
| ⚙️ **Paramètres** | Alertes prix, devise EUR, notifs push, mentions légales |
| 🧠 **Fiche détail** | Hub d'actions (3 boutons), HeroPriceOverlay, CollapsingHeader, StickyBottomBar, pyramide olfactive v5 interactive, note detail popup |
| 🚀 **Onboarding** | 3 slides au premier lancement, swipe navigation, sans auth (⏸️ désactivé temporairement) |
| 🔐 **Auth optionnelle** | App utilisable sans compte, login demandé uniquement quand nécessaire |
| 📴 **Mode hors-ligne** | Bannière réseau, contenu dégradé via cache Firestore local |
| 🌓 **Dark Mode** | 3 modes (système/clair/sombre), persistance AsyncStorage, SystemUI + NavigationBar theming, keyboardAppearance adaptatif |
| ⚖️ **Légal** | Mentions légales, politique de confidentialité, section soutien (à venir) |

---

## 🏗️ Stack technique

| Catégorie | Technologies |
|---|---|
| **Frontend** | React Native 0.86, Expo SDK 57, Expo Router 57 |
| **Langage** | TypeScript 6.0 (strict) |
| **Navigation** | Expo Router (file-based) + react-native-pager-view (native pan) |
| **Animations** | React Native Reanimated 4, Gesture Handler 2, react-native-svg |
| **Backend** | Firebase Auth, Firestore, Storage, Cloud Functions (europe-west1) |
| **IA** | GPT-4o Vision (analyse photo), Firestore (catalogue 21K parfums) |
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
│   └── search.tsx            # Overlay recherche plein écran (barre persistante → push)
├── auth/
│   ├── login.tsx             # Connexion email + Google
│   └── register.tsx          # Inscription
├── catalog/[id].tsx          # Détail enrichi : HeroPriceOverlay, CollapsingHeader, StickyBottomBar, pyramide v5, accords, saisons
├── wardrobe/[parfumId].tsx    # Fiche personnelle (notes, notes, SOTD, étagères, signature)
├── settings.tsx              # Paramètres : alertes prix, apparence, soutien, mentions légales, confidentialité
├── legal.tsx                 # Mentions légales
├── privacy.tsx               # Politique de confidentialité
├── onboarding.tsx            # 3 slides swipe + AsyncStorage (⏸️ désactivé temporairement)
└── admin.tsx                 # Administration (seed + reset cache + upload)

src/
├── services/     (12)        # Firebase, Firestore, GPT-4o, user-data, wardrobe, theme-storage…
├── hooks/        (11)        # useAuth, useScanReducer, useCatalog, useFavoris, useCollection, useWishlist, useScans, useWardrobe, useShelves, useSotd, useNetwork
├── contexts/     (1)         # AuthContext (ThemeContext est dans src/theme/)
├── components/   (11)        # ParfumCard, Button, PriceDisplay, SectionHeader, EmptyState, OfflineBanner, AlertPriceToggle, AppLoader, ErrorBoundary, ProfileAvatar, NoteDetailPopup
├── theme/        (2)         # theme.ts (double palette light/dark), ThemeContext.tsx (SystemUI + NavigationBar theming)
├── features/
│   ├── scan/     (8)         # ScanScreen + 7 sous-états
│   ├── catalog/  (5)         # CatalogPage, OlfactoryPyramid v5 (SVG unifié, touch, onNotePress), HeroPriceOverlay, CollapsingHeader, StickyBottomBar
│   ├── wardrobe/ (9)         # WardrobeAddSheet, WardrobeCard, WardrobeGrid, WardrobeQuickSheet, SOTDCard (compact redesign), SOTDPicker, FilterBar, StarRating, ShelfManager
│   └── navigation/ (1)       # DockBar (barre flottante 5 positions + FAB, indicateur doré, pulse ring, show/hide)
├── models/       (8)         # Parfum, WardrobeItem, Shelf, SotdEntry, UserFavori, UserScan, UserCollectionItem, UserWishlistItem
├── config/       (3)         # Firebase config, env, index
├── utils/        (5)         # Error translator, translate-note, note-descriptions, normalize, ownership (labels)

functions/                    # Cloud Functions Firebase
├── src/index.ts              # Analyse GPT-4o Vision + sendNotification + checkPriceAlerts
└── lib/                      # Build JavaScript
```

---

## 📊 Données — Catalogue (21 567 parfums)

Le catalogue est importé depuis un scrape Fragrantica (193 marques), nettoyé et hébergé en autonome sur Firebase — **zéro dépendance à l'API Fragella** pour le socle de données.

### Pipeline

```
data/raw/              data/clean/            Firestore + Storage
193 JSON (1.27 GB)  →  193 JSON (31 MB)   →  parfums/{id}
scrape Fragrantica      données factuelles     images hébergées
```

| Étape | Script | Action |
|---|---|---|
| 1. Nettoyage | `npm run clean-data` | `scripts/clean-apify.ts` — débruite, déduplique, strip les champs traçants (URLs, contenu éditorial, photos communauté) |
| 2. Import | `npm run import-data` | `scripts/import-firestore.ts` — parse les titres, génère les IDs, télécharge les images → Firebase Storage, écrit dans Firestore |

### Images

- **Format** : JPG 375×500 (vignettes scrape, pas de PNG transparent)
- **Stockage** : Firebase Storage → `parfums/{parfumId}/primary.jpg`
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
- Accords principaux (barres triees par score decroissant - traduits en francais)
- Saisonnalite
- Occasions
- Badge famille olfactive (traduit FR)
- Notes capitalisees (1ere lettre majuscule)

> **Indicateur dev** : pastille en haut a droite (visible uniquement en __DEV__)
> - Violet = donnees admin (seed/manual)
> - Rouge = source inconnue (fallback)

## 📚 Flux de recherche (cache-first v5.3)

```
Saisie ≥ 3 caractères → useCatalog() → debounce 800ms
  1. searchParfumsCached(query) → Firestore (gratuit, score = tokens + popularité + exact match)

Avantage : recherche 100% locale, zéro appel API externe.
→ les parfums populaires remontent naturellement.

Toutes les métadonnées (longévité, sillage, saisonnalité, occasions, accords, etc.) sont déjà
présentes dans Firestore via le pipeline d'import seed — aucun enrichissement nécessaire.
```

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
