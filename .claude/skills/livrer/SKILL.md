---
name: livrer
description: Livrer une étape validée — build, lint, vérif du verrou, commit clair, push sur main (Vercel redéploie automatiquement). Utiliser après chaque étape validée par l’utilisateur.
---

# Livrer une étape

1. `npm run lint` puis `npm run build` : zéro erreur, zéro avertissement TypeScript.
2. Si `lib/`, `app/api/`, `app/page.tsx` ou `components/` ont changé : lancer `/verifier-verrou`
   (au minimum l’étape bundles client).
3. `git status` : aucun `.env*`, `.next/`, `node_modules/` suivi.
4. Commit petit et clair, en français, préfixe conventionnel :
   `feat:`, `fix:`, `style:`, `data:`, `chore:`, `docs:`.
5. `git push origin main`. Jamais de `--force`.
6. Rappeler à l’utilisateur : Vercel redéploie en ~1 min ; vérifier l’URL de production.
