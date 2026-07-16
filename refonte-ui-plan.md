# Plan de refonte UI/UX — ParfumScan

**Statut** : en cours de revue
**Dernière mise à jour** : 2026-07-16
**Fichier brief source** : `PROMPT_REFONTE_UI-1.md`

---

## Résumé de l'intention

Refonte complète du design system et de l'interface de ParfumScan, une app React Native (iOS + Android) qui scanne des flacons de parfum via IA et trouve le meilleur prix en ligne. L'objectif est de fusionner deux identités — luxe olfactif et comparateur de prix malin — en une seule direction artistique cohérente, tout en résolvant des défis UX majeurs (triple relation collection/wishlist/favoris, fiche détail riche sans saturation, expérience de scan mémorable).

---

## 1. Direction artistique

### 1.1 Concept directeur : « Le luxe de savoir »

L'app ne vend pas du parfum ni ne crie « promo ». Elle donne à l'utilisateur le **pouvoir de l'information** — connaître la vraie valeur d'un parfum, comme un initié. L'esthétique emprunte aux codes du luxe épuré (maroquinerie, joaillerie, design gallery) mais les met au service de la transparence.

**Références mentales** :
- Un intérieur de boutique concept store : bois clair, lumière naturelle, verre fumé
- L'édition limitée d'un beau livre — le parfum comme objet culturel
- L'élégance sobre d'un terminal Bloomberg : les données traitées avec respect

### 1.2 Palette — proposition d'évolution

Le violet primaire et le doré secondaire actuels forment une bonne base, mais le contraste chaud/froid peut être affiné pour mieux servir la double identité.

```
┌─ Palette proposée ──────────────────────────────────────┐
│ Rôle           │ Token actuel     │ Proposition          │
├────────────────┼──────────────────┼──────────────────────┤
│ Fond           │ #FAF8F5 (beige)  │ #F7F4F0 (lin chaud) │
│ Surface        │ #FFFFFF          │ #FFFFFF              │
│ Primaire       │ #7C3AED (violet) │ #6B3FA0 (violet     │
│                │                  │ profond, plus noble) │
│ Accent luxe    │ #D4A574 (doré)   │ #C4A265 (or mat,    │
│                │                  │ moins jaune)         │
│ Accent deal    │ #10B981 (vert)   │ #0D9488 (teal,       │
│                │                  │ premium, pas discount)│
│ Texte          │ #1F1A2E          │ #1A1520 (plus doux)  │
│ Pyramide Tête  │ #059669          │ conservé             │
│ Pyramide Coeur │ #D97706          │ conservé             │
│ Pyramide Fond  │ #7C3AED          │ → #6B3FA0            │
└──────────────────────────────────────────────────────────┘
```

<!-- TODO: valider les contrastes d'accessibilité (ratio ≥ 4.5:1 pour le body) -->

### 1.3 Typographie — proposition d'évolution

```
┌─ Typographie ────────────────────────────────────────────┐
│ Usage           │ Actuel              │ Proposition       │
├─────────────────┼─────────────────────┼───────────────────┤
│ Display (titres)│ Playfair Display    │ Cormorant Garamond│
│                 │                     │ (plus raffiné,    │
│                 │                     │ italiques riches) │
│ Body            │ Inter               │ Inter (conservé)  │
│ Mono/data       │ —                   │ JetBrains Mono    │
│                 │                     │ (prix, données)   │
│ Chiffres/Prix   │ —                   │ Inter avec        │
│                 │                     │ tabular-nums      │
└──────────────────────────────────────────────────────────┘
```

<!-- TODO: vérifier disponibilité Cormorant Garamond sur Google Fonts pour Expo -->

### 1.4 Grille d'espacement

```
Base : 4px
Échelle : 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80
```

### 1.5 Ombres — raffinement

Passer d'ombres violettes systématiques à un système à 3 niveaux contextuels :
- **Élévation basse** (cartes) : neutre, gris très léger
- **Élévation moyenne** (FAB, bottom sheets) : neutre
- **Élévation haute** (modals, tooltips prix) : teinte légèrement chaude

---

## 2. Architecture des écrans

### 2.1 Navigation — proposition

