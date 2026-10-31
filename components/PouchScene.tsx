"use client";

// Sachet doypack en 3D (three.js + react-three-fiber), chargé uniquement à l’ouverture d’un sachet.
// Mise en scène inspirée du booster de gil2-cards.com : inclinaison au pointeur, charge lumineuse,
// bande arrachée qui s’envole, flash, sachet qui tombe, carte qui sort puis vient vers l’écran.

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, Sparkles } from "@react-three/drei";
import * as THREE from "three";

export type SceneMode = "idle" | "charging" | "tearing";

type Props = {
  n: number;
  mode: SceneMode;
  onReady: () => void;
  /** Appelé quand la carte est arrivée face à l’écran : la fiche HTML prend le relais. */
  onOpened: () => void;
  eventSource: RefObject<HTMLElement | null>;
  /** Dev uniquement : fige la déchirure à w secondes (captures d’écran, réglages). */
  freezeAt?: number;
};

/* ---------- Géométrie (unités monde) ---------- */

const HW = 1.3; // demi-largeur
const Y_MIN = -1.9;
const Y_MAX = 1.9;
const TEAR_Y = 1.42; // ligne de déchirure
const TEX_W = 1024;
const TEX_H = Math.round((TEX_W * (Y_MAX - Y_MIN)) / (2 * HW));

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const damp = THREE.MathUtils.damp;

/** Gonflement du sachet : plat aux soudures (côtés, haut), plus ventru vers le soufflet du bas. */
function puff(x: number, y: number): number {
  const ux = clamp01(Math.abs(x) / (HW - 0.06));
  const across = Math.pow(Math.max(0, Math.cos((ux * Math.PI) / 2)), 0.6);
  const top = 1 - smooth(0.85, 1.32, y);
  const bottom = Math.sqrt(smooth(Y_MIN, Y_MIN + 0.45, y));
  const depth = 0.42 + 0.2 * clamp01((0.5 - y) / 2.4);
  return depth * across * top * bottom;
}

/** Silhouette doypack : flancs qui se resserrent légèrement en haut, coins du bas arrondis. */
function shapeX(x: number, y: number): number {
  const corner = 1 - smooth(Y_MIN, Y_MIN + 0.32, y);
  const edge = Math.pow(Math.abs(x) / HW, 4);
  const pinch = 1 - 0.035 * smooth(0.2, 1.3, y);
  return x * pinch * (1 - 0.12 * corner * edge);
}

/** Bas arrondi : les coins remontent un peu, comme un sachet posé sur son soufflet. */
function shapeY(x: number, y: number): number {
  const corner = 1 - smooth(Y_MIN, Y_MIN + 0.3, y);
  return y + 0.12 * corner * Math.pow(Math.abs(x) / HW, 3);
}

function panel(y0: number, y1: number, segX: number, segY: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(2 * HW, y1 - y0, segX, segY);
  g.translate(0, (y0 + y1) / 2, 0);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // UV calculés avant déformation : l’impression suit le papier.
    uv.setXY(i, (x + HW) / (2 * HW), (y - Y_MIN) / (Y_MAX - Y_MIN));
    pos.setXYZ(i, shapeX(x, y), shapeY(x, y), puff(x, y));
  }
  g.computeVertexNormals();
  return g;
}

/* ---------- Textures dessinées au canvas ---------- */

function fontVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Générateur pseudo-aléatoire déterministe : même grain de papier à chaque ouverture. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const wy = (y: number) => ((Y_MAX - y) / (Y_MAX - Y_MIN)) * TEX_H;
const wx = (x: number) => ((x + HW) / (2 * HW)) * TEX_W;

function kraft(ctx: CanvasRenderingContext2D, seed: number) {
  const g = ctx.createLinearGradient(0, 0, TEX_W, TEX_H);
  g.addColorStop(0, "#D2AD84");
  g.addColorStop(0.55, "#BC9065");
  g.addColorStop(1, "#A57A51");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  const r = rng(seed);
  // Fibres et mouchetures du papier kraft.
  for (let i = 0; i < 2600; i++) {
    const x = r() * TEX_W;
    const y = r() * TEX_H;
    const len = 4 + r() * 18;
    ctx.strokeStyle = r() < 0.75 ? `rgba(80,50,25,${0.05 + r() * 0.1})` : `rgba(255,240,220,${0.06 + r() * 0.1})`;
    ctx.lineWidth = 0.6 + r() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len * (r() - 0.5), y + len * (r() - 0.5) * 0.4);
    ctx.stroke();
  }
}

