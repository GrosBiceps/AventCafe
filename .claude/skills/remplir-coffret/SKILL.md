---
name: remplir-coffret
description: Renseigner les sachets A, B, C, D du coffret Lugat dans lib/data.ts à réception du colis, puis pousser pour que Vercel redéploie. Utiliser quand l’utilisateur donne nom, origine, notes ou profil d’un sachet.
---

# Remplir le coffret Lugat

1. Ouvrir `lib/data.ts`, objet `COFFRET` (sachets `A`, `B`, `C`, `D`).
2. Pour chaque sachet fourni, remplir : `name`, `origin`, `process`, `roast`,
   `notes` (tableau de chaînes), `profile` (`intensite`, `acidite`, `corps`, `douceur`, de 1 à 5).
   Un champ laissé vide (`""`, `[]` ou `0`) garde le texte de remplacement de la maquette
   (« Ouvre le sachet A du coffret Lugat… », « à remplir »).
3. Typographie : `’` et `« »`, majuscule initiale sur chaque note aromatique.
4. Ne jamais copier ces valeurs ailleurs que dans `lib/data.ts`.
5. `npm run build`, puis commit `data: renseigne le sachet X du coffret Lugat` et push sur `main`.
6. Garder la surprise : ne pas répéter le contenu des sachets non encore ouverts dans la
   réponse à l’utilisateur, sauf s’il le demande.
