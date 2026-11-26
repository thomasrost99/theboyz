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

const EX = ["push", "sit", "pull"];
// Totals per exercise for one person's day from their logged sessions: {push, sit, pull}.
async function totals(D, me, day) {
  const { results } = await D.prepare("SELECT ex, SUM(n) t FROM sessions WHERE i=? AND day=? GROUP BY ex").bind(me, day).all();
  const t = { push: 0, sit: 0, pull: 0 };
  for (const r of results) if (r.ex in t) t[r.ex] = r.t;
  return t;
}

export async function onRequest({ request, env }) {
  const D = await db(env);
  if (request.method === "POST") {
    const me = await who(request, env);
    if (me < 0) return json({ error: "auth" }, 401);
    const b = await request.json();
    const day = parseInt(b.day, 10);
    if (day >= 1 && day <= 100) {
      if (b.action === "rep" || b.action === "undo") {
        // Partial progress: reps logged in sessions through the day. Only on a day that is not checked off yet.
        // When all three exercises reach the day's target the day is checked off by itself (reps = what was logged).
        const open = !(await D.prepare("SELECT 1 x FROM days WHERE i=? AND day=?").bind(me, day).first());
        if (open && b.action === "undo") {
          await D.prepare("DELETE FROM sessions WHERE id=(SELECT MAX(id) FROM sessions WHERE i=? AND day=?)").bind(me, day).run();
        } else if (open && EX.includes(b.ex)) {
          const n = Math.max(1, Math.min(999, parseInt(b.n, 10) || 0));
          if (parseInt(b.n, 10) > 0) await D.prepare("INSERT INTO sessions(i,day,ex,n,ts) VALUES(?,?,?,?,?)").bind(me, day, b.ex, n, Date.now()).run();
          const t = await totals(D, me, day);
          if (EX.every((e) => t[e] >= day)) {
            const r = await D.prepare("INSERT OR IGNORE INTO days(i,day,push,sit,pull,at) VALUES(?,?,?,?,?,?)")
              .bind(me, day, Math.min(9999, t.push), Math.min(9999, t.sit), Math.min(9999, t.pull), Date.now()).run();
            if (r.meta?.changes) await cheer(D, me, day);
          }
        }
      } else if (b.action === "log") { // log (or clear) the actual reps; makes the day done
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
          D.prepare("DELETE FROM sessions WHERE i=? AND day=?").bind(me, day),
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
  // In-progress days: per person, day -> reps so far per exercise, and the latest entry (for undo).
  const sess = NAMES.map(() => ({}));
  const { results: sr } = await D.prepare("SELECT i,day,ex,n,id FROM sessions ORDER BY id").all();
  for (const r of sr) {
    if (days[r.i]?.[r.day - 1] || !(r.ex in { push: 1, sit: 1, pull: 1 })) continue;
    const o = (sess[r.i][r.day] ||= { push: 0, sit: 0, pull: 0, last: null });
    o[r.ex] += r.n; o.last = [r.ex, r.n];
  }
  return json({ names: NAMES, days, logs, sess, hasPin: await hasPins(env) });
}
