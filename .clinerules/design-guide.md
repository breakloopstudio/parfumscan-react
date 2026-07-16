# Guide de design — ParfumScan

**Direction** : « Luxe malin »  
**Version** : 1.0 — Juillet 2026  
**Cible** : iOS + Android (React Native)

---

## 1. Principes fondateurs

1. **Le luxe du savoir, pas du prix** — L'interface doit inspirer confiance et expertise, sans ostentation. Chaque élément visuel sert l'information, pas la décoration.

2. **Contraste par la couleur, pas par la taille** — Trois couleurs sémantiques (teal, doré, violet) portent le sens. La hiérarchie visuelle vient du jeu entre fonds atténués (soft) et accents saturés — jamais de tailles de police extrêmes.

3. **Mobile-first, pouce-first** — Toute l'interface est conçue pour une main, un pouce. Les actions critiques sont dans la moitié inférieure de l'écran. Les cibles tactiles font 44 px minimum.

4. **Réduction délibérée** — Une seule police display (Playfair), une seule police body (Inter). Un seul accent visible par écran (primaire OU secondaire, pas les deux). Les ombres sont légères, les bordures fines.

5. **Fluidité discrète** — Les animations sont fonctionnelles : feedback d'appui, transition d'état, célébration d'un résultat. Spring pour les gestes, timing pour les entrées. Rien ne distrait.

---

## 2. Règles d'usage des couleurs

### 2.1 Token → Contexte

| Token | Utilisation |
|---|---|
| `background` | Fond de page / écran entier. Jamais utilisé comme fond de carte. |
| `surface` | Fond de carte, liste, conteneur surélevé. |
| `surface2` | Fond secondaire : arrière-plan de chip inactif, séparateur de section, fond de rangée alternative. |
| `border` | Bordures : séparateurs de liste, divider, contour de carte si pas d'ombre. `StyleSheet.hairlineWidth` par défaut. |
| `text` | Texte principal : titre, corps, label actif. |
| `textMuted` | Texte secondaire : sous-titre, métadonnée, placeholder, caption. |
| `textInverse` | Texte sur fond sombre (rare — utilisé dans les badges, chips, boutons). Préférer `#FFFFFF` en dur dans ces cas. |
| `primary` | Bouton principal, icône active, texte d'action, indicateur sélectionné. |
| `primarySoft` | Fond d'icône, fond de chip actif (famille olfactive), fond d'état vide, hover/pressé sur ghost. |
| `primaryInk` | Texte sur fond `primarySoft` (chips, pastilles, labels). Plus foncé que `primary` en light, plus clair en dark. |
| `secondary` | **Jamais en UI fonctionnelle.** Réservé aux accents décoratifs : récompense, badge promo, indicateur année. |
| `secondarySoft` | Fond de badge secondaire (année), fond d'étiquette note de cœur. |
| `deal` | Prix bonne affaire (ratio < 0.8), badge économie, indicateur tendance baissière. |
| `dealSoft` | Fond de zone prix deal, fond de carte promo. |
| `overpriced` | Prix surévalué (ratio > 1.05), alerte. |
| `overpricedSoft` | Fond de zone prix surévalué. |
| `fair` | Prix correct (ratio 0.8–1.05). |
| `fairSoft` | Fond de zone prix correct. |
| `favorite` | Icône cœur actif (favori). **Identique à `overpriced`** en valeur (même rouge), sémantique différente. |
| `favoriteSoft` | Fond cœur (alerte favori). |
| `pyramidTop` | Note de tête — cercle pyramide, pastille de note, texte de chip. |
| `pyramidTopSoft` | Fond de la zone notes de tête. |
| `pyramidHeart` | Note de cœur — cercle pyramide, pastille de note. |
| `pyramidHeartSoft` | Fond de la zone notes de cœur. |
| `pyramidBase` | Note de fond — cercle pyramide, pastille de note. |
| `pyramidBaseSoft` | Fond de la zone notes de fond. |
| `reward` / `rewardSoft` | Badge promo (-X%), fond de badge. Identique à `secondary`/`secondarySoft`. |
| `danger` | État d'erreur, bouton destructif. |
| `success` | État de succès, confirmation. |
| `warning` | État d'avertissement, attention. |

