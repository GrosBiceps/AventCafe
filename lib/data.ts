import "server-only";

/* ============================================================================
 *  RENSEIGNER LE COFFRET LUGAT (sachets A, B, C, D)
 * ============================================================================
 *
 *  À réception du coffret :
 *
 *  1. Repère l’objet `COFFRET` juste en dessous.
 *  2. Pour chaque sachet, remplis les champs entre guillemets :
 *       name    : nom du café            ex. "Rose Diamond"
 *       origin  : origine                ex. "Brésil"
 *       process : traitement             ex. "Nature"
 *       roast   : torréfaction           ex. "Moyenne"
 *       notes   : notes aromatiques      ex. ["Chocolat", "Noisette"]
 *       profile : de 1 (faible) à 5 (fort), 0 = « à remplir »
 *  3. Laisse vide ce que tu ne connais pas : la fiche affichera le texte
 *     de remplacement (« Ouvre le sachet A du coffret Lugat… »).
 *  4. Enregistre, puis dans un terminal à la racine du projet :
 *       git add lib/data.ts
 *       git commit -m "data: renseigne le coffret Lugat"
 *       git push
 *     Vercel redéploie tout seul en une minute environ.
 *
 *  Typographie : apostrophe ’ (pas '), guillemets « ».
 *  Ce fichier n’est lu que par le serveur : rien n’arrive au navigateur
 *  avant le jour d’ouverture du sachet.
 * ========================================================================== */

import type { Act, Candidate, CalendarStatus, Coffee, DayCard, Profile, ShelfItem } from "./types";
import { daysUntilStart, isUnlocked, todayNumber, type ParisDate } from "./dates";

type CoffretEntry = {
  name: string;
  origin: string;
  process: string;
  roast: string;
  notes: string[];
  profile: Profile;
};

const COFFRET: Record<"A" | "B" | "C" | "D", CoffretEntry> = {
  A: {
    name: "",
    origin: "",
    process: "",
    roast: "",
    notes: [],
    profile: { intensite: 0, acidite: 0, corps: 0, douceur: 0 },
  },
  B: {
    name: "",
    origin: "",
    process: "",
    roast: "",
    notes: [],
    profile: { intensite: 0, acidite: 0, corps: 0, douceur: 0 },
  },
  C: {
    name: "",
    origin: "",
    process: "",
    roast: "",
    notes: [],
    profile: { intensite: 0, acidite: 0, corps: 0, douceur: 0 },
  },
  D: {
    name: "",
    origin: "",
    process: "",
    roast: "",
    notes: [],
    profile: { intensite: 0, acidite: 0, corps: 0, douceur: 0 },
  },
};

/* ---------- Cafés (textes de la maquette, objet BASE) ---------- */

