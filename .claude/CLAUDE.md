# L’Avent torréfié — règles de travail

Calendrier de l’Avent café perso : 24 sachets du 1er au 24 décembre 2026, 7 cafés MaxiCoffee.
Chaque jour on ouvre le sachet du jour (animation plein écran), puis la fiche du café apparaît.
**Les jours futurs ne doivent jamais atteindre le navigateur.**

Réponds toujours en français. Fais des commits petits et clairs, puis pousse sur `main`.

## Source de vérité

- `reference/avent-torrefie.html` = maquette. Elle fait foi pour design, textes, logique,
  rituels (`ACTS`), fiches (`BASE`), ordre (`ORDER`), inclinaisons (`TILTS`), timings de `tear()`.
- Ne réinvente pas le design. Améliore seulement ce qui est demandé.
  Si un point de la maquette semble bancal, **signale-le avant de le changer**.
- Exception validée : l’ouverture devient une scène **plein écran** inspirée de gil2-cards.com
  (voir skill `animation-ouverture`).

## Stack imposée

- Next.js (dernière stable, App Router) + TypeScript strict.
- CSS natif (`app/globals.css` ou CSS Modules). **Pas de Tailwind, pas de lib d’UI.**
- Polices via `next/font/google` : Zilla Slab (500, 700), Karla (400, 600).
- Animations : **Web Animations API + CSS uniquement.** Pas de GSAP, Framer Motion, three.js.
- Pas de base de données en phase 1 : notes et sachets ouverts en `localStorage`.
- Hébergement : Vercel, auto-déployé à chaque push sur `main`.

## Règle numéro un : verrouillage serveur

- Données cafés + programme des 24 jours : **uniquement** `lib/data.ts`, qui commence par
  `import "server-only"`. Aucun nom de café, origine ou note ailleurs dans `app/`, `components/`,
  `public/` (un hook le vérifie à chaque écriture).
- Jour courant calculé **côté serveur**, fuseau `Europe/Paris`, via
  `Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ... })`. Jamais l’heure navigateur.
- Jour n ouvert si date Paris ≥ 2026-12-n 00:00. Après le 24 décembre 2026 : tout ouvert.
  Jour 0 (sachet d’essai) : toujours ouvert.
- `GET /api/day/[n]` → fiche complète si ouvert, sinon `403 { "locked": true, "unlocksOn": "2026-12-07" }`.
  En-tête `Cache-Control: no-store` sur toutes les réponses. Route en rendu dynamique.
- La page d’accueil reçoit seulement `{ n, locked, origin? }[]` (origine courte si ouvert). Rien d’autre.
- Next 16.4 avec `cacheComponents` : **pas** d’`export const dynamic` (interdit). Toute lecture de
  date se fait après `await connection()` ; sur la page, dans un composant sous `<Suspense>`
  (coquille statique sans donnée + étagère streamée). Le build doit afficher `◐ /` et `ƒ /api/day/[n]`.
- Avant d’écrire du code Next, lire le guide concerné dans `node_modules/next/dist/docs/` (voir `AGENTS.md`).
- `PREVIEW_DATE=2026-12-15` remplace la date **seulement si** `NODE_ENV !== "production"`.
- Côté client : aucun appel API pour un sachet verrouillé (tremblement + toast). Le serveur reste
  protégé quoi qu’il arrive.
- Jours 19, 20, 21 : le serveur renvoie le type (`fav1`, `fav2`, `duel`), son texte, et les fiches
  des cafés **déjà déverrouillés** ; le client choisit les favoris d’après les notes en localStorage.

## Plan de fichiers

```
app/
  layout.tsx            polices, metadata, viewport (viewport-fit=cover, themeColor)
  page.tsx              serveur : calcule l’état des 24 jours, rend <Calendar>
  globals.css           tokens + styles portés de la maquette
  api/day/[n]/route.ts  GET protégé, no-store
components/             tout en "use client" sauf mention ; ne reçoit que des props sérialisées
  Calendar.tsx          grille, sachet d’essai, statut, toast, ouverture du dialog
  Bag.tsx               sachet CSS (corps kraft, bande crantée, étiquette, rubans, cire)
  OpeningStage.tsx      scène plein écran + séquence d’ouverture (WAAPI)
  Sheet.tsx             fiche café, profil en grains, étoiles, notes
lib/
  data.ts               server-only : BASE, coffret A–D, ACTS, DAYS, ORDER
  dates.ts              server-only : todayParis(), isUnlocked(n), unlocksOn(n)
  types.ts              types partagés (aucune donnée)
  storage.ts            client : load/save localStorage protégés par try/catch
reference/avent-torrefie.html
```

## Conventions

- Typographie affichée : apostrophe `’`, guillemets `« »` avec espaces insécables, `1er`.
  Jamais `'` dans un texte visible.
- Clés localStorage de la maquette : `avent-opened`, `avent-ratings` (on supprime `avent-coffret`).
- Tout accès `localStorage` dans `try/catch`, lu après montage (pas pendant le rendu serveur)
  pour éviter les erreurs d’hydratation.
- Accessibilité : `prefers-reduced-motion` ⇒ fiche directe sans animation ; focus visible ;
  Entrée/Espace ouvrent ; Échap ferme ; libellés `aria` de la maquette ; cible Lighthouse a11y ≥ 95.
- Mobile d’abord : 3 colonnes sous 640 px, test à 375 px, `env(safe-area-inset-*)`.
- Thèmes : clair « avoine », sombre « nuit de sapin », `prefers-color-scheme` + `data-theme`.
  Étiquettes et fiches restent papier crème dans les deux thèmes.
- Jamais de boucle sur des centaines d’éléments DOM à chaque frame : animations WAAPI composées
  (`transform`, `opacity`) uniquement.

## Commandes

```bash
npm run dev                                   # local
PREVIEW_DATE=2026-12-15 npm run dev           # simuler une date (bash)
$env:PREVIEW_DATE="2026-12-15"; npm run dev   # idem PowerShell
npm run build && npm run lint
```

## Git et déploiement

- Dépôt : https://github.com/GrosBiceps/AventCafe (branche `main`). Pousser après chaque
  étape validée : Vercel redéploie seul. Aucune variable d’environnement en production.
- Demander confirmation avant : suppression de fichiers, `git push --force`, réécriture
  d’historique, déploiement manuel, ajout d’une dépendance.
- `gh` et `vercel` CLI ne sont pas installés sur cette machine : passer par `git` et le
  tableau de bord Vercel.

## Skills et agents du projet

- `/verifier-verrou` : prouve qu’aucun jour futur ne fuit (API, HTML, bundles `.next/static`).
- `/remplir-coffret` : renseigner les sachets A–D du coffret Lugat dans `lib/data.ts`.
- `/livrer` : build, lint, commit, push → Vercel.
- `/animation-ouverture` : spec de la scène d’ouverture plein écran.
- `/checklist` : checklist de validation finale (section 8 du cahier des charges).
- Agents : `auditeur-verrou`, `relecteur-a11y`, `gardien-maquette`.