### 2.2 Règle des soft/ink

Chaque couleur sémantique (primary, secondary/deal/reward, pyramidTop/Heart/Base, overpriced, fair) a **trois déclinaisons** :

```
couleur     → fond, icône, bordure active, texte de chip sur fond blanc
couleurSoft → fond atténué (arrière-plan de badge, zone colorée)
couleurInk  → texte sur fond soft (lisible, plus foncé en light, plus clair en dark)
```

**Pattern standard** :
```tsx
<View style={{ backgroundColor: t.colors.primarySoft }}>
  <Text style={{ color: t.colors.primaryInk }}>Label</Text>
</View>
```

### 2.3 Pièges à éviter

- ❌ `primary` ET `secondary` sur le même écran (hors pyramide)
- ❌ Texte body en `primary` — réservé aux actions
- ❌ Fond `background` sur une carte — utiliser `surface`
- ❌ `textMuted` sur fond `primarySoft` — utiliser `primaryInk`
- ❌ `favorite` pour autre chose que le cœur favori
- ❌ Du violet et du doré côte à côte comme couleurs d'action

---

## 3. Règles typographiques

### 3.1 Mapping police × usage

| Rôle | Police | Poids | Taille | Exemple |
|---|---|---|---|---|
| Titre de page (h1) | `PlayfairDisplay_700Bold` | 700 | 28–34 | "Cadre le flacon" |
| Titre de section (h2) | `PlayfairDisplay_600SemiBold` | 600 | 18–20 | "Ta collection", "Pyramide olfactive" |
| Titre de carte (h3) | `PlayfairDisplay_600SemiBold` | 600 | 18 | Nom du parfum |
| Marque (overline) | `Inter_400Regular` | 400 | 10–12 | Texte uppercase + `letterSpacing: 1–1.5` |
| Corps (body) | `Inter_400Regular` | 400 | 14–15 | Texte courant, descriptions |
| Corps emphatique | `Inter_500Medium` | 500 | 14 | Sous-titres, labels de champ |
| UI label | `Inter_600SemiBold` | 600 | 14–16 | Labels de bouton, onglets, titres de liste |
| Prix (grand) | `Inter_700Bold` | 700 | 32–42 | Prix affiché en gros |
| Prix (normal) | `Inter_800ExtraBold` | 800 | 18 | Prix dans carte (zone deal) |
| Badge / chip | `Inter_500Medium` | 500 | 11–13 | Famille olfactive, année, notes |
| Caption | `Inter_400Regular` | 400 | 11–13 | Texte d'aide, info secondaire |
| Placeholder | `Inter_400Regular` | 400 | 12 | "Rechercher un parfum..." |
| Compteur | `Inter_700Bold` | 700 | 11 | Nombre de notes dans pyramide |

### 3.2 Règle iOS stricte

**Jamais `fontWeight`.** Toujours `fontFamily`. C'est vérifié par lint — tout le codebase suit cette règle.

```tsx
// ✅ Correct
fontFamily: 'Inter_600SemiBold'

// ❌ Interdit
fontWeight: '600'
```

### 3.3 Hiérarchie par page

**Scan idle** : Playfair 28 → Inter 15 → Inter 17 (CTA) → Inter 12 (tip)  
**Fiche détail** : Playfair 28 (nom) → Inter 14 (marque uppercase) → Inter 32 (prix) → Playfair 18 (sections) → Inter 14 (corps)  
**Profil** : Playfair 24 (prénom) → Inter 14 (email) → Playfair 18 (onglets) → Inter 13 (liste)  
**Catalogue** : Playfair 18 (nom carte) → Inter 12 (marque) → Inter 11 (chips) → Inter 14 (prix deal)

### 3.4 Letter spacing

- Marque (overline) : `letterSpacing: 1.5` (12px) ou `1` (10px compact)
- Étiquette "Tête/Cœur/Fond" : `letterSpacing: 1`
- Aucun autre letterSpacing dans l'app

