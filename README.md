# 🧴 ParfumScan React Native

<div align="center">

**Scanner de parfums intelligent — Reconnais n'importe quel flacon en une photo**

[![Expo SDK 54](https://img.shields.io/badge/Expo-SDK%2054-4630EB?logo=expo)](https://expo.dev)
[![React Native 0.81](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-BaaS-FFCA28?logo=firebase)](https://firebase.google.com)
[![License MIT](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

</div>

---

## ✨ Fonctionnalités

| Module | Description |
|---|---|
| | **UI/UX** | Edge-to-edge Android (barres transparentes, fond derrière les barres système) |
| 📸 **Scan intelligent** | Photo → GPT-4o Vision → API Fragella (74K parfums) |
| 📚 **Catalogue** | Recherche cache-first (Firestore → Fragella), ghost cards, fiche détail enrichie |
| ❤️ **Favoris** | Sauvegarde Firestore temps réel, données dénormalisées |
| 👤 **Profil** | Google Sign-In, stats gamifiées, historique de scans |
| 🔐 **Auth** | Email + Google, role admin, AuthGuard automatique |
| 🧠 **Fiche détail robuste** | Bridge preview + Firestore always + Fragella by ID fallback, id normalisé |
| 💾 **Cache intelligent** | Cache Firestore partagé entre utilisateurs, 0 appel API redondant |

---

## 🏗️ Stack technique

| Catégorie | Technologies |
|---|---|
| **Frontend** | React Native 0.81, Expo SDK 54, Expo Router 6 |
| **Langage** | TypeScript 5.7 (strict) |
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

## 📁 Architecture

```
app/
├── _layout.tsx               # Root : GestureHandler + AuthProvider + AuthGuard
├── index.tsx                 # Splash → redirection
├── (tabs)/
│   ├── _layout.tsx           # Stack (index + scan)
│   ├── index.tsx             # TabPager Reanimated (Catalog ↔ Profil) + pont pending
│   └── scan.tsx              # Scanner overlay (push FAB)
├── auth/
│   ├── login.tsx             # Connexion email + Google
│   └── register.tsx          # Inscription
├── catalog/[id].tsx          # Détail enrichi : type, longévité/sillage, accords, saisonnalité, occasions, pyramide, favori
└── admin.tsx                 # Administration (seed + reset cache + upload)

src/
├── services/     (9)         # Firebase, Firestore (upsert intelligent), Fragella, GPT-4o…
├── hooks/        (7)         # useAuth, useScanReducer, useCatalog (cache-first + score popularité)…
├── contexts/     (1)         # AuthContext (Provider + Hook)
├── components/   (3)         # ParfumCard (bridge + onPressOverride), AppLoader, ErrorBoundary
├── features/
│   ├── scan/     (7)         # ScanScreen + 6 sous-états
│   ├── catalog/  (1)         # CatalogPage (composant, pas une route !)
│   └── profile/  (1)         # ProfilePage (favoris dénormalisés, bridge détail)
├── theme/        (1)         # 45 design tokens (light + dark)
├── config/       (3)         # Firebase config, env, index
└── utils/        (2)         # Error translator, translate-note (traduction notes FR)

functions/                    # Cloud Functions Firebase
├── src/index.ts              # Analyse GPT-4o Vision
└── lib/                      # Build JavaScript
```

---

## 📱 Flux de scan (v5.0)

```
Idle → [Tap Scanner] → CameraView → [Capture]
  → Scanning (step 0→1→2) → GPT-4o Vision (detail:auto → retry high si vide)
  → Confidence haute ? → Fragella → await batchCacheParfums() → Résultats
  → Confidence basse ? → Clarification manuelle → Fragella
  → Résultat → Tap parfum → setPendingParfum() → dismissTo tabs
      → TabPager consume + re-set → push /catalog/:id
      → Fiche détail consumePendingParfum() → données enrichies affichées
  → Résultat → Voir catalogue → setPendingCatalogQuery() + router.back()
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

### Catalogue idle

À l''ouverture (sans recherche) : `getPopularParfums(30)` → Firestore (triés par popularityScore desc),
shuffle journalier déterministe (Lehmer RNG), puis affichés en grille 2 colonnes avec `ParfumCard compact` (image 130px, sans notes ni zone deal).
Plus de ghost cards Chanel/Dior — 100% données réelles du cache.

Les miniatures flacon (44×44) sont affichées dans les deux onglets via le CDN Fragella
(gratuit, pas d'appel API). Fallback automatique sur icône scan/cœur si l'image échoue.
Le bouton unfavorite utilise un cœur avec animation heartbeat (scale bounce 250ms).


### Favoris & Historique enrichis

Les documents `UserFavori` et `UserScan` stockent `imageUrl` et `familleOlactive`
dénormalisés → affichage direct sans appel API Firestore ni Fragella.

---
## v5.5 — Bugfixes (16/07/2026)

- **C4** `app/catalog/[id].tsx` — `consumePendingParfum()` sorti du render (`useRef(fn())` → `useState(() => fn())`)
- **C5** `src/services/firestore.ts` — `onParfums` utilise `orderBy('updatedAt')` au lieu de `createdAt` (docs batch-cachés n'avaient pas de `createdAt`)
- **H1** `app.json` — NDK corrigé (`30.x` inexistant → `27.0.12077973` LTS)
- **H2** `app.json` — plugin `expo-build-properties` en doublon supprimé
- **H8** `src/features/profile/ProfilePage.tsx` — FavHeart migré de `Animated` natif vers Reanimated

---

## 📄 Licence

MIT — voir [LICENSE](./LICENSE)
