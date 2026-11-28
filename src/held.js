// Photos held on this device until the day is finished. Nothing here touches the server: the shrunk JPEG lives in
// IndexedDB under "<person>:<day>" (survives reload and closing the app) and is posted by App once the day is checked.
const open = () => new Promise((res, rej) => {
  if (!window.indexedDB) return rej(new Error("This browser can't keep a photo for later"));
  const r = indexedDB.open("boyz-held", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("p");
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error || new Error("Couldn't open storage"));
});
const run = async (mode, f) => {
  const d = await open();
  try {
    return await new Promise((res, rej) => {
      const t = d.transaction("p", mode), q = f(t.objectStore("p"));
      t.oncomplete = () => res(q?.result);
      t.onerror = t.onabort = () => rej(t.error || new Error("Storage failed"));
    });
  } finally { d.close(); }
};
const k = (me, day) => me + ":" + day;
export const holdPhoto = (me, day, blob) => run("readwrite", (s) => s.put(blob, k(me, day)));
export const getHeld = (me, day) => run("readonly", (s) => s.get(k(me, day))).catch(() => undefined);
export const dropHeld = (me, day) => run("readwrite", (s) => s.delete(k(me, day))).catch(() => {});
// Days (numbers) this person has a photo held for.
export const heldDays = (me) => run("readonly", (s) => s.getAllKeys())
  .then((ks) => (ks || []).filter((x) => String(x).startsWith(me + ":")).map((x) => +String(x).split(":")[1])).catch(() => []);
