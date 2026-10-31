// Types partagés serveur / client. Ce fichier ne contient AUCUNE donnée.

export type ProfileKey = "intensite" | "acidite" | "corps" | "douceur";
export type Profile = Record<ProfileKey, number>;

export const PROFILE_LABELS: Record<ProfileKey, string> = {
  intensite: "Intensité",
  acidite: "Acidité",
  corps: "Corps",
  douceur: "Douceur",
};

export type Coffee = {
  id: string;
  name: string;
  roaster: string;
  /** Origine courte affichée sur l’étiquette du sachet ouvert. */
  short: string;
  origin: string;
  process: string;
  roast: string;
  notes: string[];
  /** 0 = « à remplir ». */
  profile: Profile;
  desc: string;
  /** Profil estimé d’après la description du torréfacteur (mention « profil indicatif »). */
  estimated: boolean;
};

export type Act = { title: string; text: string; tip?: string };

export type CoffeeDay = {
  kind: "coffee";
  n: number;
  coffee: Coffee;
  act: Act;
  /** Encart supplémentaire (réveillon du 24). */
  finale?: Act;
  /** false pour le sachet d’essai : pas de note. */
  rateable: boolean;
};

/** Café candidat aux jours 19 à 21, avec son dernier jour de dégustation (départage des égalités). */
export type Candidate = Coffee & { lastDay: number };

export type SpecialDay = {
  kind: "special";
  n: number;
  special: "fav1" | "fav2" | "duel";
  title: string;
  /** Texte quand le favori est connu (ou texte unique pour le duel). */
  text: string;
  /** Texte quand aucune note ne permet encore de choisir. */
  textMissing: string;
  candidates: Candidate[];
};

export type DayCard = CoffeeDay | SpecialDay;

export type LockedResponse = { locked: true; unlocksOn: string };

export type ShelfItem = { n: number; locked: boolean; origin?: string };

export type CalendarStatus =
  | { kind: "countdown"; days: number }
  | { kind: "today"; n: number }
  | { kind: "done" };
