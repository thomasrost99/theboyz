import { NAMES, json, who, login, reset } from "./lib/auth.js";

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json({ error: "post" }, 405);
  const b = await request.json().catch(() => ({}));
  if (b.action === "reset") { // only Tommy (index 0)
    if ((await who(request, env)) !== 0) return json({ error: "forbidden" }, 403);
    if (b.target >= 1 && b.target < 4) await reset(env, b.target);
    return json({ ok: true });
  }
  if (b.action === "me") return json({ me: await who(request, env) });
  return login(env, b.i, b.pin);
}
