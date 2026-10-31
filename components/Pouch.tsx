import { memo, type CSSProperties, type Ref } from "react";

// Sachet doypack kraft à fond plat en SVG (étagère et attente du rendu 3D).
// Même direction artistique que la texture du sachet 3D (PouchScene).
// Performances : aucune ombre CSS ni filtre SVG, tout est peint par dégradés (24 sachets à l’écran).

type PouchProps = {
  n: number;
  locked?: boolean;
  torn?: boolean;
  origin?: string;
  tilt?: number;
  ref?: Ref<SVGSVGElement>;
};

/** Définitions partagées (dégradés, motifs), rendues une seule fois par page. */
export function PouchDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pk-kraft" x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor="#D8B48B" />
          <stop offset=".55" stopColor="#C49A6E" />
          <stop offset="1" stopColor="#A97D53" />
        </linearGradient>
        {/* Sachet à venir : kraft grisé, sans filtre SVG coûteux. */}
        <linearGradient id="pk-kraft-locked" x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor="#C2B5A5" />
          <stop offset=".55" stopColor="#AD9F8F" />
          <stop offset="1" stopColor="#968878" />
        </linearGradient>
        {/* Volume du film : flancs sombres, deux reflets verticaux comme sur un vrai doypack. */}
        <linearGradient id="pk-volume" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".26" />
          <stop offset=".06" stopColor="#000" stopOpacity=".06" />
          <stop offset=".2" stopColor="#fff" stopOpacity=".2" />
          <stop offset=".33" stopColor="#fff" stopOpacity=".03" />
          <stop offset=".52" stopColor="#000" stopOpacity=".02" />
          <stop offset=".7" stopColor="#fff" stopOpacity=".12" />
          <stop offset=".84" stopColor="#000" stopOpacity=".04" />
          <stop offset=".95" stopColor="#000" stopOpacity=".14" />
          <stop offset="1" stopColor="#000" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id="pk-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".1" />
          <stop offset=".25" stopColor="#fff" stopOpacity="0" />
          <stop offset=".8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
        <linearGradient id="pk-crease-light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pk-crease-dark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset=".5" stopColor="#000" stopOpacity=".16" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <pattern id="pk-heat" width="4" height="3" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#000" opacity=".1" />
        </pattern>
        <pattern id="pk-speckle" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="7" r=".7" fill="#5A3A1E" opacity=".3" />
          <circle cx="23" cy="4" r=".5" fill="#5A3A1E" opacity=".25" />
          <circle cx="33" cy="15" r=".6" fill="#fff" opacity=".35" />
          <circle cx="12" cy="22" r=".5" fill="#5A3A1E" opacity=".3" />
          <circle cx="28" cy="30" r=".7" fill="#5A3A1E" opacity=".22" />
          <circle cx="4" cy="34" r=".5" fill="#fff" opacity=".3" />
          <circle cx="37" cy="37" r=".5" fill="#5A3A1E" opacity=".28" />
        </pattern>
        <radialGradient id="pk-shadow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#2A1A0C" stopOpacity=".38" />
          <stop offset="1" stopColor="#2A1A0C" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pk-wax" cx=".35" cy=".3" r=".75">
          <stop offset="0" stopColor="#CF5A43" />
          <stop offset=".75" stopColor="#8F2E1F" />
        </radialGradient>
        <radialGradient id="pk-bean" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#7A4A2A" />
          <stop offset="1" stopColor="#2E190D" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Flancs droits légèrement bombés, fond plat (sachet debout sur son soufflet).
const SIDES = "C246 120 248 240 246 352 L246 364 Q246 370 240 370 L20 370 Q14 370 14 364 L14 352 C12 240 14 120 20 ";
const SEALED = `M22 14 L238 14 L240 54 ${SIDES}54 Z`;
const TORN =
  "M20 60 L31 55 L43 61 L55 56 L67 62 L80 55 L93 60 L106 54 L119 61 L132 56 L146 62 L159 55 L172 60 L186 54 L199 61 L212 56 L226 62 L240 57 " +
  `L240 60 ${SIDES}60 Z`;
const SEAL = "M22 14 L238 14 L240 54 L20 54 Z";

function originFit(origin: string) {
  // Les origines longues (« Brésil, Guatemala, Pérou ») sont compressées pour tenir sur l’étiquette.
  return origin.length > 14 ? { textLength: 146, lengthAdjust: "spacingAndGlyphs" as const, fontSize: 15 } : { fontSize: 18 };
}

