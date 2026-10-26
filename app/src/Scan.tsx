import { useEffect, useMemo, useRef, useState } from "react";
import { DISEASES, isHealthy, type Crop } from "./diseases";
import { speak, useT } from "./i18n";
import { classifyCanvas, drawCam, fileToImage, loadModel, readExifGps, regionToCanvas, thumbnail, type Prediction } from "./model";
import { analyzeField, drawFieldHealth, frameCanvas, M2_PER_ACRE, readDroneMeta, type DroneMeta } from "./aerial";
import { addScan, getPosition } from "./store";
import { DiseaseDetails } from "./Guide";

type CropChoice = Crop | "auto";
// Never display 100%: no screening model is certain.
const pct = (v: number) => `${Math.min(99, Math.round(v * 100))}%`;
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export default function Scan({ onSaved }: { onSaved: () => void }) {
  const { t } = useT();
  const [mode, setMode] = useState<"leaf" | "drone">("leaf");
  const [crop, setCrop] = useState<CropChoice>("auto");
  const [modelState, setModelState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    loadModel().then(() => setModelState("ready"), () => setModelState("error"));
  }, []);

  return (
    <div className="stack">
      <div className="segmented" role="tablist">
        {(["leaf", "drone"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
            {m === "leaf" ? "🍃 " + t("modeLeaf") : "🛸 " + t("modeDrone")}
          </button>
        ))}
      </div>
      {mode === "leaf" && <div className="card">
        <h3>{t("whatCrop")}</h3>
        <div className="chips">
          {(["auto", "tomato", "pepper", "potato"] as const).map((c) => (
            <button key={c} className={`chip ${crop === c ? "on" : ""}`} onClick={() => setCrop(c)}>
              {{ auto: "❔", tomato: "🍅", pepper: "🫑", potato: "🥔" }[c]} {t(c)}
            </button>
          ))}
        </div>
      </div>}
      {mode === "leaf" && modelState === "loading" && <p className="muted center">⏳ {t("loadingModel")}</p>}
      {mode === "leaf" && modelState === "error" && <p className="warn">Model failed to load. Check your connection once, then reload.</p>}
      {mode === "leaf" ? <LeafScan crop={crop} onSaved={onSaved} /> : <DroneScan onSaved={onSaved} />}
    </div>
  );
}

function LeafScan({ crop, onSaved }: { crop: CropChoice; onSaved: () => void }) {
  const { t, lang } = useT();
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ pred: Prediction; base: HTMLCanvasElement; gps: { lat: number; lon: number } | null } | null>(null);

  async function handle(file?: File) {
    if (!file) return;
    setBusy(true);
    setRes(null);
    try {
      const img = await fileToImage(file);
      const base = regionToCanvas(img);
      const [pred, gps] = await Promise.all([classifyCanvas(base, crop), readExifGps(file)]);
      setRes({ pred, base, gps });
    } finally {
      setBusy(false);
    }
  }

  if (busy) return <div className="card center"><div className="spinner" /><p>{t("analyzing")}</p></div>;
  if (res) return <LeafResult {...res} lang={lang} onAgain={() => setRes(null)} onSaved={onSaved} />;

  return (
    <>
      <button className="big-btn" onClick={() => camRef.current?.click()}>📷 {t("takePhoto")}</button>
      <button className="big-btn secondary" onClick={() => galRef.current?.click()}>🖼️ {t("upload")}</button>
      <input ref={camRef} hidden type="file" accept="image/*" capture="environment" onChange={(e) => handle(e.target.files?.[0])} />
      <input ref={galRef} hidden type="file" accept="image/*" onChange={(e) => handle(e.target.files?.[0])} />
      <div className="card tips">
        <h3>{t("tipsTitle")}</h3>
        <ul><li>🍃 {t("tip1")}</li><li>⛅ {t("tip2")}</li><li>✋ {t("tip3")}</li></ul>
      </div>
    </>
  );
}

