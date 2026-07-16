# Bilan refonte UI/UX — ParfumScan

**Direction** : « Luxe malin » — violet profond `#6C3ED9` + doré/ambré `#C8945A` + teal `#0D9488`  
**Polices** : Playfair Display (display) + Inter (body)  
**Dates** : Juillet 2026  
**Total** : ~35 fichiers modifiés/créés, 0 `fontWeight` résiduels
**Dark Mode** : +31 fichiers (3 nouveaux + 28 modifiés), 6 phases, palette « Luxe profond »

---

## Phase A — Design system

| Fichier | Action | Détail | Reste à faire |
|---|---|---|---|
| `src/theme/theme.ts` | **Modifié** | 26 tokens couleur (nouveaux + rétrocompatibilité), 4 shadows, spacing grid, fonts renommés `heading`→`display` | Nettoyer les clés rétrocompatibilité (`violetSoft`, `reward`, etc.) une fois tout le code migré |
| `src/components/Button.tsx` | **Nouveau** | 4 variantes (primary/secondary/outline/ghost), 3 états (default/loading/disabled), icône optionnelle | — |
| `src/components/PriceDisplay.tsx` | **Nouveau** | Prix animé Reanimated, couleur contextuelle deal/fair/overpriced, badge -X%, prix barré | — |
| `src/components/SectionHeader.tsx` | **Nouveau** | Titre Playfair + sous-titre + lien d'action | — |
| `src/components/EmptyState.tsx` | **Nouveau** | 4 variantes (collection/wishlist/favoris/historique), icône + CTA | — |

---

## Phase B — Scan & fiche détail

| Fichier | Action | Détail | Reste à faire |
|---|---|---|---|
| `src/features/scan/ScanIdle.tsx` | **Refondu** | Halo animé respirant (Reanimated loop), Playfair 28px, safe area, `insets.bottom` | — |
| `src/features/scan/ScanCamera.tsx` | **Refondu** | Flash blanc overlay (Reanimated sequence), `runOnJS(onCapture)`, coins violets | — |
| `src/features/scan/ScanLoading.tsx` | **Refondu** | Particules flottantes déterministes (useMemo), halo rotatif, texte cyclique ("Analyse des notes..."), prop `step` supprimée | — |
| `src/features/scan/ScanResults.tsx` | **Modifié** | Tri par prix croissant, teal au lieu du vert pomme, `fontFamily` | — |
| `src/features/scan/ScanScreen.tsx` | **Modifié** | `<ScanLoading step={...}>` → `<ScanLoading />` | — |
| `src/hooks/useScanReducer.ts` | **Modifié** | `SCAN_STEPS` mis à jour ("Capture du flacon", "Analyse IA", "Comparaison des prix") | — |
| `app/catalog/[id].tsx` | **Refondu** | `PriceDisplay` + `Button` intégrés, 3 boutons d'action (Favori/Collection/Wishlist), indicateur tendance prix 📉📈, comparateur prix magasin vs en ligne, AccordBar couleurs thème, `danger`→`favorite` | Brancher les vrais handlers Collection/Wishlist aux hooks (actuellement `Alert.alert('À venir')`) — **backend user-data prêt** |

---

## Phase C — Profil, Settings & Onboarding

| Fichier | Action | Détail | Reste à faire |
|---|---|---|---|
| `src/features/profile/ProfilePage.tsx` | **Refondu** | 3 onglets Collection/Wishlist/Favoris avec compteurs, profil olfactif à barres, header sobre (settings+logout), historique repliable, menu contextuel "..." (Déplacer vers + Retirer), `EmptyState` | — |
| `app/settings.tsx` | **Nouveau** | Alertes prix (switch), devise EUR, notifs push, déconnexion, suppression compte, mentions légales | Brancher les switches au backend (FCM pour alertes prix, système de notifs) |
| `app/onboarding.tsx` | **Nouveau** | 3 slides avec swipe PanGesture + snap, dots animés, AsyncStorage `@parfumscan_onboarding_done` | Intégrer le déclenchement au premier lancement dans `_layout.tsx` (rediriger vers `/onboarding` si flag absent) |
| `app/_layout.tsx` | **Modifié** | Routes `settings` + `onboarding` enregistrées, onboarding exempté de l'AuthGuard | Lancer l'onboarding automatiquement au 1er lancement |
| `src/hooks/useCollection.ts` | **Nouveau** | Hook Firestore temps réel pour la collection | — |
| `src/hooks/useWishlist.ts` | **Nouveau** | Hook Firestore temps réel pour la wishlist (avec `familleOlactive`) | — |
| `src/services/user-data.ts` | **Étendu** | `collCol`, `wishCol`, `onCollection`, `addToCollection`, `removeFromCollection`, `onWishlist`, `addToWishlist`, `removeFromWishlist` | Ajouter `moveToCollection`/`moveToWishlist` atomiques (supprimer de la source + ajouter à la destination) pour le menu "Déplacer vers" |
| `src/models/user-collection.interface.ts` | **Nouveau** | Interface `UserCollectionItem` | — |
| `src/models/user-wishlist.interface.ts` | **Nouveau** | Interface `UserWishlistItem` | — |
| `src/models/index.ts` | **Modifié** | Exports des nouveaux types | — |