function Pouch({ n, locked, torn, origin, tilt = 0, ref }: PouchProps) {
  const cls = ["pouch", locked && "locked", torn && "torn"].filter(Boolean).join(" ");
  const body = torn ? TORN : SEALED;
  const shown = origin || "?";
  return (
    <svg
      ref={ref}
      className={cls}
      viewBox="0 0 260 392"
      style={{ "--tilt": `${tilt}deg` } as CSSProperties}
      aria-hidden="true"
      focusable="false"
    >
      {/* Ombre portée peinte : bien moins coûteuse qu’un filter: drop-shadow. */}
      <ellipse cx="130" cy="374" rx="132" ry="14" fill="url(#pk-shadow)" />
      <path d={body} fill={locked ? "url(#pk-kraft-locked)" : "url(#pk-kraft)"} />
      <path d={body} fill="url(#pk-speckle)" />

      {!torn && (
        <g>
          <path d={SEAL} fill="#000" opacity=".1" />
          <path d={SEAL} fill="url(#pk-heat)" />
          {/* Encoches de déchirure. */}
          <path d="M20 40 l7 4 l-7 4 Z M240 40 l-7 4 l7 4 Z" fill="#3B2412" opacity=".5" />
        </g>
      )}
      {torn && (
        <g>
          <path d="M22 60 Q130 72 238 60 Q130 66 22 60 Z" fill="#24150B" />
          <ellipse cx="98" cy="60" rx="8" ry="5.5" fill="url(#pk-bean)" transform="rotate(-20 98 60)" />
          <ellipse cx="121" cy="62" rx="8" ry="5.5" fill="url(#pk-bean)" transform="rotate(15 121 62)" />
          <ellipse cx="146" cy="62" rx="8" ry="5.5" fill="url(#pk-bean)" transform="rotate(-8 146 62)" />
          <ellipse cx="168" cy="60" rx="8" ry="5.5" fill="url(#pk-bean)" transform="rotate(25 168 60)" />
        </g>
      )}

      {/* Zip refermable. */}
      <path d="M22 72 H238" stroke="#4A2E17" strokeOpacity=".3" strokeWidth="2" />
      <path d="M22 75 H238" stroke="#fff" strokeOpacity=".25" />
      {/* Valve de dégazage, centrée comme sur les sachets de café. */}
      <circle cx="130" cy="102" r="11" fill="#000" opacity=".08" />
      <circle cx="130" cy="102" r="9" fill="none" stroke="#5A3A1E" strokeOpacity=".45" strokeWidth="1.5" />
      <circle cx="130" cy="102" r="4.5" fill="none" stroke="#5A3A1E" strokeOpacity=".35" />

      {/* Plis et volume du film. */}
      <path d="M44 80 C58 160 46 250 64 352 L74 352 C58 250 70 160 56 80 Z" fill="url(#pk-crease-light)" />
      <path d="M176 84 C190 170 172 260 186 352 L194 352 C182 260 200 170 186 84 Z" fill="url(#pk-crease-light)" opacity=".7" />
      <path d="M206 80 C196 170 214 260 204 352 L212 352 C222 260 204 170 214 80 Z" fill="url(#pk-crease-dark)" />
      <path d={body} fill="url(#pk-volume)" />
      <path d={body} fill="url(#pk-depth)" />
      {/* Soudure et soufflet du fond. */}
      <path d="M16 344 Q130 356 244 344" fill="none" stroke="#000" strokeOpacity=".14" strokeWidth="1.5" />
      <path d="M16 347 Q130 359 244 347" fill="none" stroke="#fff" strokeOpacity=".16" />

      <g className="pouch-label">
        <rect x="50" y="134" width="160" height="186" rx="6" fill="var(--paper)" />
        <clipPath id={`pk-lc-${n}`}>
          <rect x="50" y="134" width="160" height="186" rx="6" />
        </clipPath>
        <g clipPath={`url(#pk-lc-${n})`}>
          <path d="M50 162 L78 134 H92 L50 176 Z" fill="var(--label-red)" />
          <path d="M50 182 L98 134 H106 L50 190 Z" fill="var(--label-green)" />
          <path d="M210 162 L182 134 H168 L210 176 Z" fill="var(--label-red)" />
          <path d="M210 182 L162 134 H154 L210 190 Z" fill="var(--label-green)" />
        </g>
        <rect x="50" y="134" width="160" height="186" rx="6" fill="none" stroke="var(--label-green)" strokeWidth="4" />
        <rect x="58" y="142" width="144" height="170" rx="3" fill="none" stroke="var(--label-green)" strokeOpacity=".35" />
        <text x="130" y="176" className="pk-brand">L’AVENT TORRÉFIÉ</text>
        <text x="130" y={n === 0 ? 240 : 252} className="pk-num" style={n === 0 ? { fontSize: 44 } : undefined}>
          {n === 0 ? "Essai" : n}
        </text>
        <path d="M112 268 H148" stroke="var(--label-green)" strokeOpacity=".5" />
        <text x="130" y="286" className="pk-kind">ORIGINE</text>
        <text x="130" y="306" className="pk-origin" {...originFit(shown)}>
          {shown}
        </text>
      </g>

      {locked && (
        <g>
          <circle cx="212" cy="330" r="27" fill="url(#pk-wax)" />
          <circle cx="212" cy="330" r="21" fill="none" stroke="#000" strokeOpacity=".18" strokeWidth="2" />
          <text x="212" y="329" className="pk-wax-n">{n}</text>
          <text x="212" y="343" className="pk-wax-m">déc.</text>
        </g>
      )}
    </svg>
  );
}

// Mémoïsé : taper une note ne doit pas redessiner les 24 sachets.
export default memo(Pouch);
