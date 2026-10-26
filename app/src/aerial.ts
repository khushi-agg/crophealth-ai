// Drone / aerial field-health analysis.
//
// From 20–120 m a drone camera cannot resolve individual leaf lesions, so the leaf
// classifier is the wrong tool up there. Instead this follows what RGB drone
// "plant health" maps do: a visible-band vegetation index (VARI) per pixel, compared
// against the rest of the same field, plus detection of bare/dead gaps in the canopy.
// Drone metadata (altitude, camera, heading, GPS) turns pixels into square metres and
// puts every hotspot on the map so a grower can walk straight to it.

export interface DroneMeta {
  lat?: number;
  lon?: number;
  altitude?: number; // metres above take-off point
  pitch?: number; // gimbal pitch, -90 = straight down
  yaw?: number; // camera heading, degrees clockwise from north
  focal35?: number; // 35 mm-equivalent focal length
  model?: string;
}

export interface Hotspot { id: number; x: number; y: number; px: number; areaM2?: number; lat?: number; lon?: number; kind: "stress" | "gap" }

export interface FieldHealth {
  width: number;
  height: number;
  field: Uint8Array; // 1 = inside the analysed field
  stress: Float32Array; // 0 healthy .. 1 strongly stressed / missing canopy
  fieldPx: number;
  flaggedPx: number;
  hotspots: Hotspot[];
  gsdCm?: number; // ground size of one analysed pixel, cm
  fieldAreaM2?: number;
  nadir: boolean;
}

const MAX_DIM = 1000;

/** Read DJI-style XMP (altitude, gimbal, heading) and EXIF (GPS, 35 mm focal length). */
export async function readDroneMeta(file: Blob): Promise<DroneMeta> {
  const buf = await file.slice(0, 512 * 1024).arrayBuffer();
  const meta: DroneMeta = {};
  const text = new TextDecoder("latin1").decode(buf);
  const xmp = (key: string) => {
    const m = text.match(new RegExp(`${key}\\s*=\\s*"([+-]?[\\d.]+)"`)) ?? text.match(new RegExp(`${key}>\\s*([+-]?[\\d.]+)\\s*<`));
    return m ? parseFloat(m[1]) : undefined;
  };
  meta.altitude = xmp("RelativeAltitude");
  meta.pitch = xmp("GimbalPitchDegree");
  meta.yaw = xmp("GimbalYawDegree") ?? xmp("FlightYawDegree");
  Object.assign(meta, parseExif(new DataView(buf)));
  return meta;
}

function parseExif(v: DataView): Partial<DroneMeta> {
  try {
    if (v.getUint16(0) !== 0xffd8) return {};
    let off = 2;
    while (off < v.byteLength - 4) {
      const marker = v.getUint16(off), len = v.getUint16(off + 2);
      if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) {
        const t = off + 10, le = v.getUint16(t) === 0x4949;
        const u16 = (o: number) => v.getUint16(t + o, le), u32 = (o: number) => v.getUint32(t + o, le);
        const entries = (ifd: number) => {
          const out = new Map<number, number>();
          for (let i = 0, n = u16(ifd); i < n; i++) out.set(u16(ifd + 2 + i * 12), ifd + 2 + i * 12);
          return out;
        };
        const ifd0 = entries(u32(4)), res: Partial<DroneMeta> = {};
        // Entry offsets are relative to the TIFF header at t; values over 4 bytes live elsewhere.
        const ascii = (e: number) => {
          const n = u32(e + 4), base = n > 4 ? u32(e + 8) : e + 8;
          let s = "";
          for (let i = 0; i < n - 1; i++) s += String.fromCharCode(v.getUint8(t + base + i));
          return s;
        };
        if (ifd0.has(0x0110)) res.model = ascii(ifd0.get(0x0110)!).trim();
        if (ifd0.has(0x8769)) {
          const exif = entries(u32(ifd0.get(0x8769)! + 8));
          if (exif.has(0xa405)) res.focal35 = u16(exif.get(0xa405)! + 8);
        }
        if (ifd0.has(0x8825)) {
          const gps = entries(u32(ifd0.get(0x8825)! + 8));
          const coord = (tag: number) => {
            const e = gps.get(tag);
            if (e === undefined) return NaN;
            const p = u32(e + 8), r = (k: number) => u32(p + k * 8) / u32(p + k * 8 + 4);
            return r(0) + r(1) / 60 + r(2) / 3600;
          };
          const ref = (tag: number) => { const e = gps.get(tag); return e === undefined ? "" : String.fromCharCode(v.getUint8(t + e + 8)); };
          let lat = coord(2), lon = coord(4);
          if (ref(1) === "S") lat = -lat;
          if (ref(3) === "W") lon = -lon;
          if (Number.isFinite(lat) && Number.isFinite(lon) && (lat || lon)) Object.assign(res, { lat, lon });
        }
        return res;
      }
      if ((marker & 0xff00) !== 0xff00) break;
      off += 2 + len;
    }
  } catch { /* malformed EXIF: no metadata */ }
  return {};
}

