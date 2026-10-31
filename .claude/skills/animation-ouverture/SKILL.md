---
name: animation-ouverture
description: Spécification de la scène d’ouverture plein écran du sachet de café (inspirée du booster de gil2-cards.com, portée en CSS 3D + Web Animations API). À charger avant de toucher OpeningStage.tsx, Bag.tsx ou les keyframes d’ouverture.
---

# Scène d’ouverture plein écran

Référence analysée : gil2-cards.com (booster 3D react-three-fiber). On reproduit la mise en scène
en vraie 3D (three.js + react-three-fiber, `components/PouchScene.tsx`). Le sachet doypack kraft
remplace le booster, en très grand, seul à l’écran.

## Ce que fait gil2 (relevé dans leur code)

| Effet gil2 | Valeurs relevées | Équivalent café |
|---|---|---|
| Rayons coniques tournants derrière le pack | `repeating-conic-gradient` 8°/22°, rotation 18 s | rayons dorés `--gold`, 18 s, masque radial |
| Inclinaison au pointeur | rotY = 0,12 rad × pointeur.x, rotX = −0,05 rad × pointeur.y, amorti | rotY ±7°, rotX ±3°, lissage rAF (damp λ = 2) |
| Balancement au repos | rotY + 0,07 sin(0,55 t), y = 0,06 sin(1,1 t) | idem en `transform` |
| Reflet spéculaire | bande `screen` qui suit `--mx` × 1,4 | reflet satiné sur le kraft (`mix-blend-mode: soft-light`) |
| Phase « charging » | micro-tremblement 46/57 Hz, ±0,025, particules ×2, lumière 0→6 | vibration fine + poussière de café + halo chaud |
| Bande déchirée | pivot coin droit, monte en haut à droite, rotZ −0,42 puis −2,6/s, fondu 0,25→0,75 s | bande crantée qui s’arrache vers le haut à droite |
| Flash | sprite radial 0,5→4,1×, fondu dès 0,4 s | halo crème qui éclate à l’ouverture |
| Pack qui coule | y −3,5 entre 0,8 et 1,55 s | sachet qui s’enfonce et sort de l’écran par le bas |
| Carte qui sort | monte de l’intérieur (0,3→1 s, easeInOutCubic), puis vient vers la caméra (1→1,55 s) avec rotY 0,25 sin | la fiche jaillit du sachet puis s’avance en plein écran |
| Ombre au sol | ellipse floue noire 60 % | ombre portée elliptique sous le sachet |
| Mouvement réduit | vitesse ×2,5, pas de particules | **aucune animation** : fiche directe (règle du projet) |

## Séquence retenue (squelette = `tear()` de la maquette, effets gil2 superposés)

Timeline à partir du toucher (t = 0). Les 5 étapes et timings de la maquette sont conservés.

1. **0–420 ms — tremblement** (maquette) + charge gil2 : halo qui monte, poussière ×2.
   Si `/api/day/[n]` n’a pas répondu à 420 ms : boucle de micro-vibration jusqu’à la réponse.
2. **420–1320 ms — bande arrachée** (maquette, 900 ms) : clone de `.bag-seal`, pivot coin droit,
   trajectoire haut-droite, `cubic-bezier(.2,.7,.3,1)`. Flash crème 0,5→4× en 700 ms.
3. **420 ms — 26 grains** jaillissent du haut du sachet puis retombent (maquette, inchangé,
   amplitudes multipliées par l’échelle du sachet plein écran).
4. **1350 ms — sortie de la fiche** : sachet s’enfonce (500 ms, `ease-in`), fiche part de
   l’intérieur du sachet (`scale(.42)`, cachée derrière la face), monte, puis s’avance vers
   l’écran en `translateZ`/`scale(1)` sur 950 ms `cubic-bezier(.2,.8,.2,1)` avec léger rotY.
5. **+520 ms — profil** : grains du profil remplis un par un (120 ms par ligne, 90 ms par grain).

## Contraintes

- Dialog modal plein écran : `100dvw × 100dvh`, fond sombre chaud, sachet `min(78vw, 58dvh)`
  de large, centré. Après ouverture, la fiche défile dans la même scène (max 560 px).
- Animer uniquement `transform`, `opacity`, `filter` léger. Pas de layout pendant l’animation.
- Inclinaison au pointeur désactivée sur `pointer: coarse` (remplacée par le balancement seul),
  et aucune écoute `deviceorientation` (permission iOS).
- Toucher, clic, Entrée ou Espace déclenchent. Échap ferme à tout moment et annule les animations
  (`getAnimations().forEach(a => a.cancel())`).
- `prefers-reduced-motion: reduce` ⇒ pas de rayons tournants, pas de particules, fiche directe.
- Sachet déjà ouvert ⇒ fiche directe, sans scène.
- Nettoyer tous les éléments temporaires (grains, bande clonée, flash) à `onfinish`.
