import test from "node:test";
import assert from "node:assert/strict";
import { buildMessage, smsHref, pickRoast, ROB_LINES, BEER_URL, isIOS } from "./share.js";

const names = ["Tommy", "Hayden", "Rob", "Jack"];
const d = { total: [42, 37, 0, 12], today: [3, 1, 0, 1] };

test("own stat, standings sorted, roast, link", () => {
  const m = buildMessage({ names, d, me: 0, roast: ROB_LINES[0] });
  assert.match(m.text, /Tommy: 42 beers total, 3 today\./);
  assert.match(m.text, /Standings: Tommy 42, Hayden 37, Jack 12\./);
  assert.ok(m.text.includes("Rob has not been invited"));
  assert.ok(!m.text.includes("http"));
  assert.ok(m.full.endsWith(BEER_URL));
  assert.equal(BEER_URL, "https://theboyz.pages.dev/#beer");
});
test("singular and ordering", () => {
  const m = buildMessage({ names, d: { total: [1, 5, 0, 2], today: [1, 0, 0, 0] }, me: 0 });
  assert.match(m.text, /1 beer total/);
  assert.match(m.text, /Hayden 5, Jack 2, Tommy 1/);
});
test("Rob (no counter) gets standings only", () => {
  const m = buildMessage({ names, d, me: 2 });
  assert.match(m.text, /beer club standings/);
  assert.ok(!m.text.includes("Rob: "));
});
test("sms syntax", () => {
  assert.equal(smsHref("a b\n&c", true), "sms:&body=a%20b%0A%26c");
  assert.equal(smsHref("a b", false), "sms:?body=a%20b");
});
test("roast pool", () => {
  assert.ok(ROB_LINES.length >= 15);
  assert.equal(new Set(ROB_LINES).size, ROB_LINES.length);
  for (let i = 0; i < 200; i++) assert.notEqual(pickRoast(3), 3);
  assert.ok(ROB_LINES.every((l) => /Rob/.test(l)));
});
test("iOS detection", () => {
  assert.ok(isIOS({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)", platform: "iPhone" }));
  assert.ok(isIOS({ userAgent: "Macintosh", platform: "MacIntel", maxTouchPoints: 5 }));
  assert.ok(!isIOS({ userAgent: "Android 14", platform: "Linux armv8l" }));
});