---

## 4. Patterns UI récurrents

### 4.1 Carte parfum (`ParfumCard`)

Deux variantes, un seul composant.

#### Compact (grille, carrousel, similaires)

```
┌──────────────────────────┐
│                          │
│       [image 130]        │ badge -X% top-right
│                          │
├──────────────────────────┤
│ MARQUE                    │
│ Nom du parfum             │
│ [Famille] [2024]          │
└──────────────────────────┘
```

- Largeur flexible (moitié d'écran en grille)
- `margin: 4`, `borderRadius: card (16)`
- Ombre `shadow.card`
- Badge promo : `reward` (doré), texte `Inter_800ExtraBold` 10px
- Titre 14px sur 2 lignes max avec `ellipsizeMode: 'tail'`
- Pas de zone prix en compact

#### Normal (liste, résultats de scan)

```
┌──────────────────────────┐
│                          │
│       [image 180]        │ badge -X% top-right
│     ▼ overlay gradient   │
├──────────────────────────┤
│ MARQUE                    │
│ Nom du parfum             │
│ [Famille] [2024]          │
│ Tête  note · note · note  │
├──────────────────────────┤
│ Dès  89.99 €  120.00 €   │ fond dealSoft
│            Voir l'offre → │
└──────────────────────────┘
```

- `marginHorizontal: 16`, `marginVertical: 6`
- Ombre `shadow.card`
- Badge promo : `reward` (doré), texte `Inter_800ExtraBold` 13px
- Notes de tête limitées à 3, jointes par " · "
- Zone prix en bas avec `borderTopWidth: hairlineWidth` + fond `dealSoft`
- CTA "Voir l'offre" en `Inter_700Bold` couleur `primary`

#### Placeholder sans image

Quand l'image est absente ou échoue : fond de couleur déterministe basée sur la marque (hash → palette 8 couleurs), initiale en Inter 700 72px blanc 50% opacité.

### 4.2 Bouton (`Button`)

4 variantes, toujours en `Inter_600SemiBold`.

| Variante | Fond | Texte | Hauteur | Border | Ombre |
|---|---|---|---|---|---|
| `primary` | `primary` | `#FFF` | 50 | — | `shadow.button` (violette) |
| `secondary` | `secondary` (doré) | `#FFF` | 50 | — | dorée (shadowOpacity: 0.25) |
| `outline` | transparent | `primary` | 50 | 1.5px `primary` | — |
| `ghost` | transparent | `primary` | 50 | — | — |

États :
- **Loading** : `ActivityIndicator` remplace l'icône, même couleur que le texte
- **Disabled** : `opacity: 0.5` (0.4 pour ghost)
- **Pressed** : `opacity: 0.85` sauf ghost → fond `primarySoft`
- **Avec icône** : Ionicons 20px, `marginRight: 2` avant le texte

`borderRadius: base (12)`, `paddingHorizontal: 24`, `gap: 8`.

### 4.3 Chip / Filtre

Deux variantes dans l'app :

#### Chip famille olfactive (tags)
```tsx
// Fond violetSoft, texte violetInk, bordure sans
backgroundColor: t.colors.violetSoft
color: t.colors.violetInk
fontFamily: 'Inter_500Medium'
fontSize: 11, paddingHorizontal: 10, paddingVertical: 4
borderRadius: 20
```

#### Chip sélecteur pyramide
```tsx
// État inactif : fond surface2, bordure transparente
// État actif : fond layerSoft, bordure layer.color
flexDirection: 'row', alignItems: 'center', gap: 6
paddingHorizontal: 14, paddingVertical: 8
borderRadius: 20, borderWidth: 1
// Dot 8×8 + label Inter 500 13px + compteur
```

#### Chip note (pyramide)
```tsx
// Fond layer.color (solide), texte blanc
backgroundColor: layer.color
color: '#FFFFFF'
fontSize: 12, fontFamily: 'Inter_500Medium'
paddingHorizontal: 12, paddingVertical: 5
borderRadius: 14
```

### 4.4 Badge prix/promo

```tsx
// Badge promo (-X%) — toujours positionné top-right de l'image
position: 'absolute', top: 12, right: 12
backgroundColor: t.colors.reward  // doré
color: '#1F1A2E'                  // texte foncé sur doré
fontFamily: 'Inter_800ExtraBold', fontSize: 13
paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20
```

```tsx
// Badge discount dans PriceDisplay — à côté du prix
backgroundColor: color             // deal/fair/overpriced
color: '#FFFFFF'
fontFamily: 'Inter_700Bold', fontSize: 13
paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10
```

### 4.5 Empty State (`EmptyState`)

4 variantes : `collection | wishlist | favoris | historique`.

```
        ┌──────┐
        │  🧪  │  icône Ionicons 32px dans cercle 72×72 fond primarySoft
        └──────┘
   Titre (Playfair 700, 20px)
   Description (Inter 400, 14px, textMuted, lineHeight 21)
   [       Bouton primary       ]
```

- Container centré, `paddingTop: 40`, `paddingHorizontal: 24`
- Description `maxWidth: 300`
- CTA = bouton primary, `minWidth: 220`

### 4.6 Section Header (`SectionHeader`)

```tsx
// Row : titre à gauche, action à droite (optionnelle)
flexDirection: 'row', justifyContent: 'space-between'
// Titre : Playfair 700, 18px, text
// Sous-titre optionnel : Inter 400, 13px, textMuted
// Action : Inter 600, 14px, primary
// HitSlop: 12 sur l'action
```

### 4.7 Loading Skeleton

Pas de skeleton screen. L'app utilise des animations contextuelles :
- **Scan loading** : particules flottantes + halo rotatif + texte cyclique
- **Chargement page** : spinner natif (`ActivityIndicator`) dans les boutons, pas de placeholder de contenu

---

## 5. Règles de spacing et layout

### 5.1 Grille de spacing

```
xs   = 4   → micro-gap (icône↔texte, dot↔label)
sm   = 8   → gap entre éléments liés (tags, boutons jumeaux)
base = 12  → padding intérieur carte, gap entre chips
md   = 16  → marge horizontale standard, padding card header
lg   = 20  → espacement entre sections
xl   = 24  → padding CTA, espace après titre
2xl  = 32  → espace après un bloc majeur
3xl  = 48  → rare — espacement global
```

### 5.2 Marges entre sections

```
┌─────────────────────────────────┐
│ paddingTop: safe area top       │
│                                 │
│ [Section titre]                 │
│ marginBottom: 16                │
│ [Contenu section]               │
│ marginBottom: 24                │
│ [Section suivante]              │
│                                 │
│ paddingBottom: safe area bottom │
└─────────────────────────────────┘
```

- `marginHorizontal: 16` sur les cartes et le contenu
- `marginVertical: 6` entre cartes dans une liste
- Espacement entre sections majeures : `marginTop: 24` ou `marginBottom: 24`
- Entre un titre de section et son contenu : `marginBottom: 12` ou `16`

### 5.3 Padding cartes

| Type | Padding |
|---|---|
| Carte normale (ParfumCard) | header 16px, body 16px horizontal / 8px vertical |
| Carte compacte (ParfumCard) | header 10px, body 10px horizontal / 4px vertical |
| PriceDisplay | 16px tout autour |
| Zone deal (ParfumCard footer) | 12px tout autour |
| OlfactoryPyramid container | 16px horizontal / 14px vertical |
| EmptyState | 40px top, 24px horizontal |

### 5.4 Radius

```
sm   = 8   → coins viseur scan, badge discount
base = 12  → boutons, inputs
card  = 16 → cartes parfum, PriceDisplay, pyramide NotesWrap
lg    = 20 → non utilisé actuellement
xl    = 24 → non utilisé actuellement
full  = 9999 → cercles (icône, halo, scan FAB)
```

### 5.5 Bordures

- Séparateurs : `borderTopWidth: StyleSheet.hairlineWidth`, couleur `border`
- Outline (bouton outline, scan import) : `borderWidth: 1.5`, couleur `primary`
- Chip sélecteur actif : `borderWidth: 1`, couleur variable
- Ring pyramide : `borderWidth: 2` (inactif) / `3` (actif)

---

## 6. Règles spécifiques mobile

### 6.1 Zone de pouce

Les actions principales sont placées dans la **moitié inférieure** de l'écran :
- Bouton "Scanner un flacon" → centré verticalement ou plus bas
- FAB scan → en bas à droite (onglet central)
- CTA fiche détail → après le scroll (visible sans scroller sur mobile standard)
- Boutons d'action profil → dans la zone visible

### 6.2 Taille minimale des cibles tactiles

**44 px minimum** (recommandation Apple HIG et Material Design).

Vérifications dans le code :
- `Button` : hauteur 50 px ✓
- `Pressable` dans `ScanIdle` : hauteur CTA 54px, outline 48px ✓
- Chip sélecteur pyramide : hauteur ~34px — compensé par `paddingHorizontal: 14` (= largeur adaptée), et `hitSlop` implicite via le flex gap
- `SectionHeader` action : `hitSlop: 12` explicite
- `ParfumCard` lien "Voir l'offre" : `hitSlop: 8`
- Pastille compteur pyramide : `paddingHorizontal: 6, paddingVertical: 2` — étroit, mais l'ensemble du bouton (label + dot + compteur) est la cible

### 6.3 Edge-to-edge et safe areas

L'app utilise `react-native-safe-area-context` :

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const insets = useSafeAreaInsets();
// paddingTop: insets.top (ou insets.top + 16 pour respirer)
// paddingBottom: insets.bottom
```

**Règle** : chaque écran full-screen gère ses propres safe areas. Ne pas wrapper toute l'app dans un SafeAreaView global — les écrans de scan ont des besoins différents de la fiche détail.

Cas spécifiques :
- **Scan idle** : `paddingTop: insets.top + 16`, tip à `bottom: 24 + insets.bottom`
- **Scan camera** : plein écran, pas de padding
- **Fiche détail** : `SafeAreaView` avec `edges={['top']}`, scroll gère le bas
- **Auth / Onboarding** : `SafeAreaView` complet

### 6.4 Barre de navigation Android

La couleur de fond de la barre système Android suit le thème actif :
```tsx
NavigationBar.setBackgroundColorAsync(theme.colors.background);
```
(Appelé dans un `useEffect` du `ThemeProvider` — `expo-navigation-bar` requis.)

### 6.5 StatusBar

Gérée dynamiquement par `ThemeContext` :
```tsx
<StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
```
Pas de `StatusBar` dans les écrans individuels.

---

## 7. Guidelines animation/transition

### 7.1 Ressorts vs timing

| Contexte | Animation | Configuration |
|---|---|---|
| Appui bouton | `Pressable` `pressed` state | Instantané (`opacity: 0.85`) |
| Apparition prix | `withSpring` | `stiffness: 200, damping: 10` |
| Entrée séquentielle (pyramide) | `withDelay` + `withTiming` | `delay: i * 150ms`, `duration: 200ms` |
| Respiration (halo scan) | `withRepeat` + `withTiming` | `duration: 2000ms`, `Easing.inOut(Easing.ease)` |
| Changement de thème | `LayoutAnimation.configureNext` | `LayoutAnimation.Presets.easeInEaseOut` |
| Swipe onboarding | `PanGesture` → `withSpring` | Snapping naturel, pas de config manuelle |
| Gesture sheet (catalogue) | `Gesture.Pan()` → `withSpring` | `damping: 20, stiffness: 200` |
| Slide down (OfflineBanner) | `withSpring` | Entrée/sortie fluide |

### 7.2 Durées recommandées

```
Feedback immédiat (pressé)      → 0ms (natif Pressable)
Transition d'état (loading→résultat) → 200–300ms
Entrée de page (apparition)     → 300–400ms
Animation d'attention (halo)     → 2000ms (boucle)
Animation séquentielle           → 150ms par élément
Transition thème                 → 300ms (LayoutAnimation)
```

### 7.3 Règles Reanimated

- **Toujours `cancelAnimation` dans le cleanup** des `useEffect` qui lancent des `withRepeat` (sinon fuite mémoire).
- **`runOnJS` pour les callbacks** depuis un worklet UI vers le thread JS :
  ```tsx
  const onCapture = () => { /* setState, navigation... */ };
  // Dans le worklet :
  runOnJS(onCapture)();
  ```
- **`useDerivedValue`** quand une valeur du thread UI dépend du thème :
  ```tsx
  const barBg = useDerivedValue(() => theme.colors.surface, [theme]);
  ```
- **Ne pas mélanger `withSpring` et `withTiming` dans une même séquence** sans raison. Spring = interactif/gestuel, timing = prédéfini.
- **Fade avant scale** : toujours `opacity` en même temps que `scale` pour éviter un "pop" brutal.

### 7.4 Easing pour les gestures

```tsx
// Swipe horizontal (onboarding)
withSpring(offset, { damping: 50, stiffness: 300 })

// Snap après drag
withSpring(snapPoint, { damping: 20, stiffness: 200 })

// Entrée fluide (pas d'overshoot)
withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })

