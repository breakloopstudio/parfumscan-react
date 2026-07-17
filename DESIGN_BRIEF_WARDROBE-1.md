# Design Brief — Wardrobe ParfumScan

> **À soumettre à un outil de design review (Open Design, v0, etc.)**

---

## 1. Contexte produit

**ParfumScan** — app React Native (iOS/Android) qui scanne les flacons de parfum, identifie le parfum via GPT-4o Vision, trouve le meilleur prix en ligne via comparaison multi-marchands, et permet de constituer un catalogue personnel.

**Public cible** : passionnés de parfumerie, 25-45 ans, consommateurs avertis qui veulent payer le juste prix.

**Design system** : « Luxe malin » — luxe du savoir pas du prix. Interface sobre, contraste par la couleur (violet primaire + doré secondaire), une seule police serif (Playfair Display) pour les titres, Inter pour le corps.

---

## 2. Écrans existants concernés

### 2.1 Onglet Collection (actuel)
Barre de navigation flottante 5 positions : Catalogue | Favoris | [Scan FAB] | Historique | **Collection**

L'onglet Collection affiche actuellement deux listes en ScrollView :
- **Possédés** (subcollection Firestore `users/{uid}/collection`) — liste avec image 44×44, nom, badge violet "Possédé"
- **Wishlist** (subcollection `users/{uid}/wishlist`) — idem, badge doré "À acheter"

Chaque item a un menu contextuel (Alert.alert) : "Déplacer vers Wishlist/Collection/Favoris", "Retirer".

**Problèmes** :
- Pas de "I Had" (anciens parfums)
- Pas de notes personnelles ni rating
- Pas de catégorisation custom (étagères/shelves)
- Pas de vue d'ensemble visuelle (juste une liste)
- UX très "base de données", pas assez émotionnelle pour un passionné

### 2.2 Fiche détail parfum (`/catalog/[id]`)
3 boutons d'action identiques : `[❤️ Favori] [📦 Collection] [🔖 Wishlist]`

Chaque bouton toggle indépendant avec son propre état.

**Problème** : 3 boutons pour 3 sous-collections différentes, code dupliqué, pas de lien entre les états.

### 2.3 Navigation globale
- Pager Reanimated 4 pages (Catalogue, Favoris, Historique, Collection)
- Swipe horizontal avec spring animations
- DockBar flottante verre dépoli (BlurView) avec indicateur doré animé
- FAB central violet avec pulse ring pour le scan
- Barre de recherche persistante en haut

---

## 3. Fonctionnalité à concevoir : la Wardrobe

### 3.1 Inspiration
La Wardrobe de **Fragrantica** — l'équivalent d'une garde-robe mais pour les parfums. L'utilisateur peut :
- Déclarer les parfums qu'il **possède**, **a possédés**, **veut**, a en **échantillon** ou **décant**
- Les organiser en **étagères custom** ("Été", "Bureau", "Soirée", "Offerts"...)
- Leur donner une **note personnelle** (1-5 étoiles)
- Écrire des **notes personnelles**
- Définir un **Parfum du Jour** (SOTD)
- Indiquer la **taille du flacon** (30ml, 50ml, 100ml...)

### 3.2 Ce qu'on doit construire (V1 — scope complet)
- [x] États d'ownership : Possédé / Souhaité / Ancien / Échantillon / Décant
- [x] Étagères custom (création, édition, suppression)
- [x] Rating 1-5 étoiles par parfum
- [x] Notes personnelles
- [x] Taille du flacon (ml)
- [x] Parfum du Jour (SOTD)
- [x] Grid 2 colonnes (pas de liste)

### 3.3 Contraintes techniques
- React Native 0.86, Expo 57
- Firestore (NoSQL, temps réel via onSnapshot)
- Reanimated 4.5 pour les animations
- BlurView (expo-blur) pour les effets verre dépoli
- Ionicons pour les icônes
- Polices : Playfair Display (display) + Inter (body). **Jamais de fontWeight, toujours fontFamily.**
- Pas de couleurs hardcodées — tout via `theme.colors.xxx`
- Cibles tactiles ≥ 44px
- Zone de pouce : actions principales dans la moitié inférieure

