import * as ort from "onnxruntime-web/wasm";
import { CLASS_CROP, isHealthy, type ClassId, type Crop } from "./diseases";

const BASE = import.meta.env.BASE_URL;
const SIZE = 224;
export const UNSURE_BELOW = 0.6;

// The Vite dev server refuses dynamic imports from public/, so dev loads the runtime from node_modules.
ort.env.wasm.wasmPaths = import.meta.env.DEV ? "/node_modules/onnxruntime-web/dist/" : new URL(`${BASE}ort/`, document.baseURI).href;
ort.env.wasm.numThreads = 1; // no cross-origin isolation needed; fine for one 224px image

export interface ModelInfo { classes: ClassId[]; test_accuracy: number; test_macro_f1: number; test_images: number; version: string }

let session: Promise<{ s: ort.InferenceSession; info: ModelInfo }> | null = null;
export function loadModel() {
  session ??= (async () => {
    const info: ModelInfo = await (await fetch(`${BASE}model/model-info.json`)).json();
    const s = await ort.InferenceSession.create(`${BASE}model/avis.onnx`, { executionProviders: ["wasm"] });
    return { s, info };
  })();
  session.catch(() => (session = null));
  return session;
}

export interface Quality { plantFraction: number; brightness: number; sharpness: number; warnings: ("warnNoLeaf" | "warnDark" | "warnBright" | "warnBlur")[] }
export interface Prediction {
  classId: ClassId;
  confidence: number;
  probs: Record<ClassId, number>;
  diseaseProb: number;
  unsure: boolean;
  cam: Float32Array; // 7x7 activation map for the predicted class, normalised 0..1
  quality: Quality;
}

/** Decode a photo. createImageBitmap applies EXIF rotation and, unlike img.decode(), never stalls in background tabs. */
export function fileToImage(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

/** Draw a region of the source onto a square canvas (center square crop by default). */
export function regionToCanvas(src: CanvasImageSource & { width: number; height: number }, r?: { x: number; y: number; w: number; h: number }, size = SIZE) {
  const sw = src.width, sh = src.height;
  const side = Math.min(sw, sh);
  r ??= { x: (sw - side) / 2, y: (sh - side) / 2, w: side, h: side };
  const c = document.createElement("canvas");
  c.width = c.height = size;
  c.getContext("2d")!.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, size, size);
  return c;
}

function hsv(r: number, g: number, b: number) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s: max ? d / max : 0, v: max / 255 };
}

function isPlant(r: number, g: number, b: number) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (max < 35 || d / (max || 1) < 0.16) return false;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return h >= 22 && h <= 170; // yellow-brown lesions through deep green
}

export function checkQuality(data: ImageData): Quality {
  const px = data.data, n = SIZE * SIZE;
  const gray = new Float32Array(n);
  let plant = 0, lum = 0;
  for (let i = 0; i < n; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    if (isPlant(r, g, b)) plant++;
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    lum += gray[i];
  }
  // Variance of the Laplacian: a standard, cheap focus measure.
  let s = 0, s2 = 0, m = 0;
  for (let y = 1; y < SIZE - 1; y++)
    for (let x = 1; x < SIZE - 1; x++) {
      const i = y * SIZE + x;
      const v = gray[i - 1] + gray[i + 1] + gray[i - SIZE] + gray[i + SIZE] - 4 * gray[i];
      s += v; s2 += v * v; m++;
    }
  const q: Quality = { plantFraction: plant / n, brightness: lum / n, sharpness: s2 / m - (s / m) ** 2, warnings: [] };
  if (q.plantFraction < 0.2) q.warnings.push("warnNoLeaf");
  if (q.brightness < 45) q.warnings.push("warnDark");
  if (q.brightness > 225) q.warnings.push("warnBright");
  if (q.sharpness < 20) q.warnings.push("warnBlur");
  return q;
}

