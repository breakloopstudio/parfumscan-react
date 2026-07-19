# ParfumScan React — Environment & Commands (v6.6)

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
✅ Firebase, Fragella (Cloud Functions), GPT-4o Vision, Camera, Haptics, Reanimated
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

## Stack
react-native 0.86.0 · expo ~57 · expo-router ~57
@react-native-firebase/* ^25 · expo-camera ~57 · expo-image ~57 · expo-splash-screen ~57
react-native-gesture-handler ~2.32 · react-native-reanimated ~4.5 · react-native-worklets 0.10
react-native-svg ^15 · react-native-pager-view ^8.0 · @react-native-vector-icons/ionicons ^13
@react-native-async-storage/async-storage · expo-navigation-bar ~57 · expo-system-ui ~57 · typescript ~6.0

## Notes v6.6
Parfumerie (ex « Garde-robe ») — icône `flask`. Favoris en grille (filtres famille, tri, ActionSheet). Historique groupé par période (Aujourd'hui/Hier/Cette semaine...), scans sauvegardés dans tous les états (no-result, error). `ActionSheet` bottom sheet custom. Dénormalisation `bestPrice`/`referencePrice`/`annee` dans UserFavori/UserScan. Back gesture edge-pan (40px strip gauche) sur fiche détail catalog. SOTDPicker ancré au-dessus de la carte (position absolute, sans Reanimated).

## Docs
Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/
iOS cross-platform rules: `.clinerules/rules.md` §17
Design system « Luxe malin » : `.clinerules/design-guide.md`

## Données — Pipeline d'import

### Catalogue seed (21 567 parfums, 193 marques)

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