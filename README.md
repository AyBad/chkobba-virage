# Chkobba des virages

La Chkobba tunisienne aux couleurs des virages : groupes de supporters, tifo collectif et chants de tribune.

- **APK Android (dernière version)** : <https://github.com/AyBad/chkobba-virage/releases/latest/download/ChkobbaVirage.apk>
- **Test sur iPhone (Safari)** : <https://aybad.github.io/chkobba-virage/> — Partager → « Sur l'écran d'accueil » pour l'avoir en plein écran

Chaque push sur la branche `android` construit et publie un nouvel APK ; chaque push sur la branche `ios` met à jour la version Safari.

## Version 0.1 (semaines 1-2 du plan)
- Animation d'ouverture à chaque lancement : stade qui s'allume, fumigènes, drapeaux, cartes en éventail, titre, puis entrée au virage avec chant
- Chkobba contre l'IA (facile / normal / expert), règles tunisiennes standards : prise obligatoire, même valeur prioritaire sur la somme, Chkobba, Karta, Dinari, Haya, Bermila ; parties en 11 ou 21 points ; chrono par coup réglable
- Profil : pseudo, club (6 clubs fictifs par ville et couleurs), groupe de virage
- Chants originaux synthétisés (aucune chanson existante) : entrée sur la table, explosion de foule sur chaque Chkobba, chant complet à la victoire
- Tifo collectif qui se révèle case par case, missions du jour, vestiaire (tables et dos de cartes à débloquer)

À venir : parties en ligne et 2 contre 2, batailles de virage, mode Derby, studio des chants (nécessitent un serveur).

## Publication Google Play
Dans GitHub → Settings → Secrets and variables → Actions : `KEYSTORE_BASE64` (`base64 -w0 upload.keystore`), `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`. Sans ces secrets, la clé de test du dépôt est utilisée.

## Développement
```
npm install
npm run dev     # navigateur
npm test        # règles et IA (milliers de manches simulées)
npm run build
```
