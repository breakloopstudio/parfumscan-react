# ðŸ§´ ParfumScan React Native

<div align="center">

**Scanner de parfums intelligent â€” Reconnais n'importe quel flacon en une photo**

[![Expo SDK 54](https://img.shields.io/badge/Expo-SDK%2054-4630EB?logo=expo)](https://expo.dev)
[![React Native 0.81](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-BaaS-FFCA28?logo=firebase)](https://firebase.google.com)
[![License MIT](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

</div>

---

## âœ¨ FonctionnalitÃ©s

| Module | Description |
|---|---|
| | **UI/UX** | Edge-to-edge Android (barres transparentes, fond derriÃ¨re les barres systÃ¨me) |
| ðŸ“¸ **Scan intelligent** | Photo â†’ GPT-4o Vision â†’ API Fragella (74K parfums) |
| ðŸ“š **Catalogue** | Recherche cache-first (Firestore â†’ Fragella), ghost cards, fiche dÃ©tail enrichie |
| â¤ï¸ **Favoris** | Sauvegarde Firestore temps rÃ©el, donnÃ©es dÃ©normalisÃ©es |
| ðŸ‘¤ **Profil** | Google Sign-In, stats gamifiÃ©es, historique de scans |
| ðŸŒ™ **Dark mode** | ThÃ¨me automatique avec 45 design tokens |
| ðŸ” **Auth** | Email + Google, role admin, AuthGuard automatique |
| ðŸ§  **Fiche dÃ©tail robuste** | Bridge preview + Firestore always + Fragella by ID fallback, id normalisÃ© |
| ðŸ’¾ **Cache intelligent** | Cache Firestore partagÃ© entre utilisateurs, 0 appel API redondant |

---

## ðŸ—ï¸ Stack technique

| CatÃ©gorie | Technologies |
|---|---|
| **Frontend** | React Native 0.81, Expo SDK 54, Expo Router 6 |
| **Langage** | TypeScript 5.7 (strict) |
| **Navigation** | Expo Router (file-based) + Reanimated pager |
| **Animations** | React Native Reanimated 4, Gesture Handler 2 |
| **Backend** | Firebase Auth, Firestore, Storage, Cloud Functions (europe-west1) |
| **IA** | GPT-4o Vision (analyse photo), Fragella API (catalogue) |
| **Formulaires** | React Hook Form 7 + Zod 4 |

---

## ðŸš€ DÃ©marrage rapide

### PrÃ©requis
- Node.js â‰¥ 18
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
# Racine â€” Ã©mulateurs Firebase (optionnel)
cp .env.example .env

# Cloud Functions â€” clÃ©s API requis
cp functions/.env.example functions/.env
# Puis Ã©dite functions/.env avec tes vraies clÃ©s :
#   OPENAI_API_KEY=sk-...
#   FRAGELLA_API_KEY=...
```

### Lancement

```bash
# Expo Go (mode dÃ©gradÃ© â€” Firebase dÃ©sactivÃ©)
npm start

# Development build (mode complet â€” Firebase actif)
npm run android   # ou npm run ios

# Ã‰mulateurs Firebase locaux
npm run emulators
```

### Build APK (installation sur tÃ©lÃ©phone)

```bash
# 1. Builder l'APK release
build_release.bat

# 2. L'APK est dans :
#    android/app/build/outputs/apk/release/app-release.apk

# 3. TransfÃ©rer sur le tÃ©lÃ©phone (USB, cloud, Telegram...)
# 4. Ouvrir le fichier .apk sur le tÃ©lÃ©phone â†’ Installer
```

---

## ðŸ“ Architecture

```
app/
â”œâ”€â”€ _layout.tsx               # Root : GestureHandler + AuthProvider + AuthGuard
â”œâ”€â”€ index.tsx                 # Splash â†’ redirection
â”œâ”€â”€ (tabs)/
â”‚   â”œâ”€â”€ _layout.tsx           # Stack (index + scan)
â”‚   â”œâ”€â”€ index.tsx             # TabPager Reanimated (Catalog â†” Profil) + pont pending
â”‚   â””â”€â”€ scan.tsx              # Scanner overlay (push FAB)
â”œâ”€â”€ auth/
â”‚   â”œâ”€â”€ login.tsx             # Connexion email + Google
â”‚   â””â”€â”€ register.tsx          # Inscription
â”œâ”€â”€ catalog/[id].tsx          # DÃ©tail enrichi : type, longÃ©vitÃ©/sillage, accords, saisonnalitÃ©, occasions, pyramide, favori
â””â”€â”€ admin.tsx                 # Administration (seed + reset cache + upload)

src/
â”œâ”€â”€ services/     (9)         # Firebase, Firestore (upsert intelligent), Fragella, GPT-4oâ€¦
â”œâ”€â”€ hooks/        (7)         # useAuth, useScanReducer, useCatalog (cache-first + score popularitÃ©)â€¦
â”œâ”€â”€ contexts/     (1)         # AuthContext (Provider + Hook)
â”œâ”€â”€ components/   (2)         # ParfumCard (bridge + onPressOverride), AppLoader
â”œâ”€â”€ features/
â”‚   â”œâ”€â”€ scan/     (7)         # ScanScreen + 6 sous-Ã©tats
â”‚   â”œâ”€â”€ catalog/  (1)         # CatalogPage (composant, pas une route !)
â”‚   â””â”€â”€ profile/  (1)         # ProfilePage (favoris dÃ©normalisÃ©s, bridge dÃ©tail)
â”œâ”€â”€ models/       (4)         # Interfaces : Parfum, ParfumSearchResult, UserFavori (+imageUrl), UserScan (+imageUrl), ScanResult
â”œâ”€â”€ theme/        (1)         # 45 design tokens (light + dark)
â”œâ”€â”€ config/       (3)         # Firebase config, env, index
â””â”€â”€ utils/        (2)         # Error translator, normalize

functions/                    # Cloud Functions Firebase
â”œâ”€â”€ src/index.ts              # Analyse GPT-4o Vision
â””â”€â”€ lib/                      # Build JavaScript
```

---

## ðŸ“± Flux de scan (v5.0)

```
Idle â†’ [Tap Scanner] â†’ CameraView â†’ [Capture]
  â†’ Scanning (step 0â†’1â†’2) â†’ GPT-4o Vision (detail:auto â†’ retry high si vide)
  â†’ Confidence haute ? â†’ Fragella â†’ await batchCacheParfums() â†’ RÃ©sultats
  â†’ Confidence basse ? â†’ Clarification manuelle â†’ Fragella
  â†’ RÃ©sultat â†’ Tap parfum â†’ setPendingParfum() â†’ dismissTo tabs
      â†’ TabPager consume + re-set â†’ push /catalog/:id
      â†’ Fiche dÃ©tail consumePendingParfum() â†’ donnÃ©es enrichies affichÃ©es
  â†’ RÃ©sultat â†’ Voir catalogue â†’ setPendingCatalogQuery() + router.back()
```

> **Pont inter-Ã©crans** : `setPendingParfum()` stocke les donnÃ©es en mÃ©moire,
> `consumePendingParfum()` les lit une seule fois. Le TabPager re-stocke
> immÃ©diatement aprÃ¨s consommation pour que la fiche dÃ©tail les reÃ§oive.

### Fiche dÃ©tail enrichie

La page `app/catalog/[id].tsx` affiche les mÃ©tadonnÃ©es de l'API Fragella :
- LongÃ©vitÃ© & Sillage (jauges visuelles avec labels)
- Prix, rÃ©duction, lien affiliÃ©
- Pyramide olfactive (notes de tÃªte/cÅ“ur/fond)
- Accords principaux (barres : labels Dominant/Prominent â†’ %)
- SaisonnalitÃ© (jauges style longÃ©vitÃ© : TrÃ¨s adaptÃ©â€¦DÃ©conseillÃ©)
- Occasions (jauges : IdÃ©alâ€¦DÃ©conseillÃ©)

> **Indicateur dev** : pastille en haut a droite (visible uniquement en __DEV__)
> indique si les donnees sont enrichies - Vert = live API Fragella (bridge)
> - Bleu = cache Firestore
> - Violet = donnees admin
> - Rouge = source inconnue

## ðŸ“š Flux de recherche (cache-first v5.3)

```
Saisie â‰¥ 3 caractÃ¨res â†’ useCatalog() â†’ debounce 800ms
  1. searchParfumsCached(query) â†’ Firestore (gratuit, score = tokens + popularitÃ© + exact match)
  2. Si < 5 rÃ©sultats â†’ searchFragranceByQuery() â†’ API payante
  3. batchCacheParfums(results) â†’ Firestore (batch.set {merge:true} + createdAt, sans read prÃ©alable)

Avantage : chaque recherche n'est payÃ©e qu'une fois,
tous utilisateurs confondus. Le score intÃ¨gre la popularitÃ©
â†’ les parfums populaires remontent naturellement.

âš ï¸ L'endpoint `/fragrances?search=` de Fragella retourne TOUTES les mÃ©tadonnÃ©es
  (longÃ©vitÃ©, sillage, saisonnalitÃ©, occasions, accords, etc.) â€” identique au dÃ©tail.
  â†’ `fragellaId` = champ `_id` de l'API (âš ï¸ underscore, pas `Id`/`id`/`ID`).
  â†’ La fiche dÃ©tail utilise `getFragranceById()` en enrichissement si `fragellaId` disponible.
  â†’ Les donnÃ©es enrichies sont mergÃ©es dans Firestore (upsert intelligent).
  â†’ Si `fragellaId` absent â†’ skip enrichissement.
```

### Catalogue idle

Ã€ l''ouverture (sans recherche) : `getPopularParfums(6)` â†’ Firestore (triÃ©s par popularityScore desc).
Plus de ghost cards Chanel/Dior â€” 100% donnÃ©es rÃ©elles du cache.

### Favoris & Historique enrichis

Les documents `UserFavori` et `UserScan` stockent `imageUrl` et `familleOlactive`
dÃ©normalisÃ©s â†’ affichage direct sans appel API Firestore ni Fragella.

---
## ðŸ“„ Licence

MIT â€” voir [LICENSE](./LICENSE)
