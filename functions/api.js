// Per-person progress in KV: key p0..p3 = string of 100 chars, "1" = checked. Days 1-28 seeded.
const NAMES = ["Tommy", "Hayden", "Rob", "Jack"];
const SEED = "1".repeat(28) + "0".repeat(72);

export async function onRequest({ request, env }) {
  if (request.method === "POST") {
    const { i, day, on } = await request.json();
    if (i >= 0 && i < 4 && day >= 1 && day <= 100) {
      const s = (await env.KV.get("p" + i)) || SEED;
      await env.KV.put("p" + i, s.slice(0, day - 1) + (on ? "1" : "0") + s.slice(day));
    }
  }
  const rows = await Promise.all(NAMES.map((_, i) => env.KV.get("p" + i)));
  const days = rows.map((s) => [...(s || SEED)].map((c) => c === "1"));
  return Response.json({ names: NAMES, days });
}
