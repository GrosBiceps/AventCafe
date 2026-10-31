"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Bag from "./Bag";
import OpeningStage, { fetchDay, type LoadResult } from "./OpeningStage";
import { useAvent } from "@/lib/storage";
import type { CalendarStatus, ShelfItem } from "@/lib/types";

const TILTS = [-2, 1.5, -1, 2, -1.5, 1, 0.5, -2, 2, -0.5, 1.5, -1];

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

/** Coquille statique affichée pendant le calcul serveur de l’étagère : aucune donnée de café. */
export function CalendarShell() {
  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>L’Avent torréfié</h1>
          <p className="lede">{LEDE}</p>
          <div className="status">
            <span className="dot" />
            <span>&nbsp;</span>
          </div>
        </div>
      </header>
      <main>
        <section className="shelf" aria-label="Calendrier de l’Avent" aria-busy="true" />
      </main>
    </div>
  );
}

export default function Calendar({ shelf, todayN, status, msToMidnight }: Props) {
  const router = useRouter();
  const { opened } = useAvent();
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

  return (
    <>
      <div className="wrap">
        <header className="top">
          <div>
            <h1>L’Avent torréfié</h1>
            <p className="lede">{LEDE}</p>
            <div className="status">
              <span className="dot" />
              <span>{statusText(status, opened)}</span>
            </div>
          </div>
          <div className="trial">
            <button className="slot" type="button" aria-label="Ouvrir le sachet d’essai" onClick={(e) => open(0, false, e)}>
              <Bag n={0} tilt={-3} />
            </button>
            <small>Sachet d’essai, pour voir l’animation</small>
          </div>
        </header>

        <main>
          <section className="shelf" aria-label="Calendrier de l’Avent">
            {shelf.map(({ n, locked, origin }, i) => {
              const isOpen = !locked && opened.includes(n);
              const isToday = n === todayN && !isOpen;
              const label = locked
                ? `Sachet ${n}, verrouillé jusqu’au ${dayLabel(n)} décembre`
                : isOpen
                  ? `Sachet ${n}, ouvert : revoir la fiche`
                  : `Ouvrir le sachet ${n}`;
              return (
                <button
                  key={n}
                  type="button"
                  className={isToday ? "slot today" : "slot"}
                  aria-label={label}
                  onClick={(e) => open(n, locked, e)}
                  onAnimationEnd={(e) => e.currentTarget.classList.remove("shake")}
                >
                  {isToday && <span className="tag">Aujourd’hui</span>}
                  <Bag
                    n={n}
                    locked={locked}
                    torn={isOpen}
                    origin={isOpen ? origin : undefined}
                    tilt={TILTS[i % TILTS.length]}
                  />
                </button>
              );
            })}
          </section>
        </main>
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