const BASE: Record<"fullmonkeys" | "kawa" | "winter" | "trial", Coffee> = {
  fullmonkeys: {
    id: "fullmonkeys",
    name: "The Full Monkeys",
    roaster: "Terres de Café",
    short: "Assemblage",
    origin: "Assemblage 100 % arabica",
    process: "Assemblage",
    roast: "Moyenne",
    notes: ["Équilibré", "Subtil", "Aromatique"],
    profile: { intensite: 3, acidite: 3, corps: 3, douceur: 3 },
    desc: "Le blend maison d’un torréfacteur parisien de référence. Un café d’équilibre, idéal pour comparer le style de Terres de Café à celui de Lugat.",
    estimated: true,
  },
  kawa: {
    id: "kawa",
    name: "Kawa Blend",
    roaster: "Tanat",
    short: "Brésil, Guatemala, Pérou",
    origin: "Brésil, Guatemala, Pérou",
    process: "Assemblage",
    roast: "Foncée",
    notes: ["Caramel", "Chocolat"],
    profile: { intensite: 4, acidite: 1, corps: 4, douceur: 4 },
    desc: "Un assemblage rond et gourmand, pensé pour l’espresso. Le contrepoint sucré des cafés plus vifs du coffret.",
    estimated: true,
  },
  winter: {
    id: "winter",
    name: "Winter Blend",
    roaster: "Lugat, édition limitée",
    short: "Brésil, Indonésie, Inde",
    origin: "Brésil, Indonésie, Inde",
    process: "Nature, semi-lavé, moussonné",
    roast: "Foncée",
    notes: ["Fruits confits", "Noisette torréfiée"],
    profile: { intensite: 4, acidite: 1, corps: 5, douceur: 4 },
    desc: "Le café d’hiver de Lugat. Un grain moussonné indien, des fruits confits et de la noisette : la tasse de réveillon.",
    estimated: true,
  },
  trial: {
    id: "trial",
    name: "Sachet d’essai",
    roaster: "L’Avent torréfié",
    short: "Patience",
    origin: "Ta cuisine, fin octobre",
    process: "Impatience lavée",
    roast: "Légère",
    notes: ["Impatience", "Gourmandise"],
    profile: { intensite: 2, acidite: 3, corps: 2, douceur: 5 },
    desc: "Ce sachet sert juste à voir l’animation. Les vrais s’ouvrent à partir du 1er décembre.",
    estimated: false,
  },
};

function coffretCoffee(k: "A" | "B" | "C" | "D"): Coffee {
  const c = COFFRET[k];
  return {
    id: k,
    name: c.name || `Café surprise ${k}`,
    roaster: `Coffret Lugat, sachet ${k}`,
    short: c.origin || `Sachet ${k}`,
    origin: c.origin || `Inscrite sur le sachet ${k}`,
    process: c.process || "À découvrir",
    roast: c.roast || "À découvrir",
    notes: c.notes.filter(Boolean),
    profile: { ...c.profile },
    // Le formulaire de la maquette n’existe plus : le texte renvoie à l’étiquette du sachet.
    desc: c.name
      ? ""
      : `Ouvre le sachet ${k} du coffret Lugat : sa fiche n’a pas encore été remplie. Lis l’étiquette pour découvrir ce café.`,
    estimated: false,
  };
}

type CoffeeId = "A" | "B" | "C" | "D" | "fullmonkeys" | "kawa" | "winter" | "trial";

function getCoffee(id: CoffeeId): Coffee {
  return id === "A" || id === "B" || id === "C" || id === "D" ? coffretCoffee(id) : BASE[id];
}

/* ---------- Rituels (objet ACTS de la maquette) ---------- */

const ACTS: Record<1 | 2 | 3, Act> = {
  1: {
    title: "Premier jour avec ce café",
    text: "Espresso court, sans sucre. Sens la tasse avant de boire, puis note ta première impression.",
    tip: "Nouveau café : fais couler un café de purge, le broyeur contient encore le précédent.",
  },
  2: {
    title: "Deuxième jour : version allongée",
    text: "Lance-le en lungo ou en café allongé. Qu’est-ce qui ressort quand il a plus d’eau pour s’exprimer ?",
  },
  3: {
    title: "Troisième jour : face au lait",
    text: "En cappuccino ou en latte. Est-ce qu’il tient tête au lait ? Donne ta note finale ci-dessous.",
  },
};

const TRIAL_ACT: Act = {
  title: "Mode d’emploi",
  text: "Le jour venu, touche le sachet du jour pour le déchirer et découvrir ton café.",
};

const FINALE: Act = {
  title: "Joyeux réveillon",
  text: "Dernier sachet. Prends le temps : c’est le café de la soirée.",
};

