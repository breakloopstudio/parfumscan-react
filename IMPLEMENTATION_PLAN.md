# Plan d'implémentation — Wardrobe

> Spec technique fichier par fichier. S'appuie sur le design d'Open Design (`wardrobe-plan.md`), le traduit en code concret respectant les conventions du projet.

---

## Phase 0 — Préparation

### Ordre global des phases
1. Modèles + Service + Hooks + Firestore rules
2. Composants indépendants (StarRating, WardrobeCard, WardrobeEmpty)
3. Composants composés (SOTDCard, FilterBar, WardrobeGrid)
4. Quick-edit sheet + Fiche personnelle
5. Écran principal WardrobePage → remplace collection.tsx
6. Intégrations (catalog/[id], DockBar, EmptyState, routes)

**Vérification après chaque phase** : `npx tsc --noEmit` doit donner 0 erreur.

---

## Phase 1 — Fondations

### 1.1 `src/models/wardrobe.interface.ts` — Créer

```ts
export interface WardrobeItem {
  parfumId: string;
  nom: string | null;
  marque: string | null;
  imageUrl: string | null;
  familleOlactive: string | null;
  ownership: 'have' | 'want' | 'had' | 'sample' | 'decant';
  rating: number | null;
  notes: string | null;
  shelfIds: string[];
  sizeMl: number | null;
  sotdCount: number;
  addedAt: Date;
  updatedAt: Date;
}

export interface Shelf {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  order: number;
  createdAt: Date;
}

export interface SotdEntry {
  parfumId: string;
  nom: string;
  marque: string;
  imageUrl: string | null;
}
```

### 1.2 `src/models/index.ts` — Modifier

Ajouter les exports :
```ts
export type { WardrobeItem, Shelf, SotdEntry } from './wardrobe.interface';
```

### 1.3 `src/services/wardrobe.ts` — Créer

Fonctions :
```ts
// Sous-collections
function wCol(uid: string) { return collection(db, `users/${uid}/wardrobe`); }
function shCol(uid: string) { return collection(db, `users/${uid}/shelves`); }
function sCol(uid: string) { return collection(db, `users/${uid}/sotd`); }

// ── Wardrobe ──
export function onWardrobe(uid: string, cb: (items: WardrobeItem[]) => void): () => void;
  // onSnapshot, sans tri (le tri sera côté client dans useWardrobe)

export async function addToWardrobe(
  uid: string, parfumId: string, ownership: WardrobeItem['ownership'],
  nom?: string, marque?: string, imageUrl?: string, familleOlactive?: string
): Promise<void>;
  // setDoc merge, doc id = parfumId

export async function updateWardrobeItem(
  uid: string, parfumId: string, data: Partial<Pick<WardrobeItem, 'ownership' | 'rating' | 'notes' | 'shelfIds' | 'sizeMl'>>
): Promise<void>;
  // setDoc merge + updatedAt: new Date()

export async function removeFromWardrobe(uid: string, parfumId: string): Promise<void>;
  // deleteDoc

export async function isInWardrobe(uid: string, parfumId: string): Promise<WardrobeItem | null>;
  // getDoc, retourne l'item ou null

// ── Shelves ──
export function onShelves(uid: string, cb: (shelves: Shelf[]) => void): () => void;
export async function createShelf(uid: string, name: string, icon?: string, color?: string): Promise<string>;
export async function updateShelf(uid: string, shelfId: string, data: Partial<Pick<Shelf, 'name' | 'icon' | 'color' | 'order'>>): Promise<void>;
export async function deleteShelf(uid: string, shelfId: string): Promise<void>;
  // ⚠️ Avant delete : batch pour retirer shelfId de tous les wardrobe items qui l'ont

// ── SOTD ──
export function onTodaySotd(uid: string, cb: (entry: SotdEntry | null) => void): () => void;
  // getDoc sur sotd/{YYYY-MM-DD}
export async function setSotd(uid: string, parfumId: string, nom: string, marque: string, imageUrl?: string | null): Promise<void>;
  // setDoc sur sotd/{YYYY-MM-DD} + incrémente sotdCount sur wardrobe/{parfumId}
```

