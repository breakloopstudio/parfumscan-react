# ParfumScan React — Environment & Commands (v6.18)

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
npx jest --ci         # 194 tests, 15 suites, ~22s
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

## Notes v6.17 — Fiche détail refonte + polices réellement chargées (22/07/2026)

**P0 polices** : Inter/Playfair n'étaient chargées nulle part (fallback système silencieux Android, crash iOS potentiel). Ajout `@expo-google-fonts/inter` + `@expo-google-fonts/playfair-display` + `useFonts` dans `_layout.tsx` (rendu bloqué jusqu'à `fontsLoaded`). Italique `PlayfairDisplay_700Bold_Italic` activée pour la ligne éditoriale.

**Fiche détail** : refonte UX/UI complète. `DetailHero` remplace `HeroPriceOverlay` (prix retiré de l'image). Prix unique dans le flux. Sections renommées : « En résumé » → « Tenue & sillage » (jauge Popularité supprimée, `popularityScore` reste interne), « Toutes les offres » → « Comparer les marchands », « Parfums similaires » → « Dans le même esprit », « Saisonnalité »+« Occasions » → « Quand le porter » (saisons en 4 colonnes verticales, occasions en chips top 3). Bug day/night corrigé : whitelist `normalizeSeasonKey` + `rankAndDedupe`. Ligne éditoriale italique « Hiver · Soirée ». `StickyBottomBar` devient barre d'action flottante (langage DockBar) + icône `flask`. Titres de section à pastille teintée sémantique (plus d'emojis).

**Design system v1.2** : 8 tokens saisonniers (`seasonSpring/Summer/Fall/Winter` + Soft, light+dark), patterns 4.9-4.11 (titre éditorial, colonnes de saison, barre flottante), règle useFonts en checklist.

## Notes v6.18 — Auth v2, Search hardening, OfflineBanner global, Weather simplifié (23/07/2026)

**Auth v2** : validation email regex, toggle visibilité mot de passe, mot de passe oublié (`sendPasswordResetEmail`), gestion `auth/cancelled` silencieux (Google), `textOn()` pour texte dynamique sur fond coloré. `KeyboardAvoidingView` corrigé (plus de `height` sur Android). SafeAreaInsets.

**Search hardening** : `SearchError` typé, limité à 4 tokens (triés par taille décroissante), trigrammes filtrés par stop words. Prefix cache : prend la query la plus peuplée, retombe Firestore si < 5 résultats. `anySucceeded` guard → `SearchError` si toutes les queries échouent (plus de `[]` silencieux). `onParfumsByMarque` (dead code) supprimé. `peekSearchCache()` / `clearSearchCache()` exportés. `docToParfum()` utilisé partout. `searchParfumFromScan` propage les erreurs. `_scanScore` copie spread (plus de mutation).

**useCatalog** : `peekSearchCache()` pour sauter le rate budget sur cache hit. `rateLimited` state + fallback gracieux (résultats précédents conservés). `error` state.

**Weather simplifié** : suppression `getStoredCity`/`setStoredCity` (GPS only, plus de fallback ville). 10s abort timeout fetch. Permission en deux étapes : `getForegroundPermissionsAsync()` d'abord, `requestForegroundPermissionsAsync()` seulement si `undetermined`. Délai initial 1s.

**VoiceOverlay** : safe areas + hauteur max dynamique (42% window, cap 360). Champ `query` dans phases searching/results. Separator line. `pointerEvents="box-none"`. Accessibilité voix.

**TabPager** : vérification réseau avant recherche vocale. `showMicFab` plus précis (caché si overlay visible, pas seulement listening). `textOn()` pour icône micro.

**OfflineBanner global** : `OfflineBanner` dans `_layout.tsx` (visible sur tous les écrans). État `reconnected` avec bannière 2.5s.

**Contrast utility** : `contrast.ts` — `textOn(bgHex)` basé WCAG luminance. Utilisé dans auth, TabPager.

**Theme** : 8 tokens saisonniers `seasonXxx`/`seasonXxxSoft` (light+dark). `dealInk`/`overpricedInk`/`fairInk`. `textMuted` éclairci `#6E6963`.

**Tests** : 194 tests, 15 suites. Test `error-translator` corrigé (unknown code → générique FR).

**Scripts** : `audit-search-fields.ts`, `backfill-search-fields.ts`.

## Notes v6.16 — Scan stability, BrandSheet, Pager gestures (22/07/2026)

**Scan stability** : phase 1–3 du diagnostic (15 bugs). Auth obligatoire sur `analyzePerfumeImage` (CF), payload state-driven (plus de `pendingAnalysis` ref), bouton Annuler sur ScanLoading, resize images `expo-image-manipulator` → 1024px (~100-300KB au lieu de 4MB), timeouts client 90s / serveur 120s, JSON mode GPT-4o + retry JSON invalide. Erreurs réseau Firestore → `SCAN_ERROR` (plus de `[]` silencieux), chemin `low-confidence` → `ScanClarify`, analyse immédiate (plus de délai 2.5s), suppression `step`/`STEP_1`/`STEP_2`/`SCAN_STEPS` (dead code), volumeMl correctement passé. Compteur burst visible ("1/3"), burst 1-appel `analyzeMultipleImages`, retry sans re-capture depuis `ScanError`, `KeyboardAvoidingView` sur `ScanClarify`. Dépendances : `expo-image-manipulator`.

**BrandSheet** : refonte complète (11 bugs). Strip en colonne sibling (plus d'overlay absolu), hauteurs fixes `ROW_H=48`/`HEADER_H=40` → offsets exacts via `scrollToOffset` (plus de dérive `getItemLayout`), mapping y→lettre exact via cellules `flex:1`, active = pill primary (plus de `fontSize` change → zéro jitter), loupe Reanimated (zéro `setState` 60fps), highlight de la lettre visible via `onScroll`, haptics sur changement de lettre, strip masquée en recherche, état vide.

**BrandCapsules** : `useRouter()` dead code retiré, `borderStyle: 'dashed'` cassé Android → fond `primarySoft` + icône flèche.

**Pager gestures** : `onHorizontalScrollActive` câblé de bout en bout (auparavant code mort v6.9). Le pager se désactive pendant le drag d'une rangée horizontale interne (BrandCapsules, CatalogRow, FamilyAmbianceCards, FilterBar pills). `.enabled(!sheetOpen && !rowScrollActive && !overlayVisible)`. Garde-fou `setRowScrollActive(false)` dans `goTo()`. 4 fichiers modifiés : `index.tsx`, `collection.tsx`, `FilterBar.tsx`, `reference.md`.

**Tests** : 185 tests, 14 suites. Tests `useScanReducer` mis à jour (suppression `SCAN_STEPS`/`STEP_1`/`STEP_2`, ajout 2 tests payload images/scanResult). Nouveaux tests `useScanPipeline` : 15 tests sur le pipeline analyse→recherche (GPT, recherche, clarify, erreurs, garde-fous, historique).

**Architecture** : `useScanPipeline` extrait le pipeline métier (GPT-4o → recherche Firestore → historique), testable via `renderHook` + mock des services. `ScanScreen` passe de ~300 lignes à ~140 lignes (rendu + handlers UI uniquement).

## Notes v6.15 — Flacon Runner (endless runner, 22/07/2026)

**Easter egg** : mini-jeu Flacon Runner accessible depuis Settings (5 taps sur le numéro de version). Endless runner vertical avec saut/double-saut, obstacles (cristaux), bonus réduction, combo aérien, near-miss, score chase lisse, countdown 3·2·1, palette progressive, speed lines, sons WAV synthétisés, skins déblocables, pause auto AppState, milestones (Nez confirmé / Expert / Maître parfumeur / Légende). Toute la logique est sur le UI thread (SharedValues + useFrameCallback + useAnimatedStyle), zéro `setState` en boucle.

**Architecture** : `src/features/runner/` — 10 fichiers :
- `useRunnerLoop.ts` — game loop via `useFrameCallback` (physique, collisions, spawn, scoring)
- `RunnerGame.tsx` — intégration (gestes, cycle de vie, score chase, sons, shake, milestones, skins)
- `RunnerBottle.tsx` — flacon joueur (squash/stretch aérien, landing spring, death flash)
- `RunnerBackground.tsx` — 2 couches parallaxe seamless avec wrapping périodique
- `RunnerGround.tsx` — sol défiant avec marques
- `RunnerObstacles.tsx` — pool de 8 cristaux (4 types + volant), rendus via opacity toggling
- `RunnerPickups.tsx` — pool de 4 badges réduction (altitudes variables)
- `RunnerSpeedLines.tsx` — traits de vitesse horizontaux (opacité liée à la vitesse)
- `runner-sounds.ts` — 4 WAV synthétisés (jump, pickup, death, record) via `expo-audio`
- `runner-types.ts` — types, constantes, helpers AABB, altitudes
- `runner-storage.ts` — high score + skins persistés AsyncStorage

**Dépendances** : `react-native-reanimated` (useFrameCallback, SharedValue, useAnimatedStyle), `react-native-gesture-handler` (Gesture.Tap), `expo-audio` (useAudioPlayer), `@react-native-async-storage/async-storage`.

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