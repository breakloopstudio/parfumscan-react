# Design Brief — Wardrobe ParfumScan

---

## 1. Contexte produit

**ParfumScan** est une app mobile (iOS/Android) pour passionnés de parfumerie. Elle scanne les flacons, identifie le parfum via IA, compare les prix multi-marchands, et sert de catalogue personnel.

**Public** : 25-45 ans, acheteurs avertis, sensibles au rapport qualité/prix. Ils connaissent la parfumerie, ont des avis tranchés, et veulent une app qui les respecte — pas de gamification infantile, pas de dark patterns.

**Tonalité** : sobre, experte, chaleureuse. On appelle ça « Luxe malin » en interne : le luxe du savoir, pas du prix. L'interface doit inspirer confiance, jamais ostentation.

---

## 2. État actuel — ce qui existe déjà

### 2.1 L'onglet Collection

L'utilisateur a accès à 4 onglets principaux (Catalogue, Favoris, Historique, Collection) via un dock flottant en bas de l'écran. Un FAB central ouvre le scanner.

L'onglet Collection affiche aujourd'hui deux listes très basiques :
- Une liste « Possédés » (badge violet)
- Une liste « Wishlist » (badge doré)

Chaque item montre une miniature, le nom, la marque, et un menu contextuel basique (Alert native) pour « Déplacer » ou « Retirer ».

### 2.2 La fiche détail parfum

Sur chaque parfum, 3 boutons identiques : Favori, Collection, Wishlist. Ils fonctionnent de façon totalement indépendante, sans lien logique entre eux.

### 2.3 Navigation

L'app utilise un pager horizontal (swipe Reanimated) entre les 4 onglets. Une barre de recherche persistante en haut. Le thème (light/dark) est global et suit les préférences système.

---

## 3. Le problème à résoudre

Pour un passionné de parfums, sa « collection » n'est pas qu'une liste binaire possédé/pas possédé. C'est un objet émotionnel, une mémoire olfactive, un reflet de sa personnalité.

**Ce qui manque cruellement aujourd'hui :**

- **Les parfums qu'on a eus avant** — un flacon terminé, offert, perdu. C'est une partie importante de l'histoire personnelle.
- **La capacité de noter** — un avis personnel (1 à 5 étoiles), même très subjectif.
- **La prise de notes** — une anecdote, un souvenir associé, « offert par ma femme », « porté le jour de mon mariage ».
- **L'organisation personnelle** — regrouper autrement que par statut d'achat. « Parfums d'été », « pour le bureau », « soirées », « cuir/boisé »...
- **Un rituel quotidien** — le parfum qu'on porte aujourd'hui. Un geste simple qui crée de l'attachement à l'app.
- **Le format du flacon** — 30ml ou 200ml, ce n'est pas la même relation au parfum.

Aujourd'hui, la page Collection ressemble à une base de données. On veut qu'elle devienne une **garde-robe personnelle**, au sens propre : un endroit intime où l'on range, trie, se souvient, et revient avec plaisir.

---

## 4. Ce qu'on veut permettre (jobs to be done)

> L'outil de design est libre de proposer les patterns UI, la navigation, et les écrans qui répondent le mieux à ces besoins.

### JTBD 1 — Gérer ses parfums selon son rapport personnel

L'utilisateur doit pouvoir déclarer, pour chaque parfum, **la nature de sa relation** avec lui :
- Je le possède actuellement
- Je l'ai possédé par le passé
- Je souhaite l'acquérir
- J'en ai un échantillon / décant

Ces états ne sont pas gravés dans le marbre — l'utilisateur doit pouvoir changer d'avis facilement (un souhait devient un achat, un flacon fini passe en « ancien »).

### JTBD 2 — Donner son avis personnel

Pour chaque parfum de sa garde-robe, l'utilisateur peut attribuer une note de 1 à 5 étoiles. C'est son avis, pas la note communautaire Fragrantica. Il peut aussi ne pas noter du tout.

