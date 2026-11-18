// Message board: one KV key "msgs" = JSON array, newest first, capped at 200. Posting needs a sign-in.
import { NAMES, json, who } from "./lib/auth.js";

export async function onRequest({ request, env }) {
  let msgs = JSON.parse((await env.KV.get("msgs")) || "[]");
  if (request.method === "POST") {
    const me = await who(request, env);
    if (me < 0) return json({ error: "auth" }, 401);
    const { text } = await request.json();
    const t = String(text || "").trim().slice(0, 500);
    if (t) {
      msgs = [{ name: NAMES[me], text: t, ts: Date.now() }, ...msgs].slice(0, 200);
      await env.KV.put("msgs", JSON.stringify(msgs));
    }
  }
  return json(msgs);
}