function boxBlur(src: Float32Array, w: number, h: number, r: number) {
  const W = w + 1, sat = new Float64Array(W * (h + 1)), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      sat[(y + 1) * W + x + 1] = src[y * w + x] + sat[y * W + x + 1] + sat[(y + 1) * W + x] - sat[y * W + x];
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      out[y * w + x] = (sat[y1 * W + x1] - sat[y0 * W + x1] - sat[y1 * W + x0] + sat[y0 * W + x0]) / ((y1 - y0) * (x1 - x0));
    }
  }
  return out;
}

function otsu(values: Float32Array, lo: number, hi: number) {
  const bins = 128, hist = new Float64Array(bins);
  for (const v of values) hist[Math.max(0, Math.min(bins - 1, Math.floor(((v - lo) / (hi - lo)) * bins)))]++;
  let total = 0, sum = 0;
  hist.forEach((c, i) => { total += c; sum += c * i; });
  let wB = 0, sB = 0, best = 0, th = 0;
  for (let i = 0; i < bins; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sB += hist[i] * i;
    const between = wB * wF * (sB / wB - (sum - sB) / wF) ** 2;
    if (between > best) { best = between; th = i; }
  }
  return lo + ((th + 0.5) / bins) * (hi - lo);
}

function median(arr: number[]) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Draw the frame at analysis resolution. */
export function frameCanvas(img: ImageBitmap) {
  const k = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/**
 * Analyse field health. `seed` (fractions of width/height) picks the field to analyse;
 * without one, the largest crop field in the frame is chosen automatically.
 */
export function analyzeField(canvas: HTMLCanvasElement, meta: DroneMeta, seed?: { x: number; y: number }): FieldHealth {
  const w = canvas.width, h = canvas.height, n = w * h;
  const px = canvas.getContext("2d")!.getImageData(0, 0, w, h).data;
  const exg = new Float32Array(n), vari = new Float32Array(n), rc = new Float32Array(n), gc = new Float32Array(n), val = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const R = px[i * 4], G = px[i * 4 + 1], B = px[i * 4 + 2], s = R + G + B || 1;
    rc[i] = R / s; gc[i] = G / s; val[i] = Math.max(R, G, B) / 255;
    exg[i] = 2 * gc[i] - rc[i] - B / s; // excess green: separates plants from soil
    const d = G + R - B;
    vari[i] = Math.abs(d) < 1 ? 0 : Math.max(-1, Math.min(1, (G - R) / d)); // visible atmospherically resistant index
  }

  // 1. Vegetation vs soil/water/road.
  const exgT = Math.max(0.03, Math.min(0.06, otsu(exg, -0.2, 0.5))); // yellow-green crops sit near 0.05–0.1
  const veg = new Float32Array(n);
  for (let i = 0; i < n; i++) veg[i] = exg[i] > exgT ? 1 : 0;

  // 2. Find the field: every area whose large-scale colour and plant cover match the tapped
  //    spot (so blocks split by paths or tramlines still count), smoothed, then hole-filled so
  //    stressed or bare patches inside the field stay part of it.
  const R = Math.max(6, Math.round(Math.max(w, h) / 40));
  const bR = boxBlur(rc, w, h, R), bG = boxBlur(gc, w, h, R), bV = boxBlur(val, w, h, R), bVeg = boxBlur(veg, w, h, R);
  // Colour (chromaticity) separates crops from grass margins; brightness gets little weight
  // because sun angle and lens vignetting change it across a single frame.
  const similar = (i: number, s0: number) =>
    ((bR[i] - bR[s0]) / 0.035) ** 2 + ((bG[i] - bG[s0]) / 0.035) ** 2 + ((bV[i] - bV[s0]) / 0.35) ** 2 + ((bVeg[i] - bVeg[s0]) / 0.5) ** 2 < 1;
  const at = (p: { x: number; y: number }) => Math.min(h - 1, Math.max(0, Math.round(p.y * h))) * w + Math.min(w - 1, Math.max(0, Math.round(p.x * w)));
  let s0 = at(seed ?? { x: 0.5, y: 0.5 });
  if (!seed) {
    // No tap yet: pick the vegetated spot with the largest connected look-alike area.
    let best = -1;
    const seen = new Int32Array(n).fill(-1);
    for (const fy of [0.2, 0.5, 0.8]) for (const fx of [0.2, 0.5, 0.8]) {
      const c = at({ x: fx, y: fy });
      if (bVeg[c] < 0.35 || seen[c] >= 0) continue; // row crops from altitude show soil between rows
      let count = 0;
      const q = [c];
      seen[c] = c;
      while (q.length) {
        const j = q.pop()!, x = j % w;
        count++;
        for (const k of [j - w, j + w, x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1])
          if (k >= 0 && k < n && seen[k] !== c && similar(k, c)) { seen[k] = c; q.push(k); }
      }
      if (count > best) { best = count; s0 = c; }
    }
  }
  const like = new Float32Array(n);
  for (let i = 0; i < n; i++) like[i] = similar(i, s0) ? 1 : 0;
  const likeSmooth = boxBlur(like, w, h, Math.round(R / 2));
  // Keep only the look-alike area connected to the chosen spot: "this field".
  const core = new Float32Array(n);
  const stack: number[] = [s0];
  core[s0] = 1;
  while (stack.length) {
    const j = stack.pop()!, x = j % w;
    for (const k of [j - w, j + w, x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1])
      if (k >= 0 && k < n && !core[k] && likeSmooth[k] >= 0.5) { core[k] = 1; stack.push(k); }
  }
  // Morphological closing (dilate, then erode) bridges damaged patches that cut into the field
  // from the frame edge, which hole-filling alone cannot reach.
  const CR = Math.round(Math.max(w, h) / 9);
  const grown = boxBlur(core, w, h, CR);
  const closed = boxBlur(grown.map((v) => (v > 0.02 ? 1 : 0)), w, h, CR);
  const field = new Uint8Array(n);
  for (let i = 0; i < n; i++) field[i] = core[i] || closed[i] > 0.98 ? 1 : 0;
  // Fill holes: anything not reachable from the border without crossing the field.
  const outside = new Uint8Array(n);
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { const i = y * w + x; if (!field[i] && !outside[i]) { outside[i] = 1; stack.push(i); } }
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) { const i = y * w + x; if (!field[i] && !outside[i]) { outside[i] = 1; stack.push(i); } }
  while (stack.length) {
    const j = stack.pop()!, x = j % w;
    for (const k of [j - w, j + w, x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1])
      if (k >= 0 && k < n && !field[k] && !outside[k]) { outside[k] = 1; stack.push(k); }
  }
  let fieldPx = 0;
  for (let i = 0; i < n; i++) if (!outside[i]) { field[i] = 1; fieldPx++; }

  // 3. Canopy stress: vegetation index, averaged over plant pixels only (so soil in wheel
  //    tracks and paths can't drag it down), well below this field's own typical value.
  const vegFrac = boxBlur(veg, w, h, 2), variVeg = boxBlur(vari.map((v, i) => v * veg[i]), w, h, 2);
  const vs = new Float32Array(n);
  for (let i = 0; i < n; i++) vs[i] = vegFrac[i] > 0 ? variVeg[i] / vegFrac[i] : 0;
  const sample: number[] = [];
  for (let i = 0; i < n; i += 7) if (field[i] && vegFrac[i] > 0.85) sample.push(vs[i]);
  const med = median(sample), mad = Math.max(0.01, median(sample.map((v) => Math.abs(v - med))));
  // 4. Canopy gaps: bare/dead blobs inside the field (thin wheel tracks average away).
  const gapR = Math.max(4, Math.round(Math.max(w, h) / 160));
  const gapFrac = boxBlur(veg.map((v) => 1 - v), w, h, gapR);
  const stress = new Float32Array(n);
  // 5. Thinning canopy: plant cover over ~2–3 m patches well below this field's typical cover.
  //    Plants dying back (blight, root rot, drought) leave more soil showing between rows.
  const cover = boxBlur(veg, w, h, Math.max(8, Math.round(Math.max(w, h) / 60)));
  const coverSample: number[] = [];
  for (let i = 0; i < n; i += 7) if (field[i]) coverSample.push(cover[i]);
  const medCover = Math.max(0.05, median(coverSample));
  for (let i = 0; i < n; i++) {
    if (!field[i]) continue;
    const low = vegFrac[i] > 0.85 ? Math.max(0, Math.min(1, (med - vs[i]) / (4 * mad))) : 0;
    const gap = Math.max(0, Math.min(1, (gapFrac[i] - 0.72) / 0.18));
    const thin = Math.max(0, Math.min(1, (0.75 * medCover - cover[i]) / (0.35 * medCover)));
    stress[i] = Math.max(low, gap, thin);
  }
  const smooth = boxBlur(stress, w, h, Math.max(2, Math.round(Math.max(w, h) / 250)));

  // 6. Ground scale and hotspot geolocation from drone metadata.
  const nadir = meta.pitch !== undefined ? meta.pitch <= -75 : false;
  let gsdCm: number | undefined;
  if (meta.altitude && meta.focal35 && nadir) {
    const diagM = (meta.altitude * 43.27) / meta.focal35; // ground diagonal of the frame
    const widthM = (diagM * w) / Math.hypot(w, h);
    gsdCm = (widthM / w) * 100;
  }
  const m2PerPx = gsdCm ? (gsdCm / 100) ** 2 : undefined;

  // 7. Hotspots: connected stressed regions, largest first. Long thin regions are wheel
  //    tracks, tramlines and paths (deliberate, not a crop problem), so they are dropped.
  const hot = new Uint8Array(n);
  let flaggedPx = 0;
  for (let i = 0; i < n; i++) if (field[i] && smooth[i] >= 0.5) { hot[i] = 1; flaggedPx++; }
  const minPx = Math.max(25, fieldPx * 0.0015);
  const spots: Hotspot[] = [];
  for (let i = 0; i < n; i++) {
    if (hot[i] !== 1) continue;
    let sumX = 0, sumY = 0, sxx = 0, syy = 0, sxy = 0, gapVotes = 0;
    const members: number[] = [];
    hot[i] = 2; stack.push(i);
    while (stack.length) {
      const j = stack.pop()!, x = j % w, y = (j - x) / w;
      members.push(j);
      sumX += x; sumY += y; sxx += x * x; syy += y * y; sxy += x * y;
      if (gapFrac[j] > 0.72) gapVotes++;
      for (const k of [j - w, j + w, x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1])
        if (k >= 0 && k < n && hot[k] === 1) { hot[k] = 2; stack.push(k); }
    }
    const count = members.length, mx = sumX / count, my = sumY / count;
    // Elongation from the shape's covariance: ratio of its long and short axes.
    const cxx = sxx / count - mx * mx, cyy = syy / count - my * my, cxy = sxy / count - mx * my;
    const tr = cxx + cyy, det = Math.sqrt(Math.max(0, (cxx - cyy) ** 2 / 4 + cxy * cxy));
    const major = tr / 2 + det, minor = Math.max(0.25, tr / 2 - det);
    if (count > 12 && Math.sqrt(major / minor) > 3.2) {
      for (const j of members) smooth[j] = Math.min(smooth[j], 0.3);
      flaggedPx -= count;
      continue;
    }
    if (count >= minPx) spots.push({ id: 0, x: mx, y: my, px: count, kind: gapVotes > count / 2 ? "gap" : "stress" });
  }
  spots.sort((a, b) => b.px - a.px);
  const hotspots = spots.slice(0, 8).map((s, k) => {
    const out: Hotspot = { ...s, id: k + 1 };
    if (m2PerPx) out.areaM2 = s.px * m2PerPx;
    if (gsdCm && meta.lat !== undefined && meta.lon !== undefined && meta.yaw !== undefined) {
      // Offset from frame centre in metres; image "up" points along the camera heading.
      const right = ((s.x - w / 2) * gsdCm) / 100, up = (-(s.y - h / 2) * gsdCm) / 100;
      const th = (meta.yaw * Math.PI) / 180;
      const east = right * Math.cos(th) + up * Math.sin(th);
      const north = -right * Math.sin(th) + up * Math.cos(th);
      out.lat = meta.lat + north / 111320;
      out.lon = meta.lon + east / (111320 * Math.cos((meta.lat * Math.PI) / 180));
    }
    return out;
  });
  return { width: w, height: h, field, stress: smooth, fieldPx, flaggedPx, hotspots, gsdCm, fieldAreaM2: m2PerPx ? fieldPx * m2PerPx : undefined, nadir };
}

