import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DISEASES, isHealthy } from "./diseases";
import { LangContext, LANGS, STRINGS, type Key, type Lang, useT } from "./i18n";
import { cachedForecast, cToF, fetchForecast, PLACES, type Forecast, type Level } from "./risk";
import { listScans, removeScan, toCsv, getPosition, type ScanRecord } from "./store";
import Scan from "./Scan";
import Guide from "./Guide";

type Tab = "home" | "scan" | "risk" | "log" | "guide";

function readLang(): Lang {
  try {
    const s = localStorage.getItem("avis.lang") as Lang | null;
    if (s && s in STRINGS) return s;
  } catch { /* storage blocked */ }
  return navigator.language.startsWith("es") ? "es" : navigator.language.startsWith("pa") ? "pa" : "en";
}

export default function App() {
  const [lang, setLang] = useState<Lang>(readLang);
  const [tab, setTab] = useState<Tab>("home");
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const t = useCallback((k: Key) => STRINGS[lang][k] ?? STRINGS.en[k], [lang]);
  const refresh = useCallback(() => { listScans().then(setScans); }, []);

  useEffect(() => {
    refresh();
    const up = () => setOnline(navigator.onLine);
    addEventListener("online", up); addEventListener("offline", up);
    return () => { removeEventListener("online", up); removeEventListener("offline", up); };
  }, [refresh]);
  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem("avis.lang", lang); } catch { /* ignore */ }
  }, [lang]);

  const nav: [Tab, string, Key][] = [["home", "🏠", "navHome"], ["scan", "📷", "navScan"], ["risk", "🌦️", "navRisk"], ["log", "🗺️", "navLog"], ["guide", "📘", "navGuide"]];

  return (
    <LangContext.Provider value={{ lang, t }}>
      <header className="topbar">
        <button className="brand" onClick={() => setTab("home")}><img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" /> AVIS</button>
        <span className={`net ${online ? "on" : "off"}`}>{online ? "● " + t("online") : "○ " + t("offline")}</span>
        <select aria-label={t("language")} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </header>
      <main>
        {tab === "home" && <Home scans={scans} go={setTab} />}
        {tab === "scan" && <Scan onSaved={refresh} />}
        {tab === "risk" && <Risk />}
        {tab === "log" && <Log scans={scans} refresh={refresh} />}
        {tab === "guide" && <Guide />}
      </main>
      <nav className="tabbar">
        {nav.map(([id, icon, k]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => { setTab(id); scrollTo(0, 0); }}>
            <span>{icon}</span>{t(k)}
          </button>
        ))}
      </nav>
    </LangContext.Provider>
  );
}

