// Message board: one KV key "msgs" = JSON array, newest first, capped at 200.
const NAMES = ["Tommy", "Hayden", "Rob", "Jack"];

export async function onRequest({ request, env }) {
  let msgs = JSON.parse((await env.KV.get("msgs")) || "[]");
  if (request.method === "POST") {
    const { name, text } = await request.json();
    const t = String(text || "").trim().slice(0, 500);
    if (NAMES.includes(name) && t) {
      msgs = [{ name, text: t, ts: Date.now() }, ...msgs].slice(0, 200);
      await env.KV.put("msgs", JSON.stringify(msgs));
    }
  }
  return Response.json(msgs);
}