---

## 4. Écrans à concevoir

### 4.1 Écran Wardrobe (remplace Collection)

```
┌──────────────────────────────────────────┐
│  Ma Wardrobe · 23                [👤]   │  Header (Playfair 28)
│  ⭐ 4.2  ·  5 étagères                  │  Stats (Inter 13, textMuted)
├──────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐ │
│ │  ☀️  Parfum du jour                  │ │  Carte SOTD
│ │  ┌────┐                              │ │  Fond : primarySoft
│ │  │ 🧪 │  Bleu de Chanel · Chanel     │ │  Hauteur : ~100px
│ │  └────┘  [Changer]                   │ │
│ └──────────────────────────────────────┘ │
├──────────────────────────────────────────┤
│ [Tous 23] [Possédés 12] [Souhaités 6]  │  Shelf tabs
│ [Anciens 3] [Été 5] [Bureau 4] [+]    │  scroll horizontal
├──────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐             │  Grid 2 colonnes
│  │ ★★★★☆   │  │ ★★★★★   │             │  ParfumCard compact
│  │ [image]  │  │ [image]  │             │  + overlays rating
│  │ BDC      │  │ Aventus  │             │  + badge ownership
│  │ Chanel   │  │ Creed    │             │  + note indicator
│  │ [Possédé]│  │ [Possédé]│             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │ ★★★☆☆   │  │ ☆☆☆☆☆   │             │
│  │ Sauvage  │  │ Égoïste  │             │
│  │ Dior     │  │ Chanel   │             │
│  │ [Ancien] │  │ [Souhait]│             │
│  └──────────┘  └──────────┘             │
└──────────────────────────────────────────┘
```

**Questions design :**
1. La carte SOTD doit-elle être collapsible ou toujours visible ? Quelle hiérarchie visuelle ?
2. Les shelf tabs : fond plein ou transparent ? Quelle distinction actif/inactif ?
3. La grille : quel espacement entre les cartes ? Marges horizontales ?
4. Les overlays rating + badge sur l'image : risquent-ils de surcharger la carte compacte ?
5. Faut-il un toggle grille/liste ou la grille 2 colonnes est suffisante ?

### 4.2 Bottom Sheet d'édition (tap sur une carte)

```
┌──────────────────────────────────────────┐
│                   ───── (handle 36×5)    │
│                                          │
│  ┌────┐  Bleu de Chanel                 │  Header
│  │ 🧪 │  Chanel                         │  Image 60×60 + texte
│  └────┘                                  │
│                                          │
│  ★★★★☆                     [Modifier]  │  Rating (doré, taille 28)
│                                          │
│  ─── ÉTAT ───                            │
│  ┌──────────────────────────────────┐   │  Segmented control
│  │ Possédé │ Souhaité │ Ancien     │   │  Fond : surface2
│  │ Échant. │ Décant   │            │   │  Actif : primary
│  └──────────────────────────────────┘   │
│                                          │
│  ─── ÉTAGÈRES ───                        │
│  [Été ×] [Bureau ×] [+ Ajouter]         │  Chips avec ×
│                                          │
│  ─── TAILLE ───                          │
│  [30ml] [50ml] [75ml] [100ml] [200ml]   │  Chips sélection unique
│                                          │
│  ─── NOTES ───                           │
│  ┌──────────────────────────────────┐   │  TextInput multiline
│  │ Offerte par ma femme. Très      │   │  Placeholder : "Mes impressions..."
│  │ belle tenue, projection modérée │   │
│  └──────────────────────────────────┘   │
│                                          │
│  [ Retirer de la Wardrobe ]            │  Danger button
└──────────────────────────────────────────┘
```

**Questions design :**
1. Fond du bottom sheet : BlurView (verre dépoli) ou surface opaque ? Quelle opacité overlay ?
2. Hauteur optimale : 60%, 70%, 80% de l'écran ?
3. Les sections doivent-elles avoir des séparateurs visuels ou l'espacement suffit ?
4. Le Rating : faut-il une animation au tap ? Laquelle ?
5. Le sélecteur d'état : segmented control ou chips horizontaux ? Quel est le plus intuitif sur mobile ?
6. Le sélecteur de taille : chips ou picker/dropdown ?
7. Faut-il un bouton "Sauvegarder" explicite ou sauvegarde automatique à chaque modification ?

