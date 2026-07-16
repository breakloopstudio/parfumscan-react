# Analyse produit — ParfumScan

Analyse de fond après revue complète du code (services, hooks, modèles, navigation, thème) et du plan de refonte.

---

## Ce qui existe et fonctionne

- **Scan IA** : pipeline robuste (burst 3 photos → GPT-4o → fallback → clarify → recherche Fragella 74K)
- **Cache intelligent** : Firestore gratuit d'abord, API payante en fallback, auto-cache des résultats
- **Moteur de recommandation** : `getPersonalizedSuggestions()` score les parfums par affinité olfactive (famille×3 + marque×2 + popularité/20) — sans appel API
- **Données enrichies** : pyramide olfactive, saisonnalité, occasions, accords, longévité, sillage, prix
- **Infra technique propre** : Firestore, Cloud Functions, FCM, Storage, emulators — tout est câblé
- **Dictionnaire FR** : `translate-note.ts` — 250+ notes et 30+ accords traduits EN→FR

---

## Ce qui manque — par ordre d'impact

### 🔴 Priorité haute

#### 1. Aucune boucle de rétention
Un utilisateur scanne un flacon, voit le prix, ferme l'app. Rien ne le fait revenir.
- **Pistes** : notification hebdo "3 parfums qui ont baissé cette semaine", alerte quand un favori/wishlist baisse, "le parfum que tu as scanné est en promo", rappel "tu n'as pas scanné depuis 2 semaines — découvre les nouveautés".
- **L'infra FCM est déjà en place** (`fcm.ts`). Il manque juste les Cloud Functions de déclenchement et le routage deep-link.

#### 2. Pas de deep-linking depuis les notifications
`onFcmNotificationOpened()` existe dans `fcm.ts` mais n'est connecté à rien. Une notif qui dit "Sauvage est à -30%" devrait ouvrir la fiche détail directement. 15 lignes de code dans `_layout.tsx`.

#### 3. Aucun mode hors-ligne ou dégradé
`useNetwork()` existe mais personne ne l'utilise. Si l'utilisateur est dans une parfumerie en sous-sol sans réseau, le scan échoue sans explication. Le cache Firestore local pourrait servir les fiches déjà consultées. A minima : un bandeau "Mode hors-ligne — scan indisponible, catalogue restreint".

#### 4. Aucune discovery passive
Aujourd'hui pour découvrir un parfum il faut soit scanner, soit taper une recherche. Pas de browsing par famille olfactive, pas de "si tu aimes X, essaie Y", pas de tendances, pas de saisonnalité dans le catalogue idle.
- **Pistes** : sections thématiques sur le catalogue (🍂 "Parfaits pour l'automne", 🌙 "Pour les soirées", 🔥 "Tendances cette semaine"), navigation par famille olfactive, "Parfums similaires" depuis une fiche détail (déjà dans le plan refonte), carrousel "Basé sur tes derniers scans".

#### 5. Aucun partage
Pas de bouton partager nulle part. Un utilisateur qui trouve un bon plan ne peut pas l'envoyer à un ami. Un parfum découvert ne peut pas être partagé sur les réseaux sociaux.
- **Mini** : bouton partager sur chaque fiche détail (lien profond `parfumscan://catalog/:id` + message pré-rempli "Regarde, Dior Sauvage à 72 € au lieu de 95 €").

#### 6. Zod inclus mais inutilisé
`zod ^4.4.3` et `react-hook-form ^7.81.0` sont dans les dépendances. Aucun schéma de validation n'existe. Les réponses API Fragella et GPT-4o ne sont pas validées — un champ manquant ou mal typé peut casser silencieusement. La search manuelle (ScanClarify) n'a aucune validation de formulaire.

---

### 🟡 Priorité moyenne

#### 7. Pas de profil olfactif utilisateur
L'utilisateur scanne, ajoute aux favoris, à sa collection. L'app sait quelles familles il aime mais ne lui montre jamais. Aucune synthèse : "Ta collection est à 60% boisée, 25% orientale, 15% fraîche".
- **Piste** : une carte "Ton profil olfactif" sur le catalogue idle ou le profil, générée côté client depuis les données Firestore (familles des favoris + collection).

