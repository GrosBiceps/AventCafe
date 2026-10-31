"use client";

import { useSyncExternalStore } from "react";

// Sachets ouverts et notes de dégustation : uniquement dans ce navigateur (phase 1).
// Clés identiques à la maquette pour garder les données déjà saisies.

export type Rating = { stars?: number; note?: string };
export type Ratings = Record<string, Rating>;
type State = { opened: number[]; ratings: Ratings };

const KEY_OPENED = "avent-opened";
const KEY_RATINGS = "avent-ratings";
const EMPTY: State = { opened: [], ratings: {} };

let cache: State | null = null;
const listeners = new Set<() => void>();

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Navigation privée ou stockage plein : l’app reste utilisable sans persistance.
  }
}

function read(): State {
  const opened = load<unknown>(KEY_OPENED, []);
  const ratings = load<unknown>(KEY_RATINGS, {});
  return {
    opened: Array.isArray(opened) ? opened.filter((n): n is number => Number.isInteger(n)) : [],
    ratings: ratings && typeof ratings === "object" ? (ratings as Ratings) : {},
  };
}

function getSnapshot(): State {
  if (!cache) cache = read();
  return cache;
}

function getServerSnapshot(): State {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Synchronise les onglets ouverts en parallèle.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY_OPENED || e.key === KEY_RATINGS) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(next: State): void {
  cache = next;
  listeners.forEach((l) => l());
}

export function useAvent(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function readRatings(): Ratings {
  return getSnapshot().ratings;
}

export function markOpened(n: number): void {
  const s = getSnapshot();
  if (n === 0 || s.opened.includes(n)) return;
  const opened = [...s.opened, n];
  save(KEY_OPENED, opened);
  commit({ ...s, opened });
}

export function setRating(id: string, patch: Rating): void {
  const s = getSnapshot();
  const ratings = { ...s.ratings, [id]: { ...s.ratings[id], ...patch } };
  save(KEY_RATINGS, ratings);
  commit({ ...s, ratings });
}