### 4.3 Fiche détail — nouveau bouton Wardrobe

Actuellement 3 boutons côte à côte. Proposition : **2 boutons.**

```
┌──────────────────────────────────────────┐
│  [❤️ Favori]           [📦 Wardrobe]    │  2 boutons au lieu de 3
│                                          │  Largeur égale (flex: 1)
│  (existant, inchangé)  (nouveau)        │
└──────────────────────────────────────────┘
```

**État "Pas dans la wardrobe" :**
```
┌──────────────────────┐
│  📦  Ajouter à ma    │  Icône outline, texte textMuted
│     Wardrobe         │  Fond surface2, border border
└──────────────────────┘
```

**État "Dans la wardrobe" :**
```
┌──────────────────────┐
│  📦  Dans Possédés   │  Icône solid primary, texte primary
│     ⭐⭐⭐⭐           │  Fond primarySoft, border primary
└──────────────────────┘
```

**Au tap → Mini bottom sheet (2 options) :**
```
┌──────────────────────────────────────────┐
│  Ajouter à la Wardrobe                    │
│                                           │
│  État :                                   │
│  [Possédé] [Souhaité] [Ancien]           │
│  [Échantillon] [Décant]                  │
│                                           │
│  [ Ajouter ]    ou    [ Retirer ]        │
└──────────────────────────────────────────┘
```

**Questions design :**
1. Un seul bouton "Wardrobe" ou garder des boutons séparés pour Possédé/Souhaité ?
2. Le mini-sheet doit-il inclure le rating et les étagères ou juste l'état ?
3. Feedback visuel au toggle (haptics + animation) ?

### 4.4 Création d'étagère (modal)

```
┌──────────────────────────────────────────┐
│  Nouvelle étagère                  ✕     │
│                                           │
│  Nom                                      │
│  ┌──────────────────────────────────┐   │
│  │ Été                             │   │  TextInput
│  └──────────────────────────────────┘   │
│                                           │
│  Icône (optionnelle)                      │
│  [☀️] [🌙] [💼] [🎉] [🎁] ...          │  Grille d'icônes Ionicons
│                                           │
│  Couleur (optionnelle)                    │
│  ● ● ● ● ● ● ● ●                        │  Palette de 8 couleurs
│                                           │
│  [ Créer l'étagère ]                    │  Button primary
└──────────────────────────────────────────┘
```

**Questions design :**
1. Modal centré ou bottom sheet ?
2. L'icône est-elle vraiment utile ou juste le nom + couleur suffit ?
3. Palette de couleurs : quelles couleurs proposer qui s'harmonisent avec le thème light/dark ?

### 4.5 SOTD Picker (sélection du parfum du jour)

```
┌──────────────────────────────────────────┐
│  Parfum du jour                    ✕     │
│                                           │
│  🔍 Rechercher...                        │  Search bar
│                                           │
│  ┌────┐ Bleu de Chanel     [Choisir]    │  Liste des parfums
│  │ 🧪 │ Chanel                          │  en ownership "have"
│  └────┘                                  │
│  ┌────┐ Aventus             [Choisir]    │
│  │ 🧪 │ Creed                           │
│  └────┘                                  │
│  ...                                      │
└──────────────────────────────────────────┘
```

**Questions design :**
1. Full modal ou bottom sheet ?
2. Faut-il afficher le SOTD d'hier comme suggestion rapide ?
3. Animation de confirmation (confetti subtil, haptics, pulse) ?

---

## 5. Contraintes du Design System

