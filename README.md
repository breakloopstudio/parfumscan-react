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
| 📸 **Scan intelligent** | Photo → GPT-4o Vision → API Fragella (74K parfums) |
| 📚 **Catalogue** | Recherche cache-first (Firestore → Fragella), ghost cards, fiche détail enrichie |
| ❤️ **Favoris** | Sauvegarde Firestore temps réel, données dénormalisées |
| 👤 **Profil** | Google Sign-In, stats gamifiées, historique de scans |
| 🌙 **Dark mode** | Thème automatique avec 45 design tokens |
| 🔐 **Auth** | Email + Google, role admin, AuthGuard automatique |
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
# Expo Go (mode dégradé — Firebase désactivé)
npm start

# Development build (mode complet — Firebase actif)
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
├── services/     (9)         # Firebase, Firestore (cache-first), Fragella, GPT-4o…
├── hooks/        (7)         # useAuth, useScanReducer, useCatalog (cache-first)…
├── contexts/     (1)         # AuthContext (Provider + Hook)
├── components/   (2)         # ParfumCard (bridge + onPressOverride), AppLoader
├── features/
│   ├── scan/     (7)         # ScanScreen + 6 sous-états
│   ├── catalog/  (1)         # CatalogPage (composant, pas une route !)
│   └── profile/  (1)         # ProfilePage (favoris dénormalisés, bridge détail)
├── models/       (5)         # Interfaces (dont FirestoreDate) + seed
├── theme/        (1)         # 45 design tokens (light + dark)
├── config/       (3)         # Firebase config, env, index
└── utils/        (2)         # Error translator, normalize

functions/                    # Cloud Functions Firebase
├── src/index.ts              # Analyse GPT-4o Vision
└── lib/                      # Build JavaScript
```

---

## 📱 Flux de scan

```
Idle → [Tap Scanner] → CameraView → [Capture]
  → Scanning (step 0→1→2) → GPT-4o Vision
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
- Pyramide olfactive (notes de tête/cœur/fond)
- Accords principaux (barres : labels Dominant/Prominent → %)
- Saisonnalité (jauges style longévité : Très adapté…Déconseillé)
- Occasions (jauges : Idéal…Déconseillé)

> 🔵 **Indicateur dev** : un point coloré en haut à droite de la fiche
> indique si les données sont enrichies (🟢 vert = API Fragella) ou
> basiques (🔴 rouge = cache Firestore périmé). Visible uniquement en `__DEV__`.

## 📚 Flux de recherche (cache-first v4.2)

```
Saisie ≥ 3 caractères → useCatalog() → debounce 800ms
  1. searchParfumsCached(query) → Firestore (gratuit, partagé)
  2. Si < 5 résultats → searchFragranceByQuery() → API payante
  3. batchCacheParfums(results) → Firestore (pour la prochaine fois)

Avantage : chaque recherche n'est payée qu'une fois,
tous utilisateurs confondus.

⚠️ L'endpoint /fragrances?search= de Fragella renvoie TOUTES les métadonnées
  (accords, saisons, occasions, longévité, sillage…) — pas besoin d'appeler
  /fragrances/:id séparément.
```

---
## 📄 Licence

MIT — voir [LICENSE](./LICENSE)
