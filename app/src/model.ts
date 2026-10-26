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
  quality: Quality;
}

/** Decode a photo. createImageBitmap applies EXIF rotation and, unlike img.decode(), never stalls in background tabs. */
export function fileToImage(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

/** Draw a region of the source onto a 224x224 canvas (center square crop by default). */
export function regionToCanvas(src: CanvasImageSource & { width: number; height: number }, r?: { x: number; y: number; w: number; h: number }) {
  const sw = src.width;
  const sh = src.height;
  const side = Math.min(sw, sh);
  r ??= { x: (sw - side) / 2, y: (sh - side) / 2, w: side, h: side };
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  c.getContext("2d")!.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, SIZE, SIZE);
  return c;
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

  const quality = checkQuality(data);
  return { classId, confidence: probs[classId], probs, diseaseProb, quality, unsure: probs[classId] < UNSURE_BELOW || quality.warnings.includes("warnNoLeaf") };
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
