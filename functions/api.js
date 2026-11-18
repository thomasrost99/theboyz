// Pages Function: forwards to the Counters Durable Object hosted by the "theboyz" Worker.
export const onRequest = ({ request, env }) =>
  env.COUNTERS.get(env.COUNTERS.idFromName("main")).fetch(request);
