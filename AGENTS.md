# ParfumScan React — Environment & Commands (v6.14)

## Environnement local (Windows)
| Variable | Valeur |
|---|---|
| ANDROID_HOME | `C:\Users\Pierre-Louis\AppData\Local\Android\Sdk` |
| ADB | `%ANDROID_HOME%\platform-tools\adb.exe` |
| Émulateur AVD | `Pixel_7_Pro` |
| PowerShell | ExecutionPolicy restreinte → utiliser `cmd /c` ou `Start-Process` |

## Commandes

### Development Build (mode complet — recommandé)
```bash
# ⭐ Script tout-en-un (2 modes)
start.bat           # Mode FAST : Metro uniquement (pas de rebuild Gradle)
start.bat build     # Mode BUILD complet : Gradle + install + Metro

# Méthode manuelle :
emulator -avd Pixel_7_Pro
adb wait-for-device
adb shell getprop sys.boot_completed  # doit = 1
npx expo run:android
```
✅ Firebase, GPT-4o Vision, Camera, Haptics, Reanimated
🔄 Fast Refresh automatique après le 1er build (~3-5 min)
⚠️ Sur Windows : le script `.bat` évite les problèmes d'ExecutionPolicy PowerShell

### Expo Go (mode dégradé)
```bash
npx expo start           # QR code → Expo Go
npx expo start --web     # navigateur
```
⚠️ Modules natifs NON disponibles

### Build Release
```bash
# ⚠️ NE PAS utiliser assembleDebug pour un téléphone —
#     le debug nécessite Metro (sinon blocage splash screen).
#     Toujours utiliser assembleRelease pour un APK autonome.

# Android : build release (production) — APK autonome, JS embarqué
.\build_release.bat      # Gradle assembleRelease
```
→ APK release : `android/app/build/outputs/apk/release/app-release.apk`

### Installer sur téléphone (USB)
```bash
# Brancher le téléphone en USB (débogage USB activé)
adb devices                # doit montrer le device

# Option 1 : Development build direct
npx expo run:android       # build + installe en une commande

# Option 2 : Installer un APK déjà buildé
adb install android/app/build/outputs/apk/release/app-release.apk
```

### iOS Development Build (macOS + Xcode requis)
```bash
npx expo run:ios           # development build sur simulateur ou device
npx expo run:ios --configuration Release  # build release
```

### EAS Build (cloud — recommandé pour iOS sans Mac)
```bash
npx eas build --platform ios      # IPA dans le cloud
npx eas build --platform android  # AAB dans le cloud
npx eas submit --platform ios     # soumettre à l'App Store
npx eas submit --platform android # soumettre au Play Store
```

### Cloud Functions
```bash
npm run functions:build
npm run functions:deploy   # → europe-west1
```

### TypeScript
```bash
npx tsc --noEmit     # vérifier la compilation (0 erreur attendu)
```

### Tests
```bash
npx jest --ci         # 166 tests, 13 suites, ~6s
npm test              # watch mode
npm run test:ci       # CI mode avec couverture
```

