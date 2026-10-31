"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Bag from "./Bag";
import Sheet, { type ProfileMode } from "./Sheet";
import { markOpened } from "@/lib/storage";
import type { DayCard } from "@/lib/types";

export type LoadResult = { ok: true; card: DayCard } | { ok: false; reason: "locked" | "error" };

/** Fiche du jour n. Le serveur reste seul juge : 403 si le jour n’est pas encore arrivé. */
export async function fetchDay(n: number): Promise<LoadResult> {
  try {
    const res = await fetch(`/api/day/${n}`, { cache: "no-store" });
    if (res.status === 403) return { ok: false, reason: "locked" };
    if (!res.ok) return { ok: false, reason: "error" };
    return { ok: true, card: (await res.json()) as DayCard };
  } catch {
    return { ok: false, reason: "error" };
  }
}

type Phase = "idle" | "charging" | "tearing" | "revealed";

type Props = {
  n: number;
  /** Sachet déjà ouvert : fiche directe, sans animation. */
  already: boolean;
  /** Requête lancée dès le clic sur l’étagère, en parallèle de l’animation. */
  load: Promise<LoadResult>;
  onClose: () => void;
  onLocked: () => void;
};

// Poussière de café autour du sachet (positions fixes : rendu identique à chaque ouverture).
const DUST = [
  [8, 14, 0], [18, 11, 3.1], [27, 16, 6.2], [36, 12, 1.4], [44, 15, 8.1], [53, 13, 4.4],
  [61, 17, 2.2], [69, 12, 7.3], [77, 15, 0.8], [85, 13, 5.6], [92, 16, 3.7], [12, 18, 9.2],
  [48, 19, 10.4], [73, 18, 11.1],
] as const;

const SHAKE: Keyframe[] = [
  { transform: "rotate(0)" },
  { transform: "rotate(-3deg)" },
  { transform: "rotate(3deg)" },
  { transform: "rotate(-2deg)" },
  { transform: "rotate(0)" },
];

