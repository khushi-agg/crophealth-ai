# Congressional App Challenge 2026: CropHealth AI submission kit

**Deadline: Monday, October 26, 2026, 12:00 PM ET (9:00 AM PT).** Submissions can't be changed after the deadline.

## Checklist

- [ ] You're registered at congressionalappchallenge.us as a solo entrant, and you live in or attend school in the district
- [ ] Code is pushed to a **public** GitHub repo (`main` branch)
- [ ] GitHub Pages is turned on (Settings → Pages → Source: **GitHub Actions**) and the live link works on a phone
- [ ] Demo video is **1–3 minutes** and uploaded to YouTube as **Public** or **Unlisted** (check what your district requires)
- [ ] The submission form has the repo link, video link, live app link, and a short description (below)
- [ ] Every image used in the video is your own, from PlantVillage, or a web image you're allowed to use; credit sources in the video description

## Short description (paste into the form)

> CropHealth AI is a free, offline-first phone app that helps California Central Valley growers and farmworkers catch crop disease early. A farmer photographs a leaf and an AI model running entirely on the phone checks it for late blight (tomato and potato) and bacterial spot (bell pepper) in about a second, with no cell signal needed. It shows where on the leaf it saw disease, says "not sure" instead of guessing, and gives next steps based on UC IPM guidance in English, Spanish and Punjabi, with read-aloud. A Drone mode scans low-altitude drone photos zone by zone and pins hot spots on a field map using the photo's GPS. A 7-day risk forecast warns when the weather favors disease. Scans stay private on the phone and can be exported as a CSV or a printed report for a UC Cooperative Extension farm advisor or PCA.

**Languages and tools:** TypeScript, React, Vite, PWA/service workers, ONNX Runtime Web (WebAssembly), Python, PyTorch, scikit-learn, Leaflet/OpenStreetMap, Open-Meteo API.

## Video

The full one-presenter script is in [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md). Quick outline:



| Time | On screen | Say |
|---|---|---|
| 0:00–0:15 | You on camera, then the app icon | "Hi, I'm ___ from ___, and this is CropHealth AI, a crop-disease scanner built for farmers in California's Central Valley." |
| 0:15–0:40 | Valley farm photos / map of the Valley | "The Valley grows a huge share of America's food, but many fields have weak cell signal, and many growers and farmworkers speak Spanish or Punjabi. Diseases like late blight can wipe out a tomato field in a week or two if nobody catches them early." |
| 0:40–1:20 | Phone: Scan → choose Tomato → gallery → diseased leaf → result, then tap **Show where** | "You take a photo of a leaf. The AI runs right on the phone, so it works with no signal. It found late blight, and the red heat map shows exactly where it saw the lesions. Then it tells you what to do next, based on University of California IPM guidance." |
| 1:20–1:35 | Healthy leaf → ✅; blurry or non-leaf photo → "Not sure" | "When it isn't confident, it says so instead of guessing. A wrong answer could cost a farmer a crop or money spent on sprays they didn't need." |
| 1:35–1:50 | Switch language to Español, tap 🔊 Read aloud | "Everything works in English, Spanish and Punjabi, and it can read results out loud." |
| 1:50–2:15 | Drone mode → upload `demo/simulated_drone_frame.jpg` → red zones | "Drone mode cuts a low-altitude drone photo into zones and marks where to walk first. It reads the drone's GPS, so hot spots show up on the field map." |
| 2:15–2:35 | Risk tab (Fresno), then Field log → Map → Export CSV | "The risk forecast uses real weather data and published disease models to warn you before conditions favor blight. Every scan is saved privately on the phone and can be exported for a farm advisor." |
| 2:35–2:55 | Training curves / confusion matrix from `ml/results` | "I trained a MobileNetV2 network on about 4,700 leaf images and tested it on over a thousand it had never seen. I learned about class imbalance, calibration, and how lab photos differ from real fields. Next, I want to test CropHealth AI with local growers and add more crops, like grapes and almonds." |

**Recording tips**
- Record the phone screen (iOS Control Center → Screen Recording; Android Quick Settings → Screen record). Open the live link and **Add to Home Screen** first so it looks like a real app.
- Before recording, turn on **Airplane mode** and run one scan. Showing it working offline is the strongest moment in the video.
- Web sample images: pick **close-ups of a single leaf**, and tap the crop chip before scanning. Busy field photos are much harder for the model, and a "Not sure" on one of those is also fine to show (see 1:20).
- Backup images: `demo/leaves/*.jpg` (held-out test images the model never trained on) and `demo/simulated_drone_frame.jpg` (a **simulated** drone frame; call it simulated if you show it).

## What judges look for, and where CropHealth AI shows it

| Judging area | Evidence |
|---|---|
| Quality of the idea / community impact | Built for a real local problem: Central Valley crops, weak rural signal, Spanish and Punjabi speakers, UC IPM and UCCE workflow |
| Implementation | On-device AI, offline PWA, explainable heat maps, calibrated "not sure" answers, drone tiling with EXIF GPS, weather risk models, three languages, CSV and print export |
| Skills demonstrated | Full ML pipeline (training, held-out testing, temperature calibration, ONNX export) plus a TypeScript/React front end |
| Honesty and rigor | README lists the known limitations and the fixes made to the original prototype |

## Facts to double-check before saying them on camera

Only state statistics you have confirmed from a primary source (USDA NASS, CDFA, USGS, UC ANR). Safe, general phrasings:
- "The Central Valley is one of the most productive farming regions in the world." (USGS)
- "California grows most of the processing tomatoes in the United States." (USDA NASS / CDFA; look up the current percentage before quoting a number)
