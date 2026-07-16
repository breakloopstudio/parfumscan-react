# Plan de refonte UI/UX — ParfumScan

**Intent** : Redesign complet de l'interface React Native pour fusionner les deux identités du produit (découverte luxe & deal hunting), rationaliser les 3 listes Collection/Wishlist/Favoris, et donner du caractère à chaque moment clé de l'expérience.

---

## 1. État des lieux — diagnostic

### Ce qui fonctionne
- Architecture Expo Router + Reanimated + Gesture Handler propre
- Design system centralisé dans `src/theme/theme.ts` (63 tokens utilisables)
- Scan fonctionnel avec IA (burst mode, clarify, fallback)
- Fiche détail riche (pyramide olfactive, accords, saisonnalité, occasions, prix)
- Swipe gesture-driven entre catalogue et profil

### Ce qu'il manque ou pose problème
| Problème | Impact |
|---|---|
| **Deux identités non fusionnées** — le violet primaire + beige donne un ton utilitaire, ni luxe ni deal hunting | L'app ne dégage aucune émotion distincte |
| **Confusion Favoris / Collection / Wishlist** — une seule liste "Favoris" existe côté profil, pas de distinction sémantique | L'utilisateur ne sait pas où ranger ses parfums |
| **Profil sous-exploité** — 2 onglets (Favoris, Historique), pas de Collection, pas de Wishlist, pas de Settings, pas d'économies réelles | Le profil est une coquille vide |
| **Aucune page Settings** | Mentionnée dans le brief, inexistante |
| **Aucun onboarding** | Demandé dans le brief, inexistant |
| **Scan visuellement basique** — viseur statique, pas d'animation mémorable pendant les 3s d'attente | Le geste fondateur manque de magie |
| **Révélation du prix sans célébration** — le prix est juste affiché dans une carte verte | L'émotion centrale du produit est absente |
| **Fiche détail saturée** — une seule ScrollView linéaire, pas de hiérarchie claire des actions | Toutes les infos sont au même niveau |
| **Pas d'alertes prix** | Demandé dans le brief, inexistant |
| **Pas de parfums similaires** | Demandé dans le brief |
| **Pas de profil olfactif** | L'app connaît les goûts de l'utilisateur mais ne les lui montre jamais |
| **Pas de gestion hors-ligne** | En parfumerie sans réseau, l'expérience est cassée sans explication |
| **États vides basiques** | Pas de personnalité, pas de guidance |

---

## 2. Direction artistique proposée

### Concept : **"Luxe malin"**
Une esthétique qui parle de raffinement (parfumerie, matières nobles) ET d'intelligence (données, économies, transparence). Le ton est chaleureux mais précis, jamais bling-bling ni discount.

### Palette — évolution du système existant
```
Fond :     #F8F6F2  (beige craie — plus froid et élégant que l'actuel #FAF8F5)
Surface :  #FFFFFF
Texte :    #1A1520  (presque noir, chaud)
Muted :    #8B8580  (gris taupe chaud)
Accent 1 : #6C3ED9  (violet profond — légèrement moins saturé que l'actuel #7C3AED)
Accent 2 : #C8945A  (doré/ambré — légèrement plus chaud que l'actuel #D4A574)
Deal :     #0D9488  (vert teal au lieu du vert pomme #10B981 — plus premium)
Danger :   #E04444  (rouge légèrement adouci)
```

