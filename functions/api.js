// Per-person progress in KV: key p0..p3 = string of 100 chars, "1" = checked. Days 1-28 seeded.
// Anyone can read; only the signed-in person can change their own days.
import { NAMES, json, who, hasPins } from "./lib/auth.js";
const SEED = "1".repeat(28) + "0".repeat(72);

export async function onRequest({ request, env }) {
  if (request.method === "POST") {
    const me = await who(request, env);
    if (me < 0) return json({ error: "auth" }, 401);
    const { day, on } = await request.json();
    if (day >= 1 && day <= 100) {
      const s = (await env.KV.get("p" + me)) || SEED;
      await env.KV.put("p" + me, s.slice(0, day - 1) + (on ? "1" : "0") + s.slice(day));
    }
  }
  const rows = await Promise.all(NAMES.map((_, i) => env.KV.get("p" + i)));
  const days = rows.map((s) => [...(s || SEED)].map((c) => c === "1"));
  return json({ names: NAMES, days, hasPin: await hasPins(env) });
}
