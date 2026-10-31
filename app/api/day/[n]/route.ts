import { connection } from "next/server";
import { getDayCard } from "@/lib/data";
import { isUnlocked, parisToday, unlocksOn } from "@/lib/dates";

// Aucune réponse ne doit être mise en cache : un jour verrouillé servi depuis un cache serait une fuite.
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export async function GET(_req: Request, ctx: { params: Promise<{ n: string }> }) {
  // La date doit être lue à la requête, jamais figée au build.
  await connection();
  const { n: raw } = await ctx.params;
  if (!/^\d{1,2}$/.test(raw)) return json(404, { error: "not_found" });
  const n = Number(raw);
  if (n > 24) return json(404, { error: "not_found" });

  const today = parisToday();
  // Vérification avant tout accès aux données du jour.
  if (!isUnlocked(n, today)) return json(403, { locked: true, unlocksOn: unlocksOn(n) });

  return json(200, getDayCard(n, today));
}
