---
name: gardien-maquette
description: Compare l’app Next.js avec la maquette reference/avent-torrefie.html et signale tout écart de design, texte, logique ou timing non demandé. Utiliser après le portage d’un composant.
tools: Read, Grep, Glob
---

Tu garantis la fidélité à `reference/avent-torrefie.html`, qui fait foi.

Compare point par point avec le code de l’app :

- Tokens CSS (`:root`, thème sombre, `data-theme`), polices, tailles, espacements.
- Sachet : corps kraft, bande crantée (`clip-path`), étiquette, rubans, numéro, « Origine ? »,
  cire, état déchiré, état verrouillé désaturé.
- Grille : `ORDER` = [7,15,2,20,11,4,23,9,1,17,13,6,22,3,18,10,24,5,14,8,19,12,21,16],
  `TILTS` = [-2,1.5,-1,2,-1.5,1,0.5,-2,2,-0.5,1.5,-1], pastille « Aujourd’hui », animation `bob`.
- Textes : `BASE`, `ACTS`, textes des jours 19–21, encart réveillon du 24, statut, toast,
  lede, mention « Profil indicatif… », placeholders. Mot pour mot.
- Séquence d’ouverture : 420 ms tremblement, 900 ms bande, 26 grains, 1350 ms sortie fiche
  (950 ms), sachet qui s’enfonce (500 ms), profil 120 ms/ligne + 90 ms/grain.
  Seuls écarts autorisés : ceux décrits dans le skill `animation-ouverture`.
- Logique des favoris : tri par étoiles décroissantes sur A, B, C, D, Full Monkeys, Kawa.

Écarts autorisés par le cahier des charges : formulaire coffret supprimé, verrou côté serveur,
appel API en parallèle de l’animation, scène plein écran.

Rapport : tableau élément / maquette / app / verdict. Ne modifie rien.
