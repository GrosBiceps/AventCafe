# L’Avent torréfié

Calendrier de l’Avent café : 24 sachets du 1er au 24 décembre 2026. Chaque sachet s’ouvre le jour venu
(heure de Paris, vérifiée côté serveur), avec une ouverture plein écran, puis révèle la fiche du café.

## Lancer en local

```bash
npm install
npm run dev
```

Simuler une date (ignoré en production) :

```bash
PREVIEW_DATE=2026-12-15 npm run dev            # bash
$env:PREVIEW_DATE="2026-12-15"; npm run dev    # PowerShell
```

## Renseigner le coffret Lugat

Tout se passe dans `lib/data.ts` (mode d’emploi en tête du fichier), puis :

```bash
git add lib/data.ts
git commit -m "data: renseigne le coffret Lugat"
git push
```

Vercel redéploie automatiquement à chaque push sur `main`.

## Structure

- `lib/data.ts`, `lib/dates.ts` : données et dates, **serveur uniquement**.
- `app/api/day/[n]/route.ts` : fiche du jour n, `403` si verrouillé, jamais mise en cache.
- `components/` : étagère, sachet CSS, scène d’ouverture, fiche.
- `reference/avent-torrefie.html` : maquette d’origine.
