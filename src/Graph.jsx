// "Where are we on the plan" chart for one person. Plan: day n = n reps of each exercise, so the total after day n
// is n(n+1)/2 (5,050 at day 100). Actual: the reps of the days this person has checked, counted up by day number.
// The pink dot is the furthest day they have checked, at their real total through it.
const W = 360, H = 280, L = 54, R = 14, T = 16, B = 40;
const MAXY = 5200, MAXX = 100;
const plan = (n) => (n * (n + 1)) / 2;
const x = (d) => L + (d / MAXX) * (W - L - R);
const y = (v) => H - B - (v / MAXY) * (H - B - T);
const fmt = (n) => n.toLocaleString();

export default function Graph({ days }) {
  const high = days.lastIndexOf(true) + 1; // furthest checked day, 0 if none
  const pts = [[0, 0]];
  let tot = 0;
  for (let d = 1; d <= high; d++) { if (days[d - 1]) tot += d; pts.push([d, tot]); }
  const curve = Array.from({ length: 101 }, (_, d) => `${x(d).toFixed(1)},${y(plan(d)).toFixed(1)}`).join(" ");
  const mine = pts.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const behind = plan(high) - tot;
  const missed = high - days.filter(Boolean).length;

  const dx = x(high), dy = y(tot);
  const lx = Math.min(Math.max(dx + (high > 60 ? -52 : 24), L + 52), W - R - 52); // label centre
  const ly = Math.max(dy - 62, T + 12);
  // arrow runs from just under the label to just short of the dot
  const ax = lx + (dx - lx) * 0.12, ay = ly + 12;
  const ang = Math.atan2(dy - ay, dx - ax);
  const ex = dx - Math.cos(ang) * 11, ey = dy - Math.sin(ang) * 11;

  return (
    <section className="graph">
      <h3>The plan vs. {high ? "you" : "the start"}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="gsvg" role="img"
        aria-label={`Plan total at day 100 is 5,050. Furthest day done: ${high}, total ${tot} of each exercise.`}>
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 1 L9 5 L0 9" fill="none" stroke="#ff2d6f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        {[0, 1000, 2000, 3000, 4000, 5000].map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} className="gline" />
            <text x={L - 6} y={y(g) + 3.5} textAnchor="end">{g}</text>
          </g>
        ))}
        {[0, 20, 40, 60, 80, 100].map((g) => (
          <g key={g}>
            <line x1={x(g)} x2={x(g)} y1={T} y2={H - B} className="gline" />
            <text x={x(g)} y={H - B + 16} textAnchor="middle">{g}</text>
          </g>
        ))}
        <line x1={L} x2={L} y1={T} y2={H - B} className="gaxis" />
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} className="gaxis" />
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" className="glab">Day</text>
        <text transform={`translate(11 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" className="glab">Total Sum</text>

        <polyline points={curve} fill="none" stroke="#00c8f0" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {high > 0 && <polyline points={mine} fill="none" stroke="#ffd34d" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1 0" />}

        <line x1={ax} y1={ay} x2={ex} y2={ey} stroke="#ff2d6f" strokeWidth="2" strokeLinecap="round" markerEnd="url(#arr)" />
        <text x={lx} y={ly - 10} textAnchor="middle" className="here">We are here</text>
        <text x={lx} y={ly + 3} textAnchor="middle" className="heresub">{high ? `Day ${high} · ${fmt(tot)} each` : "Not started yet"}</text>
        <circle cx={dx} cy={dy} r="6.5" fill="#ff2d6f" stroke="#fff" strokeWidth="2" />
      </svg>
      <div className="glegend">
        <span><i style={{ background: "#00c8f0" }} />Plan (day n = n reps)</span>
        <span><i style={{ background: "#ffd34d" }} />Actual</span>
      </div>
      <p className="note">
        {high === 0 ? "Check off day 1 and the pink dot appears."
          : missed === 0 ? `Right on the plan: ${fmt(tot)} of each exercise by day ${high} (${fmt(3 * tot)} reps in all).`
          : `${missed} day${missed > 1 ? "s" : ""} skipped before day ${high}: ${fmt(behind)} reps of each exercise behind the plan at that day.`}
        {" "}Totals are per exercise; the plan ends at 5,050 each.
      </p>
    </section>
  );
}
