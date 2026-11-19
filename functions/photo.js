// Proof photos, stored in D1 (compressed JPEG from the phone, up to ~1 MB).
// GET ?i=&day= is public; POST / DELETE ?day= needs your own sign-in.
import { json, who } from "./lib/auth.js";
import { db } from "./lib/db.js";

export async function onRequest({ request, env }) {
  const D = await db(env);
  const u = new URL(request.url);
  if (request.method === "GET") {
    const r = await D.prepare("SELECT data FROM photos WHERE i=? AND day=?").bind(+u.searchParams.get("i"), +u.searchParams.get("day")).first();
    if (!r) return new Response("none", { status: 404 });
    return new Response(new Uint8Array(r.data), { headers: { "content-type": "image/jpeg", "cache-control": "no-cache" } });
  }
  const me = await who(request, env);
  if (me < 0) return json({ error: "auth" }, 401);
  const day = +u.searchParams.get("day");
  if (!(day >= 1 && day <= 100)) return json({ error: "day" }, 400);
  if (request.method === "DELETE") {
    await D.batch([D.prepare("DELETE FROM photos WHERE i=? AND day=?").bind(me, day), D.prepare("UPDATE days SET photo=0 WHERE i=? AND day=?").bind(me, day)]);
    return json({ ok: true });
  }
  const buf = await request.arrayBuffer();
  if (buf.byteLength > 1000000 || buf.byteLength < 100) return json({ error: "size" }, 413);
  const m = new Uint8Array(buf, 0, 3);
  if (m[0] !== 0xff || m[1] !== 0xd8) return json({ error: "type" }, 415); // client always sends JPEG
  await D.batch([
    D.prepare("INSERT OR IGNORE INTO days(i,day,at) VALUES(?,?,?)").bind(me, day, Date.now()),
    D.prepare("INSERT OR REPLACE INTO photos(i,day,data,ts) VALUES(?,?,?,?)").bind(me, day, [...new Uint8Array(buf)], Date.now()),
    D.prepare("UPDATE days SET photo=1 WHERE i=? AND day=?").bind(me, day),
  ]);
  return json({ ok: true });
}
