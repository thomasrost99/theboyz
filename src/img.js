// Shrinks a phone photo to a JPEG of about 300 KB (max 1280 px on the long side) before upload.
// Android quirks handled: older Chrome/WebView throw on createImageBitmap's imageOrientation "from-image",
// pickers can hand over files with an empty or odd MIME type, and some decoders only work through <img>.
async function decode(file) {
  try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch {}
  try { return await createImageBitmap(file); } catch {} // browsers apply EXIF orientation by default
  const url = URL.createObjectURL(file); // last resort: plain <img>
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 10000); }
}

export async function compress(file, maxBytes = 300000) {
  if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name || "")) throw new Error("HEIC photos aren't supported, set the camera to JPEG or pick another");
  let bmp;
  try { bmp = await decode(file); } catch { throw new Error("Couldn't read that photo, try another"); }
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
  if (!w || !h) throw new Error("Couldn't read that photo, try another");
  let k = Math.min(1, 1280 / Math.max(w, h));
  let blob;
  for (let tries = 0; tries < 3 && !blob; tries++, k *= 0.6) { // retry smaller if the canvas fails (low memory)
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(w * k));
    cv.height = Math.max(1, Math.round(h * k));
    const ctx = cv.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); // PNG/WebP transparency would turn black
    ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
    let q = 0.85, b;
    do {
      b = await new Promise((r) => cv.toBlob(r, "image/jpeg", q));
      q -= 0.1;
    } while (b && b.size > maxBytes && q > 0.3);
    if (b && b.type === "image/jpeg" && b.size > 100) blob = b;
  }
  bmp.close?.();
  if (!blob) throw new Error("Couldn't shrink that photo, try another");
  return blob;
}
