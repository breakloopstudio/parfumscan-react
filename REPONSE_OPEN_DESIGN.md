# Retour sur le plan de refonte

## Ce qu'on garde

- **"Luxe malin"** comme direction artistique. Bonne trouvaille.
- **Palette** : l'évolution vers un beige plus froid (#F8F6F2), le violet désaturé, le teal au lieu du vert pomme — cohérent.
- **Fiche détail hub d'actions** : 3 boutons distincts (Collection / Wishlist / Favori), menu "...", alerte prix, parfums similaires.
- **Scan loading** : particules + texte poétique qui change toutes les secondes. L'idée de rendre l'attente mémorable est la bonne.
- **Révélation du prix comme événement** : scale + spring + pulse contextuel selon deal/fair/overpriced.
- **Onboarding 3 slides** : bon séquencement.
- **Catalogue** : filtres + tri. Manquait.
- **Plan de séquence pragmatique** (Phase A → D).

## Ce qu'on retire ou corrige

1. **Pas de gamification.** Pas de niveaux "Nez novice", pas de barre de stats avec économies totales. Le profil est sobre.
2. **Le scan reste un FAB central**, pas un onglet de la tab bar. C'est le geste fondateur, il doit être distinct du catalogue et du profil.
3. **Pas de JetBrains Mono.** Une troisième police alourdit le chargement pour un gain cosmétique. Inter suffit.
4. **Pas de drag entre listes ni swipe actions.** Complexité React Native disproportionnée. Un bouton "Déplacer vers..." dans un menu contextuel suffit.
5. **Pas d'économies totales.** On ne calcule pas un faux chiffre basé sur un panier moyen hypothétique. Le prix s'affiche par parfum, au cas par cas.

## Questions ouvertes à trancher

- **Onboarding : avant ou après l'auth ?** → **Ni l'un ni l'autre.** L'app doit être utilisable sans compte dès l'installation : scan, catalogue, fiche détail. L'authentification est optionnelle — on invite l'utilisateur à se connecter uniquement quand il tente une action qui le nécessite (ajouter aux favoris, wishlist, collection). Pas de mur d'auth, pas de login forcé. L'onboarding peut être montré au premier lancement sans demander de compte.
- **Fiche détail : 3 boutons séparés ou 1 menu "Ajouter à..." ?** → **3 boutons**, avec labels explicites. Le menu ajoute un tap inutile sur l'action la plus fréquente.
- **Alertes prix : backend déjà en place ou à créer ?** → **Infra existante, feature à créer.** Firebase Cloud Messaging est déjà intégré (`src/services/fcm.ts`), Cloud Functions déployées en `europe-west1`. Il manque une Cloud Function dédiée qui scrute les prix et déclenche les notifications. À scripter en Phase C (Settings), pas bloquant pour la V1 du design.
- **Devise : EUR uniquement ou prévoir USD/GBP ?** → **EUR** uniquement pour la V1. Multi-devise en V2 si traction internationale. L'API Fragella retourne les prix en EUR par défaut, le marché cible est français.
- **"Voir toutes les offres" en plus du meilleur prix ?** → **Oui**, sous forme de liste expansible depuis la deal card. L'API Fragella retourne plusieurs offres par fragrance. Afficher les marchands alternatifs renforce la transparence et l'identité comparateur de prix.

## Prochaine étape pour toi

Tu peux passer en implémentation. Quelques précisions techniques avant de coder :

- `JetBrains Mono` → ne pas l'ajouter. Pour les prix, Inter avec `fontVariant: ['tabular-nums']` sur iOS (les chiffres d'Inter sont déjà tabulaires par défaut).
- Scan comme tab → ne pas changer. La structure actuelle (FAB central qui push sur la stack) fonctionne, c'est un choix UX délibéré.
- Les stats du profil → pas de compteur d'économies. Juste les 3 listes : Collection, Wishlist, Favoris. Et un accès Historique + Settings.