---

## Phase D — Polish

| Fichier | Action | Détail | Reste à faire |
|---|---|---|---|
| `src/features/catalog/CatalogPage.tsx` | **Refondu** | Chips de navigation par famille olfactive (Frais/Boisé/Oriental/Floral), tri (Pertinence/Prix↑/Prix↓), `fontWeight`→`fontFamily` | Brancher les chips famille au search (requiert endpoint de recherche par famille olfactive) |
| `src/components/OfflineBanner.tsx` | **Nouveau** | Bannière réseau animée slide-down, icône wifi-off | Intégrer dans le `_layout.tsx` avec le hook `useNetwork` (déjà présent dans `src/hooks/useNetwork.ts`) |
| `app/auth/login.tsx` | **Poli** | Icône rose en cercle, `fontWeight`→`fontFamily`, thème cohérent | — |
| `app/auth/register.tsx` | **Poli** | Icône person-add, `fontWeight`→`fontFamily`, thème cohérent | — |
| `src/components/ParfumCard.tsx` | **Poli** | 13 `fontWeight`→`fontFamily` | — |
| `src/features/scan/ScanClarify.tsx` | **Poli** | 4 `fontWeight`→`fontFamily` | — |
| `src/features/scan/ScanError.tsx` | **Poli** | 1 `fontWeight`→`fontFamily` | — |
| `src/features/scan/ScanNoResult.tsx` | **Poli** | 1 `fontWeight`→`fontFamily` | — |
| `src/features/catalog/OlfactoryPyramid.tsx` | **Poli** | 3 `fontWeight`→`fontFamily` | Réécrire en cercles concentriques (spécifié dans le plan §3.2 mais non prioritaire) |
| `src/components/ErrorBoundary.tsx` | **Poli** | 1 `fontWeight`→`fontFamily` | — |
| `app/admin.tsx` | **Poli** | 5 `fontWeight`→`fontFamily` | — |
| `app/(tabs)/index.tsx` | **Poli** | 2 `fontWeight`→`fontFamily` dans la tab bar | — |
| `package.json` | **Modifié** | Ajout de `@react-native-async-storage/async-storage` | — |

---

## Phase E — Dark Mode « Luxe profond »

| Fichier | Action | Détail |
|---|---|---|
| `src/theme/theme.ts` | **Modifié** | Double palette `lightTheme` + `darkTheme`, 26 tokens couleur ×2, ombres → bordures en dark |
| `src/theme/ThemeContext.tsx` | **Nouveau** | `ThemeProvider` + `useTheme()` hook + StatusBar dynamique |
| `src/services/theme-storage.ts` | **Nouveau** | Persistance AsyncStorage, 3 modes `system`/`light`/`dark` |
| `app/_layout.tsx` | **Modifié** | Wrapper `ThemeProvider` au-dessus de `AuthProvider`, fond dynamique |
| `app/settings.tsx` | **Modifié** | Section « Apparence », segmented control 3 modes |
| `src/components/*` (8) | **Migrés** | `Button`, `ParfumCard`, `EmptyState`, `PriceDisplay`, `SectionHeader`, `AlertPriceToggle`, `AppLoader`, `OfflineBanner` |
| `src/features/scan/*` (8) | **Migrés** | `ScanScreen`, `ScanCamera`, `ScanIdle`, `ScanLoading`, `ScanResults`, `ScanClarify`, `ScanError`, `ScanNoResult` |
| `src/features/catalog/*` (2) | **Migrés** | `CatalogPage`, `OlfactoryPyramid` |
| `app/catalog/[id].tsx` | **Migré** | 746 lignes — inner components `StatBar`/`AccordBar`/`SectionTitle` reçoivent `s` + `t` |
| `src/features/profile/ProfilePage.tsx` | **Migré** | `ListItemImage` reçoit `t` en prop |
| `app/(tabs)/index.tsx` | **Migré** | TabPager hybride : styles layout statiques + `getStyles(t)` pour les couleurs |
| `app/auth/*` (2) | **Migrés** | `login.tsx`, `register.tsx` |
| `app/onboarding.tsx` | **Migré** | 3 slides swipe |
| `app/admin.tsx` | **Migré** | Styles inline migrés vers `getStyles(t)` |

