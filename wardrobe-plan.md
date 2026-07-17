# Plan de conception — Garde-robe ParfumScan

> **Intent** : Transformer l'onglet « Collection » (liste binaire possédé/wishlist) en une garde-robe personnelle riche, intime et organisable — directement dans le codebase React Native existant. Ce document sert de spec d'implémentation.

---

## 1. Vision & mood

La garde-robe est un **journal intime olfactif** avant d'être un inventaire. Le mood visuel cible le croisement entre carnet de souvenirs (notes personnelles, anecdotes), dressing organisé (étagères/catégories) et cabinet de curiosité (les flacons comme objets de désir). 

**Principe directeur** : chaque parfum est un objet qu'on manipule — pas une ligne de tableur. L'interface doit donner envie de toucher, feuilleter, organiser.

**Ton** : sobre (« Luxe malin »), chaleureux, jamais infantilisant. Le violet `--primary` porte l'interaction, le doré `--secondary` signale la rareté/le désir.

---

## 2. Réponses aux 10 questions ouvertes

### Q1 — Mood de la garde-robe
**Décision** : Les trois à la fois, mais hiérarchisés. Le premier écran donne le « cabinet de curiosité » (grille visuelle de flacons). Le scroll vers le bas révèle le « dressing organisé » (étagères/catégories). La fiche personnelle d'un parfum est le « journal intime » (notes, note, SOTD).

### Q2 — État vide
**Décision** : Un message chaleureux centré avec deux CTA : « Ajouter un parfum » (ouvre le catalogue) et « Scanner un flacon » (ouvre l'appareil photo). Pas de gamification, pas de faux chiffres. Une illustration simple (flacon stylisé), un texte qui parle d'émotion (« Votre garde-robe vous attend »). Pas de friction — l'utilisateur peut peupler sa garde-robe en un tap.

### Q3 — Rapport garde-robe / favoris
**Décision** : Les favoris restent un onglet séparé (ils servent à suivre les prix, les deals, pas à organiser sa collection). Un pont visuel : sur la fiche détail, le cœur favori est distinct de l'ajout à la garde-robe. Depuis la garde-robe, une pastille « bon plan » sur les parfums en wishlist indique si un suivi de prix est actif. Pas de fusion, pas de confusion des rôles.

### Q4 — Navigation à grande échelle (50-200 parfums)
**Décision corrigée** : Barre de filtres fusionnée (une seule rangée) pour économiser l'espace vertical :

```
🔍 [Rechercher...]                    ↕
[Possédés] [Souhaités] [Été] [+] [≡]
```

- **Recherche locale** : TextInput qui filtre instantanément par nom/marque
- **Pills horizontales** : fusion des pills d'état + catégories en une seule rangée scrollable. Les pills d'état sont en premier (fixes, toujours visibles), suivies des catégories custom.
- **Bouton ↕ tri** : « Récents », « Mieux notés », « A–Z », « Z–A »
- **Bouton [+] / [≡]** : créer/gérer les étagères
- **Bouton Filtres** (entonnoir) : dropdown rapide pour filtrer par ownership si beaucoup de catégories

La vue par défaut est « Tous », triée par date d'ajout décroissant.

### Q5 — Parfum du jour (SOTD)
**Décision** : Élément central sur la page garde-robe. Une carte dédiée en haut de l'écran (sous le header) qui affiche le parfum porté aujourd'hui, ou un état « Et aujourd'hui ? » engageant. Le choix du SOTD se fait depuis la fiche personnelle du parfum (Écran C).

**⚠️ Architecture corrigée** : Le SOTD est stocké dans une sous-collection dédiée `sotd/{YYYY-MM-DD}` (doc par date), pas via un flag `isSOTD` sur le `WardrobeItem`. Cela garantit : pas de race condition, cleanup automatique au changement de jour, historique gratuit pour le futur calendrier. Le `WardrobeItem` garde un `sotdCount` incrémenté à chaque sélection (pour les stats « most worn »). Le swipe SOTD a été retiré — conflit avec le pager horizontal Reanimated.

### Q6 — Édition fluide des métadonnées
**Décision corrigée** : Deux niveaux distincts pour éviter la « méga-sheet » ingérable (taille + clavier) :

**Niveau 1 — Quick-edit sheet (tap sur un item)** : légère, sans TextInput (pas de clavier). Contient :
- Le sélecteur d'état (5 options : Possédé, Souhaité, Ancien, Échantillon, Décant)
- Les étoiles de notation (tapables)
- Les chips de catégories (toggle on/off)
- Un lien « Voir plus » → fiche personnelle

**Niveau 2 — Fiche personnelle (Écran C)** : plein écran, scroll, clavier natif. Contient tout : notes, format, SOTD toggle, historique, retirer.

Pas de bouton « Enregistrer » — sauvegarde instantanée via Firestore, feedback haptique.

### Q7 — Communication fiche détail ↔ garde-robe
**Décision** : Sur la fiche détail catalogue, les 3 boutons séparés sont remplacés par **un unique bouton « Ajouter à ma garde-robe »** qui ouvre la même bottom sheet d'édition que celle du point Q6. Si le parfum est déjà dans la garde-robe, le bouton devient « Dans ma garde-robe » et navigue vers la fiche personnelle du parfum dans la garde-robe. Depuis la garde-robe, le tap sur un parfum ouvre la **fiche personnelle** (vue « mon exemplaire »), pas la fiche catalogue. Depuis cette fiche perso, un lien « Voir la fiche complète » renvoie vers le catalogue.

### Q8 — Intégration visuelle des catégories/étagères
**Décision** : Les étagères sont le **mode de navigation secondaire**. La vue principale montre toutes les catégories sous forme de pills scrollables sous le header. Quand une catégorie est sélectionnée, la grille se filtre. Les catégories sont transversales aux états d'ownership (un parfum wishlist et un possédé peuvent partager l'étagère « Été »). Un bouton « Gérer » à droite des pills ouvre une modale de gestion (créer, renommer, réorganiser par drag, supprimer).