export async function classifyCanvas(canvas: HTMLCanvasElement, crop: Crop | "auto"): Promise<Prediction> {
  const { s, info } = await loadModel();
  const data = canvas.getContext("2d")!.getImageData(0, 0, SIZE, SIZE);
  const n = SIZE * SIZE, input = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    input[i] = data.data[i * 4] / 255;
    input[n + i] = data.data[i * 4 + 1] / 255;
    input[2 * n + i] = data.data[i * 4 + 2] / 255;
  }
  const out = await s.run({ image: new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]) });
  const raw = out.probs.data as Float32Array;
  const camAll = out.cam.data as Float32Array;

  // If the grower told us the crop, only compare that crop's classes.
  const allowed = info.classes.map((c) => crop === "auto" || CLASS_CROP[c] === crop);
  const total = info.classes.reduce((a, _, i) => a + (allowed[i] ? raw[i] : 0), 0) || 1;
  const probs = {} as Record<ClassId, number>;
  let best = 0;
  info.classes.forEach((c, i) => {
    probs[c] = allowed[i] ? raw[i] / total : 0;
    if (probs[c] > probs[info.classes[best]]) best = i;
  });
  const classId = info.classes[best];
  const diseaseProb = info.classes.reduce((a, c) => a + (isHealthy(c) ? 0 : probs[c]), 0);

  // CAM for the "diseased" class of the predicted crop: shows where lesions drove the score.
  const camClass = info.classes.findIndex((c) => CLASS_CROP[c] === CLASS_CROP[classId] && !isHealthy(c));
  const cam = camAll.slice(camClass * 49, camClass * 49 + 49);
  let lo = Infinity, hi = -Infinity;
  cam.forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); });
  for (let i = 0; i < 49; i++) cam[i] = hi > lo ? (cam[i] - lo) / (hi - lo) : 0;

  const quality = checkQuality(data);
  return { classId, confidence: probs[classId], probs, diseaseProb, cam, quality, unsure: probs[classId] < UNSURE_BELOW || quality.warnings.includes("warnNoLeaf") };
}

/** Box blur of a size x size field with the given radius, using a summed-area table. */
function boxBlur(src: Float32Array, size: number, radius: number) {
  const w = size + 1, sat = new Float64Array(w * w), out = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      sat[(y + 1) * w + x + 1] = src[y * size + x] + sat[y * w + x + 1] + sat[(y + 1) * w + x] - sat[y * w + x];
  for (let y = 0; y < size; y++) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(size, y + radius + 1);
    for (let x = 0; x < size; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(size, x + radius + 1);
      out[y * size + x] = (sat[y1 * w + x1] - sat[y0 * w + x1] - sat[y1 * w + x0] + sat[y0 * w + x0]) / ((y1 - y0) * (x1 - x0));
    }
  }
  return out;
}

export interface LesionMap { heat: Float32Array; size: number; spots: number; affected: number }

/**
 * Pixel-level disease heat map. Colour analysis finds off-green tissue (yellow halos,
 * brown/black spots, grey blight) inside the leaf; the model's CAM then weights it so
 * only regions the AI actually relied on light up strongly.
 */
