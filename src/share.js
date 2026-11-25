// Beer tab "Share": builds the text and hands it to the phone (share sheet, then sms:, then clipboard).
// Pure helpers are exported separately so they can be unit tested (share.test.mjs).
export const BEER_URL = "https://theboyz.pages.dev/#beer";

// Light roasting of Rob, who is not in the beer club. Friendly, absurd, nothing about him personally.
export const ROB_LINES = [
  "Rob has not been invited and has not noticed.",
  "Rob was not invited. We checked twice, then stopped checking.",
  "Reminder: Rob is not invited. This message was not sent to Rob.",
  "Rob heard there was a beer club. Rob was told it is a book club. Rob believed it.",
  "Rob is not invited, but we respect that he is still thinking about it.",
  "Not invited: Rob. Fully invited: everyone else who owns a bottle opener.",
  "We held a vote on inviting Rob. It was a very short meeting.",
  "Rob's invitation is in the mail. The mail does not exist.",
  "Rob remains uninvited. He's taking it like a champ, which is to say he doesn't know.",
  "Rob was not invited, and the beer is better for it. Scientifically unproven.",
  "Rob, if you're reading this by mistake: hi. Still not invited.",
  "Rob is on the waiting list. The waiting list is a napkin and we lost it.",
  "The beer club has one rule: Rob is not invited. The other rule is also Rob.",
  "Rob has been uninvited so smoothly that he thinks he's on a break.",
  "Rob is not invited. He has a standing reservation for the next life.",
  "Somewhere, Rob is not at the beer club. A moment of silence, then another round.",
];

export const pickRoast = (last = -1, rand = Math.random) => {
  let k;
  do k = Math.floor(rand() * ROB_LINES.length); while (k === last && ROB_LINES.length > 1);
  return k;
};

const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");

// names: all four names; d: { total[], today[] } from /beer; me: signed-in index (or null); players: indexes with a counter.
// Returns { text, url } where text does NOT include the link and full = text + link for fallbacks.
export function buildMessage({ names, d, me, players = [0, 1, 3], roast }) {
  const lines = [];
  if (d && players.includes(me)) {
    lines.push("🍺 " + names[me] + ": " + plural(d.total[me], "beer") + " total, " + d.today[me] + " today.");
  } else lines.push("🍺 The beer club standings:");
  if (d) {
    const order = players.slice().sort((a, b) => d.total[b] - d.total[a] || a - b);
    lines.push("Standings: " + order.map((i) => names[i] + " " + d.total[i]).join(", ") + ".");
  }
  lines.push(roast ?? ROB_LINES[0]);
  const text = lines.join("\n");
  return { text, url: BEER_URL, full: text + "\n" + BEER_URL };
}

export const isIOS = (nav = navigator) =>
  /iPad|iPhone|iPod/.test(nav.userAgent || "") || (nav.platform === "MacIntel" && (nav.maxTouchPoints || 0) > 1);
export const isMobile = (nav = navigator) => isIOS(nav) || /Android/i.test(nav.userAgent || "");

// No recipient. iOS wants "sms:&body=", Android "sms:?body=".
export const smsHref = (body, ios) => "sms:" + (ios ? "&" : "?") + "body=" + encodeURIComponent(body);

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  try {
    const t = document.createElement("textarea");
    t.value = text; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(t); t.select(); t.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy"); t.remove(); return ok;
  } catch { return false; }
}

// Resolves to "shared" | "cancelled" | "sms" | "copied" | "failed". Never touches the beer counts.
export async function shareMessage(msg) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try { await navigator.share({ text: msg.text, url: msg.url }); return "shared"; }
    catch (e) { if (e && e.name === "AbortError") return "cancelled"; /* else fall through */ }
  }
  if (isMobile()) { location.href = smsHref(msg.full, isIOS()); return "sms"; }
  return (await copy(msg.full)) ? "copied" : "failed";
}