### JTBD 3 — Prendre des notes personnelles

Un champ texte libre par parfum. L'utilisateur y met ce qu'il veut : un souvenir, une description personnelle, le nom de la personne qui le lui a offert.

### JTBD 4 — Organiser avec ses propres catégories (étagères/shelves)

L'utilisateur peut créer ses propres catégories (ex: « Été », « Bureau », « Soirée », « Cuir/Boise », « Offerts »). Il peut assigner un parfum à une ou plusieurs catégories. Ces catégories sont transversales aux états d'ownership — un parfum qu'on possède ET un qu'on souhaite peuvent partager l'étagère « Été ».

L'utilisateur peut créer, renommer, réorganiser et supprimer ses catégories.

### JTBD 5 — Indiquer la taille du flacon

Pour les parfums possédés, l'utilisateur peut préciser le format : 30ml, 50ml, 100ml, etc. Une information simple mais qui change la perception de la collection.

### JTBD 6 — Choisir son parfum du jour (SOTD)

Un geste quotidien, presque rituel. L'utilisateur peut désigner quel parfum de sa collection il porte aujourd'hui. L'historique de ces choix doit être conservé (pour de futures stats ou une vue calendrier).

---

## 5. Parcours clé à concevoir

L'outil de design doit proposer une solution pour chacun de ces moments :

