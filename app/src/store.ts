import { del, get, set } from "idb-keyval";
import type { ClassId } from "./diseases";

export interface ScanRecord {
  id: string;
  date: number;
  mode: "leaf" | "drone";
  classId: ClassId;
  confidence: number;
  diseaseProb: number;
  unsure: boolean;
  field?: string;
  notes?: string;
  lat?: number;
  lon?: number;
  thumb: string;
  flaggedTiles?: number;
  plantTiles?: number;
}

const KEY = "avis.scans";

export async function listScans(): Promise<ScanRecord[]> {
  return ((await get<ScanRecord[]>(KEY)) ?? []).sort((a, b) => b.date - a.date);
}
export async function addScan(r: ScanRecord) {
  await set(KEY, [r, ...(await listScans())]);
}
export async function removeScan(id: string) {
  const rest = (await listScans()).filter((s) => s.id !== id);
  if (rest.length) await set(KEY, rest);
  else await del(KEY);
}

export function toCsv(scans: ScanRecord[]) {
  const head = ["date", "mode", "field", "result", "confidence", "disease_probability", "unsure", "latitude", "longitude", "flagged_tiles", "plant_tiles", "notes"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = scans.map((s) => [new Date(s.date).toISOString(), s.mode, s.field, s.classId, s.confidence.toFixed(3), s.diseaseProb.toFixed(3), s.unsure, s.lat, s.lon, s.flaggedTiles, s.plantTiles, s.notes].map(esc).join(","));
  return [head.join(","), ...rows].join("\n");
}

export function getPosition(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => res(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}