export function lesionMap(display: HTMLCanvasElement, cam: Float32Array): LesionMap {
  const S = display.width, n = S * S;
  const px = display.getContext("2d")!.getImageData(0, 0, S, S).data;
  const plant = new Float32Array(n), H = new Float32Array(n), Sat = new Float32Array(n), V = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    const c = hsv(r, g, b);
    H[i] = c.h; Sat[i] = c.s; V[i] = c.v;
    if (isPlant(r, g, b)) plant[i] = 1;
  }
  // Leaf region: plant pixels plus anything enclosed by them (dark spots sit inside the leaf).
  const leaf = boxBlur(plant, S, Math.max(3, Math.round(S / 40)));
  // Local brightness: a spot is dark relative to the leaf right around it, while a broad
  // shadow darkens its whole neighbourhood and so does not count.
  const localV = boxBlur(V, S, Math.max(4, Math.round(S / 28)));

  // Baseline: this photo's typical healthy leaf colour (median hue and saturation of plant pixels).
  const hueHist = new Uint32Array(360), satHist = new Uint32Array(101);
  let plantPx = 0;
  for (let i = 0; i < n; i++) if (plant[i]) { hueHist[Math.floor(H[i]) % 360]++; satHist[Math.round(Sat[i] * 100)]++; plantPx++; }
  const median = (hist: Uint32Array) => { let acc = 0; for (let k = 0; k < hist.length; k++) if ((acc += hist[k]) * 2 >= plantPx) return k; return 0; };
  const leafHue = plantPx ? median(hueHist) : 100, leafSat = plantPx ? median(satHist) / 100 : 0.4;

  const raw = new Float32Array(n), inLeaf = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!(plant[i] || leaf[i] >= 0.35)) continue;
    inLeaf[i] = 1;
    const h = H[i], s = Sat[i], v = V[i], lv = localV[i];
    // Dark and washed-out signals only count well inside a leaf: at its rim, pixels blend
    // with shadow or background and would otherwise light up the outline.
    const enclosed = Math.max(0, Math.min(1, (leaf[i] - 0.7) / 0.2));
    // Browner/yellower than the healthy leaf (hue shifted down toward orange), or red/purple.
    // Vivid, bright orange/yellow is a flower or fruit rather than a dull lesion, and colour
    // at the very rim is mostly blending with the background, so both count for less.
    const vivid = s > 0.55 && v > 0.65 ? 0.15 : 1;
    const hueShift = s >= 0.12 ? vivid * (0.3 + 0.7 * enclosed) * (h > 300 ? 1 : Math.max(0, Math.min(1, (leafHue - 18 - h) / 30))) : 0;
    // Washed-out grey/beige tissue (late blight, dead patches); skip bright glare.
    const desat = v < 0.88 ? 0.9 * enclosed * Math.max(0, Math.min(1, (0.7 * leafSat - s) / (0.45 * leafSat || 1))) : 0;
    const dark = enclosed * Math.max(0, Math.min(1, (0.82 * lv - v) / (0.3 * lv || 1)));
    raw[i] = Math.max(hueShift, desat, dark);
  }
  // Weight by the bilinearly upsampled 7x7 class activation map. Leaf pixels the model focused
  // on (CAM >= 0.3) define the leaf under examination for the "% affected" readout.
  const focus = new Uint8Array(n);
  let focusPx = 0;
  for (let y = 0; y < S; y++) {
    const cy = Math.min(6, Math.max(0, ((y + 0.5) / S) * 7 - 0.5)), y0 = Math.floor(cy), y1 = Math.min(6, y0 + 1), fy = cy - y0;
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      if (!inLeaf[i]) continue;
      const cx = Math.min(6, Math.max(0, ((x + 0.5) / S) * 7 - 0.5)), x0 = Math.floor(cx), x1 = Math.min(6, x0 + 1), fx = cx - x0;
      const a = cam[y0 * 7 + x0] * (1 - fx) + cam[y0 * 7 + x1] * fx, b = cam[y1 * 7 + x0] * (1 - fx) + cam[y1 * 7 + x1] * fx;
      const c = a * (1 - fy) + b * fy;
      if (c >= 0.3) { focus[i] = 1; focusPx++; }
      raw[i] *= 0.15 + 0.85 * c; // background foliage the AI ignored stays cool
    }
  }
  const heat = boxBlur(raw, S, Math.max(1, Math.round(S / 224)));

  // Severity: connected hot regions (spots) and the share of the examined leaf they cover.
  const hot = new Uint8Array(n);
  let hotFocus = 0;
  for (let i = 0; i < n; i++) if (heat[i] >= 0.35) { hot[i] = 1; hotFocus += focus[i]; }
  const minArea = 6 * (S / 224) ** 2, stack: number[] = [];
  let spots = 0;
  for (let i = 0; i < n; i++) {
    if (hot[i] !== 1) continue;
    let area = 0;
    hot[i] = 2; stack.push(i);
    while (stack.length) {
      const j = stack.pop()!, x = j % S;
      area++;
      for (const k of [j - S, j + S, x > 0 ? j - 1 : -1, x < S - 1 ? j + 1 : -1])
        if (k >= 0 && k < n && hot[k] === 1) { hot[k] = 2; stack.push(k); }
    }
    if (area >= minArea) spots++;
  }
  return { heat, size: S, spots, affected: focusPx ? hotFocus / focusPx : 0 };
}