### 1.4 `src/hooks/useWardrobe.ts` — Créer

```ts
export function useWardrobe(uid: string | null) {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // onSnapshot → setItems + setLoading(false)
  // Cleanup via return du useEffect
  
  return { items, loading, addToWardrobe, updateWardrobeItem, removeFromWardrobe, isInWardrobe };
}
```

### 1.5 `src/hooks/useShelves.ts` — Créer

```ts
export function useShelves(uid: string | null) {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  // onSnapshot → setShelves
  return { shelves, createShelf, updateShelf, deleteShelf };
}
```

### 1.6 `src/hooks/useSotd.ts` — Créer

```ts
export function useSotd(uid: string | null, haveItems: WardrobeItem[]) {
  const [sotd, setSotd] = useState<SotdEntry | null>(null);
  // onSnapshot sur sotd/{today}
  
  const setTodaySotd = async (parfumId: string) => {
    const item = haveItems.find(i => i.parfumId === parfumId);
    if (!item) return;
    await setSotd(uid!, parfumId, item.nom!, item.marque!, item.imageUrl);
    // Update local state optimistiquement
  };
  
  return { sotd, setTodaySotd };
}
```

### 1.7 `firestore.rules` — Modifier

Ajouter dans `match /users/{userId}` :
```
match /wardrobe/{docId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /shelves/{docId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /sotd/{docId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### 1.8 `src/services/user-data.ts` — Ne pas modifier

Les fonctions existantes (`addToCollection`, `addToWishlist`, `addFavori`, `moveTo*`) sont **conservées** en l'état. Les pages Favoris et Historique les utilisent encore. La nouvelle fonction `addToWardrobe` est dans `wardrobe.ts`. Aucun breaking change.

---

## Utilitaire partagé

### `src/utils/ownership.ts` — Créer

```ts
import type { WardrobeItem } from '../models/wardrobe.interface';

export const OWNERSHIP_LABELS: Record<WardrobeItem['ownership'], string> = {
  have: 'Possédé',
  want: 'Souhaité',
  had: 'Ancien',
  sample: 'Échantillon',
  decant: 'Décant',
};

export function ownershipLabel(o: WardrobeItem['ownership']): string {
  return OWNERSHIP_LABELS[o];
}

/** Mapping minimum pour alimenter ParfumCard (attend ParfumSearchResult) */
export function wardrobeToCardItem(item: WardrobeItem) {
  return {
    id: item.parfumId,
    nom: item.nom ?? item.parfumId.replace(/_/g, ' '),
    marque: item.marque ?? '',
    imageUrl: item.imageUrl ?? undefined,
    familleOlactive: item.familleOlactive ?? '',
    notesTete: [] as string[],
    source: 'fragella' as const,
  };
}
```

---

## Phase 2 — Composants indépendants

### 2.1 `src/features/wardrobe/StarRating.tsx` — Créer

```tsx
interface Props {
  rating: number;        // 0-5, 0 = pas noté
  size?: number;         // defaut 24
  interactive?: boolean; // defaut true
  onChange?: (rating: number) => void;
}
```

**Comportement :**
- 5 étoiles Ionicons en ligne, gap 4px
- Remplies : `"star"` + couleur `t.colors.secondary`
- Vides : `"star-outline"` + `t.colors.textMuted`
- Tap étoile N → onChange(N). Si déjà N → onChange(0) (toggle off)
- Animation : `withSpring({ scale: 1.15 })` puis retour à 1 sur l'étoile tapée (worklet Reanimated)
- Taille de cible : `hitSlop: 8` sur chaque étoile

**Style** : `getStyles(t: Theme)` → `useMemo`, pas de fontWeight.

### 2.2 `src/features/wardrobe/WardrobeCard.tsx` — Créer

Wrapper autour de `ParfumCard` compact. Ajoute des overlays sur l'image.

```tsx
interface Props {
  item: WardrobeItem;
  onPress: () => void;  // → quick-edit sheet
}
```

**Overlays :**
- **Rating** (top-left, si `rating > 0`) : fond `rgba(0,0,0,0.5)` arrondi 10px, padding 4×6, `StarRating` non-interactive size 14
- **Badge ownership** (top-right) : `Inter_600SemiBold` 10px, padding 4×8, borderRadius 10
  - `have` → fond `primary`, texte `#FFF`, label "Possédé"
  - `want` → fond `secondary`, texte `#1F1A2E`, label "Souhaité"
  - `had` → fond `rgba(139,133,128,0.7)` (textMuted), texte `#FFF`, label "Ancien"
  - `sample` → fond `deal`, texte `#FFF`, label "Échantillon"
  - `decant` → fond `dealSoft` (light) / `#0D2826` (dark), texte `deal`, label "Décant"
