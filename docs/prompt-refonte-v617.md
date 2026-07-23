# MISSION : Refonte fiche détail parfum (v6.17) — Exécution stricte, zéro improvisation

## 1. Contexte projet

- React Native 0.86 / Expo SDK 57 / TypeScript strict / Expo Router, sur Windows (PowerShell 5.1 — si une commande est bloquée par l'ExecutionPolicy, préfixe avec `cmd /c `).
- Design system « Luxe malin » : tokens dans `src/theme/theme.ts` (palettes `lightColors`/`darkColors`), hook `useTheme()`, pattern `getStyles(t: Theme)` + `useMemo(() => getStyles(theme), [theme])`.
- Règles absolues du projet : **0 `fontWeight`** (toujours `fontFamily`), **0 couleur hardcodée** hors tokens thème (exceptions existantes : `#FFFFFF`, `#1F1A2E`), **0 `any`**, commentaires en français, composants = fonctions.
- Les numéros de ligne ci-dessous se réfèrent à l'état ACTUEL des fichiers. Ils dérivent après chaque édition : localise toujours par **chaîne d'ancrage exacte**, jamais par numéro seul.

## 2. Règles d'exécution (non négociables)

1. Lis chaque fichier AVANT de le modifier.
2. Exécute les étapes 1 → 10 dans l'ordre, sans en sauter aucune.
3. Copie les blocs de code fournis **à l'identique** (indentation, typage, commentaires). N'optimise pas, ne renomme pas, ne reformate pas, ne « corrige » rien de ton chef.
4. Si une chaîne d'ancrage est introuvable ou apparaît plusieurs fois : **STOP**, rapporte le problème, n'improvise pas de contournement.
5. Ne touche à AUCUN fichier non listé. Ne lance AUCUNE commande git.
6. Réponds en français.

---

## ÉTAPE 1 — Charger les polices (bug P0 : Inter/Playfair ne sont chargées nulle part)

**1.1** — Installer :

```powershell
npm install @expo-google-fonts/inter @expo-google-fonts/playfair-display
```

**1.2** — Fichier `app/_layout.tsx` : après la ligne 13 (`import '../src/services/firebase';`), ajouter :

```tsx
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_500Medium, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display';
```

**1.3** — Remplacer la fonction `RootLayout` (lignes 84-90) par :

```tsx
export default function RootLayout() {
  // Chargement des polices AVANT tout rendu — le splash reste visible
  // (preventAutoHideAsync est appelé au niveau module, L22).
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
    PlayfairDisplay_500Medium, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic,
  });
  if (!fontsLoaded) return null;
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
```

---

## ÉTAPE 2 — Tokens saisonniers · `src/theme/theme.ts`

(L'interface `Theme` déclare `colors: Record<string, string>` → aucun changement de typage.)

**2.1** — Dans `lightColors`, insérer juste après la ligne `pyramidBaseInk: '#4C2A9E',` :

```ts
  seasonSpring: '#3E9B6D',
  seasonSpringSoft: '#EAF4EE',
  seasonSummer: '#EE6C4A',
  seasonSummerSoft: '#FDEEE8',
  seasonFall: '#A85B32',
  seasonFallSoft: '#F5EDE6',
  seasonWinter: '#4A7FB5',
  seasonWinterSoft: '#EBF1F8',
```

**2.2** — Dans `darkColors`, insérer juste après la ligne `pyramidBaseInk: '#B9A0F8',` :

```ts
  seasonSpring: '#5FBF8A',
  seasonSpringSoft: '#0F2A1E',
  seasonSummer: '#F58A63',
  seasonSummerSoft: '#2E1A12',
  seasonFall: '#C97F4F',
  seasonFallSoft: '#27190F',
  seasonWinter: '#6FA3DE',
  seasonWinterSoft: '#16222F',
```

---

## ÉTAPE 3 — Créer `src/features/catalog/DetailHero.tsx`

Créer le fichier avec exactement ce contenu :

```tsx
// src/features/catalog/DetailHero.tsx — Image hero de la fiche détail (hero pur, sans overlay prix)

import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useTheme, type Theme } from '../../theme/ThemeContext';

const PALETTE = ['#5B21B6', '#1E40AF', '#065F46', '#92400E', '#991B1B', '#9D174D', '#3730A3', '#854D0E'];

function brandColor(brand: string): string {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface Props {
  imageUrl: string | null;
  brand: string;
  imgFailed: boolean;
  onImageError: () => void;
  onImagePress: () => void;
}

export default function DetailHero({ imageUrl, brand, imgFailed, onImageError, onImagePress }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);

  const hasImage = imageUrl && !imgFailed;

  return (
    <View style={s.container}>
      {hasImage ? (
        <Pressable onPress={onImagePress}>
          <Image
            source={{ uri: imageUrl }}
            style={s.image}
            contentFit="contain"
            transition={300}
            onError={onImageError}
          />
        </Pressable>
      ) : (
        <View style={[s.placeholder, { backgroundColor: brandColor(brand) }]}>
          <Text style={s.placeholderText}>{brand.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      {hasImage ? (
        <Pressable onPress={onImagePress} style={s.expandBtn} hitSlop={8} accessibilityLabel="Agrandir l'image">
          <Ionicons name="expand-outline" size={16} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function getStyles(t: Theme) {
  return {
    container: {
      position: 'relative' as const,
      width: '100%',
      height: 340,
      backgroundColor: t.colors.surface,
      borderBottomWidth: 0.5,
      borderBottomColor: t.colors.border,
    },
    image: { width: '100%', height: 340, backgroundColor: t.colors.surface },
    placeholder: { width: '100%', height: 340, justifyContent: 'center' as const, alignItems: 'center' as const },
    placeholderText: { fontSize: 72, fontFamily: 'Inter_700Bold', color: '#FFFFFF', opacity: 0.5 },
    expandBtn: {
      position: 'absolute' as const,
      bottom: 12,
      right: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.colors.surface,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      ...t.shadow.card,
    },
  } as const;
}
```

---

## ÉTAPE 4 — `src/features/catalog/StickyBottomBar.tsx` (barre flottante)

**4.1** — Ligne 1, remplacer le commentaire par :

```ts
// src/features/catalog/StickyBottomBar.tsx — Barre d'action flottante (prix + actions, slide-in après la section prix)
```

**4.2** — Remplacer `name={wardrobeItem ? 'shirt' : 'shirt-outline'}` par `name={wardrobeItem ? 'flask' : 'flask-outline'}`.

**4.3** — Remplacer `paddingBottom: insets.bottom + 6` par `paddingBottom: insets.bottom + 12`.

**4.4** — Dans `getStyles`, remplacer les entrées `root` et `inner` par :

```ts
    root: {
      position: 'absolute' as const,
      bottom: 0,
      left: 12,
      right: 12,
      zIndex: 20,
      paddingTop: 6,
    },
    inner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      ...t.shadow.elevated,
    },
```

**4.5** — L'import `StyleSheet` (ligne 4) devient inutilisé : le retirer de l'import `react-native`.

---

## ÉTAPE 5 — `src/features/catalog/CollapsingHeader.tsx`

Remplacer `letterSpacing: 2,` par `letterSpacing: 1.5,` (une seule occurrence, dans le style `brand`).

---

## ÉTAPE 6 — `src/features/catalog/OlfactoryPyramid.tsx`

**6.1** — Remplacer :

```tsx
      <Text style={s.title}>Pyramide olfactive</Text>
      <Text style={s.subtitle}>Touchez une section pour explorer les notes</Text>
```

par :

```tsx
      <View style={s.header}>
        <Text style={s.title}>Pyramide olfactive</Text>
        <Text style={s.subtitle}>Touchez une section pour explorer les notes</Text>
      </View>
```

**6.2** — Dans `getStyles`, remplacer les entrées `title` et `subtitle` :

```ts
    title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15, color: c.text, marginBottom: 2 },
    subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: c.textMuted, marginBottom: 22 },
```

par :

```ts
    header: { width: '100%' as const, marginBottom: 22 },
    title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: c.text, marginBottom: 2 },
    subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: c.textMuted },
```

Rien d'autre ne change dans ce fichier.

---

## ÉTAPE 7 — `app/catalog/[id].tsx` (refonte principale)

**Zones à NE PAS TOUCHER** : le gesture edge-pan (lignes 166-189), les `useEffect` de chargement (211-309), les handlers (311-360), le `<StickyBottomBar>` (605-618), les trois popups (621-639), le wrapper Android (643-669), le spacer `<View style={{height:100}} />` (602).

### 7.1 — Ligne 1, remplacer le commentaire par :

```ts
// app/catalog/[id].tsx — Fiche détail parfum v7 : hero épuré, prix unique, storytelling olfactif
```

### 7.2 — Remplacer l'import hero :

| Avant | Après |
|---|---|
| `import HeroPriceOverlay from '../../src/features/catalog/HeroPriceOverlay';` | `import DetailHero from '../../src/features/catalog/DetailHero';` |

### 7.3 — Helpers (3 remplacements, `longevityMeta`/`sillageMeta`/`accordScore`/`typeParfumLabel` restent intacts)

**7.3a** — Remplacer le bloc allant de `// ─── Mappings FR ─────` jusqu'à la fermeture `};` de `OCCASION_META` par :

```ts
// ─── Mappings FR ─────────────────────────────────────────────

type SeasonKey = 'spring' | 'summer' | 'fall' | 'winter';

const SEASON_ORDER: SeasonKey[] = ['spring', 'summer', 'fall', 'winter'];

// Couleurs = tokens saisonniers dédiés du thème (dark-mode safe)
const SEASON_META: Record<SeasonKey, { label: string; icon: string; token: 'seasonSpring' | 'seasonSummer' | 'seasonFall' | 'seasonWinter' }> = {
  spring: { label: 'Printemps', icon: 'flower-outline', token: 'seasonSpring' },
  summer: { label: 'Été',       icon: 'sunny',          token: 'seasonSummer' },
  fall:   { label: 'Automne',   icon: 'leaf',           token: 'seasonFall' },
  winter: { label: 'Hiver',     icon: 'snow',           token: 'seasonWinter' },
};

// Normalise une entrée brute de seasonRanking → clé saison connue, sinon null.
// Filtre les valeurs parasites ("day", "night", …) qui ne sont PAS des saisons.
function normalizeSeasonKey(name: string): SeasonKey | null {
  const k = name.toLowerCase().trim();
  if (k === 'autumn') return 'fall';
  return (SEASON_ORDER as string[]).includes(k) ? (k as SeasonKey) : null;
}

const OCCASION_META: Record<string, { label: string; icon: string }> = {
  casual:       { label: 'Jour',        icon: 'sunny' },
  day:          { label: 'Jour',        icon: 'sunny' },
  daily:        { label: 'Jour',        icon: 'sunny' },
  evening:      { label: 'Soirée',      icon: 'moon' },
  night:        { label: 'Soirée',      icon: 'moon' },
  'night out':  { label: 'Soirée',      icon: 'moon' },
  night_out:    { label: 'Soirée',      icon: 'moon' },
  party:        { label: 'Fête',        icon: 'musical-notes' },
  club:         { label: 'Fête',        icon: 'musical-notes' },
  work:         { label: 'Bureau',      icon: 'briefcase' },
  office:       { label: 'Bureau',      icon: 'briefcase' },
  business:     { label: 'Bureau',      icon: 'briefcase' },
  professional: { label: 'Bureau',      icon: 'briefcase' },
  date:         { label: 'Rendez-vous', icon: 'heart' },
  romantic:     { label: 'Rendez-vous', icon: 'heart' },
  formal:       { label: 'Formel',      icon: 'shirt' },
  sport:        { label: 'Sport',       icon: 'fitness' },
  leisure:      { label: 'Loisir',      icon: 'game-controller' },
};

interface RankedItem { key: string; label: string; icon: string; score: number }

// Déduplique par label FR (plusieurs clés EN → même label) en gardant le score max,
// trié par score décroissant. Les clés inconnues sont ignorées (jamais de fallback brut).
function rankAndDedupe(ranking: { name: string; score: number }[]): RankedItem[] {
  const byLabel = new Map<string, RankedItem>();
  for (const item of ranking) {
    const k = item.name.toLowerCase().trim();
    const meta = OCCASION_META[k];
    if (!meta) continue;
    const existing = byLabel.get(meta.label);
    if (!existing || item.score > existing.score) {
      byLabel.set(meta.label, { key: k, label: meta.label, icon: meta.icon, score: item.score });
    }
  }
  return [...byLabel.values()].sort((a, b) => b.score - a.score);
}
```

**7.3b** — Supprimer intégralement `popLabel` et `scoreLabel` (de `function popLabel(score: number)` à l'accolade fermante de `scoreLabel`, juste avant `function typeParfumLabel`).

**7.3c** — Remplacer tout le bloc de `function StatBar(` jusqu'à l'accolade fermante de `SectionTitle` (juste avant `export default function CatalogDetailPage()`) par :

```ts
// ─── Titres de section ───────────────────────────────────────

function SectionTitle({ icon, title, subtitle, tint, tintSoft, s, t }: { icon: string; title: string; subtitle?: string; tint?: string; tintSoft?: string; s: ReturnType<typeof getStyles>; t: Theme }) {
  return (
    <View style={s.sectionTitle}>
      <View style={[s.sectionIconWrap, { backgroundColor: tintSoft ?? t.colors.primarySoft }]}>
        <Ionicons name={icon as never} size={14} color={tint ?? t.colors.primaryInk} />
      </View>
      <View style={s.sectionTitleBody}>
        <Text style={s.sectionTitleText}>{title}</Text>
        {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

// ─── Jauge horizontale (longévité, sillage) ──────────────────

function GaugeRow({ icon, iconBg, iconColor, label, valueLabel, pct, barColor, valColor, s }: { icon: string; iconBg: string; iconColor: string; label: string; valueLabel: string; pct: number; barColor: string; valColor: string; s: ReturnType<typeof getStyles> }) {
  return (
    <View style={s.gaugeRow}>
      <View style={[s.gaugeIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as never} size={14} color={iconColor} />
      </View>
      <View style={s.gaugeBody}>
        <Text style={s.gaugeLabel}>{label}</Text>
        <View style={s.gaugeTrack}><View style={[s.gaugeFill, { width: `${pct}%`, backgroundColor: barColor }]} /></View>
      </View>
      <Text style={[s.gaugeVal, { color: valColor }]}>{valueLabel}</Text>
    </View>
  );
}

// ─── Barre d'accord (violet dégradé par rang) ────────────────

const ACCORD_ALPHAS = ['FF', 'CC', '99', '73', '59'];

function AccordBar({ name, pct, index, s, t }: { name: string; pct: number; index: number; s: ReturnType<typeof getStyles>; t: Theme }) {
  const color = `${t.colors.primary}${ACCORD_ALPHAS[index % ACCORD_ALPHAS.length]}`;
  return (
    <View style={s.statBar}>
      <Text style={s.statLabel} numberOfLines={1}>{name}</Text>
      <View style={[s.statTrack, { backgroundColor: t.colors.primarySoft }]}>
        <View style={[s.statFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.statPct, { color: t.colors.violetInk }]}>{pct}%</Text>
    </View>
  );
}
```

### 7.4 — Données dérivées : remplacer le bloc de `const seasonData = ...` jusqu'à la fermeture `};` de `OCCASION_ICON` par :

```ts
  const heroUrl = parfum?.imageUrl ?? null;
  const hasBestPrice = typeof parfum?.bestPrice === 'number' && parfum.bestPrice > 0;
  const ratingDisplay: number | undefined = (() => {
    const p = parfum;
    if (!p) return undefined;
    if (typeof p.ratingScore === 'number') return Number.isNaN(p.ratingScore) ? undefined : p.ratingScore;
    if (typeof p.rating === 'string') { const v = parseFloat(p.rating); return Number.isNaN(v) ? undefined : v; }
    return undefined;
  })();

  // Saisons : clé normalisée → score max. Les valeurs parasites ("day", "night")
  // sont filtrées par normalizeSeasonKey → plus jamais de texte anglais brut.
  const seasonScores = new Map<SeasonKey, number>();
  if (parfum?.seasonRanking) {
    for (const item of parfum.seasonRanking) {
      const k = normalizeSeasonKey(item.name);
      if (!k) continue;
      seasonScores.set(k, Math.max(seasonScores.get(k) ?? 0, item.score));
    }
  }
  const seasonMax = Math.max(0, ...seasonScores.values());
  const topSeasonKey = seasonMax > 0 ? (SEASON_ORDER.find(k => seasonScores.get(k) === seasonMax) ?? null) : null;

  // Occasions : dédupliquées par label FR, triées par score décroissant
  const occasions = parfum?.occasionRanking ? rankAndDedupe(parfum.occasionRanking) : [];
  const topOccasions = occasions.slice(0, 3);
```

### 7.5 — Remplacer le commentaire `  // Parfums similaires — recherche Firestore par accords partagés` par `  // Recommandations — recherche Firestore par accords partagés`.

### 7.6 — JSX : remplacer TOUT le bloc commençant à `          <HeroPriceOverlay` et se terminant à la ligne `{similarsLoading && <ActivityIndicator style={{ marginTop: 12 }} color={t.colors.primary} />}` incluse, par :

```tsx
          <DetailHero
            imageUrl={heroUrl}
            brand={parfum.marque}
            imgFailed={imgFailed}
            onImageError={handleImageError}
            onImagePress={handleImagePress}
          />

          <View style={s.contentWrap}>
            {/* ─── Méta : famille, concentration, année, note ─── */}
            <View style={s.badgeRow}>
              <View style={[s.badgeCompact, { backgroundColor: t.colors.primarySoft }]}>
                <Text style={[s.badgeCompactText, { color: t.colors.primaryInk }]}>{translateNote(parfum.familleOlactive)}</Text>
              </View>
              {parfum.typeParfum ? (
                <View style={[s.badgeCompact, { backgroundColor: t.colors.surface2 }]}>
                  <Text style={[s.badgeCompactText, { color: t.colors.textMuted }]}>{typeParfumLabel(parfum.typeParfum)}</Text>
                </View>
              ) : null}
              {parfum.annee ? (
                <View style={[s.badgeCompact, { backgroundColor: t.colors.secondarySoft }]}>
                  <Text style={[s.badgeCompactText, { color: t.colors.secondaryInk }]}>{parfum.annee}</Text>
                </View>
              ) : null}
              {ratingDisplay !== undefined ? (
                <View style={[s.badgeCompact, s.ratingChip, { backgroundColor: t.colors.fairSoft }]}>
                  <Ionicons name="star" size={10} color={t.colors.fair} />
                  <Text style={[s.badgeCompactText, { color: t.colors.fair }]}>{ratingDisplay}</Text>
                </View>
              ) : null}
              {__DEV__ && (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: parfum.source === 'seed' || parfum.source === 'manual' ? t.colors.primary : t.colors.overpriced, alignSelf: 'center' }} />
              )}
            </View>

            {/* ─── Ligne éditoriale (voix lookbook, Playfair italique) ─── */}
            {topSeasonKey || topOccasions.length > 0 ? (
              <Text style={s.editorialLine} maxFontSizeMultiplier={1.3}>
                {[topSeasonKey ? SEASON_META[topSeasonKey].label : null, topOccasions[0]?.label ?? null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}

            {/* ─── Le prix (affichage unique dans le flux) ─── */}
            <View ref={priceSectionRef} onLayout={(e: LayoutChangeEvent) => { priceSectionY.value = e.nativeEvent.layout.y + 20; }}>
              {hasBestPrice ? (
                <View style={s.dealSection}>
                  <PriceDisplay
                    bestPrice={parfum.bestPrice!}
                    referencePrice={parfum.referencePrice}
                    priceValue={parfum.priceValue as 'deal' | 'fair' | 'overpriced' | undefined}
                    large
                  />
                  {parfum.purchaseUrl ? (
                    <Button variant="primary" onPress={() => Linking.openURL(parfum.purchaseUrl!)} icon="cart-outline" style={s.buyBtn}>
                      Voir l'offre
                    </Button>
                  ) : null}
                </View>
              ) : null}

              {isAuthenticated && user?.uid && id ? (
                <AlertPriceToggle parfumId={id} uid={user.uid} currentPrice={parfum.bestPrice} />
              ) : null}

              {/* ─── Comparer les marchands ─── */}
              {parfum.offers && parfum.offers.length > 1 ? (
                <View style={s.infoZone}>
                  <SectionTitle icon="pricetags-outline" title="Comparer les marchands" tint={t.colors.deal} tintSoft={t.colors.dealSoft} s={s} t={t} />
                  {parfum.offers.map((offer, i) => (
                    <Pressable
                      key={`${offer.marchand}-${i}`}
                      style={s.offerRow}
                      onPress={() => offer.url && Linking.openURL(offer.url)}
                    >
                      <View style={s.offerLeft}>
                        <Text style={s.offerMerchant}>{offer.marchand}</Text>
                        {offer.volumeMl ? <Text style={s.offerVolume}>{offer.volumeMl} ml</Text> : null}
                      </View>
                      <View style={s.offerRight}>
                        <Text style={s.offerPrice}>{offer.prix.toFixed(0)} €</Text>
                        {parfum.bestPrice && offer.prix > parfum.bestPrice ? (
                          <Text style={s.offerDiff}>+{(offer.prix - parfum.bestPrice).toFixed(0)} €</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            {/* ─── Pyramide olfactive ─── */}
            <OlfactoryPyramid
              topNotes={parfum.notesTete}
              heartNotes={parfum.notesCoeur}
              baseNotes={parfum.notesFond}
              onNotePress={setSelectedNote}
            />

            {/* ─── Accords principaux ─── */}
            {parfum.mainAccords && parfum.mainAccords.length > 0 ? (
              <View style={s.infoZone}>
                <SectionTitle icon="color-filter-outline" title="Accords principaux" s={s} t={t} />
                {(parfum.mainAccordsPercentage
                  ? Object.entries(parfum.mainAccordsPercentage)
                      .sort(([, a], [, b]) => accordScore(b) - accordScore(a))
                      .map(([name, pctStr]) => ({ name, pct: accordScore(pctStr) }))
                  : parfum.mainAccords.map((name, i) => ({ name, pct: 100 - i * 12 }))
                ).slice(0, 5).map((a, i) => (
                  <AccordBar key={a.name} name={translateNote(a.name)} pct={a.pct} index={i} s={s} t={t} />
                ))}
              </View>
            ) : null}

            {/* ─── Tenue & sillage ─── */}
            {parfum.longevity || parfum.sillage ? (
              <View style={s.infoZone}>
                <SectionTitle icon="flash-outline" title="Tenue & sillage" tint={t.colors.reward} tintSoft={t.colors.rewardSoft} s={s} t={t} />
                {parfum.longevity ? (() => {
                  const m = longevityMeta(parfum.longevity!);
                  return <GaugeRow icon="time-outline" iconBg={t.colors.violetSoft} iconColor={t.colors.violetInk} label="Longévité" valueLabel={m.label} pct={m.pct} barColor={t.colors.primary} valColor={t.colors.violetInk} s={s} />;
                })() : null}
                {parfum.sillage ? (() => {
                  const m = sillageMeta(parfum.sillage!);
                  return <GaugeRow icon="pulse-outline" iconBg={t.colors.rewardSoft} iconColor={t.colors.reward} label="Sillage" valueLabel={m.label} pct={m.pct} barColor={t.colors.reward} valColor={t.colors.reward} s={s} />;
                })() : null}
              </View>
            ) : null}

            {/* ─── Quand le porter ─── */}
            {seasonMax > 0 || topOccasions.length > 0 ? (
              <View style={s.infoZone}>
                <SectionTitle icon="calendar-outline" title="Quand le porter" tint={t.colors.secondary} tintSoft={t.colors.secondarySoft} s={s} t={t} />
                {seasonMax > 0 ? (
                  <View style={s.seasonCols}>
                    {SEASON_ORDER.map(key => {
                      const meta = SEASON_META[key];
                      const score = seasonScores.get(key) ?? 0;
                      const ratio = seasonMax > 0 ? score / seasonMax : 0;
                      const isTop = key === topSeasonKey;
                      const color = t.colors[meta.token];
                      const soft = t.colors[`${meta.token}Soft`];
                      return (
                        <View key={key} style={s.seasonCol}>
                          <View style={[s.seasonIconWrap, { backgroundColor: isTop ? soft : t.colors.surface2 }]}>
                            <Ionicons name={meta.icon as never} size={15} color={score > 0 ? color : t.colors.textMuted} />
                          </View>
                          <View style={s.seasonTrack}>
                            <View style={[s.seasonFill, { height: `${score > 0 ? Math.max(10, Math.round(ratio * 100)) : 6}%`, backgroundColor: score > 0 ? color : t.colors.border }]} />
                          </View>
                          <Text style={[s.seasonLabel, isTop ? { color: t.colors.text, fontFamily: 'Inter_600SemiBold' } : null]}>{meta.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
                {topOccasions.length > 0 ? (
                  <View style={[s.occasionRow, seasonMax > 0 ? { marginTop: 14 } : null]}>
                    {topOccasions.map((o, i) => (
                      <View key={o.label} style={[s.occasionChip, i === 0 ? { backgroundColor: t.colors.primarySoft } : null]}>
                        <Ionicons name={o.icon as never} size={12} color={i === 0 ? t.colors.primaryInk : t.colors.textMuted} />
                        <Text style={[s.occasionChipText, i === 0 ? { color: t.colors.primaryInk, fontFamily: 'Inter_600SemiBold' } : null]}>{o.label}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* ─── Dans le même esprit (recommandations) ─── */}
            {similars.length > 0 ? (
              <View style={s.infoZone}>
                <SectionTitle icon="sparkles-outline" title="Dans le même esprit" subtitle="Sélection aux accords proches" s={s} t={t} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.similarRow}>
                  {similars.map(sim => (
                    <View key={sim.id} style={s.similarCardWrap}>
                      <ParfumCard
                        parfum={sim}
                        mode="compact"
                        onPressOverride={() => {
                          setPendingParfum(sim);
                          router.push(`/catalog/${sim.id}`);
                        }}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            {similarsLoading ? <ActivityIndicator style={{ marginTop: 12 }} color={t.colors.primary} /> : null}
```

### 7.7 — Remplacer INTÉGRALEMENT la fonction `getStyles` (de `function getStyles(t: Theme) {` à la fin du fichier) par :

```ts
function getStyles(t: Theme) {
  return {
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentWrap: { paddingHorizontal: t.spacing.md, paddingTop: 14, paddingBottom: t.spacing.xl, backgroundColor: t.colors.surface, borderRadius: t.radius.card, ...t.shadow.card },
  // ─── Méta ───
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 },
  badgeCompact: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeCompactText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // ─── Ligne éditoriale ───
  editorialLine: { fontFamily: 'PlayfairDisplay_700Bold_Italic', fontSize: 15, color: t.colors.textMuted, marginTop: -2, marginBottom: 8 },
  // ─── Prix ───
  dealSection: { marginBottom: 8, gap: 10 },
  buyBtn: { marginTop: 2 },
  // ─── Sections ───
  infoZone: { marginTop: 24, gap: 8 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sectionTitleBody: { flex: 1 },
  sectionTitleText: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: t.colors.text },
  sectionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: t.colors.textMuted, marginTop: 1 },
  // ─── Jauges ───
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  gaugeIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  gaugeBody: { flex: 1 },
  gaugeLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: t.colors.textMuted, marginBottom: 3 },
  gaugeTrack: { height: 6, borderRadius: 3, backgroundColor: t.colors.border, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 3 },
  gaugeVal: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginLeft: 8, minWidth: 70, textAlign: 'right' },
  // ─── Saisons (4 colonnes) ───
  seasonCols: { flexDirection: 'row', gap: 8, marginTop: 4 },
  seasonCol: { flex: 1, alignItems: 'center', gap: 6 },
  seasonIconWrap: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  seasonTrack: { width: 8, height: 44, borderRadius: 4, backgroundColor: t.colors.surface2, justifyContent: 'flex-end', overflow: 'hidden' },
  seasonFill: { width: '100%', borderRadius: 4 },
  seasonLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', color: t.colors.textMuted },
  // ─── Occasions (chips) ───
  occasionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  occasionChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: t.colors.surface2 },
  occasionChipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: t.colors.textMuted },
  // ─── Accords ───
  statBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  statLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: t.colors.text, width: 96 },
  statTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: 3 },
  statPct: { fontSize: 12, fontFamily: 'Inter_700Bold', width: 36, textAlign: 'right' },
  // ─── Recommandations ───
  similarRow: { gap: 12, paddingTop: 4 },
  similarCardWrap: { width: 160 },
  // ─── Marchands ───
  offerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
  offerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offerMerchant: { fontFamily: 'Inter_500Medium', fontSize: 13, color: t.colors.text },
  offerVolume: { fontFamily: 'Inter_400Regular', fontSize: 11, color: t.colors.textMuted, backgroundColor: t.colors.surface2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  offerRight: { alignItems: 'flex-end' },
  offerPrice: { fontFamily: 'Inter_700Bold', fontSize: 15, color: t.colors.primary },
  offerDiff: { fontFamily: 'Inter_500Medium', fontSize: 11, color: t.colors.overpriced },
} as const;
}
```

### 7.8 — Vérification imports `[id].tsx` : aucun à ajouter/supprimer (seul l'import hero a changé en 7.2). Tous les autres imports restent utilisés.

---

## ÉTAPE 8 — Supprimer `src/features/catalog/HeroPriceOverlay.tsx`

Supprimer le fichier (il n'est plus importé nulle part après 7.2).

---

## ÉTAPE 9 — Vérifications

```powershell
npx tsc --noEmit
npx jest --ci
```

Critères : **0 erreur TypeScript**, **185 tests verts / 14 suites**. Si tsc échoue, corrige UNIQUEMENT en appliquant correctement les blocs fournis (jamais de `any`, jamais de `@ts-ignore`), puis relance les deux commandes.

---

## ÉTAPE 10 — Documentation

**10.1** — `.clinerules/rules.md` : remplacer `Fiche détail enrichie (HeroPriceOverlay, CollapsingHeader, StickyBottomBar, pyramide v5, NoteDetailPopup)` par `Fiche détail v7 (DetailHero, CollapsingHeader, StickyBottomBar, pyramide v5, prix unique, « Quand le porter », « Dans le même esprit »)`, et dans la ligne `│   ├── catalog/  (9)` remplacer `HeroPriceOverlay` par `DetailHero`.

**10.2** — `README.md` : remplacer les 3 occurrences de `HeroPriceOverlay` (lignes 31, 144, 160) par `DetailHero` (ne pas toucher au changelog historique).

**10.3** — `.clinerules/design-guide.md` :

a) §2.1 : après la ligne `| pyramidBaseSoft | Fond de la zone notes de fond. |`, insérer :

```markdown
| `seasonSpring` / `seasonSummer` / `seasonFall` / `seasonWinter` | Identité chromatique des saisons — remplissage des barres de saison et icônes actives (fiche détail, « Quand le porter »). Ne jamais substituer `deal`/`fair`/`secondary` à ces usages. |
| `seasonSpringSoft` → `seasonWinterSoft` | Pastille de la meilleure saison (fond atténué). |
```

b) §3.2 : après la ligne du `Titre de page (h1)`, insérer :

```markdown
| Ligne éditoriale | `PlayfairDisplay_700Bold_Italic` | 15 | Accroche contextuelle en voix lookbook — fiche détail (« Hiver · Soirée »). **Unique usage de l'italique dans l'app** : une ligne max par écran, jamais pour un titre, un label ou du corps. |
```

c) Après §4.8, ajouter :

```markdown
### 4.9 Titre de section éditorial (fiche détail)

Pastille 28×28 (`tintSoft`) + Ionicons 14px (`tint`) + titre PlayfairDisplay_600SemiBold 18px + sous-titre optionnel Inter_400Regular 12px `textMuted`. La teinte est sémantique : `deal` → marchands/prix, `reward` → performance, `secondary` → temporalité, `primary` (défaut) → contenu olfactif et recommandation. Remplace tout titre de section à emoji.

### 4.10 Colonnes de saison (dataviz)

4 colonnes égales (`flex: 1`, gap 8) : icône 15px dans cercle 30px, barre verticale 8×44px ancrée en bas (`justifyContent: 'flex-end'`, track `surface2`), label Inter_500Medium 11px. Fill = `ratio score/max` (min 10% si score > 0 ; barre fantôme 6% couleur `border` si 0). Meilleure saison : pastille `seasonXxxSoft`, label `Inter_600SemiBold` couleur `text`. Aucune valeur numérique ni label négatif : la dataviz relative suffit.

### 4.11 Barre d'action flottante

Barre persistante de bas d'écran (fiche détail) : carte `surface` flottante (`borderRadius: card`, `shadow.elevated`, marges 12px latérales, `paddingBottom: insets.bottom + 12`) — même langage que le DockBar, jamais de barre pleine largeur avec `borderTop`. Apparition en slide-in (`translateY 60→0` + fade) quand la section de référence sort de l'écran. Contenu : prix compact Inter_800ExtraBold 20px + actions 44px + CTA primary.
```

d) Annexe A.1 : après le bloc `src/theme/`, ajouter :

