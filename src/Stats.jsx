const COLORS = ["#7c5cff", "#22d3ee", "#ffd34d", "#ff5c8a"];
const DAY = 86400000;
const dkey = (t) => new Date(t).toLocaleDateString("en-CA");
const fmt = (n) => Math.round(n).toLocaleString();

// All per-person numbers come from the days + logs the server sends.
export function personStats(days, logs, now = Date.now()) {
  const done = days.map((on, j) => (on ? j + 1 : 0)).filter(Boolean);
  const target = done.reduce((t, d) => t + d, 0); // reps of ONE exercise if every day is done as targeted
  const L = (k) => done.reduce((t, d) => t + (logs[d]?.[k] ?? 0), 0);
  const loggedDays = (k) => done.filter((d) => logs[d]?.[k] != null);
  const ex = ["push", "sit", "pull"].map((k) => {
    const ld = loggedDays(k);
    return { k, logged: L(k), loggedTarget: ld.reduce((t, d) => t + d, 0), days: ld.length };
  });
  const ats = done.map((d) => logs[d]?.at).filter(Boolean).sort((a, b) => a - b);
  const dates = [...new Set(ats.map(dkey))].sort();
  // calendar streak: consecutive dates with a check-in, alive if the last one is today or yesterday
  let best = 0, run = 0, prev = null;
  for (const k of dates) {
    run = prev && new Date(k) - new Date(prev) === DAY ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  const today = dkey(now), yest = dkey(now - DAY);
  const streak = prev === today || prev === yest ? run : 0;
  const week = ats.filter((t) => t >= now - 7 * DAY).length;
  const pace = week / 7; // days finished per calendar day, last 7 days
  const left = 100 - done.length;
  const eta = left === 0 ? "done" : pace > 0 ? new Date(now + Math.ceil(left / pace) * DAY).toLocaleDateString([], { month: "short", day: "numeric" }) : null;
  const photos = done.filter((d) => logs[d]?.photo).length;
  return { done: done.length, target, ex, ats, dates, streak, best, week, pace, left, eta, photos };
}

function Line({ people, now }) {
  const W = 340, H = 170, P = 24;
  const first = Math.min(...people.flatMap((p) => p.ats), now);
  const span = Math.max(now - first, DAY);
  const x = (t) => P + ((t - first) / span) * (W - P - 8);
  const y = (n) => H - 20 - (n / 100) * (H - 34);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}><line x1={P} x2={W - 8} y1={y(g)} y2={y(g)} stroke="#ffffff14" /><text x={P - 4} y={y(g) + 4} textAnchor="end">{g}</text></g>
      ))}
      <text x={P} y={H - 4}>{new Date(first).toLocaleDateString([], { month: "short", day: "numeric" })}</text>
      <text x={W - 8} y={H - 4} textAnchor="end">now</text>
      {people.map((p, i) => {
        const base = p.done - p.ats.length; // days with no timestamp (before tracking) sit at the start
        const pts = [[first, base], ...p.ats.map((t, k) => [t, base + k + 1]), [now, p.done]];
        return <polyline key={i} fill="none" stroke={COLORS[i]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={pts.map(([t, n]) => `${x(t)},${y(n)}`).join(" ")} />;
      })}
    </svg>
  );
}