function seal(ctx: CanvasRenderingContext2D) {
  const top = 0;
  const bottom = wy(1.5);
  ctx.fillStyle = "rgba(90,55,25,0.22)";
  ctx.fillRect(0, top, TEX_W, bottom);
  ctx.fillStyle = "rgba(0,0,0,0.13)";
  for (let x = 0; x < TEX_W; x += 9) ctx.fillRect(x, top + 6, 3, bottom - 12);
  // Ligne pointillée et encoches de déchirure.
  const ty = wy(TEAR_Y);
  ctx.setLineDash([20, 14]);
  ctx.strokeStyle = "rgba(59,36,18,0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(40, ty);
  ctx.lineTo(TEX_W - 40, ty);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(40,22,10,0.7)";
  for (const [x, dir] of [[0, 1], [TEX_W, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, ty - 16);
    ctx.lineTo(x + 28 * dir, ty);
    ctx.lineTo(x, ty + 16);
    ctx.fill();
  }
  // Zip refermable.
  const zy = wy(1.24);
  ctx.fillStyle = "rgba(74,46,23,0.32)";
  ctx.fillRect(30, zy, TEX_W - 60, 7);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(30, zy + 9, TEX_W - 60, 3);
}

function frontTexture(n: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext("2d")!;
  const serif = fontVar("--font-zilla", "Georgia, serif");
  const sans = fontVar("--font-karla", "Arial, sans-serif");
  kraft(ctx, 7 + n);
  seal(ctx);

  // Valve de dégazage.
  const vx = wx(0.82);
  const vy = wy(0.98);
  ctx.fillStyle = "#2B2119";
  ctx.beginPath();
  ctx.arc(vx, vy, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(vx, vy, 24, 0, Math.PI * 2);
  ctx.stroke();

  // Étiquette crème bordée de vert sapin, rubans aux coins.
  const lx = wx(-0.82);
  const lw = wx(0.82) - lx;
  const ly = wy(0.66);
  const lh = wy(-1.28) - ly;
  ctx.save();
  ctx.shadowColor = "rgba(40,20,5,0.25)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "#FFFDF8";
  ctx.beginPath();
  ctx.roundRect(lx, ly, lw, lh, 18);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(lx, ly, lw, lh, 18);
  ctx.clip();
  const band = (x0: number, dir: 1 | -1, off: number, w: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0, ly + off);
    ctx.lineTo(x0 + dir * off, ly);
    ctx.lineTo(x0 + dir * (off + w), ly);
    ctx.lineTo(x0, ly + off + w);
    ctx.fill();
  };
  band(lx, 1, 90, 46, "#B4432F");
  band(lx, 1, 150, 26, "#1E4B3A");
  band(lx + lw, -1, 90, 46, "#B4432F");
  band(lx + lw, -1, 150, 26, "#1E4B3A");
  ctx.restore();
  ctx.strokeStyle = "#1E4B3A";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.roundRect(lx, ly, lw, lh, 18);
  ctx.stroke();
  ctx.strokeStyle = "rgba(30,75,58,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(lx + 24, ly + 24, lw - 48, lh - 48, 10);
  ctx.stroke();

  const cx = lx + lw / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = "#1E4B3A";
  ctx.font = `600 34px ${sans}`;
  ctx.letterSpacing = "6px";
  ctx.fillText("L’AVENT TORRÉFIÉ", cx, ly + 128);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#B4432F";
  ctx.font = n === 0 ? `700 150px ${serif}` : `700 250px ${serif}`;
  ctx.fillText(n === 0 ? "Essai" : String(n), cx, ly + (n === 0 ? 340 : 390));
  ctx.strokeStyle = "rgba(30,75,58,0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 60, ly + 450);
  ctx.lineTo(cx + 60, ly + 450);
  ctx.stroke();
  ctx.fillStyle = "#1E4B3A";
  ctx.font = `600 30px ${sans}`;
  ctx.letterSpacing = "8px";
  ctx.fillText("ORIGINE", cx, ly + 510);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#1C1A17";
  ctx.font = `700 64px ${serif}`;
  ctx.fillText("?", cx, ly + 590);

  ctx.fillStyle = "rgba(40,22,10,0.55)";
  ctx.font = `600 30px ${sans}`;
  ctx.letterSpacing = "5px";
  ctx.fillText("CAFÉ EN GRAINS · DÉCEMBRE 2026", TEX_W / 2, wy(-1.55));
  ctx.letterSpacing = "0px";
  return c;
}

function backTexture(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext("2d")!;
  const serif = fontVar("--font-zilla", "Georgia, serif");
  kraft(ctx, 99);
  seal(ctx);
  // Le dos est vu à travers une rotation de 180° : on dessine en miroir.
  ctx.save();
  ctx.translate(TEX_W, 0);
  ctx.scale(-1, 1);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(30,75,58,0.85)";
  ctx.font = `700 70px ${serif}`;
  ctx.fillText("L’Avent torréfié", TEX_W / 2, wy(0.2));
  ctx.fillStyle = "rgba(40,22,10,0.55)";
  ctx.font = `500 40px ${serif}`;
  ctx.fillText("Un sachet, un rituel, chaque matin.", TEX_W / 2, wy(-0.1));
  ctx.restore();
  return c;
}

function cardTexture(n: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 716;
  const ctx = c.getContext("2d")!;
  const serif = fontVar("--font-zilla", "Georgia, serif");
  const sans = fontVar("--font-karla", "Arial, sans-serif");
  ctx.fillStyle = "#FFFDF8";
  ctx.beginPath();
  ctx.roundRect(6, 6, 500, 704, 26);
  ctx.fill();
  ctx.strokeStyle = "#1E4B3A";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.strokeStyle = "rgba(30,75,58,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(30, 30, 452, 656, 14);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#1E4B3A";
  ctx.font = `600 24px ${sans}`;
  ctx.letterSpacing = "5px";
  ctx.fillText(n === 0 ? "SACHET D’ESSAI" : "JOUR", 256, 150);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#B4432F";
  ctx.font = n === 0 ? `700 120px ${serif}` : `700 240px ${serif}`;
  ctx.fillText(n === 0 ? "Essai" : String(n), 256, n === 0 ? 390 : 420);
  ctx.fillStyle = "#1E4B3A";
  ctx.font = `700 36px ${serif}`;
  ctx.fillText("L’Avent torréfié", 256, 560);
  return c;
}

function glowTexture(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,226,180,0.85)");
  g.addColorStop(1, "rgba(255,226,180,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function paperMaterial(map: THREE.Texture, transparent = false) {
  // Kraft mat légèrement satiné : rugosité élevée, léger vernis pour accrocher les reflets.
  return new THREE.MeshPhysicalMaterial({
    map,
    roughness: 0.7,
    metalness: 0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.6,
    sheen: 0.25,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color("#fff1dc"),
    envMapIntensity: 0.55,
    transparent,
  });
}

type Assets = {
  front: THREE.Material;
  back: THREE.Material;
  stripFront: THREE.MeshPhysicalMaterial;
  stripBack: THREE.MeshPhysicalMaterial;
  card: THREE.Texture;
  glow: THREE.Texture;
};

/* ---------- Grains de café éjectés ---------- */

const BEANS = 26;

function Beans({ start, freezeAt }: { start: number | null; freezeAt?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: BEANS }, () => ({
      x: (r() - 0.5) * 1.6,
      z: (r() - 0.5) * 0.3,
      vx: (r() - 0.5) * 3,
      vy: 3.4 + r() * 2.4,
      vz: 0.4 + r() * 1.6,
      rx: (r() - 0.5) * 14,
      ry: (r() - 0.5) * 14,
      delay: r() * 0.16,
    }));
  }, []);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.visible = start !== null;
    if (start === null) return;
    const t0 = freezeAt ?? state.clock.elapsedTime - start;
    seeds.forEach((s, i) => {
      const t = Math.max(0, t0 - s.delay);
      tmp.position.set(s.x + s.vx * t, TEAR_Y - 0.05 + s.vy * t - 4.9 * t * t, s.z + s.vz * t);
      tmp.rotation.set(s.rx * t, s.ry * t, 0);
      const k = t <= 0 ? 0 : 1;
      tmp.scale.set(0.075 * k, 0.055 * k, 0.1 * k);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, BEANS]} visible={false}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial color="#4A2C18" roughness={0.42} metalness={0.05} />
    </instancedMesh>
  );
}

