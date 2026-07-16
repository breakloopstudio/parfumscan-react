# Refonte UI/UX ParfumScan — Brief créatif pour Open Design

## Le produit

ParfumScan est une app mobile (React Native, Expo, iOS + Android) qui permet de **photographier un flacon de parfum** pour que l'IA l'identifie instantanément, puis **trouve le meilleur prix du web** pour que l'utilisateur achète malin.

**Promesse** : en 3 secondes, tu sais si tu vas payer le juste prix ou si tu peux économiser.

**Fonctionnalités principales** :
- Scanner un flacon → IA (GPT-4o Vision) identifie marque + nom → recherche dans un catalogue de 74 000 parfums → affiche résultats + meilleur prix
- Catalogue explorable avec recherche
- Fiche détail enrichie par parfum (notes, pyramide olfactive, saisonnalité, occasions, prix)
- **Ma collection**, **Wishlist** et **Favoris** — trois espaces distincts dans le profil :
  - **Collection** : les parfums que je possède (inventaire, fierté)
  - **Wishlist** : les parfums que je veux acheter ou me faire offrir (intention d'achat, alerte prix)
  - **Favoris** : les parfums que j'aime, sans forcément vouloir les acheter (signet émotionnel)
  - ⚠️ Challenge design : ces 3 listes sont conceptuellement distinctes mais risquent de créer du bruit dans l'UI. Comment les exposer sans lourdeur ? Comment rendre le geste d'ajout clair ("Ajouter à...") sans friction ?
- Historique de scans
- **Paramètres** : page accessible depuis le profil. Au minimum — alertes prix (notifications quand un parfum de la wishlist baisse), devise/région pour les prix, mentions légales. Libre à toi d'en proposer d'autres si pertinent.
- **Pas de gamification** : pas de niveaux, badges, ou scores utilisateur. Le profil reste sobre.
- Authentification email ou Google

**Cible** : amateurs et passionnés de parfumerie, chasseurs de bonnes affaires, utilisateurs français.

---

## Les deux facettes du produit

L'app doit incarner **deux identités simultanément**, sans que l'une écrase l'autre :

1. **Découverte & désir** — l'univers du parfum : raffinement, pyramide olfactive, matières nobles, notes de tête/cœur/fond, saisonnalité. L'utilisateur explore, compare, rêve. Ton : luxe accessible, élégance chaleureuse.

2. **Pouvoir d'achat & deal hunting** — le comparateur de prix : transparence, économies chiffrées, confiance. L'utilisateur vérifie qu'il ne se fait pas avoir et trouve la meilleure offre. Ton : malin, data-driven, satisfaisant.

La direction artistique doit **fusionner** ces deux univers. Imagine l'esthétique d'un comparateur de prix premium, ou l'inverse : une app de luxe qui te fait gagner de l'argent.

---

## Les moments clés de l'expérience

- **Le scan** : l'utilisateur pointe son téléphone vers un flacon. C'est le geste fondateur. Le viseur, l'animation de capture, l'attente (2-3s), le résultat qui apparaît.
- **La révélation du prix** : le moment de vérité. L'utilisateur découvre s'il fait une bonne affaire ou non. C'est l'émotion centrale du produit.
- **La découverte olfactive** : l'utilisateur explore la pyramide de notes, les accords, comprend l'ADN du parfum.
- **La fiche détail** : au-delà de la consultation, c'est un hub d'actions. L'utilisateur peut vouloir :
  - Ajouter à sa collection / wishlist / favoris (3 relations différentes)
  - Activer une alerte prix ("préviens-moi si ça passe sous X €")
  - Partager le parfum avec quelqu'un
  - Découvrir des parfums similaires
  - Voir les offres chez plusieurs marchands (pas juste le meilleur prix)
  - ⚠️ Challenge design : comment exposer toutes ces actions sur une fiche déjà riche sans la saturer ? Quelles actions méritent d'être visibles en permanence, lesquelles peuvent être dans un menu secondaire ?
- **Le profil** : l'utilisateur gère sa collection, sa wishlist, ses favoris, son historique. Son espace personnel.
- **Le catalogue** : l'utilisateur navigue, cherche, compare des parfums sans forcément scanner.

---

## Le système de design existant (base de travail)

Tu hérites d'un design system de 63 tokens que tu peux faire évoluer :

```
Couleurs :
  primary:     #7C3AED (violet)
  secondary:   #D4A574 (doré/ambré)
  success:     #10B981 (vert)
  danger:      #EF4444 (rouge)
  background:  #FAF8F5 (beige chaud)
  surface:     #FFFFFF

Polices :
  headings: Playfair Display (serif, élégant)
  body:     Inter (sans-serif, lisible)

Radius : 8 / 12 / 16 / 20 / 9999
```

Tu n'es pas obligé de tout garder. Si tu penses qu'une direction radicalement différente sert mieux le produit, **fonce**.

---

## Contraintes non négociables

- **React Native** (pas de web, pas de HTML/CSS classique, pas de Tailwind)
- **TypeScript** (pas de `any`)
- Composants = fonctions React (`export default function`)
- Styles : `StyleSheet.create()` au niveau module (pas d'inline styles, pas de styled-components)
- Animations : `react-native-reanimated` (`useSharedValue` + `useAnimatedStyle`)
- Gestures : `react-native-gesture-handler`
- Images : `expo-image`
- Safe areas : `react-native-safe-area-context`
- **Fichiers séparés** : 1 composant = 1 fichier
- **Pas de `fontWeight` sur iOS avec des `fontFamily` personnalisées** (les polices Google Fonts incluent déjà leurs variantes de poids)
- Ombres : les 4 props iOS (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`) **obligatoires** sur toute ombre ; `elevation` en bonus Android

---

## Liberté totale sur

- La palette de couleurs, la typographie, les espacements
- L'architecture des écrans, la navigation (garde juste le scan comme geste central)
- Les animations, transitions, micro-interactions
- La hiérarchie de l'information
- L'ambiance visuelle globale, les illustrations, l'iconographie
- La manière de présenter le prix, les économies, la pyramide olfactive
- Les états vides, erreurs, chargements
- L'onboarding (inexistant aujourd'hui)
- Le composant de scan (viseur, feedback visuel pendant la capture)

---

## Deliverables

1. **Design system mis à jour** (tokens, typographie, spacing, composants atomiques)
2. **Maquettes** couvrant l'ensemble des écrans et leurs états (vide, loading, succès, erreur)
3. **Spécifications d'animation** pour les transitions clés
4. **StyleSheet React Native** prêt à intégrer

---

## Quelques questions pour orienter ta réflexion (réponds comme tu le sens)

- À quoi ressemble un comparateur de prix qui ne fait pas "discount" ?
- Comment rendre le scan (3 secondes d'attente) mémorable plutôt que subi ?
- Comment donner envie de constituer sa collection ? Quelle émotion quand on la regarde ?
- Comment le prix et les économies peuvent-ils être fêtés plutôt que juste affichés ?
- Quelle première impression en ouvrant l'app ? Qu'est-ce que l'utilisateur doit ressentir ?
