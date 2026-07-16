# Tracking — Refonte ParfumScan

État d'avancement de l'implémentation. Cocher au fur et à mesure.

---

## Phase A — Design system

- [ ] `A1` — Mise à jour de `src/theme/theme.ts` (nouveaux tokens, couleurs, polices, spacing)
- [ ] `A2` — `Button` (variantes primary / secondary / outline / ghost, états default / loading / disabled)
- [ ] `A3` — `PriceDisplay` (prix animé, badge économie, couleur contextuelle)
- [ ] `A4` — `EmptyState` (4 variantes : collection, wishlist, favoris, historique)
- [ ] `A5` — `SectionHeader` (titre + sous-titre + action optionnelle)
- [ ] `A6` — `Tag` (famille olfactive, année, genre, concentration)
- [ ] `A7` — `Gauge` (barre progression : longévité, sillage, saisonnalité)
- [ ] `A8` — `Toast` (feedback succès après ajout à une liste, auto-dismiss 2s)
- [ ] `A9` — `TabBar` (onglets avec indicateur animé pour le profil)
- [ ] `A10` — `AlertPriceToggle` (switch + champ seuil pour alertes prix)

---

## Phase B — Scan & fiche détail

### Scan — 7 écrans
- [ ] `B1` — `ScanIdle` — viseur animé (halo respiration), typo display, layout
- [ ] `B2` — `ScanCamera` — coins animés, flash au déclenchement, overlay
- [ ] `B3` — `ScanLoading` — particules dansantes, texte poétique 3 phases
- [ ] `B4` — `ScanClarify` — formulaire correction, chips marques, affinage visuel
- [ ] `B5` — `ScanResults` — tri par prix croissant, animation d'entrée
- [ ] `B6` — `ScanNoResult` — visuel + message + CTA catalogue
- [ ] `B7` — `ScanError` — affinage visuel

### Fiche détail
- [ ] `B8` — Header : image hero + overlay gradient + marque/nom display
- [ ] `B9` — Zone prix sticky : prix animé, badge économie, couleur deal/fair/overpriced
- [ ] `B10` — Indicateur tendance prix (📉📈 selon historique)
- [ ] `B11` — Prix magasin vs en ligne (champ optionnel + calcul écart)
- [ ] `B12` — Barre d'actions 3 boutons (Collection / Wishlist / Favori) avec labels
- [ ] `B13` — Pyramide olfactive v2 (cercles concentriques animés)
- [ ] `B14` — Parfums similaires (carrousel horizontal)
- [ ] `B15` — Alerte prix (toggle + champ seuil)
- [ ] `B16` — Menu "…" (partager, signaler, offres multi-marchands)
- [ ] `B17` — Accords, saisonnalité, occasions — affinage visuel

---

## Phase C — Profil & Settings & Onboarding

### Profil
- [ ] `C1` — Header sobre (avatar, email, pas de gamification)
- [ ] `C2` — Profil olfactif (carte de synthèse familles dominantes)
- [ ] `C3` — 3 onglets avec compteurs : Collection | Wishlist | Favoris
- [ ] `C4` — Liste Collection (affichage, état vide, CTA distincte)
- [ ] `C5` — Liste Wishlist (affichage, état vide, CTA distincte)
- [ ] `C6` — Liste Favoris (affichage, état vide, CTA distincte)
- [ ] `C7` — Menu contextuel par élément ("Déplacer vers…", "Retirer")
- [ ] `C8` — Historique des scans (onglet secondaire)
- [ ] `C9` — Icône Settings dans le header

### Settings
- [ ] `C10` — Page Settings (modale ou section)
- [ ] `C11` — Alertes prix on/off global
- [ ] `C12` — Devise EUR / région
- [ ] `C13` — Notifications push on/off
- [ ] `C14` — Mentions légales
- [ ] `C15` — Suppression du compte
- [ ] `C16` — Déconnexion

### Onboarding
- [ ] `C17` — Slide 1 : "Photographie un flacon"
- [ ] `C18` — Slide 2 : "L'IA trouve le meilleur prix"
- [ ] `C19` — Slide 3 : "Ton univers parfumé"
- [ ] `C20` — Navigation slides (PanGesture + dots + animations)
- [ ] `C21` — Stockage "onboarding vu" (une seule fois)

---

## Phase D — Polish

- [ ] `D1` — Catalogue : navigation par famille olfactive (chips/carrousel)
- [ ] `D2` — Catalogue : filtres rapides (famille, genre, prix)
- [ ] `D3` — Catalogue : tri (pertinence, prix, popularité)
- [ ] `D4` — Catalogue : grille affinée visuellement
- [ ] `D5` — Mode hors-ligne : bannière réseau
- [ ] `D6` — Mode hors-ligne : contenu dégradé cache Firestore local
- [ ] `D7` — Auth : affinage visuel login/register
- [ ] `D8` — Auth optionnelle : suppression du mur d'auth, prompt contextuel
- [ ] `D9` — États vides & erreurs : illustrations et messages personnalisés partout
- [ ] `D10` — Review accessibilité : contrastes, tailles de touche ≥ 44px, labels
- [ ] `D11` — Deep-linking : `onFcmNotificationOpened` → `router.push()`
- [ ] `D12` — Partage fiche détail : bouton share avec deep link

---

## Backend (hors scope design, à prévoir)

- [ ] `E1` — Cloud Function alerte prix (scrute + notifie FCM)
- [ ] `E2` — Cloud Function historique des prix (stockage périodique)
- [ ] `E3` — Firestore : sous-collections `collection` et `wishlist` dans `users/{uid}/`

---

**Progression** : `0/58` tâches