```
Root Stack
├── Onboarding (3 écrans, 1re visite uniquement)
├── Auth Stack
│   ├── Login
│   └── Register
├── Main Pager (swipe horizontal, conservé)
│   ├── Catalogue
│   │   ├── Recherche (header persistant)
│   │   ├── Résultats / Suggestions
│   │   └── → Fiche détail [id]
│   └── Profil
│       ├── En-tête utilisateur
│       ├── Onglets : Collection | Wishlist | Favoris
│       ├── Historique de scans
│       └── → Paramètres
├── Fiche détail [id] (slide from right)
├── Scan (modal overlay fullscreen)
└── Admin (slide from bottom)
```

### 2.2 Écrans — inventaire complet

| #  | Écran                | États à couvrir                          |
|----|----------------------|------------------------------------------|
| 1  | Onboarding           | 3 slides, skip, dernière slide → login   |
| 2  | Login                | idle, loading, erreur, email non vérifié |
| 3  | Register             | idle, loading, erreur                    |
| 4  | Catalogue (vide)     | suggestions personnalisées, populaires   |
| 5  | Catalogue (recherche)| résultats, chargement, aucun résultat    |
| 6  | Fiche détail         | chargement, succès, erreur, image absente|
| 7  | Scan — idle          | viseur plein écran, bouton capture       |
| 8  | Scan — analyse       | animation iris, 3 étapes avec progression|
| 9  | Scan — résultat      | liste fiches, révélation prix animée     |
| 10 | Scan — aucun résultat| état vide, suggestion recherche manuelle |
| 11 | Scan — clarification | formulaire, chips marques populaires     |
| 12 | Scan — erreur        | message, bouton réessayer                |
| 13 | Profil — Collection  | liste, état vide, actions sur item       |
| 14 | Profil — Wishlist    | liste, état vide, alertes prix actives   |
| 15 | Profil — Favoris     | liste, état vide, actions sur item       |
| 16 | Profil — Historique  | liste chronologique, état vide           |
| 17 | Paramètres           | alertes prix, devise/région, mentions    |
| 18 | Admin                | sélecteur parfum, upload image           |

---

## 3. Défis de design — résolutions proposées

### 3.1 Collection / Wishlist / Favoris : le problème des 3 listes

**Problème** : 3 listes conceptuellement distinctes mais visuellement identiques = confusion.

**Solution** : **Métaphore visuelle différenciée par espace, pas par libellé.**

| Espace    | Métaphore            | Visuel                          | Geste d'ajout         |
|-----------|----------------------|----------------------------------|-----------------------|
| Collection| Étagère / vitrine    | Grille 2 colonnes, grandes images| « Je l'ai »           |
| Wishlist  | Ruban / bookmarks    | Liste horizontale scrollable     | « Je le veux »        |
| Favoris   | Carnet / moodboard   | Liste verticale épurée, miniatures| Cœur (toggle rapide) |

**Implémentation UI** :
- Proposer un **unique bouton cœur** sur la fiche détail, avec un **appui long** qui ouvre un menu radial ou bottom sheet : « Ajouter à ma collection » / « Ajouter à ma wishlist » / simple favori.
- Appui court = toggle favori (le plus fréquent).
- Sur la carte dans les listes, le cœur est déjà présent. L'utilisateur peut glisser vers la gauche pour « wishlist » ou vers la droite pour « collection » (gestes optionnels, non bloquants).

### 3.2 Fiche détail : prioriser les actions sans saturer

**Hiérarchie des actions** (de la plus visible à la plus discrète) :

| Priorité | Action               | Emplacement                | Raison                         |
|----------|----------------------|----------------------------|--------------------------------|
| P0       | Prix + Acheter       | Bandeau sticky en bas      | Action business critique       |
| P0       | Favori (cœur)        | En-tête, près du nom       | Action émotionnelle #1         |
| P1       | Alerte prix          | Dans le bandeau prix       | Intention d'achat différée     |
| P1       | Voir offres          | Juste sous le bandeau prix | Comparaison multi-marchands    |
| P2       | Ajouter Collection   | Menu « … » + appui long    | Action occasionnelle           |
| P2       | Ajouter Wishlist     | Menu « … » + appui long    | Action occasionnelle           |
| P2       | Partager             | Menu « … »                 | Action rare                    |
| P2       | Parfums similaires   | Section dédiée en bas      | Découverte, pas action         |