- **Note indicator** (bottom-right, si `notes` non vide) : icône `"document-text-outline"` 12px, couleur `#FFF`, fond `rgba(0,0,0,0.5)` cercle 24×24

Rendu :
```tsx
<Pressable onPress={onPress}>
  <View>
    <ParfumCard parfum={wardrobeToCardItem(item)} compact onPressOverride={onPress} />
    {item.rating > 0 && <StarRating rating={item.rating} size={14} interactive={false} style={overlayTopLeft} />}
    <View style={[overlayTopRight, badgeStyle]}><Text style={badgeTextStyle}>{ownershipLabel(item.ownership)}</Text></View>
    {item.notes && <Ionicons name="document-text" size={12} color="#FFF" style={overlayBottomRight} />}
  </View>
</Pressable>
```

### 2.3 `src/components/EmptyState.tsx` — Modifier (déplacé ici depuis Phase 6)

Ajouter le variant `wardrobe` dans CONFIG et le type `Variant`. Le composant `WardrobeEmpty` standalone n'est pas créé — on réutilise `EmptyState` avec un second CTA optionnel. Pour le double CTA (catalogue + scanner), la WardrobePage utilisera deux boutons inline plutôt que le composant EmptyState seul.

Ajout dans CONFIG :
```tsx
wardrobe: {
  icon: 'shirt-outline',
  title: 'Votre garde-robe vous attend',
  desc: 'Chaque parfum raconte une histoire. La vôtre commence ici.',
  cta: 'Explorer le catalogue',
},
```
Type : `'collection' | 'wishlist' | 'favoris' | 'historique' | 'wardrobe'`

---

## Phase 3 — Composants composés

### 3.1 `src/features/wardrobe/SOTDPicker.tsx` — Créer

Bottom sheet listant les items `have` pour choisir le parfum du jour.

```tsx
interface Props {
  visible: boolean;
  haveItems: WardrobeItem[];
  currentSotdId: string | null;
  onSelect: (parfumId: string) => void;
  onClose: () => void;
}
```

**Rendu :**
- Sheet 60% hauteur, fond `t.colors.surface`, handle drag
- Champ recherche rapide en haut (filtre local par nom/marque)
- FlatList des `haveItems` (ownership === 'have'), chaque item : image 44×44 + nom + marque + icône `checkmark-circle` primary si déjà SOTD
- Tap → `onSelect(parfumId)` + fermeture
- Animation : même pattern que QuickSheet (spring open, timing close)

### 3.2 `src/features/wardrobe/SOTDCard.tsx` — Créer

```tsx
interface Props {
  sotd: SotdEntry | null;
  onPress: () => void;           // → fiche personnelle
  onChangePress: () => void;     // → ouvrir SOTDPicker
}
```

