// Progress in D1. A row in `days` = that day is done (optional logged reps, check-in time, photo flag).
// Anyone can read; only the signed-in person can change their own days.
import { json, who, hasPins, NAMES } from "./lib/auth.js";
import { db } from "./lib/db.js";

const rep = (v) => (v === null || v === undefined || v === "" ? null : Math.max(0, Math.min(9999, parseInt(v, 10) || 0)));

// A day was just checked off for the first time: add its "finished" post to the board. Only called for new
// check-offs (never a backfill); INSERT OR IGNORE keeps it to one post per person per day.
async function cheer(D, me, day) {
  const { results } = await D.prepare("SELECT day FROM days WHERE i=?").bind(me).all();
  const n = results.length, reps = results.reduce((t, r) => t + r.day, 0);
  await D.prepare("INSERT OR IGNORE INTO cheers(i,day,ts,n,reps) VALUES(?,?,?,?,?)").bind(me, day, Date.now(), n, reps).run();
}

export async function onRequest({ request, env }) {
  const D = await db(env);
  if (request.method === "POST") {
    const me = await who(request, env);
    if (me < 0) return json({ error: "auth" }, 401);
    const b = await request.json();
    const day = parseInt(b.day, 10);
    if (day >= 1 && day <= 100) {
      if (b.action === "log") { // log (or clear) the actual reps; makes the day done
        const isNew = !(await D.prepare("SELECT 1 x FROM days WHERE i=? AND day=?").bind(me, day).first());
        await D.prepare("INSERT INTO days(i,day,push,sit,pull,at) VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(i,day) DO UPDATE SET push=?3,sit=?4,pull=?5")
          .bind(me, day, rep(b.push), rep(b.sit), rep(b.pull), Date.now()).run();
        if (isNew) await cheer(D, me, day);
      } else if (b.on) {
        const r = await D.prepare("INSERT OR IGNORE INTO days(i,day,at) VALUES(?,?,?)").bind(me, day, Date.now()).run();
        if (r.meta?.changes) await cheer(D, me, day);
      } else {
        // Unchecking removes the day's finish post (and the reactions on it); checking it again makes one fresh post.
        await D.batch([
          D.prepare("DELETE FROM days WHERE i=? AND day=?").bind(me, day),
          D.prepare("DELETE FROM photos WHERE i=? AND day=?").bind(me, day),
          D.prepare("DELETE FROM cheers WHERE i=? AND day=?").bind(me, day),
          D.prepare("DELETE FROM reacts WHERE mid=?").bind(`d${me}-${day}`),
        ]);
      }
    }
  }
  const { results } = await D.prepare("SELECT i,day,push,sit,pull,at,photo FROM days").all();
  const days = NAMES.map(() => Array(100).fill(false));
  const logs = NAMES.map(() => ({}));
  for (const r of results) {
    days[r.i][r.day - 1] = true;
    logs[r.i][r.day] = { push: r.push, sit: r.sit, pull: r.pull, at: r.at, photo: !!r.photo };
  }
  return json({ names: NAMES, days, logs, hasPin: await hasPins(env) });
}
