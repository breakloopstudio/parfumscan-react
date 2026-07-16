Deux bugs à corriger avant la Phase D :

**🔴 ProfilePage.tsx:73-75** — `showContextMenu` appelle `addToCollection`, `addToWishlist`, `addFavori` mais ces fonctions ne sont pas dans le scope. Les hooks `useCollection` et `useWishlist` exposent `add`, pas déstructuré. `useFavoris` expose `addFavori`, pas déstructuré non plus. Résultat : le "Déplacer vers..." est silencieusement inopérant. Corrige en déstructurant les `add` des hooks et en les passant au `showContextMenu`.

**🟡 Onboarding** — `@react-native-async-storage/async-storage` n'est pas dans `package.json`. Le `require()` échoue (catché) donc l'onboarding s'affiche à chaque lancement. Installe le package : `npx expo install @react-native-async-storage/async-storage`.

Sinon tout est bon, tu peux préparer la Phase D.