// Respiration (boucle infinie)
withRepeat(
  withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
  -1,  // répétitions infinies
  true  // reverse (aller-retour)
)
```

---

## 8. Dark mode

### 8.1 Changements de couleurs

Tous les tokens changent — voir `theme.ts` pour le mapping complet. Résumé des transformations clés :

| Token | Light | Dark | Principe |
|---|---|---|---|
| `background` | `#F8F6F2` beige craie | `#0B0712` violet-noir | Fond profond, pas noir pur |
| `surface` | `#FFFFFF` | `#15101E` | Surfaces légèrement au-dessus du fond |
| `surface2` | `#F3F1ED` | `#1D1728` | Troisième niveau de profondeur |
| `primary` | `#6C3ED9` | `#8B6CF6` | Plus clair pour contraste sur fond sombre |
| `secondary` | `#C8945A` | `#D4A960` | Doré plus lumineux |
| `deal` | `#0D9488` | `#2DD4BF` | Teal plus vibrant |
| `text` | `#1A1520` | `#EDE8F5` | Blanc cassé chaud |
| `textMuted` | `#8B8580` | `#988EA8` | Gris à sous-ton violet |

**Règle** : les couleurs soft/ink suivent leur couleur parente. Les couleurs sémantiques (deal, overpriced, fair, favorite) s'éclaircissent en dark mode pour garder le contraste sur fond sombre.

