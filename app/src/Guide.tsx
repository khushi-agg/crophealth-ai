import { useEffect, useState } from "react";
import { DISEASES, isHealthy, type ClassId } from "./diseases";
import { useT } from "./i18n";
import { loadModel, type ModelInfo } from "./model";

export function DiseaseDetails({ classId, open }: { classId: ClassId; open?: boolean }) {
  const { t, lang } = useT();
  const d = DISEASES[classId];
  const info = d.info[lang];
  const sections: [string, string[]][] = [
    [t("whatToDo"), info.urgent],
    [t("symptoms"), info.symptoms],
    [t("conditions"), info.conditions],
    [t("prevention"), info.prevention],
  ];
  return (
    <details className="card disease" open={open}>
      <summary>
        <span className={`dot ${isHealthy(classId) ? "ok" : "bad"}`} />
        <strong>{info.name}</strong> <span className="muted">· {t(d.crop)}</span>
      </summary>
      <p>{info.summary}</p>
      {sections.filter(([, items]) => items.length).map(([h, items], i) => (
        <div key={h} className={i === 0 && !isHealthy(classId) ? "urgent" : ""}>
          <h4>{h}</h4>
          <ul>{items.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      ))}
      {!isHealthy(classId) && <p className="advisor">👩‍🌾 {t("callAdvisor")}</p>}
      <a href={d.ipm} target="_blank" rel="noreferrer">📘 {t("moreInfo")} ↗</a>
    </details>
  );
}

export default function Guide() {
  const { t } = useT();
  const [info, setInfo] = useState<ModelInfo | null>(null);
  useEffect(() => { loadModel().then((m) => setInfo(m.info), () => {}); }, []);
  return (
    <div className="stack">
      <h2>{t("guideTitle")}</h2>
      {(Object.keys(DISEASES) as ClassId[]).filter((c) => !isHealthy(c)).map((c) => <DiseaseDetails key={c} classId={c} />)}
      <div className="card">
        <h3>{t("about")}</h3>
        <p>
          CropHealth AI runs a MobileNetV2 neural network directly on your phone.
          It was trained on 4,722 leaf images from the public PlantVillage dataset and scored on images it never saw during training.
        </p>
        {info && (
          <ul className="stats">
            <li><strong>{(info.test_accuracy * 100).toFixed(1)}%</strong><span>test accuracy</span></li>
            <li><strong>{info.test_macro_f1.toFixed(3)}</strong><span>macro F1</span></li>
            <li><strong>{info.test_images.toLocaleString()}</strong><span>held-out images</span></li>
          </ul>
        )}
        <p className="muted small">
          Lab photos are cleaner than field photos, so real-world accuracy will be lower. CropHealth AI answers “not sure” instead of guessing when confidence is low.
          Spanish text should be reviewed by native speakers before wide release.
        </p>
        <p className="small">🔒 {t("privacy")}</p>
        <p className="small">⚠️ {t("disclaimer")}</p>
        <p className="muted small">Weather: Open-Meteo.com · Disease guidance: UC IPM, University of California Agriculture and Natural Resources · Map © OpenStreetMap contributors</p>
      </div>
    </div>
  );
}