**Architecture** : `ThemeContext` séparé d'`AuthContext` → thème disponible sans authentification. Pattern `getStyles(t: Theme)` + `useMemo` dans tous les composants. `useColorScheme()` natif pour détecter le mode système. Persistance AsyncStorage (`@parfumscan/theme`).

**Palette dark** : fond `#0B0712` (violet-noir profond), surfaces `#15101E`/`#1D1728`, texte `#EDE8F5`, violet `#8B6CF6`, doré `#D4A960`, teal `#2DD4BF`. Ombres remplacées par bordures subtiles `rgba(255,255,255,0.06–0.08)`.

**Exception** : `ErrorBoundary.tsx` (class component) garde `lightTheme` en import direct — pas de hooks possible.

---

## Composants créés (inventaire)

| Composant | Emplacement | Utilisé dans |
|---|---|---|
| `Button` | `src/components/Button.tsx` | `catalog/[id]`, `EmptyState` |
| `PriceDisplay` | `src/components/PriceDisplay.tsx` | `catalog/[id]` |
| `SectionHeader` | `src/components/SectionHeader.tsx` | (prêt à l'emploi) |
| `EmptyState` | `src/components/EmptyState.tsx` | `ProfilePage` |
| `OfflineBanner` | `src/components/OfflineBanner.tsx` | (prêt, à intégrer dans `_layout`) |

---

## Features non connectées — backlog

| # | Feature | Statut UI | Statut backend | Action |
|---|---|---|---|---|
| 1 | Boutons Collection/Wishlist sur fiche détail | ✅ Intégré (`catalog/[id].tsx`) | Hooks + Firestore prêts | — |
| 2 | Menu "Déplacer vers..." dans le profil | ✅ Context menu migré | ✅ `moveToCollection`/`moveToWishlist`/`moveFavori` atomiques (batch Firestore) | — |
| 3 | Onboarding auto au 1er lancement | ✅ `app/index.tsx` vérifie AsyncStorage | — | — |
| 4 | Bannière hors-ligne | ✅ Intégré dans `_layout.tsx` | `useNetwork` actif | — |
| 5 | Alertes prix (Settings) | ✅ Switches connectés | ✅ `getUserSettings`/`updateUserSetting` dans Firestore + FCM | Cloud Function de surveillance des prix (V2) |
| 6 | Navigation par famille olfactive (catalogue) | ✅ Chips déclenchent `search()` | ✅ Via `searchFragranceByQuery` + cache Firestore | — |
| 7 | Parfums similaires (fiche détail) | ✅ Carrousel horizontal | ✅ `getSimilarFragrances` → `/fragrances/similar` | Cache Firestore pour les similaires (V2) |
| 8 | Pyramide olfactive v2 (cercles concentriques) | ✅ 3 cercles concentriques Reanimated | — | — |
| 9 | Vue "Toutes les offres" multi-marchands | ✅ Liste expansible (`parfum.offers`) | API Fragella — `offers[]` déjà présent dans le modèle | — |
| 10 | Alertes prix (toggle sur fiche détail) | ✅ `AlertPriceToggle` créé + intégré | ✅ `isPriceAlertActive`/`setPriceAlert` dans `users/{uid}/priceAlerts` | Cloud Function pour l'envoi (V2) |

---

## Contraintes vérifiées

- ✅ **0 `fontWeight`** dans `src/` et `app/` — tout en `fontFamily`
- ✅ **Pas de gamification** — pas de niveaux, badges, ou scores
- ✅ **Scan = FAB**, pas un onglet — structure conservée
- ✅ **Pas de 3e police** — Playfair Display + Inter uniquement
- ✅ **Pas de swipe/drag** entre listes — menu contextuel "Déplacer vers..."
- ✅ **Pas d'économies totales** — prix affiché au cas par cas
- ✅ **Auth optionnelle** — app fonctionnelle sans compte
- ✅ **EUR uniquement** en V1
- ✅ **3 boutons distincts** sur la fiche détail
- ✅ **Onboarding** au 1er lancement, sans demande de compte
- ✅ **Ombres iOS** : 4 props obligatoires sur toutes les ombres
- ✅ **Tous les composants** sont des fonctions React avec `StyleSheet.create()`
