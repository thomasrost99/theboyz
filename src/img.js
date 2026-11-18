// Shrinks a phone photo to a JPEG of about 300 KB (max 1280 px on the long side) before upload.
export async function compress(file, maxBytes = 300000) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(bmp.width * k);
  cv.height = Math.round(bmp.height * k);
  cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
  let q = 0.85, blob;
  do {
    blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", q));
    q -= 0.1;
  } while (blob.size > maxBytes && q > 0.3);
  return blob;
}