### 8.2 Ombres → Bordures

En dark mode, les ombres noires sont invisibles. Tous les `shadow` tokens sont remplacés :

| Shadow token | Light | Dark |
|---|---|---|
| `shadow.card` | `shadowOpacity: 0.06`, `shadowRadius: 12`, `elevation: 3` | `borderWidth: 0.5`, `borderColor: rgba(255,255,255,0.06)` |
| `shadow.elevated` | `shadowOpacity: 0.08`, `shadowRadius: 16`, `elevation: 6` | `borderWidth: 1`, `borderColor: rgba(255,255,255,0.08)` |
| `shadow.button` | ombre violette `shadowOpacity: 0.3` | `borderWidth: 1`, `borderColor: rgba(139,108,246,0.25)` |
| `shadow.scanCircle` | ombre violette `shadowOpacity: 0.4` | `borderWidth: 1.5`, `borderColor: rgba(139,108,246,0.30)` |

**En pratique** : le code n'a rien à changer. Le spread `...t.shadow.card` continue de fonctionner — c'est le thème qui expose les bonnes valeurs selon le mode.

### 8.3 Contraste

- Ratio texte/fond ≥ 4.5:1 (WCAG AA) pour le texte normal
- `text` (`#EDE8F5`) sur `background` (`#0B0712`) = ratio ~15:1 ✓
- `textMuted` (`#988EA8`) sur `surface` (`#15101E`) = ratio ~4.8:1 ✓
- `primary` (`#8B6CF6`) sur `background` (`#0B0712`) = ratio ~5.5:1 ✓

