import "server-only";

// Toute la logique de date vit ici, côté serveur, à l’heure de Paris.
// Le navigateur ne décide jamais de ce qui est ouvert.

export const YEAR = 2026;

export type ParisDate = { y: number; m: number; d: number };

const PARIS_YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const PARIS_HMS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parseYmd(s: string): ParisDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Date du jour à Paris. PREVIEW_DATE ne s’applique jamais en production. */
export function parisToday(now: Date = new Date()): ParisDate {
  const preview = process.env.NODE_ENV !== "production" ? process.env.PREVIEW_DATE : undefined;
  if (preview) {
    const p = parseYmd(preview);
    if (p) return p;
  }
  return parseYmd(PARIS_YMD.format(now))!;
}

function key(p: ParisDate): number {
  return p.y * 10000 + p.m * 100 + p.d;
}

/** Jour n ouvert si la date à Paris est ≥ n décembre 2026. Jour 0 = sachet d’essai, toujours ouvert. */
export function isUnlocked(n: number, today: ParisDate): boolean {
  if (n === 0) return true;
  return key(today) >= YEAR * 10000 + 12 * 100 + n;
}

export function unlocksOn(n: number): string {
  return `${YEAR}-12-${String(n).padStart(2, "0")}`;
}

/** Numéro du sachet du jour, 0 hors de la période du 1er au 24 décembre. */
export function todayNumber(today: ParisDate): number {
  return today.y === YEAR && today.m === 12 && today.d <= 24 ? today.d : 0;
}

/** Jours restants avant le 1er décembre (0 si la période a commencé). */
export function daysUntilStart(today: ParisDate): number {
  const t = Date.UTC(today.y, today.m - 1, today.d);
  const start = Date.UTC(YEAR, 11, 1);
  return Math.max(0, Math.round((start - t) / 86400000));
}

/** Millisecondes avant le prochain minuit à Paris : le client se rafraîchit à ce moment-là. */
export function msUntilParisMidnight(now: Date = new Date()): number {
  const [h, m, s] = PARIS_HMS.format(now).split(":").map(Number);
  return (86400 - (h * 3600 + m * 60 + s)) * 1000;
}