#### 8. Prix sans contexte temporel
Un prix à 72 € — bonne affaire ou prix habituel ? L'app affiche juste le meilleur prix instantané, pas d'historique. "Ce parfum est à son plus bas depuis 3 mois" a plus d'impact que "-22%".
- **Piste** : stocker l'historique des prix dans Firestore à chaque cache update, afficher un mini-graphique ou une tendance (prix en baisse 📉 / stable / en hausse 📈). Cloud Function qui ping l'API Fragella périodiquement.

#### 9. La recherche catalogue n'a pas de facettes
On tape un nom, on a des résultats. Pas de filtres par famille, genre, fourchette de prix, année, saison. La donnée est pourtant disponible dans chaque document Firestore. Le plan refonte mentionne les filtres en P2, c'est bien.

#### 10. Pas de cas d'usage "en magasin"
Le scan marche, mais l'expérience en parfumerie pourrait être enrichie : "Prix en ligne : 72 €" vs "Prix en magasin : ?" avec un champ pour que l'utilisateur saisisse le prix boutique et voie l'écart. "Tu économises 38 € en achetant en ligne". Ça renforce directement la proposition de valeur.

#### 11. Pas de tri par prix dans les résultats de scan
Quand le scan trouve plusieurs correspondances, elles sont listées sans tri. L'utilisateur cherche le meilleur prix — trier par prix croissant serait logique.

---

### 🟢 Priorité basse / V2

#### 12. Pas de mode "scan de collection"
Scanner un seul flacon à la fois. Pour un collectionneur qui veut numériser ses 15 parfums, c'est fastidieux. Un mode "Ajouter à ma collection" en continu sans revenir au viseur entre chaque scan.

#### 13. Pas d'export de collection
Un utilisateur qui a constitué sa collection dans l'app ne peut pas l'exporter (JSON, CSV, image à partager). V2.

#### 14. Pas d'analytics
Aucun tracking (Firebase Analytics, PostHog, rien). Impossible de savoir quelles features sont utilisées, où les utilisateurs drop, quel taux de conversion scan → achat. Indispensable avant de scaler.

#### 15. Pas d'A/B testing
Pas de système de feature flags ou d'expérimentation. Bloquant pour itérer sur l'UI sans risque.

#### 16. Pas de monétisation explicite
Les liens affiliés existent (`purchaseUrl`) mais il n'y a pas de stratégie : pas de mise en avant sponsorisée, pas de premium, pas de limite de scans gratuits. Le plan refonte est gratuit et le restera — la monétisation viendra des affiliations. S'assurer que les liens sont trackés (UTM, identifiant de clic).

---

## Synthèse — ce que je ferais en priorité

| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | **Deep-linking depuis les notifs** — `onFcmNotificationOpened` → `router.push()` | 30 min | Énorme : chaque notif devient une porte d'entrée |
| 2 | **Bannière hors-ligne** — brancher `useNetwork()` dans le scan et le catalogue | 2h | Évite la confusion en magasin |
| 3 | **Partage fiche détail** — bouton share avec deep link | 1h | Viralité, gratuit |
| 4 | **Validation Zod** — schéma pour `FragranceResult`, `ScanResult`, formulaire clarify | 2h | Évite les bugs silencieux |
| 5 | **Profil olfactif** — synthèse des familles depuis favoris/collection | 3h | Rend le profil utile, personnalise l'expérience |
| 6 | **Browsing par famille** — navigation thématique dans le catalogue idle | 4h | Discovery sans scan ni recherche |
| 7 | **Tri par prix dans les résultats de scan** | 30 min | Évident, pas fait |
| 8 | **Prix en magasin vs en ligne** — champ optionnel après scan | 3h | Renforce la proposition de valeur |
| 9 | **Historique des prix** — suivi temporel + tendance | 1 semaine | Cloud Function + UI, lourd mais différenciant |
| 10 | **Rétention notifs** — alertes prix wishlist, recap hebdo | 1 semaine | Cloud Functions + FCM templates |

---

## À intégrer au plan de refonte ?

Les points 1 à 7 sont légers et peuvent être intégrés sans alourdir le scope. Les points 8 à 10 sont plus lourds et méritent une V2 dédiée.

Si tu veux, je peux soit :
- Ajouter ces 4-5 points directement au plan de refonte
- Créer un second document "Roadmap V2" séparé
- Prioriser ensemble ce qui part en V1 vs V2
