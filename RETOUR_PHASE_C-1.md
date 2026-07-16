Phase C solide. Quelques corrections :

**🔴 Bloquant**
1. **ProfilePage.tsx:247** — `borderStyle: 'dashed'` ne fonctionne pas en React Native. Remplacer par une bordure pleine ou un fond alternatif pour l'état vide du profil olfactif.

**🟡 À corriger**
2. **ProfilePage.tsx:121** — Couleurs du profil olfactif hardcodées. Utiliser `theme.colors.secondary`, `theme.colors.primary`, `theme.colors.deal`.
3. **ProfilePage.tsx** — Ajouter l'action "Déplacer vers..." dans le menu contextuel des items (plan section 3.2). Actuellement seul "Supprimer" existe.
4. **ProfilePage.tsx:207** — `EmptyState` historique → `onAction` est vide. Rediriger vers le scan.
5. **Onboarding.tsx** — Ajouter la navigation par swipe (PanGesture) entre les slides. Le plan spécifie "Slide horizontal avec snap".
6. **Onboarding.tsx** — Stocker un flag (AsyncStorage `@onboarding_done`) pour ne l'afficher qu'au premier lancement.

Le reste est bon. Tu peux attaquer la Phase D.
