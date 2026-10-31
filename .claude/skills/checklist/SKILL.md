---
name: checklist
description: Checklist de validation finale du calendrier (local et production). Utiliser avant de déclarer le projet terminé ou après un déploiement.
---

# Checklist de validation

Passer chaque point, noter la preuve (sortie de commande, capture, mesure).

- [ ] `npm run build` passe sans erreur ni avertissement TypeScript.
- [ ] Avant décembre, `/api/day/5` en production renvoie 403. Le source de la page ne contient
      ni « Kawa », ni « Winter Blend », ni « Full Monkeys ».
- [ ] Avec `PREVIEW_DATE=2026-12-15` en local : jours 1 à 15 ouverts, 16 refusé, 15 porte
      la pastille « Aujourd’hui ».
- [ ] Le sachet d’essai s’ouvre toujours, avec l’animation complète.
- [ ] Notes et sachets ouverts persistent après rechargement.
- [ ] Jours 19 et 20 affichent les deux cafés les mieux notés.
- [ ] Rendu correct en thème clair et sombre, mobile 375 px et desktop.
- [ ] `prefers-reduced-motion` : fiche affichée sans animation.
- [ ] Lighthouse accessibilité ≥ 95.

Outils : `/verifier-verrou` pour les points 1–3, agent `relecteur-a11y` pour les points 7–9.
