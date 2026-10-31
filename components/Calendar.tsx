"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Pouch, { PouchDefs } from "./Pouch";
import OpeningStage, { fetchDay, preloadScene, type LoadResult } from "./OpeningStage";
import { useOpened } from "@/lib/storage";
import type { CalendarStatus, ShelfItem } from "@/lib/types";

const TILTS = [-2, 1.5, -1, 2, -1.5, 1, 0.5, -2, 2, -0.5, 1.5, -1];
const WEEKDAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

const LEDE = "Vingt-quatre sachets, sept cafés, un rituel par matin. Chaque sachet s’ouvre le jour venu, pas avant.";

type Props = {
  shelf: ShelfItem[];
  todayN: number;
  status: CalendarStatus;
  msToMidnight: number;
};

function dayLabel(n: number): string {
  return n === 1 ? "1er" : String(n);
}

/** « mar. 1er déc. » : date fixe de décembre 2026, identique serveur et client. */
function dateCaption(n: number): string {
  return `${WEEKDAYS[new Date(Date.UTC(2026, 11, n)).getUTCDay()]} ${dayLabel(n)} déc.`;
}

function statusText(status: CalendarStatus, opened: number[]): string {
  if (status.kind === "countdown") {
    return status.days === 1
      ? "Le premier sachet s’ouvre demain"
      : `Le premier sachet s’ouvre dans ${status.days} jours`;
  }
  if (status.kind === "today") {
    return opened.includes(status.n)
      ? `Sachet n° ${status.n} ouvert. À demain.`
      : `Le sachet n° ${status.n} t’attend`;
  }
  return "Calendrier terminé. Joyeuses fêtes !";
}

function TopBar() {
  return (
    <div className="topbar">
      <span className="brand">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M6 4h12l.6 3.2c.9 4.4.9 8.8 0 13.2-.2.9-1 1.6-2 1.6H7.4c-1 0-1.8-.7-2-1.6-.9-4.4-.9-8.8 0-13.2Z" fill="currentColor" opacity=".18" />
          <path d="M6 4h12l.6 3.2c.9 4.4.9 8.8 0 13.2-.2.9-1 1.6-2 1.6H7.4c-1 0-1.8-.7-2-1.6-.9-4.4-.9-8.8 0-13.2Z M5.6 7.5h12.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        L’Avent torréfié
      </span>
      <span className="edition">Décembre 2026</span>
    </div>
  );
}