### Q9 — Dimension sociale future
**Décision** : Ne pas anticiper dans l'interface V1. La garde-robe reste 100% privée. Le design ne bloque rien (pas de layout figé), mais n'ajoute aucun bouton « Partager », aucun lien social, aucun compteur public. Si un jour cette feature arrive, ce sera un écran dédié accessible depuis les paramètres.

### Q10 — Dark mode : pièges et précautions
**Décision** : Tous les éléments suivants utilisent les tokens dark du thème (`darkColors` dans `theme.ts`) :
- Les badges d'état (Possédé/Wishlist/Ancien/Échantillon) sur fond `surface2` avec bordures subtiles, pas d'ombres
- Les étoiles de notation : `secondary` (doré) sur fond sombre, contraste vérifié à ≥ 4.5:1
- Les overlays modaux : fond `surface` + `border` visible
- Le SOTD : fond `primarySoft` dark avec texte `primaryInk` dark, pas de dégradé
- Les pills de catégories : `surface2` avec bordure `border`, sélection = `primarySoft` + `primary` bordure

---

## 3. Architecture des écrans

### Écran A — Garde-robe principale (remplace `app/(tabs)/collection.tsx`)

```
┌─────────────────────────────────┐
│  Ma Garde-robe           [👤]   │  ← Header
│  ─────────────────────────────   │
│  🔍 Rechercher dans ma garde... │  ← Search bar locale
│                                 │
│  ┌─────────────────────────┐    │
│  │ ✨ Parfum du jour       │    │  ← Carte SOTD (si défini)
│  │    Eau Sauvage · Dior  │    │     OU état « Aujourd'hui ? »
│  │    Porté aujourd'hui    │    │
│  └─────────────────────────┘    │
│                                 │
│  [Possédés][Souhaités][Anciens]  │  ← Pills fusionnées (état + catégories
│  [Échantillons][Été][Bureau][+] │     sur une seule rangée scrollable)
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │      │ │      │ │      │    │  ← Grille visuelle (2 colonnes)
│  │Flacon│ │Flacon│ │Flacon│    │     ou liste compacte (>50 items)
│  │      │ │      │ │      │    │
│  │Nom   │ │Nom   │ │Nom   │    │
│  │★★★☆☆ │ │★★★★☆ │ │────  │    │
│  │Marque│ │Marque│ │Marque│    │
│  └──────┘ └──────┘ └──────┘    │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ ...  │ │ ...  │ │ ...  │    │
│  └──────┘ └──────┘ └──────┘    │
│                                 │
│            [DockBar flottant]   │  ← existant, inchangé
└─────────────────────────────────┘
```