// Same thermal scale as the leaf heat map: blue (healthy) -> red (stressed).
const STOPS = [[40, 70, 210], [30, 185, 230], [70, 200, 90], [250, 205, 40], [225, 30, 30]];
const LUT = Array.from({ length: 256 }, (_, i) => {
  const t = (i / 255) * (STOPS.length - 1), k = Math.min(STOPS.length - 2, Math.floor(t)), f = t - k;
  return STOPS[k].map((c, j) => c + (STOPS[k + 1][j] - c) * f);
});

/** Render the health map: field shaded blue→red, everything outside the field greyed out. */
export function drawFieldHealth(target: HTMLCanvasElement, frame: HTMLCanvasElement, fh: FieldHealth, showMap: boolean) {
  const { width: w, height: h } = fh;
  target.width = w; target.height = h;
  const ctx = target.getContext("2d")!;
  ctx.drawImage(frame, 0, 0);
  if (showMap) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < w * h; i++) {
      if (!fh.field[i]) {
        const g = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = g * 0.55 + 40;
        continue;
      }
      const col = LUT[Math.round(Math.min(1, fh.stress[i] * 1.4) * 255)];
      d[i * 4] = d[i * 4] * 0.4 + col[0] * 0.6;
      d[i * 4 + 1] = d[i * 4 + 1] * 0.4 + col[1] * 0.6;
      d[i * 4 + 2] = d[i * 4 + 2] * 0.4 + col[2] * 0.6;
    }
    ctx.putImageData(img, 0, 0);
  }
  // Numbered hotspot markers.
  const r = Math.max(12, Math.round(Math.max(w, h) / 45));
  ctx.font = `bold ${Math.round(r * 1.1)}px system-ui`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const s of fh.hotspots) {
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.fill();
    ctx.lineWidth = Math.max(2, r / 5); ctx.strokeStyle = "#c62828"; ctx.stroke();
    ctx.fillStyle = "#c62828"; ctx.fillText(String(s.id), s.x, s.y + 1);
  }
}

export const M2_PER_ACRE = 4046.86;