**A — La page principale de la garde-robe**
C'est l'écran que l'utilisateur voit quand il tape sur l'onglet (aujourd'hui « Collection », demain probablement renommé). Il doit :
- Donner une vue d'ensemble de la garde-robe
- Permettre de filtrer/parcourir par catégorie
- Être agréable visuellement (pas une liste Excel)
- S'intégrer au dock flottant et au pager horizontal existants

**B — L'édition des métadonnées d'un parfum**
Quand l'utilisateur veut modifier les infos d'un parfum de sa garde-robe (changer l'état, la note, les catégories, la taille, les notes perso). L'outil doit trouver le meilleur pattern mobile pour cette édition.

**C — L'ajout d'un parfum depuis la fiche détail**
Sur la page de détail d'un parfum, l'utilisateur doit pouvoir l'ajouter à sa garde-robe. Aujourd'hui il y a 3 boutons séparés. L'outil doit proposer une meilleure approche.

**D — Le parfum du jour**
Comment l'utilisateur choisit son SOTD, comment cette information est affichée (sur la page garde-robe ? ailleurs ?), et quel feedback il reçoit.

**E — La création et gestion des catégories/étagères**
Créer une nouvelle catégorie, la renommer, la supprimer. Comment ces catégories s'intègrent dans la navigation de la garde-robe.

**F — L'état vide**
La première fois qu'un utilisateur arrive sur sa garde-robe vide. Comment lui donner envie de la remplir, sans friction.

---

## 6. Contraintes

### 6.1 Contraintes techniques

| Contrainte | Détail |
|---|---|
| Plateforme | React Native 0.86, Expo 57 (iOS + Android) |
| Animations | Reanimated 4.5 (spring, timing, worklets) |
| Effets visuels | BlurView natif (expo-blur) disponible |
| Icônes | Ionicons (librairie complète) |
| Temps réel | Firestore onSnapshot — les données se mettent à jour sans refresh |
| Polices | **Jamais de `fontWeight`** — uniquement `fontFamily` |
| Couleurs | **Jamais hardcodées** — uniquement via `t.colors.xxx` du thème |

### 6.2 Règles du design system

- Une seule police display (Playfair Display), une seule police body (Inter)
- `primary` et `secondary` ne peuvent PAS être utilisés ensemble comme couleurs d'action sur un même écran
- `textMuted` ne peut pas être utilisé sur fond `primarySoft`
- Le fond `background` ne s'utilise pas sur les cartes (utiliser `surface`)
- Cibles tactiles ≥ 44 px
- Les actions principales sont dans la moitié inférieure de l'écran (zone de pouce)
- En dark mode, les ombres sont remplacées par des bordures subtiles

### 6.3 Tokens de couleur disponibles (thème light)

```
Fond écran :     #F8F6F2 (background)
Fond carte :     #FFFFFF (surface)
Fond secondaire : #F3F1ED (surface2)
Bordures :       #E8E4DE (border)
Texte :          #1A1520 (text)
Texte secondaire: #8B8580 (textMuted)

Violet (primary):     #6C3ED9 — soft: #F0EBFA — ink: #4C2A9E
Doré (secondary):     #C8945A — soft: #FBF5EE — ink: #8B6934
Teal (deal/bon plan): #0D9488 — soft: #E6F7F5
Rouge (favori/alerte):#E04444 — soft: #FEF2F2
Orange (fair):        #D97706 — soft: #FFF8ED
```

Des tokens équivalents existent pour le dark mode (palette « Luxe profond »).

### 6.4 Tokens typographiques

```
Titre page :    PlayfairDisplay_700Bold   28-34px
Titre section : PlayfairDisplay_600SemiBold 18-20px
Titre carte :   PlayfairDisplay_600SemiBold 18px
Marque :        Inter_400Regular          10-12px uppercase letterSpacing 1-1.5
Corps :         Inter_400Regular          14-15px
Label UI :      Inter_600SemiBold         14-16px
Badge/Chip :    Inter_500Medium           11-13px
Caption :       Inter_400Regular          11-13px
```

### 6.5 Tokens de mise en page

```
radius: sm=8, base=12, card=16, full=9999
spacing: xs=4, sm=8, base=12, md=16, lg=20, xl=24, 2xl=32, 3xl=48
```

---

## 7. Questions ouvertes pour la design review

Ces questions sont volontairement larges. L'outil de design est invité à proposer sa vision, pas à choisir entre deux options déjà définies.

1. **Quel est le « mood » de la garde-robe ?** Est-ce un tableau de chasse (collectionneur fier), un journal intime (souvenirs, notes), un dressing (organisation pratique), ou les trois à la fois ? Le ton visuel doit en découler.

2. **Comment donner envie de remplir sa garde-robe ?** L'état vide est un moment critique. Quelle approche pour convertir un nouvel utilisateur en utilisateur régulier de cette fonctionnalité ?

3. **Quel est le rapport entre la garde-robe et les favoris ?** Aujourd'hui les favoris sont un onglet séparé. Faut-il les fusionner, les distinguer visuellement, créer des ponts entre les deux ?

4. **Comment l'utilisateur navigue-t-il dans sa garde-robe quand elle contient 50, 100, 200 parfums ?** Le scroll infini n'est pas une solution. Quels patterns de filtrage, recherche, regroupement proposer ?

5. **Quelle place pour le parfum du jour ?** Est-ce une feature secondaire (un petit widget) ou un élément central de l'expérience ? Faut-il le mettre en avant pour créer un rituel quotidien ?

6. **Comment rendre l'édition des métadonnées fluide et non frustrante ?** L'utilisateur doit pouvoir changer rapidement l'état, la note, les catégories. Sans quitter la page, sans formulaire lourd, sans friction.

7. **Comment la fiche détail parfum et la garde-robe communiquent-elles ?** Depuis la fiche, comment ajouter un parfum ? Depuis la garde-robe, que se passe-t-il quand on tape sur un parfum — va-t-on sur la fiche catalogue, ou sur une vue « mon exemplaire » ?

8. **Comment les catégories/étagères s'intègrent-elles visuellement ?** Sont-elles le mode de navigation principal, un filtre secondaire, une vue parmi d'autres ?

9. **Le design doit-il anticiper une dimension sociale future ?** Même si la V1 est 100% privée, faut-il prévoir un espace pour un futur « partager ma garde-robe » ou « voir la garde-robe de X » ?

10. **Dark mode : quels pièges éviter ?** Les overlays sur image, les badges colorés, les étoiles de rating — tout cela doit rester lisible sur fond sombre. Quelles précautions prendre ?
