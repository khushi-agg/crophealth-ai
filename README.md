# 🌱 CropHealth AI: Crop disease checks for Central Valley farmers

**CropHealth AI** (formerly AVIS, the Autonomous Vegetation Imaging System) is a free, offline-first phone app that helps
California Central Valley growers and farmworkers catch crop disease early. Photograph a leaf,
and an AI model **running entirely on the phone** checks it
for disease in about a second. Fly a drone over the field, and CropHealth AI maps weak or dying
canopy across the whole field, measures it in acres, and pins every problem zone on a map. It needs no
cell signal, no account, and no upload.

> **Live app:** https://vyom-aggarwal.github.io/crophealth-ai/ (open on your phone and choose *Add to Home Screen*)
>
> Built for the 2026 Congressional App Challenge. See [docs/SUBMISSION.md](docs/SUBMISSION.md) for the submission kit and demo script.

![TypeScript](https://img.shields.io/badge/TypeScript-React-3178C6?logo=typescript&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-MobileNetV2-EE4C2C?logo=pytorch&logoColor=white)
![ONNX](https://img.shields.io/badge/ONNX_Runtime-Web%20%2F%20WASM-005CED?logo=onnx&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-works%20offline-5A0FC8?logo=pwa&logoColor=white)

---

## Why CropHealth AI

The Central Valley is one of the most productive farming regions in the world, and it has three problems a generic plant app doesn't solve:

| Problem in the Valley | What CropHealth AI does |
|---|---|
| Weak or no cell signal out in the fields | The model and the whole app are cached on the phone, so scans work in airplane mode |
| Many growers and farmworkers speak Spanish or Punjabi | The full interface and disease guidance are in **English, Spanish and Punjabi**, with read-aloud |
| Late blight can destroy a tomato or potato field within weeks of cool, foggy weather | A **7-day risk forecast** warns *before* conditions favor disease |
| A wrong AI answer costs real money | CropHealth AI shows **where** it saw disease, says **"not sure"** instead of guessing, and sends serious cases to a UC Cooperative Extension farm advisor or licensed PCA |
| Big fields can't be walked leaf by leaf | **Drone field map** finds weak or thinning canopy across a whole field and GPS-pins each problem zone |

## Features

- 📷 **Leaf scan.** Take a photo or upload one. On-device MobileNetV2 inference via ONNX Runtime Web (WebAssembly).
- 🔥 **Explainable results.** **Show where** highlights, in red, the part of the leaf that drove the diagnosis (the model's class-activation map).
- ❔ **Honest uncertainty.** Calibrated confidence (temperature scaling). CropHealth AI says "not sure" below 60% confidence or when the photo has too little leaf in it.
- 📸 **Photo quality checks.** Warns when a photo is too dark, too bright, blurry, or has too little leaf.
- 🛸 **Drone field-health map.** Upload straight-down drone photos (one or a whole flight). CropHealth AI finds the crop field (or the one you tap), then maps each spot's vegetation index (VARI), canopy thinning and bare gaps against that field's own typical values, shading it blue (healthy) to red (weak). Tractor tramlines and paths are recognized by shape and ignored. It reads the drone's own flight data (altitude, gimbal angle, heading, camera, GPS) to report ground resolution, field area in m²/acres and the size of every problem zone, and GPS-locates each zone with a **Navigate** link and pins on the field-log map. From the air it maps *where* the crop is struggling; the leaf scan then identifies *what* it is.
- 🌦️ **Disease risk forecast.** Open-Meteo hourly weather plus the **Hutton criteria** for late blight and a warm-and-wet hour model for bacterial spot, for 14 Valley towns or your GPS location.
- 📘 **Action guide.** Symptoms, spread conditions, urgent steps and prevention, based on UC IPM guidance, with links to the official pages.
- 🗺️ **Private field log.** Scans are stored on the phone (IndexedDB) and shown as a list or map, with CSV export and a printable report.
- 🌐 **Three languages** and 🔊 **read-aloud** (Web Speech API).
- 📲 **Installable PWA.** Add it to the home screen on iPhone or Android, with no app store needed.

## Drone field map in action

![Drone field-health map of a damaged field](docs/screenshots/drone-damaged-field.png)

A real DJI drone photo from 73 m. The app read the drone's flight data (10.6 cm per pixel, GPS), found the crop field, and shaded the thinned, damaged area red. It measured 2 problem zones (≈ 311 m² and ≈ 97 m²) and GPS-located each one. A healthy field for comparison: [docs/screenshots/drone-healthy-field.png](docs/screenshots/drone-healthy-field.png).

## What it detects

| Crop | Disease | Pathogen |
|---|---|---|
| Tomato | Late blight | *Phytophthora infestans* |
| Potato | Late blight | *Phytophthora infestans* |
| Bell pepper | Bacterial spot | *Xanthomonas* spp. |

Each crop also has a "healthy" class (six classes total).

## Model results

Trained with [ml/train.py](ml/train.py) on 4,722 PlantVillage images. The original validation folder was split by a hash of each filename into a **validation half** (model selection and calibration) and a **held-out test half** that the model never trained on. Everything below is measured on that test half.

| Metric | Value |
|---|---|
| Test accuracy | **99.0%** |
| Macro F1 | 0.982 |
| Calibration error (ECE), before → after temperature scaling | 0.104 → **0.005** |
| Test images | 1,094 |
| Model size | 8.9 MB (ONNX) |
| Training time | 39 min on an 8-core laptop CPU |

The weakest class is `potato-healthy` (F1 0.936, only 22 test images), the smallest class in the dataset. Per-class results are in [ml/results/metrics.json](ml/results/metrics.json).

| Training curves | Held-out test confusion matrix |
|---|---|
| ![curves](ml/results/training_curves.png) | ![confusion](ml/results/confusion_matrix.png) |

> **Read these numbers carefully.** PlantVillage images are single leaves photographed in a lab on plain backgrounds. Field photos and web photos are much harder, so expect lower accuracy in real use. That's why CropHealth AI shows uncertainty and points people to experts.

### What I fixed from my first prototype

My first version ([legacy/](legacy/)) was a Keras webcam script. I listed its problems and fixed each one:

| Prototype problem | Fix in CropHealth AI |
|---|---|
| Fed BGR camera frames to a model trained on RGB images | The browser canvas gives RGB, and normalization is built into the exported model |
| No held-out test set | Deterministic validation/test split |
| 11× class imbalance, uncorrected | Class-weighted loss |
| Frozen backbone only | Two stages: train the head, then fine-tune the top MobileNetV2 blocks |
| Overconfident softmax and no "unsure" state | Temperature scaling plus a 60% abstention threshold and photo-quality checks |
| No random seeds | Seeded training (`SEED = 42`) |
| Desktop webcam only | Offline phone app plus a drone field-health map |

## How it works

```mermaid
flowchart LR
  subgraph Train["Training (Python, once)"]
    A[PlantVillage leaves] --> B[MobileNetV2 + class-weighted fine-tuning]
    B --> C[Temperature calibration]
    C --> D[(avis.onnx: probs + CAM)]
  end
  subgraph Phone["On the phone (offline)"]
    E[Leaf photo] --> G[Crop 224×224 + quality check]
    F[Drone frame + flight metadata] --> H[Find field, VARI + canopy cover vs field typical]
    H --> K2[Problem zones in m², GPS pins]
    K2 --> K
    G --> I[ONNX Runtime Web, WASM]
    D --> I
    I --> J[Diagnosis + show-where highlight + 'not sure']
    J --> K[(IndexedDB field log + GPS)]
  end
  W[Open-Meteo forecast] --> R[Hutton late-blight + bacterial-spot risk]
```

## Run it

**App** (Node 20+):

```bash
cd app && npm install && npm run dev
```

Open the printed URL. To test on a phone on the same Wi-Fi network, run `npm run dev -- --host`. Production build: `npm run build`, which writes the output to `app/dist/`.

**Deploy.** Pushing to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which publishes the app to GitHub Pages. Turn it on once under *Settings → Pages → Source: GitHub Actions*.

**Retrain the model** (Python 3.10–3.13):

```bash
python -m venv .venv && .venv/Scripts/activate  # macOS/Linux: source .venv/bin/activate
pip install -r ml/requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
python ml/train.py
```

Training writes `app/public/model/avis.onnx`, `model-info.json`, and the metrics and plots in `ml/results/`.

**Demo images.** `demo/leaves/` holds held-out test leaves, `demo/web_samples/` holds tested web photos, and `demo/drone/` holds **real DJI drone photos** with their original flight metadata (see [demo/drone/CREDITS.md](demo/drone/CREDITS.md)).

## Repository layout

```
app/        React + TypeScript PWA (the farmer-facing app)
  src/model.ts      on-device leaf inference, AI-attention highlight, quality checks, EXIF GPS
  src/aerial.ts     drone field-health map: VARI, canopy cover, field finding, drone metadata, GPS pins
  src/risk.ts       weather-driven disease risk models
  src/diseases.ts   disease guidance in EN / ES / PA
  src/i18n.ts       interface text in EN / ES / PA
ml/         training, evaluation and ONNX export (PyTorch)
dataset/    PlantVillage train/val images
demo/       demo images for presentations
docs/       Congressional App Challenge submission kit
legacy/     original Keras + OpenCV prototype
```

## Limitations (stated plainly)

1. Three diseases on three crops. Any other problem, such as powdery mildew, nutrient deficiency or pests, is outside what the model knows. CropHealth AI may say "not sure," or it may be wrong.
2. Trained on lab images. Real-field leaf accuracy **has not been validated yet**.
3. The drone map uses an ordinary RGB camera. It finds *where* canopy is weak or thinning, but it can't tell disease from drought, pests or nutrient problems from the air; a leaf scan or an expert does that. It also hasn't been checked against ground-truth scouting yet, and works best with straight-down photos (gimbal −90°) from 20–80 m.
4. The risk forecast uses published rules of thumb, not a calibrated local model. It's a prompt to scout, not a spray decision.
5. Spanish and Punjabi text should be reviewed by native-speaking growers.
6. CropHealth AI is a screening tool, not a diagnosis. Treatment decisions belong with a UCCE farm advisor or licensed PCA.

## Roadmap

- Field-test with Central Valley growers and UCCE farm advisors; collect real field photos (with consent) to fine-tune
- Add Valley crops: grapes (powdery mildew), almonds (hull rot), pistachios
- Validate the drone map against ground-truth scouting in Central Valley fields, and add multispectral (NDVI) camera support
- Optional, opt-in anonymous outbreak map for neighboring growers

## Credits

- **PlantVillage**: Hughes & Salathé (2015), [arXiv:1511.08060](https://arxiv.org/abs/1511.08060)
- **MobileNetV2**: Sandler et al., CVPR 2018
- **UC IPM**: University of California Statewide Integrated Pest Management Program ([ipm.ucanr.edu](https://ipm.ucanr.edu/)), the source for disease guidance
- **Hutton criteria**: AHDB (2017) late-blight risk criteria
- Weather: [Open-Meteo](https://open-meteo.com/) · Maps: © OpenStreetMap contributors · Runtime: ONNX Runtime Web

## License

MIT; see [LICENSE](LICENSE). PlantVillage imagery is covered by its own upstream terms.