### 8.4 Éviter le noir pur

- Le fond n'est **jamais** `#000000`. Le `#0B0712` a un sous-ton violet qui adoucit le dark mode.
- Les surfaces (`#15101E`, `#1D1728`) restent dans des écarts de luminance faibles (~3–5%) — suffisants pour distinguer les cartes, sans casser l'immersion nocturne.
- Les textes ne sont jamais blanc pur (`#FFFFFF`) — le `#EDE8F5` est un blanc cassé chaud qui réduit la fatigue oculaire.

### 8.5 Comportement dynamique

- **Mode système** : `useColorScheme()` natif. Si l'utilisateur change le thème du téléphone, l'app suit immédiatement.
- **Persistance** : le choix `system | light | dark` est stocké dans AsyncStorage (`@parfumscan/theme`).
- **Pas de flash** : le `ThemeProvider` bloque le rendu (`{ready ? children : null}`) tant que la préférence n'est pas chargée.
- **StatusBar** : suit automatiquement le mode résolu.

### 8.6 Ce qui NE change PAS

- Les `fonts`, `radius`, `spacing` — identiques dans les deux thèmes
- Les `fontFamily` — le mapping de police ne dépend pas du mode
- La structure des composants — un seul `getStyles(t: Theme)` par composant
- Les icônes Ionicons — leur couleur est déjà dynamique via `theme.colors.xxx`

