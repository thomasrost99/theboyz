// PIN auth. KV: pin<i> = {salt,hash,ver}; tok:<sha256(token)> = {i,ver} (1 year); fail<i> = attempt count (15 min).
export const NAMES = ["Tommy", "Hayden", "Rob", "Jack"];
const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
async function derive(pin, salt) {
  const k = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100000 }, k, 256));
}
const rand = () => hex(crypto.getRandomValues(new Uint8Array(24)));

export const json = (o, status = 200) => Response.json(o, { status });

// Returns the person index for a valid Bearer token, else -1.
export async function who(request, env) {
  const t = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!t) return -1;
  const v = await env.KV.get("tok:" + (await sha(t)), "json");
  if (!v) return -1;
  const rec = await env.KV.get("pin" + v.i, "json");
  return rec && rec.ver === v.ver ? v.i : -1;
}

async function issue(env, i, ver) {
  const t = rand();
  await env.KV.put("tok:" + (await sha(t)), JSON.stringify({ i, ver }), { expirationTtl: 31536000 });
  return t;
}

export async function hasPins(env) {
  return Promise.all(NAMES.map(async (_, i) => !!(await env.KV.get("pin" + i))));
}

export async function login(env, i, pin) {
  if (!(i >= 0 && i < 4) || !/^\d{4}$/.test(String(pin))) return json({ error: "bad" }, 400);
  const fails = parseInt((await env.KV.get("fail" + i)) || "0", 10);
  if (fails >= 5) return json({ error: "locked" }, 429);
  const rec = await env.KV.get("pin" + i, "json");
  if (!rec) { // first-time setup for this name
    const salt = rand();
    const n = { salt, hash: await derive(pin, salt), ver: 1 };
    await env.KV.put("pin" + i, JSON.stringify(n));
    return json({ token: await issue(env, i, n.ver), me: i, created: true });
  }
  if ((await derive(pin, rec.salt)) !== rec.hash) {
    await env.KV.put("fail" + i, String(fails + 1), { expirationTtl: 900 });
    return json({ error: "wrong" }, 401);
  }
  await env.KV.delete("fail" + i);
  return json({ token: await issue(env, i, rec.ver), me: i });
}

// Tommy (person 0) clears someone's PIN; that also invalidates their device tokens.
export async function reset(env, target) {
  await env.KV.delete("pin" + target);
  await env.KV.delete("fail" + target);
}