### Typographie — conservée et élargie
- **Display** : Playfair Display (titres, marques, grands nombres de prix)
- **Body** : Inter (corps, labels, inputs, chiffres — les chiffres d'Inter sont déjà tabulaires, utiliser `fontVariant: ['tabular-nums']` sur iOS pour les prix)

### Principes visuels
1. **Un accent par écran** — le violet pour la navigation/actions, le doré pour les récompenses/économies, jamais les deux en compétition
2. **Le prix est un événement** — animations dédiées, scale, couleur contextuelle (vert = bonne affaire, doré = prix correct, rouge = trop cher)
3. **Texture, pas décoration** — fonds subtilement grainés (pas de dégradés), ombres douces, bordures fines
4. **Hiérarchie par la taille, pas par la couleur** — le prix est le plus gros élément visible après le nom du parfum

---

## 3. Architecture des écrans — cible

### 3.1 Navigation
```
Tab Bar (floating pill, conservée)
├── Catalogue  (gauche)
├── [FAB Scan] (centre, bouton caméra — push stack, pas un onglet)
└── Profil     (droite)

Le scan est un FAB central distinct, pas un onglet. C'est le geste fondateur,
il ouvre un écran plein écran via la stack Expo Router (structure actuelle conservée).

Stack modals :
├── auth/login
├── auth/register
├── catalog/[id]
├── admin
├── onboarding/*     ← NOUVEAU
└── settings          ← NOUVEAU

Auth optionnelle : l'app est utilisable sans compte (scan, catalogue, fiche détail).
L'authentification est proposée uniquement quand une action le nécessite (ajout favoris/wishlist/collection).
Pas de mur d'auth ni de login forcé.

**Mode hors-ligne** : l'app doit gérer l'absence de réseau avec élégance. Bannière discrète, contenu dégradé depuis le cache Firestore local. Le scan est indisponible avec un message clair. Ne pas bloquer l'utilisateur.

### 3.1bis Spécifications mode hors-ligne

| Écran | Comportement hors-ligne |
|---|---|
| **Bannière réseau** | Barre horizontale en haut de l'écran (sous la safe area), hauteur 36px, fond `#FEF3C7` (amber clair), texte "Mode hors-ligne" en Inter 500 12px couleur `#92400E`. Icône wifi-off à gauche. Disparaît automatiquement quand le réseau revient (pas de swipe pour fermer). Animation : slide down + fade in (300ms, easeOut). |
| **Catalogue** | Affiche les parfums depuis le cache Firestore local (`getParfumById`). Les résultats de recherche sont indisponibles → message "Recherche indisponible hors-ligne. Explore le catalogue en cache." La navigation par famille olfactive fonctionne si les données sont en cache. |
| **Scan** | Écran d'idle normal jusqu'au déclenchement. Au tap sur "Scanner", au lieu d'ouvrir la caméra → alerte modale : "Le scan nécessite une connexion Internet. Tu peux explorer le catalogue en attendant." + bouton "Voir le catalogue". La caméra ne s'ouvre pas. |
| **Fiche détail** | Fonctionne si le parfum est en cache (Firestore). Prix et offres → masqués, remplacés par "Prix indisponible hors-ligne". Pyramide, accords, saisonnalité → affichés depuis le cache. Actions (favoris, collection, wishlist) → désactivées avec un tooltip "Connecte-toi à Internet pour ajouter à ta collection". |
| **Profil** | Listes (collection, wishlist, favoris) → affichées depuis le cache local. Profil olfactif → affiché si calculé précédemment. Historique → affiché. |
| **Auth / Settings** | Indisponibles. Les pages sont accessibles mais affichent un message "Cette fonctionnalité nécessite une connexion Internet." |

```

### 3.2 Écrans par ordre de priorité

#### P0 — Scan (refonte du geste fondateur)
- **ScanIdle** : viseur repensé avec halo animé (respiration lente en violet), typographie display pour le titre
- **ScanCamera** : viseur avec coins arrondis animés, flash élégant au déclenchement
- **ScanLoading** : animation signature (3 secondes) — particules de parfum qui dansent, texte poétique qui change toutes les secondes ("J'analyse les notes...", "Je compare les prix...", "Presque...")
- **ScanResults →** redirige vers la fiche détail avec animation de transition fluide. Résultats triés par prix croissant — le meilleur deal en premier.

#### P0 — Fiche détail (hub d'actions)
Refonte de `app/catalog/[id].tsx` :
- **Header** : image hero avec overlay gradient subtil → marque + nom en display
- **Zone prix** (sticky sous le header) : prix en très grand, économie en %, badge deal/overpriced/fair, CTA "Voir l'offre"
- **Indicateur de tendance** : le prix actuel est-il en baisse 📉, stable, ou en hausse 📈 par rapport à l'historique récent ? ← NOUVEAU
- **Prix en magasin vs en ligne** : champ optionnel "Prix en boutique" → l'app calcule l'écart et affiche "Tu économises X € en ligne" ← NOUVEAU
- **Barre d'actions** (sticky ou dans le scroll) : 3 boutons distincts 🗂️ Ajouter à ma collection / ⭐ Wishlist / ❤️ Favori — avec labels explicites, pas d'icônes ambiguës
- **Pyramide olfactive** : version visuelle enrichie (cercles concentriques au lieu des barres)
- **Accords, saisonnalité, occasions** : conservés, affinés visuellement
- **Parfums similaires** : carrousel horizontal en bas ← NOUVEAU
- **Alerte prix** : toggle + champ de prix seuil ← NOUVEAU
- **Menu "..."** : partager, signaler une erreur, voir les offres alternatives (liste multi-marchands) ← NOUVEAU

#### P1 — Profil (3 listes distinctes)
Refonte de `src/features/profile/ProfilePage.tsx` :
- **Header** : avatar, email. Sobre, pas de niveau ni gamification.
- **Profil olfactif** : carte de synthèse située entre le header et les onglets. Pas un dashboard analytics, une carte de personnalité — "Ton univers olfactif". ← NOUVEAU
  - **Forme visuelle** : barres horizontales empilées dans un conteneur arrondi unique (pas un radar, pas un camembert). La barre fait 100% de la largeur, chaque segment est proportionnel à son poids. Exemple : `████████████████████░░░░░ 60% boisé  ·  25% oriental  ·  15% frais`
  - **Couleurs par famille** : Boisé → `#C8945A` (doré), Oriental → `#6C3ED9` (violet), Frais → `#0D9488` (teal), Floral → `#EC4899` (rose poudré), Aromatique → `#84CC16` (vert sauge)
  - **États** : si < 3 parfums en favoris/collection → afficher "Ajoute des parfums à ta collection pour débloquer ton profil olfactif" + CTA vers le catalogue. Si données insuffisantes → carte masquée (pas de placeholder vide).
  - **Titre** : "Ton univers olfactif" en Playfair Display, corps 12px, muted. Pas d'icône.
- **3 onglets avec compteurs** : Ma collection (12) | Wishlist (3) | Favoris (8)
  - Chaque liste a son état vide avec un message et une CTA distincts
  - Actions sur un élément : menu contextuel avec "Retirer" et "Déplacer vers..." (pas de swipe ni drag)
- **Historique** : accessible via un lien ou onglet secondaire
- **Accès Settings** : icône engrenage dans le header

#### P1 — Settings
Nouvelle page modale ou section :
- Alertes prix (on/off global)
- Devise / région pour les prix
- Notifications push
- Mentions légales
- Suppression du compte
- Déconnexion

#### P1 — Onboarding
3 écrans affichés au premier lancement, sans demande de compte :
1. **"Photographie un flacon"** — illustration du scan, promesse de reconnaissance instantanée
2. **"L'IA trouve le meilleur prix"** — illustration du comparateur, transparence
3. **"Ton univers parfumé"** — illustration des 3 listes (Collection, Wishlist, Favoris)
L'utilisateur arrive ensuite directement sur le catalogue. Aucun compte requis. L'auth est proposée plus tard, au moment d'une action qui la nécessite (ajout à une liste).

#### P2 — Catalogue
Améliorations légères :
- Grille visuellement plus respirée
- **Navigation par famille olfactive** : chips ou carrousel (🍃 Frais, 🌲 Boisé, 🕌 Oriental, 🌸 Floral) ← NOUVEAU
- Filtres rapides (famille olfactive, genre, fourchette de prix)
- Tri (pertinence, prix croissant/décroissant, popularité)

#### P2 — Auth (login/register)
Conservé, affinage visuel uniquement (meilleure hiérarchie, illustration de fond subtile).

---

## 4. Design system — tokens mis à jour

### 4.1 `theme.ts` — nouvelle version

```ts
export const theme = {
  colors: {
    // Fondations
    background: '#F8F6F2',
    surface: '#FFFFFF',
    surface2: '#F3F1ED',
    border: '#E8E4DE',

    // Texte
    text: '#1A1520',
    textMuted: '#8B8580',
    textInverse: '#FFFFFF',

    // Accents
    primary: '#6C3ED9',       // violet — actions principales, navigation
    primarySoft: '#F0EBFA',
    primaryInk: '#4C2A9E',
    secondary: '#C8945A',     // doré — récompenses, économies
    secondarySoft: '#FBF5EE',

    // Sémantique
    deal: '#0D9488',          // teal — bonne affaire
    dealSoft: '#E6F7F5',
    overpriced: '#E04444',
    overpricedSoft: '#FEF2F2',
    fair: '#D97706',          // amber — prix correct
    fairSoft: '#FFF8ED',
    favorite: '#E04444',      // cœur favoris
    favoriteSoft: '#FEF2F2',

    // Pyramide olfactive
    pyramidTop: '#0D9488',
    pyramidTopSoft: '#E6F7F5',
    pyramidHeart: '#C8945A',
    pyramidHeartSoft: '#FBF5EE',
    pyramidBase: '#6C3ED9',
    pyramidBaseSoft: '#F0EBFA',
  },

  fonts: {
    display: { fontFamily: 'PlayfairDisplay_700Bold' },
    displaySemiBold: { fontFamily: 'PlayfairDisplay_600SemiBold' },
    displayItalic: { fontFamily: 'PlayfairDisplay_700Bold_Italic' },
    body: { fontFamily: 'Inter_400Regular' },
    bodyMedium: { fontFamily: 'Inter_500Medium' },
    bodySemiBold: { fontFamily: 'Inter_600SemiBold' },
    bodyBold: { fontFamily: 'Inter_700Bold' },
    size: {
      xs: 10, sm: 12, base: 14, md: 16, lg: 18,
      xl: 22, '2xl': 28, '3xl': 34, '4xl': 42,
    },
  },

  radius: {
    sm: 8, base: 12, card: 16, lg: 20, xl: 24, full: 9999,
  },

  spacing: {
    xs: 4, sm: 8, base: 12, md: 16, lg: 20, xl: 24, '2xl': 32, '3xl': 48,
  },

  shadow: {
    card: {
      shadowColor: '#1A1520',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    elevated: {
      shadowColor: '#1A1520',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6,
    },
    button: {
      shadowColor: '#6C3ED9',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },
} as const;
```

### 4.2 Composants atomiques à créer

| Composant | Priorité | Description |
|---|---|---|
| `Button` | P0 | Variantes : primary, secondary, outline, ghost. États : default, loading, disabled |
| `PriceDisplay` | P0 | Affiche un prix avec animation, badge d'économie, couleur contextuelle |
| `OlfactoryPyramid` | P0 | Refonte du composant existant — cercles concentriques animés |
| `SectionHeader` | P0 | Titre + sous-titre + action optionnelle, cohérent partout |
| `EmptyState` | P1 | Illustration + message + CTA, 4 variantes (collection, wishlist, favoris, historique) |
| `StatBadge` | P1 | Compteur avec icône et label |
| `Tag` | P1 | Badge pour famille olfactive, année, genre, concentration |
| `Gauge` | P1 | Barre de progression horizontale (longévité, sillage, saisonnalité) |
| `TabBar` | P2 | Onglets avec indicateur animé (pour le profil) |
| `Toast` | P2 | Feedback de succès après ajout à une liste |
| `AlertPriceToggle` | P2 | Switch + champ de seuil pour les alertes prix |
| `PriceTrend` | P1 | Indicateur de tendance : flèche 📉/📈 + texte "En baisse", "Stable", "En hausse" + variation en % basé sur l'historique récent. Affiché sous le prix dans la deal card. |
| `PriceComparison` | P1 | Champ de saisie "Prix en magasin" + calcul automatique de l'écart avec le prix en ligne. Affiche "Tu économises X € en ligne" avec animation si l'écart est favorable. |
| `OfflineBanner` | P1 | Bannière réseau : barre fine avec icône wifi-off + texte "Mode hors-ligne", fond amber clair. Apparaît/disparaît avec animation slide. |
| `OlfactoryProfile` | P1 | Carte de profil olfactif : barres empilées horizontales représentant les familles dominantes (boisé, oriental, frais, floral, aromatique). États : données suffisantes, insuffisantes (CTA), masqué. |

---

## 5. Spécifications d'animation

### 5.1 Scan loading (2-3 secondes)
```
Phase 0 (0ms)   : Capture → flash blanc plein écran → fondu vers le loader
Phase 1 (0-800ms): Viseur qui pulse (scale 1 → 0.9 → 1 sur 800ms, easeOut)
                   + halo violet qui tourne lentement (rotation 360° en 3s, linear)
Phase 2 (800-1600ms): Particules (6-8 cercles translucides) qui montent depuis le centre,
                      opacité 0.6 → 0, translateY -40, durée 1200ms, stagger 150ms
                      Texte : "Analyse des notes..." → "Comparaison des prix..." → "Presque..."
Phase 3 (1600-2400ms): Dernière particule → transition vers le résultat
                       Si succès : slide up du résultat depuis le bas (spring, damping 20)
                       Si échec : shake léger + état no-result
```

### 5.2 Révélation du prix
```
Le prix apparaît avec :
  - Opacity 0 → 1 + scale 0.5 → 1.05 → 1 (spring, stiffness 200, damping 10)
  - Le badge d'économie (-X%) apparaît 300ms après avec scale 0 → 1 (spring)
  - La couleur de fond de la carte prix pulse brièvement (deal → dealSoft → deal, 600ms)
```

### 5.3 Toggle favori / collection / wishlist
```
Cœur qui se remplit : scale 1 → 1.3 → 1 (100ms + 150ms, spring)
Icône liste : rotation 15° → 0° avec haptic feedback
Toast de confirmation : slide down depuis le haut (spring, 300ms), auto-dismiss 2s
```

### 5.4 Transitions entre écrans
```
Scan → Résultat :    expand du viseur vers la fiche détail (shared element si possible, sinon fade)
Catalogue → Détail : slide from right (conservé)
Tab switches :      interpolations existantes conservées (scale + fade + translateX)
```

### 5.5 Onboarding
```
Slide horizontal entre les étapes (PanGesture avec snap)
Indicateur de progression (dots animés)
Illustrations : opacity + translateY à l'entrée de chaque slide
```

---

## 6. Plan de réalisation — séquence

### Phase A — Design system (priorité absolue, ~1 session)
1. **Mise à jour de `src/theme/theme.ts`** — nouveaux tokens, polices, espacements
2. **Composants atomiques** — `Button`, `PriceDisplay`, `EmptyState`, `SectionHeader`

### Phase B — Scan & fiche détail (P0, ~2 sessions)
4. **Refonte ScanIdle** — viseur animé, typographie, layout
5. **Refonte ScanCamera** — coins animés, particules, overlay
6. **ScanLoading** — animation signature, texte poétique
7. **Refonte fiche détail** — nouveau layout, section prix sticky, barre d'actions 3 boutons
8. **Pyramide olfactive v2** — cercles concentriques
9. **Parfums similaires** — carrousel horizontal
10. **Alerte prix** — toggle + champ seuil
11. **Indicateur de tendance prix** — 📉📈 selon historique
12. **Prix magasin vs en ligne** — champ optionnel + calcul d'écart

### Phase C — Profil & Settings (P1, ~2 sessions)
13. **Refonte ProfilePage** — 3 listes distinctes (Collection, Wishlist, Favoris), header sobre
14. **Profil olfactif** — carte de synthèse des familles dominantes ← NOUVEAU
15. **Menu contextuel** — bouton "Déplacer vers..." et "Retirer" par élément
16. **Nouvelle page Settings** — alertes prix, devise EUR, notifs push, mentions légales
17. **Onboarding** — 3 slides au premier lancement, sans auth

### Phase D — Polish (P2, ~1 session)
18. **Catalogue** — navigation par famille, filtres, tri, grille affinée
19. **Mode hors-ligne** — bannière réseau + dégradé cache local
20. **Auth** — affinage visuel
21. **États vides & erreurs** — illustrations et messages personnalisés
22. **Review accessibilité** — contrastes, tailles de touche, labels

---

## 7. Questions ouvertes et risques

### Questions — tranchées (issues du retour équipe)
- [x] **Onboarding** : affiché au premier lancement, sans demande de compte. L'app est utilisable sans auth. Login proposé uniquement quand l'utilisateur tente une action qui le nécessite (ajout favoris/wishlist/collection).
- [x] **Fiche détail — 3 boutons séparés** : Collection / Wishlist / Favori, avec labels explicites. Pas de menu "Ajouter à...".
- [x] **Alertes prix** : Firebase Cloud Messaging déjà intégré (`src/services/fcm.ts`). Cloud Function à créer en Phase C pour scruter les prix et déclencher les notifications.
- [x] **Devise** : EUR uniquement pour la V1. Multi-devise en V2 si traction internationale.
- [x] **"Voir toutes les offres"** : oui, liste expansible depuis la deal card. Renforce l'identité comparateur de prix.

### Risques techniques
| Risque | Mitigation |
|---|---|
| Performances des animations Reanimated sur Android bas de gamme | Tester sur device physique Android tôt, réduire le nombre de particules si nécessaire |
| Temps de chargement des polices supplémentaires | Précharger via `useFonts` dans `_layout.tsx`. Inter uniquement (pas de 3e police). |
| Expo SDK version — compatibilité `expo-image` vs `Image` | Vérifier la version actuelle, `expo-image` est déjà utilisé |

---

## 8. Contraintes verrouillées

Ces décisions sont définitives (sauf prochain retour explicite) :

1. **Pas de gamification.** Pas de niveaux, badges, scores, ou compteurs d'économies totales. Le profil est sobre.
2. **Le scan est un FAB**, pas un onglet. Structure actuelle conservée (push stack).
3. **Pas de 3e police.** Playfair Display + Inter uniquement. Inter suffit pour les prix (tabular-nums).
4. **Pas de swipe/drag entre listes.** Un menu contextuel "Déplacer vers..." par élément.
5. **Pas d'économies totales.** Le prix est affiché au cas par cas, par parfum.
6. **Auth optionnelle.** L'app fonctionne sans compte. Login proposé uniquement quand nécessaire.
7. **EUR uniquement en V1.**
8. **Fiche détail : 3 boutons distincts** (Collection / Wishlist / Favori), pas de menu déroulant.

---

## 9. Prochaine étape

Le plan est complet et les questions sont tranchées. Prêt pour l'implémentation en Design mode.

1. **Démarrer la Phase A** — mise à jour de `src/theme/theme.ts` + composants atomiques
2. **Ordre** : Phase A → Phase B → Phase C → Phase D

**Fichier de plan** : `plan-refonte-ui.md`
