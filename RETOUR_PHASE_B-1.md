Phase B bien avancée. Un bug critique + quelques ajustements :

**🔴 Bloquant**
1. **ScanCamera.tsx:61-62** — `triggerFlash()` est une worklet, `onCapture()` modifie du state React. Il manque `runOnJS` : remplacer `onCapture(burst)` par `runOnJS(onCapture)(burst)`.

**🟡 À corriger**
2. **ScanLoading.tsx** — `Math.random()` dans le corps de Particle (lignes 58-59) : les particules changent de taille/position à chaque render. Calculer les valeurs fixes une fois avec `useMemo` ou un `useRef`.
3. **ScanLoading.tsx** — La prop `step` est inutilisée. La barre de progression reste à 60%. Soit supprimer `step`, soit animer la barre selon l'étape.
4. **catalog/[id].tsx:358** — L'icône cœur utilise `theme.colors.danger` au lieu de `theme.colors.favorite`.
5. **catalog/[id].tsx:127** — `AccordBar` utilise encore des couleurs hardcodées (`#7C3AED`, etc.) au lieu des tokens du thème.
6. **ScanIdle.tsx + catalog/[id].tsx** — Éléments en `position: absolute; bottom: 24` : ajouter `insets.bottom` pour éviter de passer sous la barre de navigation.

Le reste est bon. Tu peux corriger et attaquer la Phase C.