// Thermal-style colour scale: cool blue (healthy) -> cyan -> green -> yellow -> red (disease).
const STOPS = [[40, 70, 210], [30, 185, 230], [70, 200, 90], [250, 205, 40], [225, 30, 30]];
const LUT = Array.from({ length: 256 }, (_, i) => {
  const t = (i / 255) * (STOPS.length - 1), k = Math.min(STOPS.length - 2, Math.floor(t)), f = t - k;
  return STOPS[k].map((c, j) => c + (STOPS[k + 1][j] - c) * f);
});

/** Shade the whole photo with the heat map so every spot shows up at its exact location. */
export function drawHeatmap(target: HTMLCanvasElement, display: HTMLCanvasElement, map: LesionMap) {
  const S = map.size;
  target.width = target.height = S;
  const ctx = target.getContext("2d")!;
  ctx.drawImage(display, 0, 0);
  const img = ctx.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < S * S; i++) {
    const v = Math.min(1, map.heat[i] * 1.9), col = LUT[Math.round(v * 255)], a = 0.5 + 0.25 * v;
    d[i * 4] = d[i * 4] * (1 - a) + col[0] * a;
    d[i * 4 + 1] = d[i * 4 + 1] * (1 - a) + col[1] * a;
    d[i * 4 + 2] = d[i * 4 + 2] * (1 - a) + col[2] * a;
  }
  ctx.putImageData(img, 0, 0);
}

export function thumbnail(src: CanvasImageSource, w: number, h: number, max = 320) {
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.75);
}

/** Read GPS latitude/longitude from JPEG EXIF (phones and DJI-style drones write this). */
export async function readExifGps(file: Blob): Promise<{ lat: number; lon: number } | null> {
  try {
    const v = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (v.getUint16(0) !== 0xffd8) return null;
    let off = 2;
    while (off < v.byteLength - 4) {
      const marker = v.getUint16(off), len = v.getUint16(off + 2);
      if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) {
        const t = off + 10, le = v.getUint16(t) === 0x4949;
        const u16 = (o: number) => v.getUint16(t + o, le), u32 = (o: number) => v.getUint32(t + o, le);
        const findTag = (ifd: number, tag: number) => {
          const n = u16(ifd);
          for (let i = 0; i < n; i++) if (u16(ifd + 2 + i * 12) === tag) return ifd + 2 + i * 12;
          return -1;
        };
        const gpsEntry = findTag(u32(4), 0x8825);
        if (gpsEntry < 0) return null;
        const gps = u32(gpsEntry + 8);
        const coord = (tag: number) => {
          const e = findTag(gps, tag);
          if (e < 0) return NaN;
          const p = u32(e + 8), r = (k: number) => u32(p + k * 8) / u32(p + k * 8 + 4);
          return r(0) + r(1) / 60 + r(2) / 3600;
        };
        const ref = (tag: number) => { const e = findTag(gps, tag); return e < 0 ? "" : String.fromCharCode(v.getUint8(t + e + 8)); };
        let lat = coord(2), lon = coord(4);
        if (ref(1) === "S") lat = -lat;
        if (ref(3) === "W") lon = -lon;
        return Number.isFinite(lat) && Number.isFinite(lon) && (lat || lon) ? { lat, lon } : null;
      }
      if ((marker & 0xff00) !== 0xff00) break;
      off += 2 + len;
    }
  } catch { /* malformed EXIF: treat as no GPS */ }
  return null;
}
