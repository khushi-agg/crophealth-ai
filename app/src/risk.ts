// Weather-driven disease risk. Forecast data: Open-Meteo (free, no API key).
// Late blight follows the Hutton criteria (AHDB, 2017): a day with a minimum
// temperature >= 10 °C and >= 6 hours of relative humidity >= 90 %; two such days
// in a row is a high-risk "Hutton period".
// Bacterial spot uses a simple warm-and-wet hour count: 24–30 °C with RH >= 85 %
// or rain in that hour.

export type Level = "low" | "moderate" | "high";
export interface DayRisk { date: string; tMin: number; tMax: number; rain: number; lbHours: number; bsHours: number; lateBlight: Level; bacterialSpot: Level }
export interface Forecast { place: string; lat: number; lon: number; fetched: number; days: DayRisk[] }

export const PLACES: { name: string; lat: number; lon: number }[] = [
  { name: "Fresno", lat: 36.7378, lon: -119.7871 },
  { name: "Bakersfield", lat: 35.3733, lon: -119.0187 },
  { name: "Visalia", lat: 36.3302, lon: -119.2921 },
  { name: "Tulare", lat: 36.2077, lon: -119.3473 },
  { name: "Hanford", lat: 36.3275, lon: -119.6457 },
  { name: "Madera", lat: 36.9613, lon: -120.0607 },
  { name: "Merced", lat: 37.3022, lon: -120.483 },
  { name: "Los Banos", lat: 37.0583, lon: -120.8499 },
  { name: "Modesto", lat: 37.6391, lon: -120.9969 },
  { name: "Stockton", lat: 37.9577, lon: -121.2908 },
  { name: "Delano", lat: 35.7688, lon: -119.2471 },
  { name: "Woodland", lat: 38.6785, lon: -121.7733 },
  { name: "Sacramento", lat: 38.5816, lon: -121.4944 },
  { name: "Yuba City", lat: 39.1404, lon: -121.6169 },
];

const KEY = "avis.forecast";

export function cachedForecast(): Forecast | null {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}

export async function fetchForecast(place: string, lat: number, lon: number): Promise<Forecast> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation&forecast_days=7&timezone=America%2FLos_Angeles`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`forecast ${res.status}`);
  const h = (await res.json()).hourly as { time: string[]; temperature_2m: number[]; relative_humidity_2m: number[]; precipitation: number[] };
  const byDay = new Map<string, number[]>();
  h.time.forEach((t, i) => {
    const d = t.slice(0, 10);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(i);
  });
  const days: DayRisk[] = [];
  for (const [date, idx] of byDay) {
    const temps = idx.map((i) => h.temperature_2m[i]);
    const tMin = Math.min(...temps), tMax = Math.max(...temps);
    const lbHours = idx.filter((i) => h.relative_humidity_2m[i] >= 90).length;
    const bsHours = idx.filter((i) => {
      const t = h.temperature_2m[i];
      return t >= 24 && t <= 30 && (h.relative_humidity_2m[i] >= 85 || h.precipitation[i] > 0);
    }).length;
    const rain = idx.reduce((a, i) => a + h.precipitation[i], 0);
    const huttonDay = tMin >= 10 && lbHours >= 6;
    const prev = days[days.length - 1];
    const prevHutton = prev ? prev.tMin >= 10 && prev.lbHours >= 6 : false;
    days.push({
      date, tMin, tMax, rain, lbHours, bsHours,
      lateBlight: huttonDay && prevHutton ? "high" : huttonDay || (tMin >= 7 && lbHours >= 4) ? "moderate" : "low",
      bacterialSpot: bsHours >= 6 ? "high" : bsHours >= 2 ? "moderate" : "low",
    });
    // A Hutton period also raises the first day of the pair.
    if (huttonDay && prevHutton) prev.lateBlight = "high";
  }
  const f: Forecast = { place, lat, lon, fetched: Date.now(), days };
  try { localStorage.setItem(KEY, JSON.stringify(f)); } catch { /* storage full or blocked */ }
  return f;
}

export const cToF = (c: number) => Math.round(c * 9 / 5 + 32);