**États** : vide, SOTD défini, SOTD non défini, carte SOTD collapsée (une fois le parfum du jour choisi, la carte se réduit à une ligne compacte pour libérer l'espace vertical), filtré par pill, grande collection (>20 items → liste au lieu de grille)

**Comportements** :
- Tap sur un item → ouvre la quick-edit sheet (Écran B)
- Long press sur un item → mode sélection (multi-actions futures)
- Tap carte SOTD → fiche personnelle du parfum (Écran C)
- Pull-to-refresh → resync Firestore
- Barre de recherche → filtre local instantané
- Bouton ↕ → menu tri (Récents, Mieux notés, A–Z, Z–A)

### Écran B — Quick-edit sheet (tap sur un item)

Sheet légère (~40% écran, pas de clavier). Pour les notes/format/SOTD → fiche personnelle (Écran C).

```
┌─────────────────────────────────┐
│  (fond semi-transparent)        │
│                                 │
│  ┌─────────────────────────┐    │
│  │  ┌────┐  Eau Sauvage    │    │
│  │  │ 🧪 │  Dior          │    │
│  │  └────┘                 │    │
│  │                         │    │
│  │  ★★★☆☆                  │    │  ← étoiles tapables
│  │                         │    │
│  │  [Possédé] [Souhaité]   │    │  ← chips d'ownership
│  │  [Ancien] [Échantillon] │    │
│  │  [Décant]               │    │
│  │                         │    │
│  │  [Été ×] [Bureau ×]     │    │  ← chips catégories
│  │  [+ Ajouter]            │    │
│  │                         │    │
│  │  [Voir plus...]         │    │  → fiche personnelle
│  └─────────────────────────┘    │
│       (poignée drag)            │
└─────────────────────────────────┘
```

### Écran C — Fiche personnelle (vue « mon exemplaire »)

Ouverte quand l'utilisateur tape sur un parfum depuis la garde-robe. Complémentaire à la fiche catalogue (`/catalog/[id]`), centrée sur la relation personnelle.

```
┌─────────────────────────────────┐
│  ← Retour               [···]   │  ← Header avec menu contextuel
│                                 │
│         ┌─────────┐            │
│         │         │            │
│         │ Flacon  │            │  ← Image grand format
│         │         │            │
│         └─────────┘            │
│                                 │
│  Eau Sauvage                    │  ← Nom (Playfair Display)
│  Dior                           │  ← Marque (Inter, uppercase)
│                                 │
│  ★★★☆☆  Ma note : 3/5     │  ← Notation personnelle
│                                 │
│  [Possédé]  [100ml]            │  ← Badges état + format
│  [Été] [Bureau]                │  ← Catégories
│                                 │
│  ─── Parfum du jour ───        │
│  ○ Porté aujourd'hui           │  ← Toggle SOTD
│                                 │
│  ─── Mes notes ───             │
│  Offert par ma femme pour      │
│  notre anniversaire. Un        │
│  souvenir très spécial...      │
│                                 │
│  ─── Historique SOTD ───       │
│  Lun 14/07 · Mar 15/07 ...     │  ← Optionnel V1, calendrier futur
│                                 │
│  [Voir la fiche complète ▸]    │  ← Lien vers /catalog/[id]
│  [Retirer de la garde-robe]    │
└─────────────────────────────────┘
```

### Écran D — Gestion des étagères (modal)

```
┌─────────────────────────────────┐
│  Gérer mes étagères      [Fermer]│
│                                 │
│  ── Mes étagères ──            │
│  ≡ Été          [✏️] [🗑️]    │  ← drag handle + edit + delete
│  ≡ Bureau       [✏️] [🗑️]    │
│  ≡ Soirée       [✏️] [🗑️]    │
│  ≡ Cuir/Boise   [✏️] [🗑️]    │
│                                 │
│  [+ Nouvelle étagère]          │
│                                 │
│  12 parfums sans étagère       │  ← Compteur d'orphelins
└─────────────────────────────────┘
```

### Écran E — État vide

```
┌─────────────────────────────────┐
│  Ma Garde-robe           [👤]   │
│                                 │
│                                 │
│          🧴                    │  ← Icône flacon stylisé
│                                 │
│     Votre garde-robe           │
│     vous attend                 │
│                                 │
│  Chaque parfum raconte une     │
│  histoire. La vôtre commence   │
│  ici.                          │
│                                 │
│  ┌─────────────────────────┐   │
│  │  Ajouter un parfum      │   │  ← Bouton primary CTA
│  └─────────────────────────┘   │
│                                 │
│  ── ou ──                      │
│                                 │
│  ┌─────────────────────────┐   │
│  │  Scanner un flacon  📷  │   │  ← Bouton surface CTA
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

---

## 4. Flux de navigation

```
Garde-robe principale (Écran A)
  │
  ├─ Tap sur item → Quick-edit sheet (Écran B)
  │     └─ Tap « Voir plus » → Fiche personnelle (Écran C)
  │
  ├─ Tap carte SOTD → Fiche personnelle du parfum (Écran C)
  │
  ├─ Tap « + Gérer » catégories → Modal étagères (Écran D)
  │
  ├─ Tap sur pill → Filtre la grille
  │
  └─ Tap sur ↕ → Menu tri

Fiche catalogue (/catalog/[id])
  │
  ├─ Bouton « Ajouter à ma garde-robe » → Quick-edit sheet (Écran B)
  └─ Bouton « Dans ma garde-robe » → Fiche personnelle (Écran C)

Fiche personnelle (Écran C)
  │
  ├─ Tap étoiles → Modifie la note (instantané)
  ├─ Tap badge état → Cycle entre les 5 ownerships
  ├─ Tap « Porté aujourd'hui » → Définit SOTD (haptique + toast)
  ├─ Tap format → Change la taille du flacon
  ├─ Tap notes → Édition inline
  └─ « Voir la fiche complète » → /catalog/[id]
```

---

## 5. Modèle de données (extension)

Les données utilisateur existantes (collection/wishlist dans Firestore) sont étendues :

```typescript
// Firestore: users/{uid}/wardrobe/{parfumId}
interface WardrobeItem {
  parfumId: string;                // doc ID = parfumId (déterministe, pas de doublons)
  nom: string | null;
  marque: string | null;
  imageUrl: string | null;
  familleOlactive: string | null;
  
  ownership: 'have' | 'want' | 'had' | 'sample' | 'decant';
  rating: number | null;           // 1-5, null = pas noté
  notes: string | null;            // texte libre
  shelfIds: string[];              // IDs des étagères assignées
  sizeMl: number | null;           // 30, 50, 75, 100, 125, 200
  sotdCount: number;               // incrémenté à chaque sélection SOTD
  
  addedAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore: users/{uid}/shelves/{autoId}
interface Shelf {
  name: string;                    // "Été", "Bureau"...
  icon: string | null;             // Ionicons name
  color: string | null;            // hex color
  order: number;
  createdAt: Timestamp;
}

// Firestore: users/{uid}/sotd/{YYYY-MM-DD}  (doc par date)
interface SotdEntry {
  parfumId: string;
  nom: string;
  marque: string;
  imageUrl: string | null;
}
```

> **⚠️ Correction** : SOTD stocké par date (pas via `isSOTD` flag). Pas de race condition, pas de cleanup manuel, historique gratuit.

---

## 6. Composants à créer (`src/features/wardrobe/`)

| Composant | Rôle | Écran |
|-----------|------|-------|
| `WardrobePage` | Écran principal avec recherche + filtres + grille | A |
| `SOTDCard` | Carte parfum du jour / état vide | A |
| `FilterBar` | Pills fusionnées (ownership + catégories) + tri + gestion | A |
| `WardrobeGrid` | Grille 2 colonnes de flacons avec overlays | A |
| `WardrobeQuickSheet` | Sheet légère d'édition rapide (état, étoiles, catégories) | B |
| `StarRating` | Étoiles tapables 1-5 (doré, spring anim) | B, C |
| `WardrobeDetail` | Fiche personnelle plein écran (tout le reste) | C |
| `ShelfManager` | Modal gestion étagères (créer, renommer, supprimer, réordonner) | D |
| `WardrobeCard` | Wrapper ParfumCard compact avec overlays rating + badge | A, B |
| `WardrobeEmpty` | État vide engageant | A (vide) |

---

## 7. Règles d'interaction

1. **Sauvegarde instantanée** — tout changement (note, état, catégorie, SOTD) persiste immédiatement via Firestore. Pas de bouton « Enregistrer ».
2. **Feedback haptique** — changement de statut, SOTD, et notation déclenchent `hapticsLight()`.
3. **Optimisme** — l'UI se met à jour avant la confirmation serveur. Rollback silencieux si échec.
4. **Confirmation destructive** — seul « Retirer de la garde-robe » demande une confirmation (Alert native).
5. **SOTD stocké par date** — `sotd/{YYYY-MM-DD}` (pas de flag à reset). Définir un nouveau SOTD overwrite le doc du jour. `sotdCount` sur `WardrobeItem` incrémenté.
6. **Catégories orphelines** — supprimer une étagère ne supprime pas les parfums. Ils passent juste sans catégorie.
7. **Thème** — tout composant utilise `useTheme()` et `t.colors.xxx`. Aucune couleur hardcodée.

---

## 8. Plan d'implémentation (React Native)

Implémentation directe dans le codebase existant. Ordre par priorité décroissante.

### Phase 1 — Fondations (P0)

| Fichier | Action | Contenu |
|---------|--------|---------|
| `src/models/wardrobe.interface.ts` | Créer | Interfaces `WardrobeItem`, `Shelf`, `SotdEntry` |
| `src/hooks/useWardrobe.ts` | Créer | Hook Firestore onSnapshot sur `users/{uid}/wardrobe` |
| `src/hooks/useShelves.ts` | Créer | Hook CRUD étagères (`users/{uid}/shelves`) |
| `src/hooks/useSotd.ts` | Créer | Hook lecture/écriture `sotd/{YYYY-MM-DD}` |
| `src/services/user-data.ts` | Modifier | Remplacer `addToCollection`/`addToWishlist` par `addToWardrobe(uid, parfumId, ownership)` ; ajouter `updateWardrobeItem`, `removeFromWardrobe` |
| `src/services/firestore.ts` | Modifier | Ajouter les queries wardrobe/shelves/sotd |

### Phase 2 — Composants (P0)

| Fichier | Action | Contenu |
|---------|--------|---------|
| `src/features/wardrobe/WardrobeCard.tsx` | Créer | Carte flacon compacte (grille 2 col.) avec overlay rating + badge ownership |
| `src/features/wardrobe/StarRating.tsx` | Créer | Étoiles 1-5 tapables, doré `secondary`, spring anim Reanimated |
| `src/features/wardrobe/WardrobeEmpty.tsx` | Créer | État vide avec double CTA |
| `src/features/wardrobe/SOTDCard.tsx` | Créer | Carte parfum du jour (états : défini / non défini / collapsé) |
| `src/features/wardrobe/FilterBar.tsx` | Créer | Pills fusionnées scrollables (ownership + catégories) + bouton tri |
| `src/features/wardrobe/WardrobeGrid.tsx` | Créer | Grille `FlatList` 2 colonnes avec `numColumns={2}`, bascule auto liste si >50 items |

### Phase 3 — Écrans & sheets (P0)

| Fichier | Action | Contenu |
|---------|--------|---------|
| `app/(tabs)/collection.tsx` | Remplacer | `WardrobePage` : header + recherche + SOTD + FilterBar + grille |
| `src/features/wardrobe/WardrobeQuickSheet.tsx` | Créer | Bottom sheet (~40%) : ownership chips + étoiles + catégories + « Voir plus » |
| `src/features/wardrobe/WardrobeDetail.tsx` | Créer | Écran plein écran (Stack) : image, nom, note, état, format, SOTD toggle, notes, « Voir fiche complète », retirer |

### Phase 4 — Étagères & intégration catalogue (P1)

| Fichier | Action | Contenu |
|---------|--------|---------|
| `src/features/wardrobe/ShelfManager.tsx` | Créer | Modal : liste étagères, créer, renommer, supprimer, compteur orphelins |
| `app/catalog/[id].tsx` | Modifier | Remplacer 3 boutons Favori/Collection/Wishlist par bouton unique « Ajouter à ma garde-robe » / « Dans ma garde-robe » |

### Phase 5 — Navigation (P1)

| Fichier | Action | Contenu |
|---------|--------|---------|
| `src/features/navigation/DockBar.tsx` | Modifier | Onglet 4 : label « Garde-robe », icône `shirt-outline` / `shirt` |
| `app/_layout.tsx` | Modifier | Ajouter la route `app/wardrobe/[parfumId].tsx` pour la fiche personnelle |

### Design system
Tokens du brief (§6.3) déjà présents dans `src/theme/theme.ts`. Playfair Display + Inter. Touch targets ≥ 44px. Tous les composants utilisent `useTheme()` et `t.colors.xxx`.

---

## 9. Critères d'acceptation

- [ ] L'utilisateur voit immédiatement l'état de chaque parfum (have/want/had/sample/decant) via un badge visuel sur la carte
- [ ] Le parfum du jour est mis en avant sur la page principale
- [ ] La notation (1-5) est modifiable en un tap dans la quick-edit sheet, sans navigation
- [ ] La quick-edit sheet est légère (~40% écran), pas de clavier, fermeture rapide
- [ ] Les notes personnelles sont éditables dans la fiche personnelle (plein écran)
- [ ] Les catégories/étagères filtrent la vue et sont transversales aux états d'ownership
- [ ] Une seule barre de filtres fusionnée (pas deux rangées de pills)
- [ ] Un bouton de tri (↕) permet de trier la grille
- [ ] Le SOTD est stocké par date (`sotd/YYYY-MM-DD`), pas via un flag
- [ ] La fiche personnelle permet de tout gérer (notes, format, SOTD, retirer)
- [ ] L'état vide est engageant avec un double CTA (catalogue + scanner)
- [ ] Tous les éléments respectent les tokens de couleur du thème (pas de hardcodage)
- [ ] Les cibles tactiles ≥ 44px
- [ ] Le dark mode est lisible (bordures, contraste vérifié)
- [ ] Les polices utilisent exclusivement `fontFamily` (jamais `fontWeight`)

---

## 10. Décisions actées & questions restantes

### Acté
- [x] SOTD stocké par date (`sotd/{YYYY-MM-DD}`), pas via flag `isSOTD`
- [x] Swipe SOTD retiré (conflit avec le pager Reanimated). SOTD se définit depuis la fiche personnelle
- [x] Quick-edit sheet légère (~40%) sans clavier + fiche personnelle plein écran pour le reste
- [x] Barre de filtres fusionnée : une seule rangée de pills (ownership + catégories)
- [x] Bouton de tri (↕) : Récents, Mieux notés, A–Z, Z–A
- [x] Pas de migration des anciennes données (fresh start)
- [x] Onglet « Collection » renommé en « Garde-robe » dans la DockBar, icône `shirt-outline` (dressing) au lieu de `flask-outline`

### Ouvert
- [ ] **TODO** — Tri manuel (drag & drop) dans une étagère, ou seulement ordre chronologique/alphabétique ?
- [ ] **TODO** — Notification push quotidienne de rappel SOTD ?
- [ ] **TODO** — Conserver l'onglet « Historique » séparé ou l'intégrer dans la garde-robe (futur vue calendrier) ?
- [ ] **TODO** — La fiche personnelle doit-elle afficher un mini-graphe de l'historique SOTD en V1 ou V2 ?

---

## Next step

1. **Relire ce document** — valider les décisions de design et l'architecture des écrans
2. **Répondre aux TODO** de la section 10
3. **Approuver pour passage en Design mode** — l'implémentation React Native commencera par la Phase 1 (modèles + hooks + services), puis les composants, puis les écrans
4. **Fichiers produits** : modifications dans `app/`, `src/features/wardrobe/`, `src/hooks/`, `src/models/`, `src/services/`
5. **Vérification TypeScript** : `npx tsc --noEmit` attendu 0 erreur en fin de chaque phase
