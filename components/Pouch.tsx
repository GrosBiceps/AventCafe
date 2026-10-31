import type { CSSProperties, Ref } from "react";

// Sachet doypack kraft en SVG (étagère et attente du rendu 3D).
// Même direction artistique que la texture du sachet 3D (PouchScene).

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
        <linearGradient id="pk-kraft" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D2AD84" />
          <stop offset=".55" stopColor="#BC9065" />
          <stop offset="1" stopColor="#9C7048" />
        </linearGradient>
        <linearGradient id="pk-seal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A87C52" />
          <stop offset="1" stopColor="#B88B5F" />
        </linearGradient>
        {/* Volume : lumière à gauche, ombre à droite, fond plus sombre (soufflet). */}
        <linearGradient id="pk-volume" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".12" stopColor="#fff" stopOpacity=".05" />
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset=".9" stopColor="#000" stopOpacity=".16" />
          <stop offset="1" stopColor="#000" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id="pk-bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
        <pattern id="pk-crimp" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="1.4" height="4" fill="#000" opacity=".16" />
        </pattern>
        <pattern id="pk-fiber" width="38" height="38" patternUnits="userSpaceOnUse">
          <path d="M3 5h9M20 2h6M30 11h7M8 17h5M17 24h9M2 31h6M27 33h8M33 22h4" stroke="#5A3A1E" strokeWidth=".8" opacity=".14" />
          <circle cx="14" cy="9" r=".9" fill="#5A3A1E" opacity=".18" />
          <circle cx="31" cy="28" r=".7" fill="#5A3A1E" opacity=".18" />
          <circle cx="6" cy="25" r=".6" fill="#fff" opacity=".25" />
        </pattern>
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

const SEALED_TOP = "M16 22 L244 22 L246 60";
// Bord déchiré, irrégulier, juste sous l’ancienne soudure.
const TORN_TOP =
  "M15 66 L26 61 L37 67 L49 62 L60 68 L73 61 L86 66 L98 60 L112 67 L125 62 L139 68 L152 61 L166 66 L179 60 L192 67 L205 62 L219 68 L232 61 L245 66";
const SIDES =
  "C250 150 251 250 246 330 C244 356 232 368 206 370 L54 370 C28 368 16 356 14 330 C9 250 10 150 14 60 Z";

function bodyPath(torn: boolean): string {
  return torn ? `${TORN_TOP} ${SIDES.replace("C250 150", "L246 66 C250 150")}` : `${SEALED_TOP} ${SIDES}`;
}

// Soudure crantée du haut.
const SEAL_PATH = (() => {
  let d = "M16 28";
  for (let x = 16; x < 244; x += 8) d += ` L${x + 4} 22 L${x + 8} 28`;
  return `${d} L244 60 L16 60 Z`;
})();

function originFit(origin: string) {
  // Les origines longues (« Brésil, Guatemala, Pérou ») sont compressées pour tenir sur l’étiquette.
  return origin.length > 14 ? { textLength: 146, lengthAdjust: "spacingAndGlyphs" as const, fontSize: 15 } : { fontSize: 18 };
}