/* ---------- Sachet ---------- */

function Pouch3D({ n, mode, onReady, onOpened, freezeAt }: Omit<Props, "eventSource">) {
  const group = useRef<THREE.Group>(null);
  const strip = useRef<THREE.Group>(null);
  const stripMeshes = useRef<THREE.Mesh[]>([]);
  // Opacité de la bande pilotée via les meshes : les matériaux en state restent immuables pour React.
  const setStripOpacity = (o: number) =>
    stripMeshes.current.forEach((m) => ((m.material as THREE.MeshPhysicalMaterial).opacity = o));
  const card = useRef<THREE.Mesh>(null);
  const flash = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const tearStart = useRef<number | null>(null);
  const opened = useRef(false);
  const [beansAt, setBeansAt] = useState<number | null>(null);
  const [assets, setAssets] = useState<Assets | null>(null);
  const { pointer, clock } = useThree();

  const geo = useMemo(() => ({ body: panel(Y_MIN, TEAR_Y, 64, 80), top: panel(TEAR_Y, Y_MAX, 64, 10) }), []);

  useEffect(() => {
    let alive = true;
    const serif = fontVar("--font-zilla", "Georgia");
    Promise.all([document.fonts.load(`700 80px ${serif}`), document.fonts.ready]).then(() => {
      if (!alive) return;
      const front = toTexture(frontTexture(n));
      const back = toTexture(backTexture());
      setAssets({
        front: paperMaterial(front),
        back: paperMaterial(back),
        stripFront: paperMaterial(front, true),
        stripBack: paperMaterial(back, true),
        card: toTexture(cardTexture(n)),
        glow: toTexture(glowTexture()),
      });
      onReady();
    });
    return () => {
      alive = false;
    };
  }, [n, onReady]);

  useEffect(() => {
    if (mode === "tearing" && tearStart.current === null) {
      tearStart.current = clock.elapsedTime;
      setBeansAt(clock.elapsedTime);
    }
  }, [mode, clock]);

  useFrame((state, dt) => {
    const g = group.current;
    const s = strip.current;
    if (!g || !s || !assets) return;
    const t = state.clock.elapsedTime;
    const tearing = mode === "tearing";

    // Inclinaison au pointeur + balancement au repos ; figé pendant la déchirure.
    g.rotation.y = damp(g.rotation.y, tearing ? 0 : 0.14 * pointer.x + 0.07 * Math.sin(0.55 * t), 2, dt);
    g.rotation.x = damp(g.rotation.x, tearing ? 0 : -0.06 * pointer.y, 2, dt);
    g.position.y = 0.06 * Math.sin(1.1 * t);
    if (mode === "charging") {
      // Micro-vibration de charge.
      g.rotation.z = 0.025 * Math.sin(46 * t);
      g.position.x = 0.025 * Math.sin(57 * t);
    } else {
      g.rotation.z = damp(g.rotation.z, 0, 8, dt);
      g.position.x = damp(g.position.x, 0, 8, dt);
    }
    if (light.current) {
      light.current.intensity = damp(light.current.intensity, mode === "charging" ? 4 : tearing ? 14 : 0, 4, dt);
    }

    if (!tearing || tearStart.current === null) {
      s.position.set(HW, TEAR_Y, 0);
      s.rotation.set(0, 0, 0);
      setStripOpacity(1);
      if (card.current) card.current.visible = false;
      if (flash.current) flash.current.visible = false;
      return;
    }

    const w = freezeAt ?? t - tearStart.current;
    // Bande : pivote sur son coin droit, monte en haut à droite et s’efface.
    s.position.set(HW + 2.4 * w, TEAR_Y + 2.2 * w, 0.8 * w);
    s.rotation.z = -0.42 * easeOut(w / 0.18) - 2.6 * w;
    s.rotation.x = 1.2 * w;
    setStripOpacity(1 - easeOut((w - 0.25) / 0.5));

    if (flash.current) {
      flash.current.visible = true;
      flash.current.scale.setScalar(0.5 + 3.6 * easeOut(w / 0.7));
      (flash.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - (w - 0.4) / 1.1);
    }

    // Le sachet tombe pendant que la carte sort par le haut puis vient vers l’écran.
    g.position.y -= 3.5 * easeOut((w - 0.8) / 0.75);
    const c = card.current;
    if (c) {
      c.visible = w >= 0.3;
      const rise = easeInOut((w - 0.3) / 0.7);
      const come = easeOut((w - 1) / 0.55);
      const y = -0.42 + rise * (2.75 + 0.42);
      c.position.set(0, y + come * (-g.position.y - y), 2.2 * come);
      c.rotation.y = 0.25 * Math.sin(come * Math.PI);
    }
    if (w > 1.55 && !opened.current && freezeAt === undefined) {
      opened.current = true;
      onOpened();
    }
  });

  if (!assets) return null;
  return (
    <group ref={group}>
      {/* Lumière logée dans le sachet : elle s’échappe par l’ouverture sans brûler la face avant. */}
      <pointLight ref={light} position={[0, 1.36, 0.02]} color="#FFD7A8" intensity={0} distance={5} />
      <mesh geometry={geo.body} material={assets.front} />
      <mesh geometry={geo.body} material={assets.back} rotation-y={Math.PI} />
      <group ref={strip} position={[HW, TEAR_Y, 0]}>
        <group position={[-HW, -TEAR_Y, 0]}>
          <mesh ref={(m) => { if (m) stripMeshes.current[0] = m; }} geometry={geo.top} material={assets.stripFront} />
          <mesh ref={(m) => { if (m) stripMeshes.current[1] = m; }} geometry={geo.top} material={assets.stripBack} rotation-y={Math.PI} />
        </group>
      </group>
      <mesh ref={card} position={[0, -0.42, 0]} visible={false}>
        <planeGeometry args={[1.7, 2.38]} />
        <meshBasicMaterial map={assets.card} transparent alphaTest={0.02} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={flash} position={[0, TEAR_Y, 0.35]} visible={false} renderOrder={10}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={assets.glow} transparent blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <Beans start={beansAt} freezeAt={freezeAt} />
    </group>
  );
}

