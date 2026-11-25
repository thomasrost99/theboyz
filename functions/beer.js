// Beer tracker in D1 (table beers: one row per beer). Tommy, Hayden and Jack have counters; Rob (index 2) does not.
// Anyone can read; only the signed-in person can add or undo their own. `since` = the phone's local midnight in ms,
// so "today" follows the phone's own clock and time zone.
import { NAMES, json, who } from "./lib/auth.js";
import { db } from "./lib/db.js";

const PLAYERS = [0, 1, 3];

export async function onRequest({ request, env }) {
  const D = await db(env);
  let since = parseInt(new URL(request.url).searchParams.get("since"), 10);
  if (request.method === "POST") {
    const me = await who(request, env);
    if (me < 0) return json({ error: "auth" }, 401);
    if (!PLAYERS.includes(me)) return json({ error: "no counter" }, 403);
    const b = await request.json().catch(() => ({}));
    if (b.since) since = parseInt(b.since, 10);
    if (b.action === "add") await D.prepare("INSERT INTO beers(i,ts) VALUES(?,?)").bind(me, Date.now()).run();
    else if (b.action === "undo") await D.prepare("DELETE FROM beers WHERE id=(SELECT MAX(id) FROM beers WHERE i=?)").bind(me).run();
  }
  if (!(since > 0)) since = Date.now() - 86400000;
  const { results } = await D.prepare("SELECT i, COUNT(*) total, SUM(ts>=?) today FROM beers GROUP BY i").bind(since).all();
  const total = NAMES.map(() => 0), today = NAMES.map(() => 0);
  for (const r of results) { total[r.i] = r.total; today[r.i] = r.today || 0; }
  return json({ names: NAMES, players: PLAYERS, total, today });
}
