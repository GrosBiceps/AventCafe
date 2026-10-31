---
name: verifier-verrou
description: Prouve qu’aucune donnée d’un jour verrouillé n’atteint le navigateur (API 403, HTML, bundles JS). À lancer après toute modification de lib/, app/api/, app/page.tsx ou components/.
---

# Vérifier le verrouillage serveur

Objectif : démontrer, preuves à l’appui, que le navigateur ne reçoit jamais un café futur.

## 1. Build de production

```bash
npm run build
```
Doit passer sans erreur ni avertissement TypeScript. Vérifier dans le résumé que `/` et
`/api/day/[n]` sont marqués **dynamiques** (ƒ), pas statiques (○).

## 2. Bundles client

Aucun nom de café ne doit apparaître dans le JS envoyé au navigateur :
```bash
grep -rlE "Kawa|Winter Blend|Full Monkeys|Terres de Café|Tanat" .next/static || echo "OK : rien dans .next/static"
```

## 3. Serveur de production local, date réelle (avant décembre)

```bash
npm run start &   # port 3000
curl -i http://localhost:3000/api/day/5        # attendu : 403, {"locked":true,"unlocksOn":"2026-12-05"}, Cache-Control: no-store
curl -i http://localhost:3000/api/day/0        # attendu : 200, sachet d’essai
curl -i http://localhost:3000/api/day/25       # attendu : 404
curl -i http://localhost:3000/api/day/abc      # attendu : 404
curl -s http://localhost:3000/ | grep -cE "Kawa|Winter Blend|Full Monkeys"   # attendu : 0
```

## 4. Date simulée (dev uniquement)

```bash
PREVIEW_DATE=2026-12-15 npm run dev
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/day/15   # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/day/16   # 403
```
Vérifier aussi que `PREVIEW_DATE` est **ignorée** avec `npm run start` (production).

## 5. Jours spéciaux

`/api/day/19` avec `PREVIEW_DATE=2026-12-19` : la liste de fiches renvoyée ne contient que des
cafés de jours ≤ 19 (jamais Winter Blend).

## Rapport

Donner un tableau : test, attendu, obtenu, OK/KO. Tout KO bloque le push.
