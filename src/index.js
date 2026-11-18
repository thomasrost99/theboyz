const NAMES = ["Person 1", "Person 2", "Person 3", "Person 4"];

export class Counters {
  constructor(state) { this.state = state; }
  async fetch(req) {
    let v = (await this.state.storage.get("v")) || [0, 0, 0, 0];
    if (req.method === "POST") {
      const { i, d } = await req.json();
      if (i >= 0 && i < 4) v[i] = Math.max(0, Math.min(100, v[i] + d));
      await this.state.storage.put("v", v);
    }
    return Response.json({ names: NAMES, v });
  }
}

export default {
  fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api") {
      return env.COUNTERS.get(env.COUNTERS.idFromName("main")).fetch(req);
    }
    return new Response(PAGE, { headers: { "content-type": "text/html;charset=utf-8" } });
  },
};

const PAGE = `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Progress</title>
<style>body{font-family:system-ui;max-width:480px;margin:20px auto;padding:0 12px}
.r{display:flex;align-items:center;gap:10px;margin:14px 0}.n{flex:1;font-weight:600}
button{font-size:22px;width:48px;height:48px;border-radius:8px;border:1px solid #888;background:#eee}
.c{font-size:24px;width:60px;text-align:center}progress{width:100%;height:8px}</style>
<div id=a></div>
<script>
let s;
async function api(i,d){const r=await fetch('/api',i==null?{}:{method:'POST',body:JSON.stringify({i,d})});s=await r.json();draw()}
function draw(){a.innerHTML=s.names.map((n,i)=>'<div><div class=r><span class=n>'+n+'</span><button onclick="api('+i+',-1)">-</button><span class=c>'+s.v[i]+'</span><button onclick="api('+i+',1)">+</button></div><progress max=100 value='+s.v[i]+'></progress></div>').join('')}
api();setInterval(()=>api(),3000);
</script>`;
