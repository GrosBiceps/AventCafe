"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Pouch from "./Pouch";
import Sheet, { type ProfileMode } from "./Sheet";
import type { SceneMode } from "./PouchScene";
import { markOpened } from "@/lib/storage";
import type { DayCard } from "@/lib/types";

// three.js n’est téléchargé qu’à l’ouverture d’un sachet : l’accueil reste léger.
const loadScene = () => import("./PouchScene");
const PouchScene = dynamic(loadScene, { ssr: false });

/** Précharge la scène dès que le doigt touche un sachet : gagne le temps du clic. */
export function preloadScene(): void {
  void loadScene();
}

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

type Phase = SceneMode | "revealed";

type Props = {
  n: number;
  /** Sachet déjà ouvert : fiche directe, sans animation. */
  already: boolean;
  /** Requête lancée dès le clic sur l’étagère, en parallèle de l’animation. */
  load: Promise<LoadResult>;
  onClose: () => void;
  onLocked: () => void;
};

function canAnimate(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    // Libère tout de suite ce contexte de test : iOS limite le nombre de contextes WebGL.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Si la 3D plante (WebGL refusé, mémoire), l’ouverture continue avec le sachet 2D. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function OpeningStage({ n, already, load, onClose, onLocked }: Props) {
  // Sans WebGL ou avec mouvement réduit : fiche directe, comme un sachet déjà ouvert.
  const [animated] = useState(() => !already && canAnimate());
  // Dev uniquement : ?freeze=0.6 fige la déchirure à 0,6 s pour régler l’animation image par image.
  const [freezeAt] = useState(() => {
    if (process.env.NODE_ENV === "production") return undefined;
    const v = new URLSearchParams(window.location.search).get("freeze");
    return v === null ? undefined : Number(v);
  });
  const [phase, setPhase] = useState<Phase>(animated ? "idle" : "revealed");
  const [profile, setProfile] = useState<ProfileMode>(animated ? "empty" : "instant");
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneGone, setSceneGone] = useState(false);
  const [card, setCard] = useState<DayCard | null>(null);
  const [error, setError] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const phaseRef = useRef<Phase>(phase);
  const loadRef = useRef(load);
  const sceneOk = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const dlg = dialogRef.current!;
    if (!dlg.open) dlg.showModal();
    if (animated) hitRef.current?.focus();
    let alive = true;
    load.then((res) => {
      if (!alive) return;
      if (res.ok) {
        setCard(res.card);
        if (!animated && !already) markOpened(n);
      } else if (res.reason === "locked") {
        onLocked();
      } else {
        setError(true);
      }
    });
    return () => {
      alive = false;
    };
    // Une seule fois par ouverture : le composant est remonté pour chaque sachet (key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSceneReady = useCallback(() => {
    sceneOk.current = true;
    setSceneReady(true);
  }, []);

  const onSceneFail = useCallback(() => {
    sceneOk.current = false;
    setSceneFailed(true);
  }, []);

  // La carte 3D est face à l’écran (ou la 3D a échoué) : la fiche HTML prend le relais.
  const onOpened = useCallback(() => {
    if (phaseRef.current === "revealed") return;
    phaseRef.current = "revealed";
    setPhase("revealed");
    requestAnimationFrame(() => {
      sheetRef.current?.animate(
        [
          { transform: "translateY(24px) scale(.82)", opacity: 0 },
          { transform: "translateY(0) scale(1)", opacity: 1 },
        ],
        { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
      window.setTimeout(() => setProfile("animate"), 260);
      // Fondu terminé : on libère le contexte WebGL.
      window.setTimeout(() => setSceneGone(true), 700);
    });
  }, []);

  const tap = useCallback(async () => {
    if (phaseRef.current !== "idle") return;
    phaseRef.current = "charging";
    setPhase("charging");
    if (error) {
      // Nouvel essai après une erreur réseau : nouvelle requête.
      loadRef.current = fetchDay(n);
      setError(false);
    }
    // Charge lumineuse au moins 420 ms, prolongée tant que la fiche n’est pas arrivée.
    const [res] = await Promise.all([loadRef.current, wait(420)]);
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
    phaseRef.current = "tearing";
    setPhase("tearing");
    // Ouverture garantie : sans 3D prête, fiche directe ; sinon filet de sécurité si la scène
    // n’annonce pas la fin (téléphone lent, contexte WebGL perdu).
    timers.current.push(window.setTimeout(onOpened, sceneOk.current ? 2600 : 150));
  }, [error, n, onLocked, onOpened]);

  const revealed = phase === "revealed";
  const sceneMode: SceneMode = revealed ? "tearing" : phase;

  return (
    <dialog ref={dialogRef} className={`opening ${phase}`} aria-label="Sachet du jour" onClose={onClose}>
      <div className="rays" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />
      <button className="close" type="button" aria-label="Fermer" onClick={() => dialogRef.current?.close()}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div className="scene" ref={stageRef}>
        {animated && !sceneGone && !sceneFailed && (
          <div className={sceneReady ? "stage3d ready" : "stage3d"} aria-hidden="true">
            <SceneBoundary onError={onSceneFail}>
              <PouchScene
                n={n}
                mode={sceneMode}
                onReady={onSceneReady}
                onOpened={onOpened}
                onFail={onSceneFail}
                eventSource={stageRef}
                freezeAt={freezeAt}
              />
            </SceneBoundary>
          </div>
        )}
        {animated && !revealed && (
          <>
            {/* Sachet 2D identique, affiché pendant le chargement de la 3D ou à sa place si elle échoue. */}
            {(!sceneReady || sceneFailed) && (
              <div className="stage-placeholder" aria-hidden="true">
                <Pouch n={n} />
              </div>
            )}
            <button
              ref={hitRef}
              type="button"
              className="stage-hit"
              aria-label="Déchirer le sachet"
              onClick={tap}
            />
            <p className="stage-hint" role="status">
              {error
                ? "Impossible de charger la fiche. Vérifie ta connexion, puis touche à nouveau le sachet."
                : phase === "idle"
                  ? "Touche le sachet pour le déchirer"
                  : ""}
            </p>
          </>
        )}

        <div ref={sheetRef} className={revealed ? "sheet-wrap show" : "sheet-wrap"}>
          {card ? (
            <Sheet card={card} profile={profile} />
          ) : (
            revealed && (
              <p className="stage-hint" role="status">
                {error ? "Impossible de charger la fiche. Vérifie ta connexion, puis rouvre le sachet." : "Chargement…"}
              </p>
            )
          )}
        </div>
      </div>
    </dialog>
  );
}