function isLite(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
}

export default function PouchScene({ n, mode, onReady, onOpened, eventSource, freezeAt }: Props) {
  const [lite] = useState(isLite);
  const charging = mode === "charging";
  return (
    <Canvas
      dpr={lite ? [1, 1.5] : [1, 2]}
      camera={{ position: [0, 0, 7.4], fov: 46 }}
      gl={{ antialias: !lite, alpha: true, powerPreference: "high-performance" }}
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.18} />
      <directionalLight position={[-3.5, 4, 4]} intensity={1.7} color="#FFF4E6" />
      <directionalLight position={[4.5, 0.5, -2]} intensity={1.1} color="#9FD1B6" />
      <Pouch3D n={n} mode={mode} onReady={onReady} onOpened={onOpened} freezeAt={freezeAt} />
      <Sparkles
        count={(charging ? 70 : 36) / (lite ? 2 : 1)}
        scale={[4.2, 5.2, 2.5]}
        size={charging ? 4 : 2.5}
        speed={charging ? 1.4 : 0.35}
        color="#F2C98A"
        opacity={0.7}
      />
      {!lite && <ContactShadows position={[0, -2.45, 0]} opacity={0.5} scale={7} blur={2.6} far={4} />}
      {/* Studio de lumières virtuel : reflets doux sur le kraft, liseré sapin en contre-jour. */}
      <Environment resolution={lite ? 128 : 256}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
          <Lightformer form="ring" color="#E2B577" intensity={6} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={4} />
          <Lightformer form="rect" color="#5FA884" intensity={4} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[10, 2, 1]} />
          <Lightformer form="rect" intensity={0.5} position={[0, 0, 10]} scale={[10, 10, 1]} />
          <Lightformer form="rect" intensity={1.4} rotation-x={Math.PI / 2} position={[0, 8, 4]} scale={[6, 3, 1]} />
        </group>
      </Environment>
    </Canvas>
  );
}
