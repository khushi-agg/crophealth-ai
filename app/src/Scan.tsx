import { useEffect, useRef, useState } from "react";
import { DISEASES, isHealthy, type Crop } from "./diseases";
import { speak, useT } from "./i18n";
import { classifyCanvas, drawCam, fileToImage, loadModel, readExifGps, regionToCanvas, scanTiles, thumbnail, type Prediction, type Tile } from "./model";
import { addScan, getPosition } from "./store";
import { DiseaseDetails } from "./Guide";

type CropChoice = Crop | "auto";
const pct = (v: number) => `${Math.round(v * 100)}%`;
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
      <div className="card">
        <h3>{t("whatCrop")}</h3>
        <div className="chips">
          {(["auto", "tomato", "pepper", "potato"] as const).map((c) => (
            <button key={c} className={`chip ${crop === c ? "on" : ""}`} onClick={() => setCrop(c)}>
              {{ auto: "❔", tomato: "🍅", pepper: "🫑", potato: "🥔" }[c]} {t(c)}
            </button>
          ))}
        </div>
      </div>
      {modelState === "loading" && <p className="muted center">⏳ {t("loadingModel")}</p>}
      {modelState === "error" && <p className="warn">Model failed to load. Check your connection once, then reload.</p>}
      {mode === "leaf" ? <LeafScan crop={crop} onSaved={onSaved} /> : <DroneScan crop={crop} onSaved={onSaved} />}
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
        <div className="meter" aria-label={t("confidence")}>
          <div style={{ width: pct(pred.confidence) }} />
        </div>
        <small>{t("confidence")}: {pct(pred.confidence)}</small>
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

interface DroneResult { id: string; name: string; img: HTMLImageElement; tiles: Tile[]; gps: { lat: number; lon: number } | null; saved?: boolean }

function DroneScan({ crop, onSaved }: { crop: CropChoice; onSaved: () => void }) {
  const { t } = useT();
  const ref = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState(4);
  const [progress, setProgress] = useState<string | null>(null);
  const [results, setResults] = useState<DroneResult[]>([]);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    const out: DroneResult[] = [];
    for (const [k, f] of [...files].entries()) {
      const img = await fileToImage(f);
      const gps = await readExifGps(f);
      const { tiles } = await scanTiles(img, crop, rows, (d, n) => setProgress(`${t("processing")} ${k + 1}/${files.length}: ${Math.round((d / n) * 100)}%`));
      out.push({ id: uid(), name: f.name, img, tiles, gps });
      setResults([...out]);
    }
    setProgress(null);
  }

  async function save(r: DroneResult) {
    const plant = r.tiles.filter((x) => x.diseaseProb !== null);
    const flagged = plant.filter((x) => x.diseaseProb! >= 0.6);
    const worst = plant.reduce<Tile | null>((a, x) => (!a || x.diseaseProb! > a.diseaseProb! ? x : a), null);
    await addScan({
      id: r.id, date: Date.now(), mode: "drone", classId: worst?.classId ?? "tomato-healthy",
      confidence: worst?.diseaseProb ?? 0, diseaseProb: worst?.diseaseProb ?? 0, unsure: !plant.length,
      field: r.name, lat: r.gps?.lat, lon: r.gps?.lon, flaggedTiles: flagged.length, plantTiles: plant.length,
      thumb: thumbnail(r.img, r.img.naturalWidth, r.img.naturalHeight),
    });
    setResults((rs) => rs.map((x) => (x.id === r.id ? { ...x, saved: true } : x)));
    onSaved();
  }

  return (
    <div className="stack">
      <p>{t("droneSub")}</p>
      <div className="card row between">
        <span>{t("gridSize")}</span>
        <div className="chips">
          {[[6, t("fine")], [4, "●"], [3, t("coarse")]].map(([v, l]) => (
            <button key={v} className={`chip ${rows === v ? "on" : ""}`} onClick={() => setRows(v as number)}>{l}</button>
          ))}
        </div>
      </div>
      <button className="big-btn" disabled={!!progress} onClick={() => ref.current?.click()}>🛸 {t("uploadFrames")}</button>
      <input ref={ref} hidden type="file" accept="image/*" multiple onChange={(e) => handle(e.target.files)} />
      {progress && <div className="card center"><div className="spinner" /><p>{progress}</p></div>}
      {!results.length && (
        <div className="card tips">
          <h3>{t("tipsTitle")}</h3>
          <ul><li>📏 {t("droneTip1")}</li><li>🌅 {t("droneTip2")}</li><li>📍 {t("droneTip3")}</li></ul>
        </div>
      )}
      {results.map((r) => <DroneCard key={r.id} r={r} onSave={() => save(r)} />)}
      <p className="muted small">⚠️ {t("droneNote")}</p>
    </div>
  );
}

function DroneCard({ r, onSave }: { r: DroneResult; onSave: () => void }) {
  const { t } = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const plant = r.tiles.filter((x) => x.diseaseProb !== null);
  const flagged = plant.filter((x) => x.diseaseProb! >= 0.6);

  useEffect(() => {
    const c = ref.current!, W = r.img.naturalWidth, H = r.img.naturalHeight, k = Math.min(1, 900 / W);
    c.width = W * k; c.height = H * k;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(r.img, 0, 0, c.width, c.height);
    for (const tl of r.tiles) {
      const x = tl.x * k, y = tl.y * k, w = tl.w * k, h = tl.h * k;
      if (tl.diseaseProb === null) { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x, y, w, h); continue; }
      const p = tl.diseaseProb;
      ctx.fillStyle = p >= 0.6 ? "rgba(220,38,38,0.45)" : p >= 0.4 ? "rgba(234,179,8,0.35)" : "rgba(22,163,74,0.18)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
      if (p >= 0.4) {
        ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.max(12, w / 6)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(pct(p), x + w / 2, y + h / 2);
      }
    }
  }, [r]);

  return (
    <div className={`result ${flagged.length ? "diseased" : plant.length ? "healthy" : "unsure"}`}>
      <div className="row between"><strong className="ellipsis">{r.name}</strong>{r.gps && <small>📍 {r.gps.lat.toFixed(5)}, {r.gps.lon.toFixed(5)}</small>}</div>
      <canvas ref={ref} className="scan-img wide" />
      {plant.length ? (
        <>
          <h2>{flagged.length} {t("zonesFlagged")}</h2>
          <small>{plant.length} {t("plantZones")}</small>
          {flagged.length > 0 && <p>{t("scoutHere")}</p>}
        </>
      ) : <p>{t("noZones")}</p>}
      <button className="big-btn" disabled={r.saved} onClick={onSave}>{r.saved ? `✔ ${t("saved")}` : `💾 ${t("save")}`}</button>
    </div>
  );
}