## Stack
react-native 0.86.0 · expo ~57 · expo-router ~57
@react-native-firebase/* ^25 · expo-camera ~57 · expo-image ~57 · expo-splash-screen ~57
react-native-gesture-handler ~2.32 · react-native-reanimated ~4.5 · react-native-worklets 0.10
react-native-svg ^15 · react-native-pager-view ^8.0 · @react-native-vector-icons/ionicons ^13
@react-native-async-storage/async-storage · expo-navigation-bar ~57 · expo-system-ui ~57 · typescript ~6.0
react-hook-form ^7.81 · zod ^4.4
expo-speech-recognition ^56 · expo-audio ~57 · expo-file-system ~57 · expo-location ~57

## Notes v6.14 — Voix, Météo & Images WebP (22/07/2026)

**Recherche vocale** : nouveau module complet avec architecture dual-mode. `useVoiceSearch` hook wrappe `expo-speech-recognition` (STT on-device, 60+ marques en `contextualStrings`) + `expo-audio` (enregistrement audio en parallèle). Fallback `transcribeVoice` Cloud Function (OpenAI Whisper-1) quand le STT local ne trouve rien. `VoiceOverlay` — panneau overlay 5 phases (listening/searching/results/empty/error) avec transcript live, top 5 ParfumCard compact, lien "Voir tous les résultats". Intégré dans la barre de recherche du TabPager (long-press 400ms) et dans l'écran `/search` (bouton micro toggle). Dépendances : `expo-speech-recognition`, `expo-audio`, `expo-file-system`.

**Météo & suggestions** : module complet de météo avec suggestion de parfum adapté. `useWeather` hook → `expo-location` (GPS + fallback ville stockée) → Open-Meteo API (gratuit, sans clé). `WeatherWidget` pastille compacte dans la page Parfumerie (icône + température + "Parfait pour X" si SOTD). `weather-scoring.ts` — algorithme de scoring basé sur `familleOlactive` du wardrobe (12 familles × 31 codes WMO × saisons × jour/nuit). Tri "Météo" dans la FilterBar. SOTDPicker pré-trié par score météo + badge `85%` coloré. Cloud Function `sendWeatherNotifications` (every day 07:00 Europe/Paris) — fetch Open-Meteo + scoring serveur-side + FCM push. Coordonnées persistées dans `users/{uid}/settings/preferences`. Toggle "Suggestions météo" dans Settings. Dépendance : `expo-location`.

**Migration images WebP + background removal** : `scripts/migrate-webp.ts` — conversion batch JPEG/PNG → WebP (sharp quality 82), upload Firebase Storage. `scripts/migrate-bgremoval.ts` — suppression de fond bouteilles via `@imgly/background-removal-node` (MODNet) → PNG transparent → WebP alpha. Sous-processus isolé `scripts/bgremoval/`. Commandes : `npm run migrate-webp`, `npm run migrate-bg`. Dépendances dev : `sharp`, `tsx`.

**Cloud Functions mises à jour** : `sendWeatherNotifications` créée, `transcribeVoice` créée, `searchFragrance` supprimée (orpheline). `npm run functions:build && npm run functions:deploy`.

**Settings** : toggle "Suggestions météo" (`weatherNotifs`). `getUserSettings` enrichi : `weatherLat`, `weatherLon`, `weatherNotifs`. Nouvelle méthode `saveWeatherCoords()`.

**Dépendances retirées** : `expo-notifications` (remplacé par FCM push).

## Notes v6.13 — Scan search & dedup
**Recherche scan** : nouvelle fonction `searchParfumFromScan()` — wrapper au-dessus de `searchParfumsCached` qui exploite la sortie structurée de GPT-4o (champs marque+nom séparés). Rescoring : +50 nom exact, +25 nom partiel, +15 marque exacte, +8 marque partielle. Le +50 garantit que le match exact écrase les variants/flankers plus populaires.

**ScanResults** : ne trie plus par prix — préserve l'ordre de pertinence de `searchParfumFromScan` (avant, le tri par bestPrice noyait le match exact derrière les EDT/Cologne moins chers).

**Dédoublonnage** : nouvelle fonction `_dedupByMarqueNom()` — filtre les résultats par `normalize(marque)+'_'+normalize(nom)`, conserve le 1er (meilleur score). Appliqué dans `searchParfumsCached` (catalogue+scan), prefix cache, et `searchParfumFromScan`. Élimine les doublons Firestore (même parfum importé plusieurs fois avec des IDs différents).

## Notes v6.12 — Quality hardening & testing
Refactoring qualité final : `console.log` wrappés dans `if (__DEV__)` (3 occurrences firestore search). 12 `catch {}` vides remplacés par `console.warn` (CatalogPage, firestore, useAuth, fcm, user-data, favorites, history, \_layout). `ProfileAvatar` refactoré en `getStyles(t: Theme)` + `useMemo`. Design guide v1.1 finalisé (accessibilité, StyleSheet.create, TextInput, radius, Reanimated, couleurs invariantes). 2e passe d'audit : 0 `fontWeight`, 0 `as any`, 0 `StyleSheet.create` thématique, 8/8 `onSnapshot` error callbacks, 100% `getStyles` + `useMemo`.

**Suite de tests** : 166 tests, 13 suites, ~6s. Infrastructure Jest 29 + `jest-expo` + mock Firestore in-memory. Couvre : 5 utils (normalize, translate-note, error-translator, ownership, note-descriptions), 3 hooks (useScanReducer 26 tests, useCatalog 12 tests, useDensityPreference 13 tests), 3 composants (Button 12 tests, PriceDisplay 17 tests, EmptyState 11 tests), 2 services (user-data 14 tests, wardrobe 14 tests). `npm test` / `npm run test:ci`. `npx tsc --noEmit` clean sur src/ et app/.

## Notes v6.11
Refactoring qualité : `useCallback` sur tous les handlers passés aux enfants (16 fichiers, 30+ handlers). `try/catch` + `console.warn` sur toute la couche service (12 fonctions `user-data.ts`, 7 fonctions `wardrobe.ts`, `storage.ts`). Hooks `useWardrobe` et `useShelves` : méthodes wrappées dans `useCallback`. `useEffect` deps corrigées (`catalog/[id].tsx` similars, `ScanScreen.tsx` scan steps). `.catch()` ajoutés sur 22 appels Firestore non protégés dans 7 écrans. `getStyles` + `useMemo` systématique (1 oubli corrigé dans `OlfactoryPyramid`). Couleurs hardcodées remplacées par tokens (6 dans `catalog/[id]`, 2 dans `admin`). `gridKey` ne change plus au changement de thème. Design guide mis à jour v1.1 : accessibilité texte, `StyleSheet.create` clarifié, `TextInput` styling, couleurs invariantes documentées, `lg`/`xl` retirés de la grille de spacing.

## Notes v6.10
Recherche refaite : cache Map (prefix cache local + hit complet), dual query Firestore (1 token → `array-contains` + `orderBy reviewCount`, 2+ tokens → `array-contains-any`), `exactMatch` réservé aux queries multi-mots, signal composite `Math.max(reviewCount, ratingCount, popularityScore)`, bonus `/2`, scoring single-pass (boucle for), tri pop-first pour 1 token, 50 résultats, debounce 150ms, requestIdRef anti-race. Barre de recherche fixe en haut (ne disparaît plus au scroll). Parfums similaires : scoring par accords partagés (`mainAccords`, `array-contains-any`) + `orderBy popularityScore`, ParfumCard compact. Cache TTL 24h sur `similarIds`. Auth : `KeyboardAvoidingView` sur Android (login + register). Réimport 46 nouvelles marques → ~25 100 parfums, `popularityScore` backporté sur tous les docs. Nouveaux index Firestore composites : `searchKeywords` + `reviewCount` et `mainAccords` + `popularityScore`. Déployer les index avec `firebase deploy --only firestore:indexes`.

## Notes v6.9
Favoris : chips famille remplacés par bouton unique « Famille » → ActionSheet + chip dismissible, densité partagée avec le catalogue via `useDensityPreference`. Historique : `ScanHistoryCard` refactorée en wrapper — scans réussis délèguent à `ParfumCard` + overlay (dot statut + date + compteur ×N), no-result/error en layout compact natif. Densité applicable aux scans réussis. `BrandSheet` : bottom sheet alphabétique A-Z (60+ marques, barre de recherche, index latéral). Pager remplacé : `GestureDetector` + Reanimated au lieu de `react-native-pager-view` — résolution native des conflits de swipe avec `activeOffsetX(30)` + `failOffsetY(15)`. « Voir tout → » scroll à la grille via `scrollToIndex` au lieu de push vers recherche. `GRID_MODES` centralisé dans `useDensityPreference`.

## Notes v6.8
Refonte catalogue v2 — structure hybride rangées éditoriales + grille filtrable. Suppression chips famille olfactive (remplacés par dilution dans sections nommées + cartes d'ambiance « Explorer par famille »). Capsules marques rectangulaires (top 10 + « Toutes → »). `ParfumCard` 4 modes : `compact` (rangées, 140px), `comfortable` (grille défaut, tags+notes+price dot), `compactPlus` (grille dense, image 90px), `list`. Price dots colorés deal/fair/overpriced. Densité persistée AsyncStorage (`@parfumscan/catalog-density`), partagée catalogue + recherche. Recherche : chips famille supprimées, contrôles de densité identiques à la grille. Nouveaux composants : `BrandCapsules`, `CatalogRow` (collapse/expand), `FamilyAmbianceCards` (6 cartes theme-aware avec Ionicons). Nouveau hook : `useDensityPreference`.

## Notes v6.7
Parfumerie (ex « Garde-robe ») — icône `flask`. Favoris en grille (filtres famille, tri, ActionSheet). Historique groupé par période (Aujourd'hui/Hier/Cette semaine...), scans sauvegardés dans tous les états (no-result, error). `ActionSheet` bottom sheet custom. Dénormalisation `bestPrice`/`referencePrice`/`annee` dans UserFavori/UserScan. Back gesture edge-pan (40px strip gauche) sur fiche détail catalog. SOTDPicker ancré au-dessus de la carte (position absolute, sans Reanimated). `ImageViewerPopup` : tap sur la photo du parfum → popup plein écran. Recherche en grille 2 colonnes (`compact`). Images en `contain` (pas de crop). Parfums similaires triés par popularité + shuffle journalier. Recherche par préfixes (scoring `startsWith` + bonus `reviewCount`).

## Docs
Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/
React Native Reanimated: https://docs.swmansion.com/react-native-reanimated/
Design system « Luxe malin » : `.clinerules/design-guide.md`

## Données — Pipeline d'import

### Catalogue seed (~25 100 parfums, 239 marques)

Le catalogue est importé depuis un scrape Fragrantica Apify, puis nettoyé et hébergé en autonome.
Zéro dépendance à l'API Fragella pour les données de base.

```
data/raw/ (1.27 GB, non versionné) → data/clean/ (31 MB) → Firestore parfums/{id}
```

### Scripts

| Commande | Fichier | Rôle |
|---|---|---|
| `npm run clean-data` | `scripts/clean-apify.ts` | Nettoie les 193 JSON scrapés : débruite, déduplique, strip champs traçants |
| `npm run import-data` | `scripts/import-firestore.ts` | Import Firestore + upload images → Firebase Storage |
| `npm run clean-fragella` | `scripts/clean-fragella.ts` | Supprime tous les parfums importés via l'ancienne API Fragella (`source: 'fragella-cached'`) |

### Authentification import

Nécessite un compte de service Firebase :
1. Console Firebase → Project Settings → Service Accounts → Generate key
2. Sauvegarder le JSON → `service-account.json` à la racine (gitignoré)
3. Le script le lit via `firebase-admin` (v13+, API modulaire)

### Décisions clés

| Décision | Raison |
|---|---|
| Zéro référence Fragella dans les données | Indépendance totale |
| Images : 1 JPG 375×500 par parfum (pas de PNG transparent) | Seule source dispo dans le scrape (vignettes, pas full-size) |
| Images hébergées sur Firebase Storage | Pas de dépendance CDN externe (fimgs.net) |
| `imageUrlTransparent` = null, `imageFallbacks` = [] | Non disponibles dans le scrape, non nécessaires pour l'UI |
| `source` = `'seed'` | Distingue les données importées des données API live |
| Photos communauté (`images[]`, photogram) supprimées | Contenu utilisateur, risque légal, jamais affiché |