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
| 📚 **Catalogue** | Recherche temps réel, ghost cards, pyramide olfactive |
| ❤️ **Favoris** | Sauvegarde Firestore temps réel par utilisateur |
| 👤 **Profil** | Google Sign-In, stats gamifiées, historique de scans |
| 🌙 **Dark mode** | Thème automatique avec 45 design tokens |
| 🔐 **Auth** | Email + Google, role admin, AuthGuard automatique |

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
app/                          # Expo Router (file-based)
├── _layout.tsx               # Root : GestureHandler + AuthProvider
├── index.tsx                 # Splash → redirection
├── (tabs)/
│   ├── _layout.tsx           # Stack layout
│   ├── index.tsx             # TabPager Reanimated (Catalog ↔ Profil)
│   ├── catalog.tsx           # Catalogue
│   ├── profile.tsx           # Profil
│   └── scan.tsx              # Scanner overlay
├── auth/
│   ├── login.tsx             # Connexion email + Google
│   └── register.tsx          # Inscription
├── catalog/[id].tsx          # Détail parfum
└── admin.tsx                 # Administration

src/
├── services/     (9)         # Firebase, Firestore, Fragella, GPT-4o, FCM…
├── hooks/        (7)         # useAuth, useScanReducer, useCatalog, useFavoris…
├── contexts/     (1)         # AuthContext (Provider + Hook)
├── components/   (2)         # ParfumCard, AppLoader
├── features/scan/(7)         # ScanScreen + 6 sous-états
├── models/       (5)         # Interfaces + seed
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
  → Confidence haute ? → Fragella → Résultats
  → Confidence basse ? → Clarification manuelle → Fragella
  → Résultat → Catalogue | Réessayer
```

---

## 🔑 Configuration Firebase

1. Crée un projet sur [Firebase Console](https://console.firebase.google.com)
2. Télécharge `google-services.json` et place-le à la racine (⚠️ `.gitignore`-d)
3. Active **Authentication** (Email/Password + Google)
4. Active **Firestore Database** + **Storage**
5. Déploie les Cloud Functions :
   ```bash
   firebase use parfumscan-60549
   firebase deploy --only functions
   # ⚠️ Les fonctions sont déployées en europe-west1
   #    Le client doit utiliser _functions('europe-west1'), pas _functions()
   ```
6. Configure le `webClientId` Google Sign-In dans `app/_layout.tsx`

---

## 🛠️ Scripts

| Commande | Description |
|---|---|
| `npm start` | Lance Expo Go |
| `npm run android` | Development build Android |
| `npm run ios` | Development build iOS |
| `npm run env:setup` | Copie `.env.example` → `.env` |
| `npm run functions:build` | Compile les Cloud Functions |
| `npm run functions:deploy` | Déploie les Cloud Functions |
| `npm run emulators` | Lance les émulateurs Firebase |
| `build_release.bat` | Build APK release Android → `android/app/build/outputs/apk/release/` |

---

## 🎨 Design System

- **Couleur primaire** : `#7C3AED` (violet)
- **Accent** : `#D4A574` (or champagne)
- **Succès** : `#10B981` (vert)
- **Typographie** : Playfair Display (titres) + Inter (corps)
- **45 tokens** dans `src/theme/theme.ts`

---

## 📄 Licence

MIT — voir [LICENSE](./LICENSE)