```markdown
Polices : chargées dans app/_layout.tsx via useFonts (expo-font) +
@expo-google-fonts/inter (400/500/600/700/800) et
@expo-google-fonts/playfair-display (500/600/700/700-italic).
Le rendu de l'app est bloqué (splash maintenu) jusqu'à fontsLoaded —
toute fontFamily référencée dans le code DOIT exister dans ce useFonts.
```

e) Annexe B checklist : après `- [ ] Aucun fontWeight → tout en fontFamily`, ajouter :

```markdown
- [ ] Toute `fontFamily` utilisée existe dans le `useFonts` de `app/_layout.tsx`
- [ ] Données saisonnières → tokens `seasonXxx`, jamais `deal`/`fair`/`secondary`
```

f) Ligne 3 : `**Version** : 1.1 — Juillet 2026` → `**Version** : 1.2 — Juillet 2026 (tokens saisonniers, italique éditorial, barre flottante, polices chargées)`.

**10.4** — `AGENTS.md` : insérer au-dessus de `## Notes v6.16` :

```markdown
## Notes v6.17 — Fiche détail refonte + polices réellement chargées (22/07/2026)

**P0 polices** : Inter/Playfair n'étaient chargées nulle part (fallback système silencieux Android, crash iOS potentiel). Ajout `@expo-google-fonts/inter` + `@expo-google-fonts/playfair-display` + `useFonts` dans `_layout.tsx` (rendu bloqué jusqu'à `fontsLoaded`). Italique `PlayfairDisplay_700Bold_Italic` activée pour la ligne éditoriale.

**Fiche détail** : refonte UX/UI complète. `DetailHero` remplace `HeroPriceOverlay` (prix retiré de l'image). Prix unique dans le flux. Sections renommées : « En résumé » → « Tenue & sillage » (jauge Popularité supprimée, `popularityScore` reste interne), « Toutes les offres » → « Comparer les marchands », « Parfums similaires » → « Dans le même esprit », « Saisonnalité »+« Occasions » → « Quand le porter » (saisons en 4 colonnes verticales, occasions en chips top 3). Bug day/night corrigé : whitelist `normalizeSeasonKey` + `rankAndDedupe`. Ligne éditoriale italique « Hiver · Soirée ». `StickyBottomBar` devient barre d'action flottante (langage DockBar) + icône `flask`. Titres de section à pastille teintée sémantique (plus d'emojis).

**Design system v1.2** : 8 tokens saisonniers (`seasonSpring/Summer/Fall/Winter` + Soft, light+dark), patterns 4.9-4.11 (titre éditorial, colonnes de saison, barre flottante), règle useFonts en checklist.
```

---

## Rapport final attendu

1. Tableau : étape | statut (✅/❌) | détail.
2. Sortie brute de `npx tsc --noEmit` et `npx jest --ci`.
3. Liste des déviations par rapport à ce plan (attendue : **zéro** — toute déviation doit être justifiée ligne par ligne).
