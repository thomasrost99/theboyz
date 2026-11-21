// D1 setup. Tables are created on first use; data is copied once from the old KV store.
let ready;
export const NAMES = ["Tommy", "Hayden", "Rob", "Jack"];

export function db(env) {
  if (!ready) ready = init(env).catch((e) => { ready = null; throw e; });
  return ready.then(() => env.DB);
}

async function init(env) {
  const D = env.DB;
  await D.batch([
    D.prepare("CREATE TABLE IF NOT EXISTS days(i INTEGER NOT NULL, day INTEGER NOT NULL, push INTEGER, sit INTEGER, pull INTEGER, at INTEGER, photo INTEGER, PRIMARY KEY(i,day))"),
    D.prepare("CREATE TABLE IF NOT EXISTS msgs(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, text TEXT, ts INTEGER, UNIQUE(name,text,ts))"),
    D.prepare("CREATE TABLE IF NOT EXISTS auth(k TEXT PRIMARY KEY, v TEXT, exp INTEGER)"),
    D.prepare("CREATE TABLE IF NOT EXISTS reacts(mid TEXT NOT NULL, i INTEGER NOT NULL, emoji TEXT NOT NULL, ts INTEGER, PRIMARY KEY(mid,i,emoji))"),
    D.prepare("CREATE TABLE IF NOT EXISTS cheers(i INTEGER NOT NULL, day INTEGER NOT NULL, ts INTEGER, n INTEGER, reps INTEGER, PRIMARY KEY(i,day))"),
    D.prepare("CREATE TABLE IF NOT EXISTS photos(i INTEGER NOT NULL, day INTEGER NOT NULL, data BLOB, ts INTEGER, PRIMARY KEY(i,day))"),
  ]);
  const done = await D.prepare("SELECT v FROM auth WHERE k='migrated'").first();
  if (done || !env.KV) return;
  const st = [];
  for (let i = 0; i < 4; i++) {
    const s = (await env.KV.get("p" + i)) || "1".repeat(28) + "0".repeat(72);
    for (let d = 0; d < 100; d++) if (s[d] === "1") st.push(D.prepare("INSERT OR IGNORE INTO days(i,day) VALUES(?,?)").bind(i, d + 1));
    const pin = await env.KV.get("pin" + i);
    if (pin) st.push(D.prepare("INSERT OR IGNORE INTO auth(k,v) VALUES(?,?)").bind("pin" + i, pin));
  }
  const msgs = JSON.parse((await env.KV.get("msgs")) || "[]").reverse();
  for (const m of msgs) st.push(D.prepare("INSERT OR IGNORE INTO msgs(name,text,ts) VALUES(?,?,?)").bind(m.name, m.text, m.ts));
  st.push(D.prepare("INSERT OR IGNORE INTO auth(k,v) VALUES('migrated','1')"));
  for (let k = 0; k < st.length; k += 90) await D.batch(st.slice(k, k + 90));
}