function Hero({ status, opened }: { status: string; opened: number | null }) {
  return (
    <div className="hero-text">
      <p className="eyebrow">Calendrier de l’Avent · Café en grains</p>
      <h1>L’Avent torréfié</h1>
      <p className="lede">{LEDE}</p>
      <div className="hero-meta">
        <div className="status">
          <span className="dot" />
          <span>{status}</span>
        </div>
        {opened !== null && (
          <div className="progress">
            <div
              className="progress-bar"
              role="progressbar"
              aria-label="Sachets ouverts"
              aria-valuemin={0}
              aria-valuemax={24}
              aria-valuenow={opened}
            >
              <span style={{ width: `${(opened / 24) * 100}%` }} />
            </div>
            <span className="progress-text">
              {opened}/24 ouverts
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Coquille statique affichée pendant le calcul serveur de l’étagère : aucune donnée de café. */
export function CalendarShell() {
  return (
    <div className="wrap">
      <TopBar />
      <header className="hero">
        <Hero status=" " opened={null} />
      </header>
      <main>
        <section className="shelf" aria-label="Calendrier de l’Avent" aria-busy="true" />
      </main>
    </div>
  );
}

export default function Calendar({ shelf, todayN, status, msToMidnight }: Props) {
  const router = useRouter();
  const opened = useOpened();
  const [active, setActive] = useState<{ n: number; already: boolean; load: Promise<LoadResult> } | null>(null);
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  // À minuit (Paris), le serveur recalcule l’étagère : le nouveau sachet apparaît sans recharger.
  useEffect(() => {
    const t = window.setTimeout(() => router.refresh(), msToMidnight + 1500);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [msToMidnight, router]);

  const showToast = useCallback((msg: string) => {
    setToast({ msg, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const open = (n: number, locked: boolean, e: MouseEvent<HTMLButtonElement>) => {
    if (locked) {
      // Aucun appel réseau pour un sachet verrouillé : le refus est immédiat et local.
      const slot = e.currentTarget;
      slot.classList.remove("shake");
      void slot.offsetWidth;
      slot.classList.add("shake");
      showToast(`Patience : ce sachet s’ouvre le ${dayLabel(n)} décembre.`);
      return;
    }
    const already = n !== 0 && opened.includes(n);
    // Requête lancée dès le clic, pendant que la scène s’installe.
    setActive({ n, already, load: fetchDay(n) });
  };

  const onLocked = useCallback(() => {
    setActive(null);
    router.refresh();
    if (active) showToast(`Patience : ce sachet s’ouvre le ${dayLabel(active.n)} décembre.`);
  }, [active, router, showToast]);

  const openedCount = shelf.filter((s) => !s.locked && opened.includes(s.n)).length;

  return (
    <>
      <PouchDefs />
      <div className="wrap">
        <TopBar />
        <header className="hero">
          <Hero status={statusText(status, opened)} opened={openedCount} />
          <div className="trial">
            <button className="slot trial-slot" type="button" aria-label="Ouvrir le sachet d’essai" onPointerDown={preloadScene} onFocus={preloadScene} onClick={(e) => open(0, false, e)}>
              <Pouch n={0} tilt={-3} />
            </button>
            <div className="trial-text">
              <strong>Sachet d’essai</strong>
              <span>Pour découvrir l’ouverture avant le 1er décembre.</span>
            </div>
          </div>
        </header>

        <main>
          <div className="shelf-head">
            <h2>Les 24 sachets</h2>
            <ul className="legend" aria-label="Légende">
              <li><span className="lg lg-today" />Aujourd’hui</li>
              <li><span className="lg lg-open" />Ouvert</li>
              <li><span className="lg lg-locked" />À venir</li>
            </ul>
          </div>
          <section className="shelf" aria-label="Calendrier de l’Avent">
            {shelf.map(({ n, locked, origin }, i) => {
              const isOpen = !locked && opened.includes(n);
              const isToday = n === todayN && !isOpen;
              const label = locked
                ? `Sachet ${n}, verrouillé jusqu’au ${dayLabel(n)} décembre`
                : isOpen
                  ? `Sachet ${n}, ouvert : revoir la fiche`
                  : `Ouvrir le sachet ${n}`;
              const cls = ["slot", isToday && "today", isOpen && "is-open", locked && "is-locked"].filter(Boolean).join(" ");
              return (
                <button
                  key={n}
                  type="button"
                  className={cls}
                  aria-label={label}
                  onPointerDown={locked ? undefined : preloadScene}
                  onClick={(e) => open(n, locked, e)}
                  onAnimationEnd={(e) => e.currentTarget.classList.remove("shake")}
                >
                  {isToday && <span className="tag">Aujourd’hui</span>}
                  <Pouch n={n} locked={locked} torn={isOpen} origin={isOpen ? origin : undefined} tilt={TILTS[i % TILTS.length]} />
                  <span className="caption" aria-hidden="true">{dateCaption(n)}</span>
                </button>
              );
            })}
          </section>
        </main>

        <footer className="foot">
          <span>Sept cafés, un rituel par matin.</span>
          <span>Tes notes restent sur cet appareil.</span>
        </footer>
      </div>

      {active && (
        <OpeningStage
          key={`${active.n}-${active.already}`}
          n={active.n}
          already={active.already}
          load={active.load}
          onClose={() => setActive(null)}
          onLocked={onLocked}
        />
      )}

      <div className={toast ? "toast show" : "toast"} role="status">
        {toast?.msg}
      </div>
    </>
  );
}