function useForecast() {
  const [f, setF] = useState<Forecast | null>(cachedForecast);
  const [err, setErr] = useState(false);
  const load = useCallback(async (name: string, lat: number, lon: number) => {
    setErr(false);
    try { setF(await fetchForecast(name, lat, lon)); } catch { setErr(true); }
  }, []);
  useEffect(() => {
    // Refresh a stale forecast (older than 3 hours) when we have signal.
    const p = f ?? { place: PLACES[0].name, lat: PLACES[0].lat, lon: PLACES[0].lon, fetched: 0 };
    if (navigator.onLine && Date.now() - p.fetched > 3 * 3600e3) load(p.place, p.lat, p.lon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { f, err, load };
}

function Home({ scans, go }: { scans: ScanRecord[]; go: (t: Tab) => void }) {
  const { t, lang } = useT();
  const { f } = useForecast();
  const week = scans.filter((s) => Date.now() - s.date < 7 * 864e5);
  const bad = week.filter((s) => !s.unsure && (s.mode === "drone" ? (s.flaggedTiles ?? 0) > 0 : !isHealthy(s.classId)));
  const today = f?.days[0];
  return (
    <div className="stack">
      <section className="hero">
        <h1>AVIS</h1>
        <p>{t("appTagline")}</p>
        <button className="big-btn light" onClick={() => go("scan")}>📷 {t("scanLeaf")}</button>
        <small>{t("scanLeafSub")}</small>
      </section>
      <button className="card risk-card" onClick={() => go("risk")}>
        <h3>{t("today")}{f && <span className="muted"> · {f.place}</span>}</h3>
        {today ? (
          <div className="row gap">
            <RiskChip label={t("lateBlight")} level={today.lateBlight} />
            <RiskChip label={t("bacterialSpot")} level={today.bacterialSpot} />
          </div>
        ) : <p className="muted">{t("riskOffline")}</p>}
      </button>
      <div className="card row gap">
        <div className="kpi"><strong>{week.length}</strong><span>{t("last7")}</span></div>
        <div className="kpi bad"><strong>{bad.length}</strong><span>{t("flagged")}</span></div>
      </div>
      <h3>{t("recent")}</h3>
      {scans.length ? scans.slice(0, 3).map((s) => <ScanRow key={s.id} s={s} lang={lang} />) : <p className="muted">{t("noScans")}</p>}
    </div>
  );
}

function RiskChip({ label, level }: { label: string; level: Level }) {
  const { t } = useT();
  return <div className={`risk ${level}`}><small>{label}</small><strong>{t(level)}</strong></div>;
}

function Risk() {
  const { t, lang } = useT();
  const { f, err, load } = useForecast();
  const [busy, setBusy] = useState(false);
  async function pick(name: string, lat: number, lon: number) { setBusy(true); await load(name, lat, lon); setBusy(false); }
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-US" : "pa-IN";
  return (
    <div className="stack">
      <h2>{t("riskTitle")}</h2>
      <p className="muted">{t("riskSub")}</p>
      <div className="card row gap wrap">
        <label className="grow">{t("location")}
          <select value={f?.place ?? ""} onChange={(e) => { const p = PLACES.find((x) => x.name === e.target.value); if (p) pick(p.name, p.lat, p.lon); }}>
            {!f && <option value="">{t("setLocation")}</option>}
            {f && !PLACES.some((p) => p.name === f.place) && <option value={f.place}>{f.place}</option>}
            {PLACES.map((p) => <option key={p.name}>{p.name}</option>)}
          </select>
        </label>
        <button className="ghost" onClick={async () => { const p = await getPosition(); if (p) pick("📍 GPS", p.lat, p.lon); }}>📍 {t("useGps")}</button>
      </div>
      {busy && <div className="spinner" />}
      {err && <p className="warn">{t("riskOffline")}</p>}
      {f && (
        <>
          <div className="forecast">
            {f.days.map((d) => (
              <div key={d.date} className="day card">
                <strong>{new Date(d.date + "T12:00").toLocaleDateString(locale, { weekday: "short", month: "numeric", day: "numeric" })}</strong>
                <span className="muted small">{cToF(d.tMin)}–{cToF(d.tMax)}°F{d.rain > 0.2 ? ` · 🌧 ${(d.rain / 25.4).toFixed(2)}"` : ""}</span>
                <RiskChip label={t("lateBlight")} level={d.lateBlight} />
                <RiskChip label={t("bacterialSpot")} level={d.bacterialSpot} />
                <span className="muted small">{d.lbHours} {t("hoursWet")}</span>
              </div>
            ))}
          </div>
          <div className="card small">
            <p>🥔🍅 {t("riskWhyLB")}</p>
            <p>🫑 {t("riskWhyBS")}</p>
            <p className="muted">{t("updated")}: {new Date(f.fetched).toLocaleString(locale)} · Open-Meteo</p>
          </div>
        </>
      )}
    </div>
  );
}

function ScanRow({ s, lang, onDelete }: { s: ScanRecord; lang: Lang; onDelete?: () => void }) {
  const { t } = useT();
  const info = DISEASES[s.classId].info[lang];
  const label = s.mode === "drone"
    ? `🛸 ${s.flaggedTiles ?? 0} ${t("zonesFlagged")}`
    : s.unsure ? `❔ ${t("resultUnsure")}` : `${isHealthy(s.classId) ? "✅" : "⚠️"} ${info.name}`;
  return (
    <div className="card scan-row">
      <img src={s.thumb} alt="" />
      <div className="grow">
        <strong>{label}</strong>
        <small className="muted">{new Date(s.date).toLocaleString()}{s.field ? ` · ${s.field}` : ""}{s.lat ? " · 📍" : ""}</small>
        {s.mode === "leaf" && !s.unsure && <small>{t("confidence")}: {Math.round(s.confidence * 100)}%</small>}
        {s.notes && <small>{s.notes}</small>}
      </div>
      {onDelete && <button className="link" onClick={onDelete} aria-label={t("del")}>🗑</button>}
    </div>
  );
}

function Log({ scans, refresh }: { scans: ScanRecord[]; refresh: () => void }) {
  const { t, lang } = useT();
  const [view, setView] = useState<"list" | "map">("list");
  function exportCsv() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([toCsv(scans)], { type: "text/csv" }));
    a.download = `avis-field-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }
  return (
    <div className="stack">
      <div className="row between">
        <h2>{t("logTitle")}</h2>
        <div className="segmented small">
          <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>{t("list")}</button>
          <button className={view === "map" ? "on" : ""} onClick={() => setView("map")}>{t("map")}</button>
        </div>
      </div>
      <div className="row gap no-print">
        <button className="ghost" disabled={!scans.length} onClick={exportCsv}>⬇️ {t("exportCsv")}</button>
        <button className="ghost" disabled={!scans.length} onClick={() => print()}>🖨️ {t("printReport")}</button>
      </div>
      {view === "map" ? <ScanMap scans={scans} /> : scans.length
        ? scans.map((s) => <ScanRow key={s.id} s={s} lang={lang} onDelete={async () => { if (confirm(t("confirmDel"))) { await removeScan(s.id); refresh(); } }} />)
        : <p className="muted">{t("noScans")}</p>}
      <p className="muted small">🔒 {t("privacy")}</p>
    </div>
  );
}

function ScanMap({ scans }: { scans: ScanRecord[] }) {
  const { t, lang } = useT();
  const el = useRef<HTMLDivElement>(null);
  const pts = useMemo(() => scans.filter((s) => s.lat != null && s.lon != null), [scans]);
  useEffect(() => {
    const map = L.map(el.current!, { zoomControl: true }).setView([36.74, -119.79], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    const group = L.featureGroup().addTo(map);
    for (const s of pts) {
      const bad = s.mode === "drone" ? (s.flaggedTiles ?? 0) > 0 : !s.unsure && !isHealthy(s.classId);
      L.circleMarker([s.lat!, s.lon!], { radius: 10, color: "#fff", weight: 2, fillOpacity: 0.9, fillColor: s.unsure ? "#9ca3af" : bad ? "#dc2626" : "#16a34a" })
        .bindPopup(`<b>${s.mode === "drone" ? `${s.flaggedTiles} ${t("zonesFlagged")}` : DISEASES[s.classId].info[lang].name}</b><br>${new Date(s.date).toLocaleDateString()}${s.field ? "<br>" + s.field.replace(/</g, "&lt;") : ""}`)
        .addTo(group);
    }
    if (pts.length) map.fitBounds(group.getBounds().pad(0.3), { maxZoom: 17 });
    return () => { map.remove(); };
  }, [pts, t, lang]);
  return (
    <>
      <div ref={el} className="map" />
      {!pts.length && <p className="muted">{t("noGps")}</p>}
    </>
  );
}
