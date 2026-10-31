// Hook SessionStart : rappelle l’état du projet en début de session (affiché comme contexte).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const lines = [];

const paris = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short",
}).format(new Date());
lines.push(`Date à Paris : ${paris}.`);

const start = Date.UTC(2026, 10, 30, 23); // 1er décembre 2026, 00:00 heure de Paris
const days = Math.ceil((start - Date.now()) / 86400000);
lines.push(days > 0 ? `Premier sachet dans ${days} jour(s).` : "Le calendrier est en cours ou terminé.");

lines.push(existsSync(join(root, "package.json"))
  ? "Projet Next.js initialisé."
  : "Projet Next.js PAS encore initialisé (étape 1 du plan).");

const data = join(root, "lib", "data.ts");
if (existsSync(data)) {
  const empty = (readFileSync(data, "utf8").match(/name:\s*""/g) || []).length;
  if (empty) lines.push(`Coffret Lugat : ${empty} sachet(s) encore vide(s) dans lib/data.ts (/remplir-coffret).`);
}

try {
  const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
    .toString().trim();
  const dirty = execSync("git status --porcelain", { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
    .toString().trim().split("\n").filter(Boolean).length;
  lines.push(`Git : branche ${branch}, ${dirty} fichier(s) modifié(s).`);
} catch {
  lines.push("Git : dépôt non initialisé.");
}

process.stdout.write(lines.join("\n") + "\n");