**Layout fiche détail** :
```
┌─────────────────────────────┐
│ ← Retour          ⋯ (menu) │  ← header
├─────────────────────────────┤
│                             │
│       Image héro           │  ← 280px, dégradé en bas
│                             │
├─────────────────────────────┤
│ MARQUE              ♡ cœur │
│ Nom du parfum               │
│ Famille · Année · Genre·Type│  ← badges
│ ★★★★☆ 4.2                  │
├─────────────────────────────┤
│ Meilleur prix               │
│ 89,90 €    au lieu de 120€  │  ← zone deal (sticky bottom ?)
│ [Économisez 30,10 €] [Acheter] │
│ ☰ Comparer les offres (3)   │
│ 🔔 Alerte si < 80€         │
├─────────────────────────────┤
│ Pyramide olfactive          │
│ ┌─ Notes de Tête ─┐        │
│ │ bergamote, citron│        │
│ ├─ Notes de Cœur ─┤        │
│ │ jasmin, rose     │        │
│ └─ Notes de Fond ─┘        │
├─────────────────────────────┤
│ Accords principaux          │
│ ████████░░ Boisées  85%    │
│ ██████░░░░ Florales 62%    │
├─────────────────────────────┤
│ Saisonnalité                │
│ Printemps ████████ 80%     │
├─────────────────────────────┤
│ Occasions                   │
│ Bureau ██████ 60%          │
├─────────────────────────────┤
│ Parfums similaires          │  ← carrousel horizontal
│ [carte] [carte] [carte]     │
└─────────────────────────────┘
```

**Question ouverte** : le bandeau prix doit-il être sticky en bas (toujours visible, mais prend de la place) ou intégré dans le scroll (plus élégant, mais moins accessible) ? La recommandation est **sticky en bas** car l'achat est la conversion principale — le bandeau peut être fin (56px) et élégant.

### 3.3 L'expérience de scan : rendre 3 secondes mémorables

**Concept : l'iris qui s'ouvre**

1. L'utilisateur pointe le viseur sur le flacon. Un cadre subtil (coins arrondis, ligne fine dorée) suggère la zone de capture.
2. Au déclenchement : un **iris circulaire se referme** depuis les bords de l'écran vers le centre (animation 400ms, easing easeInOut), comme un obturateur d'appareil photo ou un diaphragme.
3. Pendant l'analyse (2-3s) : l'écran est noir avec un **point lumineux central qui pulse** doucement. Un filet de lumière (violet → doré) tourne lentement autour du point, évoquant le capuchon d'un flacon qu'on dévisse. Les 3 étapes défilent en dessous avec une typographie fine.
4. À l'arrivée du résultat : l'iris se rouvre en révélant la fiche du parfum identifié, avec un **effet de révélation** (opacité + scale de 0.95 à 1, 300ms).

**Spécifications techniques animation** :
- Iris : `react-native-reanimated` avec masque circulaire (`borderRadius: 9999` sur un `Animated.View` parent, animation de `width/height` de `screenSize * 2` à 0 puis 0 à `screenSize * 2`)
- Pulse central : `useSharedValue` pour scale (1 → 1.3 → 1), boucle `withRepeat(withSequence(...), -1)`
- Filet lumineux : `Animated.View` avec rotation continue (`withRepeat(withTiming(360, { duration: 3000 }), -1)`), masqué par un gradient radial
- Étapes : fondu enchaîné avec `opacity`, timing décalé

### 3.4 La révélation du prix : célébrer l'économie

**Trois cas** :

| Situation               | Traitement visuel                                    |
|-------------------------|------------------------------------------------------|
| Économie ≥ 15%          | Badge « Bon plan » avec animation scale-in + vert    |
|                         | Compteur qui défile jusqu'au montant économisé       |
| Prix normal (±5%)       | Affichage sobre, badge neutre « Prix du marché »     |
| Prix élevé (>+5%)       | Pas de mise en avant, simple affichage               |

**Animation du montant économisé** : un texte qui compte de 0 à la valeur économisée en 800ms avec `withTiming`, comme un compteur de caisse. Le badge pulse une fois à la fin.

**Question ouverte** : faut-il afficher le pourcentage d'économie ou le montant ? **Les deux** : le pourcentage est l'accroche émotionnelle (« −25% »), le montant est la preuve concrète (« 30,10 € »). Priorité visuelle au pourcentage.

---

## 4. Design system — spécifications détaillées

### 4.1 Tokens de couleur (React Native)