**États :**
- **SOTD défini** : carte horizontale, fond `primarySoft`, borderRadius card, padding 14, image 44×44 + nom/marque + badge "Porté aujourd'hui" (primaryInk) + bouton "Changer" (ghost)
- **SOTD non défini** : même carte, fond primarySoft, icône `sunny-outline` + texte "Quel parfum portez-vous aujourd'hui ?" + bouton "Choisir"
- **SOTD collapsé** (après premier choix dans la session) : version compacte, une ligne, `paddingVertical: 8`

### 3.3 `src/features/wardrobe/FilterBar.tsx` — Créer

```tsx
interface Props {
  shelves: Shelf[];
  activeOwnership: string | null;
  activeShelfId: string | null;
  activeSort: 'recent' | 'rating' | 'az' | 'za';
  searchQuery: string;
  ownershipCounts: Record<string, number>;  // { have: 12, want: 6, had: 3, ... }
  onOwnershipChange: (o: string | null) => void;
  onShelfChange: (id: string | null) => void;
  onSortChange: (s: string) => void;
  onSearchChange: (q: string) => void;
  onManageShelves: () => void;
}
```

**Layout :**
- Row 1 : TextInput recherche (icône search, fond surface2, borderRadius 20, height 40) + bouton ↕ tri
- Row 2 : ScrollView horizontal de pills fusionnées :
  - `[Tous]` (toujours premier, actif si aucun filtre)
  - `[Possédés N]` `[Souhaités N]` `[Anciens N]` `[Échantillons N]` `[Décants N]` — pills d'ownership (counts dynamiques)
  - Pills des shelves custom, chacun avec son nom et optionnellement son icône/couleur
  - `[+]` ou `[≡]` dernier bouton → onManageShelves
- Style pills : même pattern que `CatalogPage` chips (surface2 fond, border transparent → primarySoft + primary border si actif)

**Tri :** Le bouton ↕ ouvre un petit menu (Alert.alert ou custom dropdown) :
- "Récents" (défaut)
- "Mieux notés"
- "A–Z"
- "Z–A"

### 3.4 `src/features/wardrobe/WardrobeGrid.tsx` — Créer

```tsx
interface Props {
  items: WardrobeItem[];
  loading?: boolean;
  onItemPress: (item: WardrobeItem) => void;
  onScroll?: (y: number) => void;
}
```

**Rendu :**
- Si `loading` → `ActivityIndicator` centré
- Sinon → `FlatList` avec `numColumns={2}`
- `columnWrapperStyle={{ gap: 8, marginBottom: 8 }}`
- `contentContainerStyle={{ paddingHorizontal: 16 }}`
- `keyExtractor={item => item.parfumId}`
- Chaque item = `<WardrobeCard item={item} onPress={() => onItemPress(item)} />`
- `onScroll` prop pour le show/hide du DockBar
- `scrollEventThrottle={16}`

---

## Phase 4 — Sheets & Écrans secondaires

### 4.1 `src/features/wardrobe/WardrobeQuickSheet.tsx` — Créer

```tsx
interface Props {
  visible: boolean;
  item: WardrobeItem | null;
  shelves: Shelf[];
  onClose: () => void;
  onOwnershipChange: (ownership: WardrobeItem['ownership']) => void;
  onRatingChange: (rating: number) => void;
  onToggleShelf: (shelfId: string) => void;
  onViewMore: () => void;  // → fiche personnelle
  onRemove: () => void;
}
```

**Structure :**
- Fond semi-transparent `rgba(0,0,0,0.4)`, tap → onClose
- Sheet ancrée en bas, ~45% hauteur écran, borderRadius 20 top
- Fond : `t.colors.surface`, handle 36×5 centré en haut
- Contenu (pas de ScrollView, volontairement limité) :
  - Header : image 48×48 + nom + marque
  - StarRating interactive (size 28)
  - Chips ownership (5 options, scroll horizontal si nécessaire)
  - Chips shelves (optionnelles, si des shelves existent)
  - Bouton "Voir plus..." (Inter 600, primary) en bas
