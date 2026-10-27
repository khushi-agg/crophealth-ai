# Congressional App Challenge 2026: CropHealth AI submission kit

**Deadline: Monday, October 26, 2026, 12:00 PM ET (9:00 AM PT).** Submissions can't be changed after the deadline.

**Repo:** https://github.com/vyom-aggarwal/crophealth-ai · **Live app:** https://khushi-agg.github.io/crophealth-ai/

## Checklist

- [ ] You're registered at congressionalappchallenge.us as a solo entrant, and you live in or attend school in the district
- [ ] Code is pushed to a **public** GitHub repo (`main` branch)
- [x] GitHub Pages is turned on (GitHub Actions source)
- [ ] The live link works on your phone, including in airplane mode after the first load
- [ ] Demo video is **1–3 minutes** and uploaded to YouTube as **Public** or **Unlisted** (check what your district requires)
- [ ] The submission form has the repo link, video link, live app link, and a short description (below)
- [ ] Every image used in the video is your own, from PlantVillage, or a web image you're allowed to use; credit sources in the video description

## Short description (paste into the form)

> CropHealth AI is a free, offline-first phone app that helps California Central Valley growers and farmworkers catch crop disease early. A farmer photographs a leaf and an AI model running entirely on the phone checks it for late blight (tomato and potato) and bacterial spot (bell pepper) in about a second, with no cell signal needed. It shows where on the leaf it saw disease, says "not sure" instead of guessing, and gives next steps based on UC IPM guidance in English and Spanish, with read-aloud. A drone field map finds weak or thinning canopy in straight-down drone photos, lists each problem zone, measures the field and each zone in acres, and GPS-pins every zone so the grower can walk straight to it. A 7-day risk forecast warns when the weather favors disease. Scans stay private on the phone and can be exported as a CSV or a printed report for a UC Cooperative Extension farm advisor or PCA.

**Languages and tools:** TypeScript, React, Vite, PWA/service workers, ONNX Runtime Web (WebAssembly), Python, PyTorch, scikit-learn, Leaflet/OpenStreetMap, Open-Meteo API.

## Video

The full script is in [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md). It has two parts:

| Part | Time | What's on screen |
|---|---|---|
| **1. On camera** | 0:00–0:50 | You, talking to the camera: living in the Central Valley, why farming matters here, and the problems (fast-spreading disease, apps not built for farmers or only in English) that led you to build CropHealth AI. |
| **2. Faceless demo** | 0:50–2:40 | Phone screen recording with your voice-over: leaf scan + next steps → "Not sure" → Spanish + read-aloud → drone field analysis → risk forecast + field log → closing and end card. |

Images to save to your phone before recording: `demo/web_samples/phone-1-tomato-late-blight.jpg`, a photo that isn't a plant, and `demo/drone/drone-damaged-field-73m.jpg`. Credit lines for the YouTube description are in the script.

## What judges look for, and where CropHealth AI shows it

| Judging area | Evidence |
|---|---|
| Quality of the idea / community impact | Built for a real local problem: Central Valley crops, weak rural signal, English and Spanish with read-aloud, UC IPM and UCCE workflow |
| Implementation | On-device AI, offline PWA, calibrated "not sure" answers, a drone field-health map with real acreage and GPS pins from drone flight data, weather risk models, English and Spanish, CSV and print export |
| Skills demonstrated | Full ML pipeline (training, held-out testing, temperature calibration, ONNX export) plus a TypeScript/React front end |
| Honesty and rigor | README lists the known limitations and the fixes made to the original prototype |

## Facts to double-check before saying them on camera

Only state statistics you have confirmed from a primary source (USDA NASS, CDFA, USGS, UC ANR). Safe, general phrasings:
- "The Central Valley is one of the most productive farming regions in the world." (USGS)
- "California grows most of the processing tomatoes in the United States." (USDA NASS / CDFA; look up the current percentage before quoting a number)
