// PIN auth on D1. auth rows: pin<i> = {salt,hash,ver}; tok:<sha256(token)> = {i,ver} (1 year); fail<i> = count (15 min).
import { db, NAMES } from "./db.js";
export { NAMES };
const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
async function derive(pin, salt) {
  const k = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100000 }, k, 256));
}
const rand = () => hex(crypto.getRandomValues(new Uint8Array(24)));

export const json = (o, status = 200) => Response.json(o, { status, headers: { "cache-control": "no-store" } });

async function get(env, k) {
  const D = await db(env);
  const r = await D.prepare("SELECT v, exp FROM auth WHERE k=?").bind(k).first();
  if (!r || (r.exp && r.exp < Date.now())) return null;
  return r.v;
}
async function put(env, k, v, ttlSec) {
  const D = await db(env);
  await D.prepare("INSERT OR REPLACE INTO auth(k,v,exp) VALUES(?,?,?)").bind(k, v, ttlSec ? Date.now() + ttlSec * 1000 : null).run();
}
async function del(env, k) { const D = await db(env); await D.prepare("DELETE FROM auth WHERE k=?").bind(k).run(); }

// Person index for a valid Bearer token, else -1.
export async function who(request, env) {
  const t = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!t) return -1;
  const v = JSON.parse((await get(env, "tok:" + (await sha(t)))) || "null");
  if (!v) return -1;
  const rec = JSON.parse((await get(env, "pin" + v.i)) || "null");
  return rec && rec.ver === v.ver ? v.i : -1;
}
async function issue(env, i, ver) {
  const t = rand();
  await put(env, "tok:" + (await sha(t)), JSON.stringify({ i, ver }), 31536000);
  return t;
}
export async function hasPins(env) {
  return Promise.all(NAMES.map(async (_, i) => !!(await get(env, "pin" + i))));
}
export async function login(env, i, pin) {
  if (!(i >= 0 && i < 4) || !/^\d{4}$/.test(String(pin))) return json({ error: "bad" }, 400);
  const fails = parseInt((await get(env, "fail" + i)) || "0", 10);
  if (fails >= 5) return json({ error: "locked" }, 429);
  const rec = JSON.parse((await get(env, "pin" + i)) || "null");
  if (!rec) { // first-time setup for this name
    const salt = rand();
    const n = { salt, hash: await derive(pin, salt), ver: Date.now() };
    await put(env, "pin" + i, JSON.stringify(n));
    return json({ token: await issue(env, i, n.ver), me: i, created: true });
  }
  if ((await derive(pin, rec.salt)) !== rec.hash) {
    await put(env, "fail" + i, String(fails + 1), 900);
    return json({ error: "wrong" }, 401);
  }
  await del(env, "fail" + i);
  return json({ token: await issue(env, i, rec.ver), me: i });
}
// Tommy (person 0) clears someone else's PIN; that also invalidates their device tokens.
export async function reset(env, target) {
  await del(env, "pin" + target);
  await del(env, "fail" + target);
}
