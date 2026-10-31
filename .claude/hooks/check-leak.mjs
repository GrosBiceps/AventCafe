// Hook PostToolUse : bloque toute fuite des données cafés hors de lib/data.ts.
// Exit 2 = message renvoyé à Claude pour qu’il corrige immédiatement.
import { readFileSync, existsSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}
const file = input?.tool_input?.file_path;
if (!file) process.exit(0);

const rel = relative(root, resolve(file)).replace(/\\/g, "/");
// Seuls les dossiers livrés au navigateur ou partagés sont surveillés.
if (!/^(app|components|lib|public)\//.test(rel)) process.exit(0);
if (rel === "lib/data.ts") process.exit(0);
if (!existsSync(file)) process.exit(0);

const src = readFileSync(file, "utf8");
const problems = [];

// Noms qui ne doivent exister que dans lib/data.ts.
const SECRETS = [
  "Kawa", "Winter Blend", "Full Monkeys", "Terres de Café", "Tanat",
  "Fruits confits", "Noisette torréfiée", "moussonné",
];
for (const s of SECRETS) {
  if (src.includes(s)) problems.push(`contient « ${s} » : cette donnée doit rester dans lib/data.ts`);
}

const isClient = /^\s*["']use client["']/m.test(src);
const importsData = /from\s+["'](@\/lib\/data|(\.\.?\/)+lib\/data|\.\/data)["']/.test(src);
const importsDates = /from\s+["'](@\/lib\/dates|(\.\.?\/)+lib\/dates|\.\/dates)["']/.test(src);
if (isClient && (importsData || importsDates)) {
  problems.push("composant client qui importe lib/data ou lib/dates (server-only)");
}
if (rel.startsWith("components/") && importsData) {
  problems.push("components/ ne doit pas importer lib/data : passer par les props ou /api/day/[n]");
}
if (rel === "lib/dates.ts" && !/import\s+["']server-only["']/.test(src)) {
  problems.push("lib/dates.ts doit commencer par import \"server-only\"");
}
if (isClient && /new Date\(\s*\)|Date\.now\(\)/.test(src) && /isUnlocked|unlock/i.test(src)) {
  problems.push("calcul de déverrouillage côté client détecté : l’heure doit venir du serveur");
}

if (problems.length) {
  process.stderr.write(
    `Verrouillage serveur — ${rel} :\n- ${problems.join("\n- ")}\nCorrige avant de continuer.\n`,
  );
  process.exit(2);
}
process.exit(0);