- Animation Reanimated : `withSpring` pour l'ouverture (translateY: screenHeight → 0), `withTiming` pour la fermeture
- Pas de TextInput → pas de gestion clavier

### 4.2 `app/wardrobe/[parfumId].tsx` — Créer

Fiche personnelle. Route Expo Router avec paramètre dynamique `parfumId`.

**Layout (ScrollView) :**
1. Image hero (280px, `resizeMode: cover`, source depuis Parfum cache ou placeholder)
2. Nom + Marque (Playfair 26 + Inter 11 uppercase)
3. StarRating interactive (note personnelle, sauvegarde instantanée)
4. Chips ownership (5 options, tap → update instantané)
5. Format flacon (chips : 30/50/75/100/125/200, visible seulement si ownership === 'have')
6. Chips shelves (avec toggle ×)
7. Section SOTD : toggle "Porté aujourd'hui" avec switch visuel
8. Section Notes : TextInput multiline, fond surface2, borderRadius base, padding 12, placeholder "Mes impressions..."
9. Lien "Voir la fiche complète" → `router.push('/catalog/${parfumId}')`
10. Bouton "Retirer de la garde-robe" (danger, confirmation Alert)

**Header :** flèche retour + bouton `...` (menu contextuel : "Voir la fiche catalogue", "Retirer")

**Route :** ajoutée dans `app/_layout.tsx` (Stack racine) :
```tsx
<Stack.Screen name="wardrobe/[parfumId]" options={{ headerShown: false, animation: 'slide_from_right' }} />
```

---

## Phase 5 — Écran principal

### 5.1 `app/(tabs)/collection.tsx` — Remplacer entièrement

Devient l'écran Wardrobe principal.