function LeafResult({ pred, base, gps, lang, onAgain, onSaved }: { pred: Prediction; base: HTMLCanvasElement; gps: { lat: number; lon: number } | null; lang: "en" | "es" | "pa"; onAgain: () => void; onSaved: () => void }) {
  const { t } = useT();
  const [showCam, setShowCam] = useState(!isHealthy(pred.classId));
  const [field, setField] = useState("");
  const [notes, setNotes] = useState("");
  const [useGps, setUseGps] = useState(true);
  const [saved, setSaved] = useState(false);
  const view = useRef<HTMLCanvasElement>(null);
  const d = DISEASES[pred.classId];
  const info = d.info[lang];
  const healthy = isHealthy(pred.classId);
  const status = pred.unsure ? "unsure" : healthy ? "healthy" : "diseased";

  useEffect(() => {
    const c = view.current!;
    if (showCam) drawCam(c, base, pred.cam);
    else { c.width = c.height = 224; c.getContext("2d")!.drawImage(base, 0, 0); }
  }, [showCam, base, pred.cam]);

  const headline = status === "unsure" ? t("resultUnsure") : status === "healthy" ? t("resultHealthy") : t("resultDiseased");

  async function save() {
    const pos = useGps ? gps ?? (await getPosition()) : null;
    await addScan({
      id: uid(), date: Date.now(), mode: "leaf", classId: pred.classId, confidence: pred.confidence, diseaseProb: pred.diseaseProb,
      unsure: pred.unsure, field: field || undefined, notes: notes || undefined, lat: pos?.lat, lon: pos?.lon, thumb: thumbnail(base, 224, 224, 224),
    });
    setSaved(true);
    onSaved();
  }

  return (
    <div className="stack">
      <div className={`result ${status}`}>
        <div className="result-head">
          <span className="result-icon">{status === "unsure" ? "❔" : healthy ? "✅" : "⚠️"}</span>
          <div>
            <h2>{headline}</h2>
            {status !== "unsure" && <p className="result-name">{info.name}{info.pathogen && <em> · {info.pathogen}</em>}</p>}
          </div>
        </div>
        <canvas ref={view} className="scan-img" />
        {!healthy && !pred.unsure && (
          <div className="row between">
            <small>{showCam ? t("heatmap") : ""}</small>
            <button className="link" onClick={() => setShowCam(!showCam)}>{showCam ? t("hideHeatmap") : t("showHeatmap")}</button>
          </div>
        )}
        {status !== "unsure" && (
          <>
            <div className="meter" aria-label={t("confidence")}>
              <div style={{ width: pct(pred.confidence) }} />
            </div>
            <small>{t("confidence")}: {pct(pred.confidence)}</small>
          </>
        )}
        {pred.quality.warnings.map((w) => <p key={w} className="warn">📸 {t(w)}</p>)}
        {status === "unsure" && <p>{t("unsureBody")}</p>}
        <button className="ghost" onClick={() => speak(`${headline}. ${status === "unsure" ? t("unsureBody") : info.name + ". " + info.summary + " " + info.urgent.join(" ")}`, lang)}>🔊 {t("readAloud")}</button>
      </div>

      {status !== "unsure" && <DiseaseDetails classId={pred.classId} open />}

      <div className="card stack">
        <input placeholder={t("fieldName")} value={field} onChange={(e) => setField(e.target.value)} />
        <textarea placeholder={t("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        <label className="row"><input type="checkbox" checked={useGps} onChange={(e) => setUseGps(e.target.checked)} /> {gps ? `📍 ${t("gpsFromPhoto")}` : t("attachGps")}</label>
        <button className="big-btn" disabled={saved} onClick={save}>{saved ? `✔ ${t("saved")}` : `💾 ${t("save")}`}</button>
      </div>
      <button className="big-btn secondary" onClick={onAgain}>🔁 {t("scanAgain")}</button>
      <p className="muted small">{t("disclaimer")}</p>
    </div>
  );
}

interface DroneResult { id: string; name: string; frame: HTMLCanvasElement; meta: DroneMeta; thumb: string; saved?: boolean }

function DroneScan({ onSaved }: { onSaved: () => void }) {
  const { t } = useT();
  const ref = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [results, setResults] = useState<DroneResult[]>([]);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    const out: DroneResult[] = [];
    for (const [k, f] of [...files].entries()) {
      setProgress(`${t("processing")} ${k + 1}/${files.length}…`);
      const [img, meta] = await Promise.all([fileToImage(f), readDroneMeta(f)]);
      const frame = frameCanvas(img);
      out.push({ id: uid(), name: f.name, frame, meta, thumb: thumbnail(img, img.width, img.height) });
      img.close();
      setResults([...out]);
    }
    setProgress(null);
  }

  return (
    <div className="stack">
      <p>{t("droneSub")}</p>
      <button className="big-btn" disabled={!!progress} onClick={() => ref.current?.click()}>🛸 {t("uploadFrames")}</button>
      <input ref={ref} hidden type="file" accept="image/*" multiple onChange={(e) => handle(e.target.files)} />
      {progress && <div className="card center"><div className="spinner" /><p>{progress}</p></div>}
      {!results.length && (
        <div className="card tips">
          <h3>{t("tipsTitle")}</h3>
          <ul><li>🎯 {t("droneTip1")}</li><li>📏 {t("droneTip2")}</li><li>📍 {t("droneTip3")}</li></ul>
        </div>
      )}
      {results.map((r) => (
        <DroneCard key={r.id} r={r} onSaved={() => { setResults((rs) => rs.map((x) => (x.id === r.id ? { ...x, saved: true } : x))); onSaved(); }} />
      ))}
    </div>
  );
}

const fmtArea = (m2: number) => (m2 >= 4047 ? `${(m2 / M2_PER_ACRE).toFixed(2)} ac` : `${Math.round(m2)} m² (${Math.round(m2 * 10.764)} ft²)`);

function DroneCard({ r, onSaved }: { r: DroneResult; onSaved: () => void }) {
  const { t } = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const [seed, setSeed] = useState<{ x: number; y: number }>(); // undefined = largest field
  const [showMap, setShowMap] = useState(true);
  const fh = useMemo(() => analyzeField(r.frame, r.meta, seed), [r, seed]);
  const flaggedShare = fh.fieldPx ? fh.flaggedPx / fh.fieldPx : 0;

  useEffect(() => { drawFieldHealth(ref.current!, r.frame, fh, showMap); }, [r, fh, showMap]);

  function pick(e: React.MouseEvent<HTMLCanvasElement>) {
    const b = e.currentTarget.getBoundingClientRect();
    setSeed({ x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height });
  }

  async function save() {
    const pinned = fh.hotspots.filter((h) => h.lat !== undefined);
    await addScan({
      id: r.id, date: Date.now(), mode: "drone",
      classId: "tomato-healthy", // unused for drone records; keeps the record shape uniform
      confidence: 1 - flaggedShare, diseaseProb: flaggedShare, unsure: false,
      field: r.name, lat: r.meta.lat, lon: r.meta.lon, flaggedTiles: fh.hotspots.length,
      hotspots: pinned.map((h) => ({ lat: h.lat!, lon: h.lon!, areaM2: h.areaM2, kind: h.kind })),
      thumb: r.thumb,
    });
    onSaved();
  }

  return (
    <div className={`result ${fh.hotspots.length ? "diseased" : "healthy"}`}>
      <strong className="ellipsis">{r.name}</strong>
      <div className="chips">
        {r.meta.altitude !== undefined && <span className="chip static">🛸 {Math.round(r.meta.altitude)} m</span>}
        {fh.gsdCm && <span className="chip static">📐 {fh.gsdCm.toFixed(1)} cm/px</span>}
        {r.meta.pitch !== undefined && <span className="chip static">🎯 {Math.round(r.meta.pitch)}°</span>}
        {r.meta.lat !== undefined && <span className="chip static">📍 GPS</span>}
        {r.meta.model && <span className="chip static">{r.meta.model}</span>}
      </div>
      <canvas ref={ref} className="scan-img wide tappable" onClick={pick} />
      <div className="segmented small" role="tablist">
        <button role="tab" aria-selected={!showMap} className={showMap ? "" : "on"} onClick={() => setShowMap(false)}>📷 {t("heatPhoto")}</button>
        <button role="tab" aria-selected={showMap} className={showMap ? "on" : ""} onClick={() => setShowMap(true)}>🌡️ {t("healthMap")}</button>
      </div>
      <div className="legend" aria-hidden="true" />
      <div className="row between small"><span>{t("legendHealthy")}</span><span>{t("legendStressed")}</span></div>
      <small className="muted">👆 {t("tapField")}</small>

      <h2>{fh.hotspots.length ? `${fh.hotspots.length} ${t("zonesFlagged")}` : t("noZones")}</h2>
      <p className="severity">
        {Math.round(flaggedShare * 100)}% {t("flaggedShare")}
        {fh.fieldAreaM2 ? ` · ${t("fieldChecked")} ≈ ${fmtArea(fh.fieldAreaM2)}` : ""}
      </p>
      {fh.hotspots.length > 0 && (
        <ol className="hotspots">
          {fh.hotspots.map((h) => (
            <li key={h.id}>
              <span className="hs-id">{h.id}</span>
              <div className="grow">
                <strong>{h.kind === "gap" ? t("gapKind") : t("stressKind")}</strong>
                <small className="muted">
                  {h.areaM2 ? `≈ ${fmtArea(h.areaM2)}` : ""}
                  {h.lat !== undefined ? ` · ${h.lat.toFixed(6)}, ${h.lon!.toFixed(6)}` : ""}
                </small>
              </div>
              {h.lat !== undefined && (
                <a className="ghost small-btn" href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat.toFixed(6)},${h.lon!.toFixed(6)}`} target="_blank" rel="noreferrer">🧭 {t("openMaps")}</a>
              )}
            </li>
          ))}
        </ol>
      )}
      {fh.gsdCm ? <small className="muted">{t("droneRes").replace("{cm}", fh.gsdCm.toFixed(1))}</small> : <p className="warn">{t("noMeta")}</p>}
      <p className="small">🍃 {t("droneNote")}</p>
      <button className="big-btn" disabled={r.saved} onClick={save}>{r.saved ? `✔ ${t("saved")}` : `💾 ${t("save")}`}</button>
    </div>
  );
}