---

## Annexe A — Architecture technique

### A.1 Structure des fichiers

```
src/theme/
├── theme.ts             ← lightTheme + darkTheme (tokens complets)
├── ThemeContext.tsx      ← ThemeProvider + useTheme()
└── (pas de theme-utils.ts séparé — tout dans ThemeContext)

src/services/
└── theme-storage.ts     ← AsyncStorage, clé @parfumscan/theme
```

### A.2 Pattern getStyles

Chaque composant migré vers le dark mode suit ce pattern :

```tsx
import { useTheme, type Theme } from '../theme/ThemeContext';

export default function MonComposant() {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  // ...
}

function getStyles(t: Theme) {
  return {
    container: { backgroundColor: t.colors.surface },
    title: { color: t.colors.text, fontFamily: t.fonts.display.fontFamily },
  } as const;
}
```

- `getStyles` est une **fonction pure** hors du composant
- Les styles sont memoïsés avec `useMemo`
- `StyleSheet.create` n'est pas utilisé dans les composants migrés (inefficace dans un `useMemo`)
- Les anciens composants non migrés utilisent `import { theme }` de `theme.ts` — c'est `lightTheme` en dur, rétrocompatible

### A.3 ThemeProvider vs AuthProvider

`ThemeProvider` wrap `AuthProvider` → le thème est disponible **sans authentification**. Les écrans de login, register et onboarding bénéficient du dark mode.

---

## Annexe B — Checklist de conformité

### Nouveau composant
- [ ] Utilise `useTheme()` (pas `import { theme }`)
- [ ] Styles dans `getStyles(t: Theme)` → `useMemo`
- [ ] Aucun `fontWeight` → tout en `fontFamily`
- [ ] Couleurs via tokens (`t.colors.xxx`), jamais en dur
- [ ] Ombres via `t.shadow.xxx`, jamais en dur
- [ ] Tailles de police via `t.fonts.size.xxx`
- [ ] Radius via `t.radius.xxx`
- [ ] Cibles tactiles ≥ 44 px
- [ ] Safe areas gérées si plein écran
- [ ] Un seul accent par écran (primary OU secondary, pas les deux)

### Révision design
- [ ] Pas de violet ET doré comme couleurs d'action sur le même écran
- [ ] Pas de `textMuted` sur fond `primarySoft`
- [ ] Pas de fond `background` sur une carte
- [ ] Hiérarchie typographique cohérente (taille affichée dans l'ordre logique)
- [ ] Les overlays sur image sont dans un coin, pas flottants
- [ ] Dark mode : les ombres sont-elles visibles ? (sinon → bordures)
- [ ] Dark mode : les contrastes texte/fond sont-ils suffisants ?