```ts
// src/theme/theme.ts — proposition de refonte
export const theme = {
  colors: {
    // Fondations
    background: '#F7F4F0',      // lin chaud
    surface: '#FFFFFF',
    surface2: '#F5F2ED',        // légèrement teinté

    // Marque
    primary: '#6B3FA0',         // violet profond
    primarySoft: '#EDE5F5',
    primaryInk: '#4A2A75',

    // Accent luxe
    gold: '#C4A265',            // or mat
    goldSoft: '#FBF6ED',

    // Accent deal (teal au lieu de vert criard)
    deal: '#0D9488',
    dealSoft: '#E6F7F5',

    // Pyramide olfactive
    pyramidTop: '#059669',
    pyramidTopSoft: '#ECFDF5',
    pyramidHeart: '#D97706',
    pyramidHeartSoft: '#FFFBEB',
    pyramidBase: '#6B3FA0',
    pyramidBaseSoft: '#F5F3FF',

    // Fonctionnels
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',

    // Texte
    text: '#1A1520',
    textMuted: '#8B8580',
    textInverse: '#FFFFFF',

    // Bordures & divers
    border: '#E8E4DF',
    borderFocus: '#6B3FA0',
  },
  // ...
};
```

### 4.2 Tokens de typographie

```ts
fonts: {
  display: { fontFamily: 'CormorantGaramond_600SemiBold' },
  displayItalic: { fontFamily: 'CormorantGaramond_500Medium_Italic' },
  heading: { fontFamily: 'CormorantGaramond_600SemiBold' },
  body: { fontFamily: 'Inter_400Regular' },
  bodyMedium: { fontFamily: 'Inter_500Medium' },
  bodySemiBold: { fontFamily: 'Inter_600SemiBold' },
  mono: { fontFamily: 'JetBrainsMono_400Regular' },
  price: { fontFamily: 'Inter_600SemiBold' }, // tabular nums via variant
  size: {
    xs: 10, sm: 12, base: 14, md: 16, lg: 18,
    xl: 20, '2xl': 24, '3xl': 30, '4xl': 36,
  },
},
```

### 4.3 Tokens d'espacement

```ts
spacing: {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20,
  xl: 24, '2xl': 32, '3xl': 40, '4xl': 48, '5xl': 64, '6xl': 80,
},
```

### 4.4 Tokens d'ombres

```ts
shadow: {
  low: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  high: {
    shadowColor: '#6B3FA0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
},
```

### 4.5 Composants atomiques à créer

| Composant             | Props clés                              | Priorité |
|-----------------------|-----------------------------------------|----------|
| `Button`              | variant, size, loading, icon, fullWidth | P0       |
| `Input`               | label, error, leftIcon, rightIcon       | P0       |
| `Chip`                | label, active, color, onPress           | P0       |
| `Badge`               | variant (deal/info/neutral), animated   | P0       |
| `Card`                | variant (elevated/outlined/flat)        | P0       |
| `GaugeBar`            | value, color, label                     | P0       |
| `PriceDisplay`        | price, referencePrice, discountPct, animated | P0  |
| `EmptyState`          | icon, title, description, action        | P1       |
| `SectionHeader`       | title, subtitle, action                 | P1       |
| `PyramidSegment`      | layer (top/heart/base), notes, expanded | P1       |
| `PerfumeImage`        | uri, size, fallback                     | P1       |
| `TabBar`              | tabs, activeIndex, onChange             | P2       |
| `BottomSheet`         | visible, children                       | P2       |

---

## 5. Spécifications d'animation

### 5.1 Transitions entre écrans

| Transition              | Animation                                    | Durée  |
|-------------------------|----------------------------------------------|--------|
| Catalogue → Fiche       | Slide from right (conservé)                  | 300ms  |
| Fiche → Scan            | Scale down + fade out                        | 250ms  |
| Scan → Résultat         | Iris reveal (décrit en §3.3)                 | 600ms  |
| Résultat → Fiche        | Push depuis le bas                           | 300ms  |
| Onglets profil          | Fade out/in avec léger translateY (10px)     | 200ms  |
| Modal / Bottom sheet    | Slide up + backdrop fade                     | 300ms  |

### 5.2 Micro-interactions

| Interaction             | Animation                                    | Durée  |
|-------------------------|----------------------------------------------|--------|
| Cœur (favori toggle)    | Scale 1 → 1.3 → 1, couleur fill             | 300ms  |
| Prix (compteur)         | Défilement chiffres de 0 à valeur            | 800ms  |
| Bouton pressé           | Scale 0.97, puis retour                      | 150ms  |
| Pull to refresh         | Icône parfum qui tourne + pulse              | continu |
| Ajout collection        | Confetti miniature (particules dorées)        | 600ms  |
| Badge deal apparition   | Scale 0 → 1.1 → 1, bounce                    | 400ms  |
| Chip sélection          | Background color transition                  | 200ms  |