const SPECIALS = {
  fav1: {
    title: "Le retour de ton favori",
    text: "Ressers-toi le café le mieux noté de ton calendrier. Te plaît-il toujours autant ?",
    textMissing:
      "Choisis le café qui t’a le plus marqué depuis le 1er décembre et ressers-le. Pense à noter tes cafés : ce sachet le choisira pour toi.",
  },
  fav2: {
    title: "Le dauphin",
    text: "Voici ton deuxième café préféré. Demain, il affronte le premier.",
    textMissing: "Ressers ton deuxième café préféré. Demain, il affronte le premier.",
  },
  duel: {
    title: "Duel à l’aveugle",
    text: "Demande à quelqu’un de préparer tes deux favoris dans deux tasses identiques. Devine lequel est lequel, puis départage-les pour de bon.",
    textMissing:
      "Demande à quelqu’un de préparer tes deux favoris dans deux tasses identiques. Devine lequel est lequel, puis départage-les pour de bon.",
  },
} as const;

/* ---------- Programme des 24 jours ---------- */

type DayDef =
  | { coffee: CoffeeId; act: 1 | 2 | 3; finale?: true }
  | { special: "fav1" | "fav2" | "duel" };

/** Cafés notables, dans l’ordre de dégustation : candidats aux jours 19 à 21. */
const RATED: CoffeeId[] = ["A", "B", "C", "D", "fullmonkeys", "kawa"];

const DAYS: Record<number, DayDef> = (() => {
  const days: Record<number, DayDef> = {};
  let d = 1;
  for (const id of RATED) {
    for (const act of [1, 2, 3] as const) days[d++] = { coffee: id, act };
  }
  days[19] = { special: "fav1" };
  days[20] = { special: "fav2" };
  days[21] = { special: "duel" };
  days[22] = { coffee: "winter", act: 1 };
  days[23] = { coffee: "winter", act: 2 };
  days[24] = { coffee: "winter", act: 3, finale: true };
  return days;
})();

/** Ordre mélangé des sachets sur l’étagère (constante ORDER de la maquette). */
export const ORDER = [7, 15, 2, 20, 11, 4, 23, 9, 1, 17, 13, 6, 22, 3, 18, 10, 24, 5, 14, 8, 19, 12, 21, 16];

function firstDay(id: CoffeeId): number {
  return Number(Object.keys(DAYS).find((k) => {
    const d = DAYS[Number(k)];
    return "coffee" in d && d.coffee === id;
  }));
}

function lastDay(id: CoffeeId): number {
  return firstDay(id) + 2;
}

function originFor(n: number): string {
  const d = DAYS[n];
  if ("coffee" in d) return getCoffee(d.coffee).short;
  return d.special === "duel" ? "Duel" : "Favori";
}

/* ---------- API publique (serveur uniquement) ---------- */

/** Fiche complète du jour n. À n’appeler qu’après avoir vérifié isUnlocked(n). */
export function getDayCard(n: number, today: ParisDate): DayCard {
  if (n === 0) {
    return { kind: "coffee", n, coffee: getCoffee("trial"), act: TRIAL_ACT, rateable: false };
  }
  const d = DAYS[n];
  if ("coffee" in d) {
    return {
      kind: "coffee",
      n,
      coffee: getCoffee(d.coffee),
      act: ACTS[d.act],
      finale: d.finale ? FINALE : undefined,
      rateable: true,
    };
  }
  // Seuls les cafés déjà déverrouillés partent vers le client.
  const candidates: Candidate[] = RATED.filter((id) => isUnlocked(firstDay(id), today)).map(
    (id) => ({ ...getCoffee(id), lastDay: lastDay(id) }),
  );
  return { kind: "special", n, special: d.special, ...SPECIALS[d.special], candidates };
}

/** Étagère : numéros dans l’ordre mélangé, état, et origine courte des seuls jours ouverts. */
export function getShelf(today: ParisDate): ShelfItem[] {
  return ORDER.map((n) =>
    isUnlocked(n, today) ? { n, locked: false, origin: originFor(n) } : { n, locked: true },
  );
}

export function getStatus(today: ParisDate): CalendarStatus {
  const until = daysUntilStart(today);
  if (until > 0) return { kind: "countdown", days: until };
  const tn = todayNumber(today);
  return tn ? { kind: "today", n: tn } : { kind: "done" };
}