export default function Pouch({ n, locked, torn, origin, tilt = 0, ref }: PouchProps) {
  const cls = ["pouch", locked && "locked", torn && "torn"].filter(Boolean).join(" ");
  const body = bodyPath(Boolean(torn));
  const shown = origin || "?";
  return (
    <svg
      ref={ref}
      className={cls}
      viewBox="0 0 260 380"
      style={{ "--tilt": `${tilt}deg` } as CSSProperties}
      aria-hidden="true"
      focusable="false"
    >
      <g className="pouch-paper">
        <path d={body} fill="url(#pk-kraft)" />
        <path d={body} fill="url(#pk-fiber)" />
        {!torn && (
          <g className="pouch-seal">
            <path d={SEAL_PATH} fill="url(#pk-seal)" />
            <path d={SEAL_PATH} fill="url(#pk-crimp)" />
            {/* Encoches de déchirure. */}
            <path d="M14 63 l8 4 l-8 4 Z M246 63 l-8 4 l8 4 Z" fill="#3B2412" opacity=".55" />
            <path d="M24 67 H236" stroke="#3B2412" strokeOpacity=".25" strokeDasharray="5 4" />
          </g>
        )}
        {torn && (
          <g>
            <ellipse cx="130" cy="66" rx="113" ry="8" fill="#24150B" />
            <ellipse cx="96" cy="63" rx="9" ry="6" fill="url(#pk-bean)" transform="rotate(-20 96 63)" />
            <ellipse cx="118" cy="61" rx="9" ry="6" fill="url(#pk-bean)" transform="rotate(15 118 61)" />
            <ellipse cx="146" cy="63" rx="9" ry="6" fill="url(#pk-bean)" transform="rotate(-8 146 63)" />
            <ellipse cx="170" cy="62" rx="9" ry="6" fill="url(#pk-bean)" transform="rotate(25 170 62)" />
          </g>
        )}
        {/* Zip refermable. */}
        <path d="M20 82 H240" stroke="#4A2E17" strokeOpacity=".28" strokeWidth="2" />
        <path d="M20 85 H240" stroke="#fff" strokeOpacity=".22" />
        {/* Valve de dégazage. */}
        <circle cx="208" cy="112" r="11" fill="#2B2119" opacity=".88" />
        <circle cx="208" cy="112" r="6.5" fill="none" stroke="#fff" strokeOpacity=".25" />
        <circle cx="208" cy="112" r="1.8" fill="#fff" opacity=".35" />
        <path d={body} fill="url(#pk-volume)" />
        <path d={body} fill="url(#pk-bottom)" />
        <path d="M30 346 Q130 364 230 346" fill="none" stroke="#000" strokeOpacity=".16" strokeWidth="1.5" />
      </g>

      <g className="pouch-label">
        <rect x="50" y="130" width="160" height="190" rx="6" fill="var(--paper)" />
        <clipPath id={`pk-lc-${n}`}>
          <rect x="50" y="130" width="160" height="190" rx="6" />
        </clipPath>
        <g clipPath={`url(#pk-lc-${n})`}>
          <path d="M50 158 L78 130 H92 L50 172 Z" fill="var(--label-red)" />
          <path d="M50 178 L98 130 H106 L50 186 Z" fill="var(--label-green)" />
          <path d="M210 158 L182 130 H168 L210 172 Z" fill="var(--label-red)" />
          <path d="M210 178 L162 130 H154 L210 186 Z" fill="var(--label-green)" />
        </g>
        <rect x="50" y="130" width="160" height="190" rx="6" fill="none" stroke="var(--label-green)" strokeWidth="4" />
        <rect x="58" y="138" width="144" height="174" rx="3" fill="none" stroke="var(--label-green)" strokeOpacity=".35" />
        <text x="130" y="172" className="pk-brand">L’AVENT TORRÉFIÉ</text>
        <text x="130" y={n === 0 ? 236 : 248} className="pk-num" style={n === 0 ? { fontSize: 44 } : undefined}>
          {n === 0 ? "Essai" : n}
        </text>
        <path d="M112 264 H148" stroke="var(--label-green)" strokeOpacity=".5" />
        <text x="130" y="282" className="pk-kind">ORIGINE</text>
        <text x="130" y="304" className="pk-origin" {...originFit(shown)}>
          {shown}
        </text>
      </g>

      {locked && (
        <g className="pouch-wax">
          <circle cx="212" cy="328" r="27" fill="url(#pk-wax)" />
          <circle cx="212" cy="328" r="21" fill="none" stroke="#000" strokeOpacity=".18" strokeWidth="2" />
          <text x="212" y="327" className="pk-wax-n">{n}</text>
          <text x="212" y="341" className="pk-wax-m">déc.</text>
        </g>
      )}
    </svg>
  );
}
