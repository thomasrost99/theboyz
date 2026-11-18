const NAMES = ["Tommy", "Hayden", "Rob", "Jack"];
const seed = () => NAMES.map(() => Array.from({ length: 100 }, (_, d) => d < 28));

export class Counters {
  constructor(state) { this.state = state; }
  async fetch(req) {
    const days = (await this.state.storage.get("days")) || seed();
    if (req.method === "POST") {
      const { i, day, on } = await req.json();
      if (i >= 0 && i < 4 && day >= 1 && day <= 100) days[i][day - 1] = !!on;
      await this.state.storage.put("days", days);
    }
    return Response.json({ names: NAMES, days });
  }
}

export default {
  fetch(req, env) {
    return env.COUNTERS.get(env.COUNTERS.idFromName("main")).fetch(req);
  },
};
