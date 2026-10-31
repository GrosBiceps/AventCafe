import type { CSSProperties, Ref } from "react";

type BagProps = {
  n: number;
  locked?: boolean;
  torn?: boolean;
  origin?: string;
  tilt?: number;
  /** Reflet satiné qui suit le pointeur (scène d’ouverture). */
  sheen?: boolean;
  ref?: Ref<HTMLDivElement>;
};

// Sachet kraft dessiné en CSS, structure identique à bagHTML() de la maquette.
export default function Bag({ n, locked, torn, origin, tilt = 0, sheen, ref }: BagProps) {
  const cls = ["bag", torn && "torn", locked && "locked"].filter(Boolean).join(" ");
  return (
    <div ref={ref} className={cls} style={{ "--tilt": `${tilt}deg` } as CSSProperties}>
      <div className="bag-body">
        {sheen && <div className="bag-sheen" aria-hidden="true" />}
        <div className="label">
          <span className="ribbon r1" />
          <span className="ribbon r2" />
          <div className="label-brand">L’Avent torréfié</div>
          <div className="label-num" style={n === 0 ? { fontSize: "2.4em" } : undefined}>
            {n === 0 ? "Essai" : n}
          </div>
          <div className="label-kind">Origine</div>
          <div className="label-origin">{origin || "?"}</div>
        </div>
      </div>
      <div className="bag-seal" />
      {locked && (
        <div className="wax">
          {n}
          <br />
          déc.
        </div>
      )}
    </div>
  );
}
