# Spec : Dock Flottant Osmotique — Implémentation

**Source** : Prototype HTML `navigation-prototype.html` validé — juillet 2026
**Direction design** : « Luxe malin » (cf. `.clinerules/design-guide.md`)

---

## 1. Ce qui change vs l'existant

| Actuel | Nouveau |
|---|---|
| 2 pages (Catalog ↔ Profil) avec swipe | 4 écrans indépendants (Catalog, Favoris, Historique, Collection) |
| FAB scan isolé entre 2 onglets | FAB scan central dans un dock 5 positions |
| Profil = fourre-tout (favoris, collection, wishlist, historique, compte) | Profil disparaît. Favoris, Historique, Collection deviennent des écrans dédiés. Compte → avatar en header. |
| Barre = pill opaque avec ombre | Barre = verre dépoli (`rgba(bg, 0.88)` + blur 24px), bordure subtile |
| Indicateur violet sous le tab | Indicateur **doré** (`#C8945A`) qui glisse, positionné au-dessus des tabs |
| 2 tabs | 4 tabs (Catalogue, Favoris, Historique, Collection) + 1 FAB |
| Pas de réaction au scroll | La barre se cache au scroll ↓, réapparaît au scroll ↑ |

---

## 2. Architecture visuelle du dock

```
┌──────────┬──────────┬────────────┬──────────┬──────────┐
│    📋    │    ❤️    │     📷     │    ⏱    │    📦    │
│ Catalogue│  Favoris │    SCAN    │Historique│Collection│
└──────────┴──────────┴────────────┴──────────┴──────────┘
                     indicateur doré
                     glissant au-dessus
```

### 2.1 Dimensions

| Élément | Valeur |
|---|---|
| Largeur dock | `width: '88%'`, `maxWidth: 380` |
| Hauteur dock | 64px (58px sur écran < 380px) |
| Border radius dock | 24px |
| Fond dock | `rgba(248, 246, 242, 0.88)` light / `rgba(11, 7, 18, 0.88)` dark |
| Blur dock | 24px (`expo-blur`, intensité 24) |
| Bordure dock | 1px, `rgba(border, 0.6)` |
| FAB | 56×56 (48×48 sur petit écran), `borderRadius: 28` (24) |
| Icônes tabs | 22px (20px sur petit écran) |
| Labels tabs | 10px `Inter_500Medium` (9px sur petit écran) |
| Indicateur | 28×3px, `borderRadius: 2`, couleur `secondary` (doré) |
| Spacing icône↔label | `gap: 3` |

### 2.2 Ombres

```
dock :      shadowColor #1A1520, opacity 0.06, radius 12, y=2
            + shadowColor #1A1520, opacity 0.10, radius 32, y=8
fab :       shadowColor #6C3ED9, opacity 0.40, radius 16, y=4
            + shadowColor #6C3ED9, opacity 0.25, radius 32, y=8
```

En dark mode : ombres remplacées par des bordures subtiles (cf. design-guide.md §8.2).

---

## 3. Écrans à créer/modifier

### 3.1 Nouveaux écrans (extraire de ProfilePage)

**`src/features/favorites/FavoritesPage.tsx`**
- Extrait de `ProfilePage.tsx` : liste des favoris
- Header "Favoris" + compteur
- Pas de menu contextuel "Déplacer vers" (inutile ici)
- Garder le cœur plein (déjà favori)