### 5.1 Couleurs disponibles (thème light)
```
background: #F8F6F2    surface: #FFFFFF     surface2: #F3F1ED
border: #E8E4DE         text: #1A1520        textMuted: #8B8580
primary: #6C3ED9        primarySoft: #F0EBFA primaryInk: #4C2A9E
secondary: #C8945A      secondarySoft: #FBF5EE secondaryInk: #8B6934
deal: #0D9488           dealSoft: #E6F7F5
overpriced: #E04444     overpricedSoft: #FEF2F2
favorite: #E04444       favoriteSoft: #FEF2F2
fair: #D97706           fairSoft: #FFF8ED
violetSoft: #F0EBFA     violetInk: #4C2A9E
reward: #C8945A         rewardInk: #8B6934  rewardSoft: #FBF5EE
```

### 5.2 Règles strictes
- ❌ `primary` ET `secondary` comme couleurs d'action sur le même écran
- ❌ `fontWeight` — toujours `fontFamily` (`Inter_600SemiBold`, etc.)
- ❌ Couleurs hardcodées hors du thème
- ❌ `textMuted` sur fond `primarySoft`
- ❌ Fond `background` sur une carte (utiliser `surface`)
- ✅ Cibles tactiles ≥ 44px
- ✅ Un seul accent visuel par écran (primary OU secondary, pas les deux)
- ✅ Ombres via `t.shadow.xxx`, bordures fines en dark mode

### 5.3 Typographie
```
Titre page :      PlayfairDisplay_700Bold    28-34px
Titre section :   PlayfairDisplay_600SemiBold 18-20px
Titre carte :     PlayfairDisplay_600SemiBold 18px
Marque :          Inter_400Regular            10-12px  uppercase letterSpacing 1-1.5
Corps :           Inter_400Regular            14-15px
UI label :        Inter_600SemiBold           14-16px
Prix :            Inter_700Bold / Inter_800ExtraBold
Badge/Chip :      Inter_500Medium            11-13px
Caption :         Inter_400Regular            11-13px
Placeholder :     Inter_400Regular            12px
```

### 5.4 Radius et spacing
```
radius: sm=8, base=12, card=16, full=9999
spacing: xs=4, sm=8, base=12, md=16, lg=20, xl=24, 2xl=32, 3xl=48
```

---

## 6. Questions globales pour la design review

1. **Hiérarchie de l'écran Wardrobe** : le SOTD doit-il être si proéminent ? Ou est-ce que la grille de parfums est le vrai contenu principal et le SOTD devrait être plus discret (une pastille dans le header) ?

2. **Densité d'information** : avec rating + badge ownership + indicateur de notes + image + marque + nom + tags, une carte compacte (demi-largeur d'écran) devient-elle trop chargée ? Faut-il un mode "aperçu" (grid simple) et un mode "détail" (liste) ?

3. **Cohérence avec le reste de l'app** : le catalogue utilise déjà un pattern grid 2 colonnes + chips horizontaux + BlurView. La wardrobe doit-elle réutiliser exactement ces patterns ou mérite-t-elle une identité visuelle distincte ?

4. **Dark mode** : les overlays sur image (rating stars, badge ownership) seront-ils lisibles en dark mode ? Les couleurs des badges (violet, doré, teal) gardent-elles un contraste suffisant ?

5. **Animation du bottom sheet** : spring (rebond léger, plus naturel) ou timing (plus propre, pas de rebond) ? Quelle durée pour l'ouverture/fermeture ?

6. **Feedback haptique** : quelles interactions méritent un retour haptique ? (tap rating, changement d'état, ajout/retrait d'étagère, SOTD)

7. **Empty states** : comment rendre l'écran de première visite engageant ? Une illustration ? Un onboarding rapide ? Des suggestions "Par où commencer" ?

8. **Le bouton Wardrobe sur la fiche détail** : vaut-il mieux un seul bouton qui ouvre un mini-sheet, ou deux boutons distincts ("Je le possède" / "Je le veux") pour une action plus rapide ?

9. **Navigation entre Wardrobe et Catalogue** : quand l'utilisateur est dans sa Wardrobe et tape sur un parfum, doit-il aller sur la fiche détail catalogue ou sur une vue "mon exemplaire" avec ses notes personnelles en avant ?

10. **Partage / social (futur)** : doit-on prévoir dès maintenant un emplacement pour un bouton "Partager ma Wardrobe" ou "Voir la Wardrobe de X" ?
