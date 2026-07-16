Phase A validée, bon boulot. Deux corrections avant de passer à la suite :

1. **`Button.tsx` ligne 69** — `fontWeight: '600'` sur la variante ghost → `fontFamily: 'Inter_600SemiBold'`. Sur iOS, `fontWeight` ne fonctionne pas avec les Google Fonts chargées via `expo-font`.

2. **`PriceDisplay.tsx` ligne 128** — `Inter_800ExtraBold` n'est pas dans `theme.fonts`. Passe en `Inter_700Bold` ou ajoute la variante dans le thème si tu y tiens.

Le reste est bon. Tu peux attaquer la Phase B.