function Bars({ people, now }) {
  const N = 14, W = 340, H = 130, bw = (W - 16) / N;
  const keys = Array.from({ length: N }, (_, k) => dkey(now - (N - 1 - k) * DAY));
  const cols = keys.map((k) => people.map((p) => p.ats.filter((t) => dkey(t) === k).length));
  const mx = Math.max(3, ...cols.map((c) => c.reduce((a, b) => a + b, 0)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      {cols.map((c, k) => {
        let y0 = H - 18;
        return (
          <g key={k}>
            {c.map((n, i) => { const h = (n / mx) * (H - 34); y0 -= h; return n ? <rect key={i} x={8 + k * bw + 2} y={y0} width={bw - 4} height={h} rx="3" fill={COLORS[i]} /> : null; })}
            {k % 2 === (N - 1) % 2 && <text x={8 + k * bw + bw / 2} y={H - 4} textAnchor="middle">{new Date(keys[k] + "T12:00").getDate()}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function Stats({ s, me, onBack, onOpen }) {
  const now = Date.now();
  const P = s.names.map((_, i) => personStats(s.days[i], s.logs?.[i] || {}, now));
  const groupReps = P.reduce((t, p) => t + 3 * p.target, 0);
  const groupDays = P.reduce((t, p) => t + p.done, 0);
  const leader = [...P.keys()].sort((a, b) => P[b].done - P[a].done)[0];
  const best = [...P.keys()].sort((a, b) => P[b].best - P[a].best)[0];
  const wall = s.names.flatMap((n, i) => Object.entries(s.logs?.[i] || {}).filter(([, l]) => l.photo).map(([d, l]) => ({ i, d: +d, at: l.at || 0 })))
    .sort((a, b) => b.at - a.at).slice(0, 12);
  const legend = <div className="legend">{s.names.map((n, i) => <span key={i}><i style={{ background: COLORS[i] }} />{n}</span>)}</div>;

  return (
    <>
      <button className="back" onClick={onBack}>← Everyone</button>
      <h1 className="stitle">Stats</h1>

      <div className="big3">
        <div><b>{fmt(groupReps)}</b><span>group reps (target)</span></div>
        <div><b>{groupDays}</b><span>days checked, all 4</span></div>
        <div><b>{Math.round((groupDays / 400) * 100)}%</b><span>of the whole challenge</span></div>
      </div>

      <section className="panel"><h3>Days done over time</h3>{legend}<Line people={P} now={now} />
        <p className="note">Days checked before 11/18 have no time stamp, so every line starts from where it stood.</p></section>
      <section className="panel"><h3>Check-ins, last 14 days</h3>{legend}<Bars people={P} now={now} /></section>

      <section className="panel"><h3>Head to head</h3>
        <div className="cmp">
          {[
            ["Days done", (p) => p.done],
            ["Current streak 🔥", (p) => p.streak],
            ["Best streak", (p) => p.best],
            ["Last 7 days", (p) => p.week],
            ["Reps (target)", (p) => fmt(3 * p.target)],
            ["Photos 📸", (p) => p.photos],
          ].map(([label, f]) => (
            <div className="crow" key={label}>
              <span className="clabel">{label}</span>
              {P.map((p, i) => <span key={i} className="cval" style={{ color: COLORS[i] }}>{f(p)}</span>)}
            </div>
          ))}
          <div className="crow head"><span />{s.names.map((n, i) => <span key={i} style={{ color: COLORS[i] }}>{n}</span>)}</div>
        </div>
        <p className="note">👑 Most days: {s.names[leader]} · Best streak: {s.names[best]} ({P[best].best})</p>
      </section>

      {s.names.map((n, i) => {
        const p = P[i];
        return (
          <section className={"panel person" + (i === me ? " mine" : "")} key={i} onClick={() => onOpen(i)}>
            <h3 style={{ color: COLORS[i] }}>{n}{i === me && <span className="you">YOU</span>}</h3>
            <div className="mini3">
              <div><b>{p.done}/100</b><span>days</span></div>
              <div><b>{p.streak} 🔥</b><span>streak (best {p.best})</span></div>
              <div><b>{p.pace ? p.pace.toFixed(1) : "–"}</b><span>days / day (7d)</span></div>
            </div>
            <p className="note">Pace to finish: {p.eta === "done" ? "finished 👑" : p.eta ? `${p.left} days left, ~${p.eta} at this pace` : `${p.left} days left (no pace yet)`}</p>
            {p.ex.map((e) => (
              <div className="exrow" key={e.k}>
                <span>{{ push: "Push-ups", sit: "Sit-ups", pull: "Pull-ups" }[e.k]}</span>
                <div className="bar"><i style={{ width: Math.min(100, p.target ? (e.days ? (e.logged / (e.loggedTarget || 1)) * 100 : 0) : 0) + "%", background: COLORS[i] }} /></div>
                <span className="exn">{e.days ? `${fmt(e.logged)} logged vs ${fmt(e.loggedTarget)}` : `${fmt(p.target)} target`}</span>
              </div>
            ))}
            <p className="note">Logged vs target counts only days where exact reps were logged; other days count at target ({fmt(p.target)} each).</p>
          </section>
        );
      })}

      {wall.length > 0 && (
        <section className="panel"><h3>Proof wall 📸</h3>
          <div className="wall">
            {wall.map((w) => (
              <figure key={w.i + "-" + w.d} onClick={() => onOpen(w.i)}>
                <img loading="lazy" alt="" src={`/photo?i=${w.i}&day=${w.d}`} />
                <figcaption style={{ color: COLORS[w.i] }}>{s.names[w.i]} · day {w.d}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