**`src/features/history/HistoryPage.tsx`**
- Extrait de `ProfilePage.tsx` : historique des scans
- Groupé par date (Aujourd'hui, Hier, Cette semaine, ...)
- Header "Historique" + compteur
- Swipe-to-delete ou ellipsis pour supprimer

**`src/features/collection/CollectionPage.tsx`**
- Fusionne Collection + Wishlist en 2 sections
- Section "Possédés" avec badge violet
- Section "Wishlist" avec badge doré "À acheter"
- Header "Collection" + compteur total

### 3.2 Écrans modifiés

**`src/features/catalog/CatalogPage.tsx`**
- Ajouter un avatar en haut à droite (remplace l'accès Profil)
- Avatar → navigate vers `settings.tsx`
- Si pas connecté : icône personne → `auth/login`

**`app/(tabs)/index.tsx` → refonte complète**
- Remplacer le pager 2 pages par 4 pages OU conditional rendering par tab actif
- Nouveau dock en bas (le composant principal de ce rework)
- Garder Reanimated pour l'indicateur et le show/hide au scroll

**`app/(tabs)/_layout.tsx`**
- Probablement simplifié ou supprimé (tout dans `index.tsx`)

**`app/(tabs)/scan.tsx`**
- **Intégralement inchangé** — tous les états du scan existant sont préservés :
  - Idle (bouton Scanner + import galerie)
  - Camera (vuefinder + capture)
  - Burst (3 photos)
  - Scanning (GPT-4o Vision)
  - Results / No-result / Clarify / Error
- Le FAB du dock déclenche `router.push('/(tabs)/scan')` (remplace l'ancien FAB)
- Aucune régression, aucun écran ou composant retiré du flux scan

### 3.3 Écrans supprimés ou réduits

**`src/features/profile/ProfilePage.tsx`**
- Devient obsolète. Son contenu est dispatché dans Favorites/History/Collection.
- Le header utilisateur + profil olfactif peut être déplacé dans `settings.tsx` ou supprimé.
- Conserver le code le temps de la migration, puis supprimer.

---

## 4. Comportements

### 4.1 Navigation entre écrans

4 écrans montés en parallèle (tous rendus, 1 visible) — pas de swipe horizontal.
Le dock change l'écran visible. Pas de gesture Pan entre écrans (trop complexe avec 4 pages + scan).

Alternative : garder le pager Reanimated mais avec 4 pages. Plus lourd mais plus fluide.
→ **Décision à prendre pendant l'implémentation.**

### 4.2 Indicateur doré

- Position absolue dans le dock
- Animation `withSpring` (damping: 22, stiffness: 280, mass: 0.7) entre les positions
- Calcul de `left` basé sur la position du tab actif dans le layout
- À mesurer avec `onLayout` sur chaque `dock-tab`

### 4.3 FAB — pulse ring

```tsx
// Reanimated — respiration infinie
const pulse = useSharedValue(1);
useEffect(() => {
  pulse.value = withRepeat(
    withTiming(1.18, { duration: 2500, easing: Easing.out(Easing.ease) }),
    -1,
    true
  );
  return () => cancelAnimation(pulse);
}, []);
```

Ring : `<Animated.View>` position absolute, `inset: -4`, `borderRadius: full`, `borderWidth: 1.5`, `borderColor: rgba(108,62,217,0.3)`.

Sur écran < 380px : pas de pulse ring (trop chargé).

### 4.4 Show/hide au scroll

```
scrollY > lastScrollY && scrollY > 60  → cache la barre (translateY: +120)
scrollY < lastScrollY                    → montre la barre (translateY: 0)
```

- `useSharedValue` pour `dockTranslateY`
- `withSpring(damping: 22, stiffness: 260)` pour l'animation
- Remettre à zéro quand l'écran change (`useEffect` sur `activeTab`)

### 4.5 Avatar header (Catalogue)

- Cercle 36×36, fond `primarySoft`, initiale utilisateur
- Si pas connecté : icône `person-outline`
- Au clic → `router.push('/settings')`
- Présent sur **tous** les écrans (Catalog, Favoris, Historique, Collection)
- Position : top-right du header de chaque écran

---

## 5. Points techniques React Native

### 5.1 Blur sur Android

CSS `backdrop-filter` ne fonctionne pas sur Android. Solution :

```tsx
import { BlurView } from 'expo-blur';

<BlurView intensity={24} tint={resolvedMode === 'dark' ? 'dark' : 'light'}
  style={StyleSheet.absoluteFill}
/>
<View style={{ backgroundColor: resolvedMode === 'dark'
  ? 'rgba(11,7,18,0.88)'
  : 'rgba(248,246,242,0.88)'
}}>
  {/* contenu du dock */}
</View>
```

Le `BlurView` + le fond semi-transparent recréent l'effet verre dépoli sur les 2 plateformes.

### 5.2 Expo Router — deep linking

Si on garde un seul fichier `index.tsx` avec 4 sous-écrans gérés par state, le deep linking ne peut pas cibler un écran spécifique.

**Solution** : utiliser les segments Expo Router :
```
app/(tabs)/
├── _layout.tsx          ← stack wrapper
├── index.tsx            ← Catalogue (default)
├── favorites.tsx        ← Favoris
├── history.tsx          ← Historique
├── collection.tsx       ← Collection
└── scan.tsx             ← Scan (inchangé)
```

Chaque écran est une route, le dock est un composant partagé dans `_layout.tsx`.
Avantage : deep linking, navigation par URL, `router.push('/(tabs)/favorites')`.

Inconvénient : plus de pager swipe (on passe en navigation par tabs). C'est acceptable vu qu'on passe de 2 à 4 écrans.

### 5.3 Conflits gesture handler

Le `PanGesture` du pager actuel est supprimé → plus de conflit avec les listes scrollables.
Chaque écran a sa propre `FlatList`/`ScrollView`, pas de gesture wrapper commun.
Le show/hide au scroll utilise `onScroll` des listes, pas un gesture handler.

### 5.4 Expo Blur — pièges

- `expo-blur` nécessite `expo-blur` dans `package.json`
- Le `BlurView` ne fonctionne pas en mode Expo Go (pas de modules natifs) → OK, le projet utilise un dev build
- `BlurView` avec `intensity={0}` peut causer un flash sur Android → toujours `intensity >= 1`
- Le `BlurView` + `borderRadius` nécessite `overflow: 'hidden'` sur le parent

### 5.5 Safe areas

Le dock doit intégrer `paddingBottom: insets.bottom` pour la barre de navigation Android.
Le wrapper du dock a déjà `paddingBottom: 8 + insets.bottom` dans l'actuel → à conserver.

---

## 6. Tâches (ordre de réalisation)

| # | Tâche | Fichier(s) |
|---|---|---|
| 1 | Créer `FavoritesPage.tsx` | `src/features/favorites/` |
| 2 | Créer `HistoryPage.tsx` | `src/features/history/` |
| 3 | Créer `CollectionPage.tsx` | `src/features/collection/` |
| 4 | Ajouter avatar header à `CatalogPage.tsx` | `src/features/catalog/CatalogPage.tsx` |
| 5 | Créer les routes `favorites.tsx`, `history.tsx`, `collection.tsx` | `app/(tabs)/` |
| 6 | Construire le composant `Dock` | nouveau `src/components/Dock.tsx` |
| 7 | Intégrer le Dock dans `_layout.tsx` | `app/(tabs)/_layout.tsx` |
| 8 | Refondre `index.tsx` (retirer l'ancien pager) | `app/(tabs)/index.tsx` |
| 9 | Nettoyer `ProfilePage.tsx` (garder ce qui est utile, virer le reste) | `src/features/profile/ProfilePage.tsx` |
| 10 | Adapter `settings.tsx` (ajouter les infos du profil olfactif ?) | `app/settings.tsx` |
| 11 | Installer `expo-blur` si pas déjà présent | `package.json` |
| 12 | Tester sur iPhone SE (375px) et grand écran | — |
| 13 | Mettre à jour `rules.md` §2 (architecture) | `.clinerules/rules.md` |

---

## 7. Fichiers de référence pendant l'implémentation

- Prototype HTML : `navigation-prototype.html`
- Guide de design : `.clinerules/design-guide.md`
- Règles projet : `.clinerules/rules.md`
- Thème : `src/theme/theme.ts`
- Hook thème : `src/theme/ThemeContext.tsx`
- Données utilisateur : `src/services/user-data.ts`
- Modèles : `src/models/` (parfum, user-collection, user-wishlist, user-favori, user-scan)

---

## 8. Checklist de fin de chantier

- [ ] 4 écrans fonctionnels (Catalog, Favoris, Historique, Collection)
- [ ] Dock verre dépoli sur iOS et Android
- [ ] Indicateur doré animé
- [ ] FAB pulse ring
- [ ] Show/hide au scroll
- [ ] Avatar header → settings
- [ ] Compatible iPhone SE (375px)
- [ ] Dark mode fonctionnel
- [ ] Pas de `fontWeight` dans le nouveau code
- [ ] Pas de couleurs hardcodées hors du thème
- [ ] `useTheme()` partout, jamais `import { theme }`
- [ ] Deep linking fonctionnel (`/(tabs)/favorites`, etc.)
- [ ] L'ancien ProfilePage ne crash pas (migration progressive)