### 5.3 Courbes d'easing

- Entrée : `Easing.bezier(0.16, 1, 0.3, 1)` (courbe spring-like pour les apparitions)
- Sortie : `Easing.bezier(0.4, 0, 1, 1)` (accélération pour les disparitions)
- Élastique : `Easing.bezier(0.34, 1.56, 0.64, 1)` (pour les overshoots : cœur, badge)
- Standard : `Easing.inOut(Easing.ease)` (pour les opacités simples)

---

## 6. Plan d'implémentation

### Phase 1 — Fondations (design system)
- [ ] Mise à jour `src/theme/theme.ts` (couleurs, typo, espacement, ombres)
- [ ] Ajout polices Google Fonts (Cormorant Garamond, JetBrains Mono)
- [ ] Création composants atomiques : `Button`, `Input`, `Chip`, `Badge`, `Card`
- [ ] Création `EmptyState`, `GaugeBar`, `PriceDisplay`

### Phase 2 — Écrans core
- [ ] Refonte `ScanIdle` : nouveau viseur, iris animation placeholder
- [ ] Refonte `ScanCamera` : nouveau viseur, UI épurée
- [ ] Refonte `ScanLoading` : animation iris + pulse + filet lumineux
- [ ] Refonte `ScanResults` : révélation prix animée
- [ ] Refonte `ScanNoResult`, `ScanError`, `ScanClarify`
- [ ] Refonte `CatalogPage` : nouvelles suggestions, grille

### Phase 3 — Fiche détail
- [ ] Nouveau layout fiche détail (sticky price band)
- [ ] Menu radial / bottom sheet pour Collection/Wishlist/Favoris
- [ ] Refonte `OlfactoryPyramid` avec nouveau design system
- [ ] Section « Parfums similaires »

### Phase 4 — Profil
- [ ] Refonte `ProfilePage` : métaphore visuelle différenciée par espace
- [ ] Collection (grille), Wishlist (scroll horizontal), Favoris (liste)
- [ ] Nouvelle page Paramètres

### Phase 5 — Onboarding & finitions
- [ ] Création onboarding 3 écrans
- [ ] Refonte Login/Register
- [ ] États vides, erreurs, chargements partout
- [ ] Animations de transition entre écrans

---

## 7. Questions ouvertes

<!-- TODO: à trancher avec le product owner -->

1. **Onboarding** : 3 slides suffisent-ils ? Contenu proposé :
   - Slide 1 : « Scannez n'importe quel flacon » — illustration scan + flacon
   - Slide 2 : « Découvrez son histoire olfactive » — pyramide + notes
   - Slide 3 : « Payez le juste prix » — comparaison prix + économies
   
2. **Polices** : Cormorant Garamond est-il acceptable ou préfère-t-on rester sur Playfair Display (déjà intégré, moins de friction) ?

3. **Bandeau prix sticky** en bas de la fiche détail : valider que ça ne gêne pas la navigation swipe-back sur Android.

4. **Menu radial vs bottom sheet** pour l'ajout à Collection/Wishlist : le bottom sheet est plus natif, le radial plus distinctif mais plus complexe à implémenter. Recommandation : **bottom sheet** (plus simple, déjà familier aux utilisateurs).

5. **Compteur de prix animé** : le temps de défilement (800ms) est-il acceptable ou préfère-t-on un affichage immédiat avec simple pulse ?

6. **Parfums similaires** : cette feature n'existe pas encore côté backend (Fragella). Faut-il la maquetter comme placeholder ou l'omettre ?

7. **Devise/région** : quelles devises et régions supporter en V1 ? (EUR-FR uniquement, ou multi-pays ?)

---

## 8. Prochaine étape

1. **Relire ce document** et répondre aux questions ouvertes (§7)
2. **Valider la direction artistique** (§1) : palette, typographie, concept « Le luxe de savoir »
3. **Prioriser les phases** (§6) : ordre, périmètre, ce qui peut attendre une V2
4. Une fois le plan approuvé, dire **« go »** pour lancer la génération des fichiers de design system et des écrans en React Native
