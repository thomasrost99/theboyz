const NAMES = ["Person 1", "Person 2", "Person 3", "Person 4"];

export class Counters {
  constructor(state) { this.state = state; }
  async fetch(req) {
    const v = (await this.state.storage.get("v")) || [0, 0, 0, 0];
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
    return env.COUNTERS.get(env.COUNTERS.idFromName("main")).fetch(req);
  },
};