```tsx
export default function WardrobePage({ onScroll }: { onScroll?: (y: number) => void }) {
  const { theme } = useTheme();
  const { user, authReady, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const uid = user?.uid ?? null;
  
  const { items, loading } = useWardrobe(uid);
  const { shelves } = useShelves(uid);
  const haveItems = useMemo(() => items.filter(i => i.ownership === 'have'), [items]);
  const { sotd, setTodaySotd } = useSotd(uid, haveItems);
  
  // Compteurs par ownership (base : total items, pas filtered)
  const ownershipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.ownership] = (counts[item.ownership] ?? 0) + 1;
    }
    return counts;
  }, [items]);
  
  // États locaux
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOwnership, setActiveOwnership] = useState<string | null>(null);
  const [activeShelfId, setActiveShelfId] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<'recent' | 'rating' | 'az' | 'za'>('recent');
  const [quickSheetItem, setQuickSheetItem] = useState<WardrobeItem | null>(null);
  const [shelfManagerVisible, setShelfManagerVisible] = useState(false);
  const [sotdPickerVisible, setSotdPickerVisible] = useState(false);
  
  // Filtrage + tri côté client
  const filtered = useMemo(() => {
    let result = [...items];
    if (activeOwnership) result = result.filter(i => i.ownership === activeOwnership);
    if (activeShelfId) result = result.filter(i => i.shelfIds.includes(activeShelfId));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(i => 
        (i.nom ?? '').toLowerCase().includes(q) || 
        (i.marque ?? '').toLowerCase().includes(q)
      );
    }
    // Tri
    result.sort((a, b) => {
      switch (activeSort) {
        case 'rating': return (b.rating ?? 0) - (a.rating ?? 0);
        case 'az': return (a.nom ?? '').localeCompare(b.nom ?? '');
        case 'za': return (b.nom ?? '').localeCompare(a.nom ?? '');
        case 'recent':
        default: return b.addedAt.getTime() - a.addedAt.getTime();
      }
    });
    return result;
  }, [items, activeOwnership, activeShelfId, searchQuery, activeSort]);
  
  // Auth gate
  if (!authReady) return <LoadingView />;
  if (!isAuthenticated) return <AuthRequiredView />;
  
  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Ma Garde-robe · {items.length}</Text>
        <ProfileAvatar />
      </View>
      
      {items.length === 0 ? (
        <WardrobeEmpty
          onAddFromCatalog={() => router.replace('/(tabs)')}
          onScan={() => router.push('/(tabs)/scan')}
        />
      ) : (
        <>
          <SOTDCard
            sotd={sotd}
            onPress={() => sotd && router.push(`/wardrobe/${sotd.parfumId}`)}
            onChangePress={() => setSotdPickerVisible(true)}
          />
          <FilterBar
            shelves={shelves}
            activeOwnership={activeOwnership}
            activeShelfId={activeShelfId}
            activeSort={activeSort}
            searchQuery={searchQuery}
            ownershipCounts={ownershipCounts}
            onOwnershipChange={setActiveOwnership}
            onShelfChange={setActiveShelfId}
            onSortChange={setActiveSort}
            onSearchChange={setSearchQuery}
            onManageShelves={() => setShelfManagerVisible(true)}
          />
          <WardrobeGrid
            items={filtered}
            loading={loading}
            onItemPress={setQuickSheetItem}
            onScroll={onScroll}
          />
        </>
      )}
      
      {/* Quick-edit sheet */}
      <WardrobeQuickSheet
        visible={quickSheetItem !== null}
        item={quickSheetItem}
        shelves={shelves}
        onClose={() => setQuickSheetItem(null)}
        onOwnershipChange={(o) => { /* updateWardrobeItem */ }}
        onRatingChange={(r) => { /* updateWardrobeItem */ }}
        onToggleShelf={(sid) => { /* toggle shelfIds */ }}
        onViewMore={() => {
          const id = quickSheetItem?.parfumId;
          setQuickSheetItem(null);
          if (id) router.push(`/wardrobe/${id}`);
        }}
        onRemove={() => { /* confirm + removeFromWardrobe */ }}
      />
      
      {/* Shelf manager modal */}
      <ShelfManager
        visible={shelfManagerVisible}
        shelves={shelves}
        orphanCount={items.filter(i => i.shelfIds.length === 0).length}
        onClose={() => setShelfManagerVisible(false)}
        onCreate={/* createShelf */}
        onRename={/* updateShelf */}
        onDelete={/* deleteShelf */}
      />

      {/* SOTD picker */}
      <SOTDPicker
        visible={sotdPickerVisible}
        haveItems={haveItems}
        currentSotdId={sotd?.parfumId ?? null}
        onSelect={(parfumId) => {
          setTodaySotd(parfumId);
          setSotdPickerVisible(false);
        }}
        onClose={() => setSotdPickerVisible(false)}
      />
    </SafeAreaView>
  );
}
```

**getStyles** : standard, `useTheme()` + `useMemo`, pas de fontWeight.

---

## Phase 6 — Intégrations

### 6.1 `app/(tabs)/index.tsx` — Modifier

```tsx
// AVANT
import CollectionPage from './collection';
// APRÈS
import WardrobePage from './collection';  // le fichier collection.tsx contient maintenant WardrobePage

// Ligne 201 : changer le composant
<WardrobePage onScroll={handlePageScroll} />
```

### 6.2 `src/features/navigation/DockBar.tsx` — Modifier

```tsx
// Ligne 109 : changer le dernier tab
{ index: 4, iconActive: 'shirt', iconInactive: 'shirt-outline', label: 'Garde-robe' },
```

### 6.3 `app/catalog/[id].tsx` — Modifier

Remplacer les 3 boutons d'action (lignes 542-555) par 2 boutons :

