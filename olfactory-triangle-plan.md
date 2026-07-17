# Plan — Pyramide olfactive en triangle ✅

**Intent** : Remplacer les 3 cercles concentriques de `OlfactoryPyramid` par un triangle à 3 bandes horizontales, avec transitions animées et polissage premium.

**Statut** : Implémenté (v3)

## 1. Design retenu

Triangle équilatéral pointe vers le haut, 3 bandes horizontales (Fond → Cœur → Tête). Technique : 3 `View` superposées avec le border trick CSS (zéro dépendance).

```
         ▲  ── Tête (52 px)
        ──── Cœur (104 px)
       ────── Fond (156 px)
```

## 2. Améliorations visuelles (v3)

| Feature | Détail |
|---------|--------|
| **Contour** | Triangle légèrement plus grand (160/92) derrière les bandes, couleur `border` à 30% d'opacité |
| **Transition actif/inactif** | Scale via `withSpring` (1.04 actif / 1.0 inactif), opacité via `withTiming` (1.0 / 0.3) |
| **Pulse** | Oscillation subtile 0.93↔1.0 sur la bande active, cycle de 3.2s |
| **Entrée** | Séquencée base→cœur→tête (140ms d'intervalle), overshoot à 1.08 |
| **Badge actif** | Pastille "Notes de tête/cœur/fond" sous le triangle, fond `soft` + texte `ink` |
| **Ombre** | Non appliquée (le shadow rectangulaire sur une forme triangulaire serait incohérent) |

## 3. Fichier modifié

- `src/features/catalog/OlfactoryPyramid.tsx` — 262 lignes

## 4. Technique

- 12 `useSharedValue` (4 par bande : entryScale, activeScale, activeOpacity, pulse)
- 3 `useAnimatedStyle` — toujours appelés, pas de violation des règles de hooks
- Border trick : `width: 0, height: 0` + `borderLeft/RightColor: 'transparent'` + `borderBottomColor: couleur`
- Aucune dépendance externe ajoutée