// Micro-vibration de « charge » (gil2) tant que la fiche n’est pas arrivée.
const JITTER: Keyframe[] = [
  { transform: "translate(-1.5px, .5px) rotate(-.5deg)" },
  { transform: "translate(1.5px, -.5px) rotate(.5deg)" },
];

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function OpeningStage({ n, already, load, onClose, onLocked }: Props) {
  const [reduced] = useState(prefersReducedMotion);
  const direct = already || reduced;
  const [phase, setPhase] = useState<Phase>(direct ? "revealed" : "idle");
  const [profile, setProfile] = useState<ProfileMode>(direct ? "instant" : "empty");
  const [card, setCard] = useState<DayCard | null>(null);
  const [error, setError] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const bagRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const sheetWrapRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>(phase);
  const timers = useRef<number[]>([]);
  const loadRef = useRef(load);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // Ouverture du dialog modal et réception de la fiche.
  useEffect(() => {
    const dlg = dialogRef.current!;
    if (!dlg.open) dlg.showModal();
    if (!direct) bagRef.current?.focus();
    let alive = true;
    load.then((res) => {
      if (!alive) return;
      if (res.ok) {
        setCard(res.card);
        if (direct && !already) markOpened(n);
      } else if (res.reason === "locked") {
        onLocked();
      } else {
        setError(true);
      }
    });
    const pending = timers.current;
    return () => {
      alive = false;
      pending.forEach(clearTimeout);
    };
    // Une seule fois par ouverture : le composant est remonté pour chaque sachet (key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inclinaison au pointeur + reflet (gil2), uniquement souris/trackpad.
  const tilting = phase === "idle" || phase === "charging";
  useEffect(() => {
    const el = tiltRef.current;
    if (!tilting || reduced || !el || !window.matchMedia("(pointer: fine)").matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, last = performance.now(), raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => { tx = 0; ty = 0; };
    const loop = (t: number) => {
      // Amortissement exponentiel : mouvement fluide quel que soit le taux de rafraîchissement.
      const k = 1 - Math.exp(-6 * Math.min(0.05, (t - last) / 1000));
      last = t;
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      el.style.transform = `rotateY(${(cx * 9).toFixed(2)}deg) rotateX(${(-cy * 4).toFixed(2)}deg)`;
      el.style.setProperty("--mx", `${(50 + cx * 50).toFixed(1)}%`);
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      el.style.transform = "";
    };
  }, [tilting, reduced]);

  const burstBeans = useCallback((bag: HTMLElement, fx: HTMLElement) => {
    const br = bag.getBoundingClientRect();
    // Amplitudes de la maquette (sachet de 300 px) mises à l’échelle du sachet plein écran.
    const s = br.width / 300;
    const cx = br.left + br.width / 2;
    const cy = br.top + br.height * 0.14;
    for (let i = 0; i < 26; i++) {
      const b = document.createElement("span");
      b.className = "bean";
      b.style.left = `${cx - 8 + (Math.random() - 0.5) * br.width * 0.5}px`;
      b.style.top = `${cy - 11}px`;
      fx.appendChild(b);
      const dx = (Math.random() - 0.5) * 360 * s;
      const up = (120 + Math.random() * 170) * s;
      const fall = (260 + Math.random() * 220) * s;
      const r = (Math.random() - 0.5) * 720;
      const sc = Math.max(1, s * 0.9);
      b.animate(
        [
          { transform: "translate(0,0) rotate(0) scale(.6)", opacity: 0 },
          { transform: `translate(${dx * 0.5}px,${-up}px) rotate(${r / 2}deg) scale(${sc})`, opacity: 1, offset: 0.4 },
          { transform: `translate(${dx}px,${fall}px) rotate(${r}deg) scale(${sc})`, opacity: 0 },
        ],
        { duration: 1300 + Math.random() * 500, delay: Math.random() * 160, easing: "cubic-bezier(.3,.6,.5,1)", fill: "forwards" },
      ).onfinish = () => b.remove();
    }
  }, []);

  // Séquence tear() de la maquette, à partir de l’étape 2 (le tremblement est déjà joué).
  const tear = useCallback(() => {
    const bag = bagRef.current;
    const fx = fxRef.current;
    const seal = bag?.querySelector<HTMLElement>(".bag-seal");
    if (!bag || !fx || !seal) {
      setPhase("revealed");
      setProfile("instant");
      return;
    }
    phaseRef.current = "tearing";
    setPhase("tearing");

    // 2. La bande du haut s’arrache, pivote sur son coin droit et s’envole en haut à droite.
    const sr = seal.getBoundingClientRect();
    const fly = seal.cloneNode(true) as HTMLElement;
    fly.className = "bag-seal seal-fly";
    Object.assign(fly.style, { left: `${sr.left}px`, top: `${sr.top}px`, width: `${sr.width}px`, height: `${sr.height}px` });
    fx.appendChild(fly);
    bag.classList.add("torn");
    fly.animate(
      [
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${sr.width * 0.06}px,${-sr.height * 0.5}px) rotate(-12deg)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${sr.width * 0.25}px,${-sr.height * 1.5}px) rotate(-40deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${sr.width * 0.45}px,${-sr.height * 2.2}px) rotate(-75deg)`, opacity: 0 },
      ],
      { duration: 900, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" },
    ).onfinish = () => fly.remove();

    // Flash chaud à l’ouverture (gil2).
    const flash = document.createElement("div");
    flash.className = "flash";
    const size = sr.width * 0.9;
    Object.assign(flash.style, {
      left: `${sr.left + sr.width / 2 - size / 2}px`,
      top: `${sr.bottom - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
    });
    fx.appendChild(flash);
    flash.animate(
      [
        { transform: "scale(.5)", opacity: 0.95 },
        { transform: "scale(2.6)", opacity: 0.7, offset: 0.4 },
        { transform: "scale(4.1)", opacity: 0 },
      ],
      { duration: 700, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" },
    ).onfinish = () => flash.remove();

    // 3. Les grains jaillissent.
    burstBeans(bag, fx);

    // 4. À 1350 ms du toucher : le sachet s’enfonce, la fiche jaillit puis vient vers l’écran.
    later(() => {
      const br = bag.getBoundingClientRect();
      bag.animate(
        [
          { transform: "translateY(0)", opacity: 1 },
          { transform: `translateY(${Math.round(br.height * 0.35)}px) scale(.9)`, opacity: 0 },
        ],
        { duration: 500, easing: "ease-in", fill: "forwards" },
      );
      shadowRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" });

      const wrap = sheetWrapRef.current;
      if (wrap) {
        const wr = wrap.getBoundingClientRect();
        const start = br.top + br.height * 0.3 - wr.top;
        const peak = Math.max(br.top - br.height * 0.3 - wr.top, 16 - wr.top);
        wrap.style.visibility = "visible";
        wrap.animate(
          [
            { transform: `translateY(${start}px) scale(.42) rotateX(14deg)`, opacity: 0 },
            { transform: `translateY(${peak}px) scale(.5) rotateY(-10deg)`, opacity: 1, offset: 0.35 },
            { transform: "translateY(0) scale(1) rotateY(0)", opacity: 1 },
          ],
          { duration: 950, easing: "cubic-bezier(.2,.8,.2,1)" },
        );
      }
      // 5. Le sachet disparaît, les grains du profil se remplissent un par un.
      later(() => {
        phaseRef.current = "revealed";
        setPhase("revealed");
        setProfile("animate");
      }, 520);
    }, 930);
  }, [burstBeans]);

  const tap = useCallback(async () => {
    const bag = bagRef.current;
    if (phaseRef.current !== "idle" || !bag) return;
    phaseRef.current = "charging";
    setPhase("charging");
    if (error) {
      // Nouvel essai après une erreur réseau : nouvelle requête.
      loadRef.current = fetchDay(n);
      setError(false);
    }

    // 1. Le sachet tremble (420 ms), puis vibre tant que la fiche n’est pas arrivée.
    const shake = bag.animate(SHAKE, { duration: 420 });
    let jitter: Animation | null = null;
    const t = window.setTimeout(() => {
      jitter = bag.animate(JITTER, { duration: 110, iterations: Infinity, direction: "alternate" });
    }, 420);
    const [res] = await Promise.all([loadRef.current, shake.finished.catch(() => undefined)]);
    clearTimeout(t);
    (jitter as Animation | null)?.cancel();
    if (!dialogRef.current?.open) return;

    if (!res.ok) {
      phaseRef.current = "idle";
      setPhase("idle");
      if (res.reason === "locked") onLocked();
      else setError(true);
      return;
    }
    setCard(res.card);
    markOpened(n);
    tear();
  }, [error, n, onLocked, tear]);

  const onBagKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tap();
    }
  };

  const showBag = phase !== "revealed";

  return (
    <dialog
      ref={dialogRef}
      className={`opening ${phase}`}
      aria-label="Sachet du jour"
      onClose={onClose}
    >
      <div className="rays" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />
      {/* Hors de .scene : la perspective de la scène piégerait le position:fixed au défilement. */}
      <button className="close" type="button" aria-label="Fermer" onClick={() => dialogRef.current?.close()}>
        ×
      </button>
      <div className="scene" ref={sceneRef}>
        {/* Sous le sachet et la fiche : les grains semblent sortir de l’intérieur du sachet. */}
        <div className="fx" ref={fxRef} aria-hidden="true" />

        {showBag && (
          <div className="bag-zone">
            {!reduced && (
              <div className="dust" aria-hidden="true">
                {DUST.map(([x, dur, delay], i) => (
                  <span
                    key={i}
                    style={{ left: `${x}%`, animationDuration: `${dur}s`, animationDelay: `-${delay}s` } as CSSProperties}
                  />
                ))}
              </div>
            )}
            <div className="bag-float">
              <div className="bag-tilt" ref={tiltRef}>
                <div
                  className="bag-hit"
                  role="button"
                  tabIndex={0}
                  aria-label="Déchirer le sachet"
                  onClick={tap}
                  onKeyDown={onBagKey}
                >
                  <Bag ref={bagRef} n={n} torn={phase === "tearing"} sheen />
                </div>
              </div>
            </div>
            <div className="bag-shadow" ref={shadowRef} aria-hidden="true" />
            <p className="hint">
              {error ? "Impossible de charger la fiche. Vérifie ta connexion, puis touche à nouveau le sachet." : "Touche le sachet pour le déchirer"}
            </p>
          </div>
        )}

        <div ref={sheetWrapRef} className={phase === "revealed" ? "sheet-wrap show" : "sheet-wrap"}>
          {card ? (
            <Sheet card={card} profile={profile} />
          ) : (
            phase === "revealed" && (
              <p className="hint" role="status">
                {error ? "Impossible de charger la fiche. Vérifie ta connexion, puis rouvre le sachet." : "Chargement…"}
              </p>
            )
          )}
        </div>
      </div>
    </dialog>
  );
}