```tsx
<View style={s.actionRow}>
  {/* Favori — inchangé */}
  <Pressable onPress={toggleFav} style={s.actionBtn}>
    <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? t.colors.favorite : t.colors.textMuted} />
    <Text style={[s.actionLabel, isFav && { color: t.colors.favorite }]}>Favori</Text>
  </Pressable>
  
  {/* Wardrobe — nouveau */}
  <Pressable onPress={handleWardrobePress} style={[s.actionBtn, inWardrobe && s.actionBtnActive]}>
    <Ionicons name={inWardrobe ? 'shirt' : 'shirt-outline'} size={18} color={inWardrobe ? t.colors.primary : t.colors.textMuted} />
    <Text style={[s.actionLabel, inWardrobe && { color: t.colors.primary }]}>
      {inWardrobe ? ownershipLabel(wardrobeItem!.ownership) : 'Garde-robe'}
    </Text>
  </Pressable>
</View>
```

**Logique :**
- `handleWardrobePress` :
  - Si pas dans la wardrobe → mini bottom sheet avec sélecteur d'ownership + bouton "Ajouter"
  - Si dans la wardrobe → `router.push(\`/wardrobe/${parfumId}\`)`
- État `inWardrobe` + `wardrobeItem` chargés via `isInWardrobe(uid, id)` dans le `useEffect` existant
- Supprimer les states `isInColl`, `collItemId`, `isInWish`, `wishItemId`, et les fonctions `toggleCollection`, `toggleWishlist`
- Style `s.actionBtnActive` : fond `primarySoft`, border `primary`

### 6.4 `app/_layout.tsx` — Modifier

Ajouter la route dans le Stack :
```tsx
<Stack.Screen name="wardrobe/[parfumId]" options={{ headerShown: false, animation: 'slide_from_right' }} />
```

Vérifier que cette ligne est avant le `</Stack>` fermant.

### 6.5 `src/services/user-data.ts` — Ne pas modifier

Les fonctions `addToCollection`, `addToWishlist`, `removeFromCollection`, `removeFromWishlist`, `moveToCollection`, `moveToWishlist`, `moveFavori`, `isInCollection`, `isInWishlist` sont conservées. Les anciennes pages Favoris/Historique les utilisent. La Wardrobe utilise son propre service (`wardrobe.ts`). Aucun breaking change.

---

## Récapitulatif des fichiers

### Créés (13)
| Fichier |
|---------|
| `src/utils/ownership.ts` |
| `src/models/wardrobe.interface.ts` |
| `src/services/wardrobe.ts` |
| `src/hooks/useWardrobe.ts` |
| `src/hooks/useShelves.ts` |
| `src/hooks/useSotd.ts` |
| `src/features/wardrobe/StarRating.tsx` |
| `src/features/wardrobe/WardrobeCard.tsx` |
| `src/features/wardrobe/SOTDPicker.tsx` |
| `src/features/wardrobe/SOTDCard.tsx` |
| `src/features/wardrobe/FilterBar.tsx` |
| `src/features/wardrobe/WardrobeGrid.tsx` |
| `src/features/wardrobe/WardrobeQuickSheet.tsx` |
| `src/features/wardrobe/ShelfManager.tsx` |
| `app/wardrobe/[parfumId].tsx` |

### Modifiés (8)
| Fichier | Changement |
|---------|------------|
| `src/models/index.ts` | +1 export line |
| `src/components/EmptyState.tsx` | +1 variant `wardrobe` + type update |
| `firestore.rules` | +9 lines (3 match blocks) |
| `app/(tabs)/collection.tsx` | Remplacement complet |
| `app/(tabs)/index.tsx` | Import renommé |
| `src/features/navigation/DockBar.tsx` | Label + icône |
| `app/catalog/[id].tsx` | 3 boutons → 2, ~100 lignes supprimées |
| `app/_layout.tsx` | +1 Stack.Screen |

---

## Vérification finale

```bash
npx tsc --noEmit
```

Attendu : 0 erreur.
