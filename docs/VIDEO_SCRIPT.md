# CropHealth AI: Congressional App Challenge demo video script

**Target length: 2:45** (hard limit 3:00) · About 390 spoken words at a calm pace · Upload to YouTube as Public or Unlisted (check your district's rule)

Replace `[NAME]`, `[SCHOOL]` and `[CITY]`. One presenter reads every line. Spoken lines are in quote blocks.

---

## Scene 1: Hook (0:00–0:15)

| | |
|---|---|
| **Shot** | Close-up of a hand holding a phone over a tomato leaf, or a web photo of a blighted tomato field. Then cut to the presenter(s) on camera. |
| **On-screen text** | `CropHealth AI · Crop disease checks that work without signal` |

> A farmer in the Central Valley notices dark spots on a tomato leaf. Is it nothing, or is it late blight, a disease that can wipe out a field in about two weeks? Out in the field, there's often no signal to look it up.

## Scene 2: Who I am (0:15–0:27)

| | |
|---|---|
| **Shot** | You on camera, with a name lower-third |
| **On-screen text** | `[NAME] · [SCHOOL] · [CITY], CA` |

> Hi, I'm [NAME], a student at [SCHOOL] in [CITY]. I built CropHealth AI, a free phone app that checks crops for disease in about a second, even with no internet at all.

## Scene 3: The problem (0:27–0:47)

| | |
|---|---|
| **Shot** | B-roll of Valley farmland or a map of the Valley. Then three icons appear one by one: 📶❌ · 🗣️ · ⏱️ |
| **On-screen text** | `No signal in the fields` · `Many growers speak Spanish or Punjabi` · `Disease spreads fast` |

> The Central Valley is one of the most productive farming regions in the world. But I noticed three problems: many fields have weak cell service, many farmers and farmworkers here speak Spanish or Punjabi, and diseases spread faster than anyone can walk every row. So I designed CropHealth AI around all three.

## Scene 4: Live demo, leaf scan (0:47–1:25)

| | |
|---|---|
| **Shot** | **Screen recording.** First show the phone's **airplane mode icon**. Open CropHealth AI from the home screen → Scan → tap 🍅 Tomato → Choose from gallery → diseased tomato leaf → result appears. Tap **Show where**. Scroll to "What to do now." |
| **On-screen text** | `✈️ Airplane mode: no internet` · `AI runs on the phone` |

> Here's CropHealth AI in airplane mode. I pick tomato and choose a leaf photo. The AI model runs right on the phone, and in about a second it says *possible late blight*. Then it shows *where* it saw disease: these red areas are where the model focused, so the farmer doesn't have to just trust a black box.
>
> Below that are clear next steps based on University of California IPM guidance: what to look for, how it spreads, and to contact a farm advisor before spraying anything.

## Scene 5: Honesty and accessibility (1:25–1:50)

| | |
|---|---|
| **Shot** | Scan a blurry or non-leaf web image → amber **"Not sure — please retake"**. Then switch the language menu to **Español** and tap **🔊 Leer en voz alta**, letting about 3 seconds of audio play. Optionally flash **ਪੰਜਾਬੀ**. |
| **On-screen text** | `Says "not sure" instead of guessing` · `English · Español · ਪੰਜਾਬੀ` |

> When a photo is blurry or the AI isn't confident, CropHealth AI says *not sure* instead of guessing, because a wrong answer could cost a farmer their crop or money spent on sprays they didn't need.
>
> And the whole app works in English, Spanish and Punjabi, and it can read results out loud. *(let the Spanish audio play for ~3 seconds)*

## Scene 6: Drone mode and field map (1:50–2:12)

| | |
|---|---|
| **Shot** | Scan tab → **Drone / wide photo** → upload a drone or wide field photo (or `demo/simulated_drone_frame.jpg`, with the caption "simulated"). The grid appears with red zones. Then Field log → **Map** with pins. |
| **On-screen text** | `Drone mode: find hot spots across a whole field` |

> For big fields, CropHealth AI has a drone mode. It splits a low-flying drone photo into zones, checks each one, and marks in red where to walk first. It reads the GPS from the photo, so hot spots land on a field map.

## Scene 7: Forecast and records (2:12–2:27)

| | |
|---|---|
| **Shot** | Risk tab → pick Fresno → 7-day cards. Then Field log → **Export CSV**. |
| **On-screen text** | `7-day disease risk from live weather` |

> The risk tab uses real weather forecasts and published disease models to warn farmers *before* conditions favor blight. Every scan is saved privately on the phone and can be exported for a farm advisor.

## Scene 8: How I built it and what I learned (2:27–2:45)

| | |
|---|---|
| **Shot** | Quick cuts: the code editor showing `ml/train.py`, then `ml/results/confusion_matrix.png`, then `training_curves.png`. End on you. |
| **On-screen text** | `TypeScript · React · Python · PyTorch · ONNX` · `99% accuracy on 1,094 held-out test images` |

> I trained a MobileNetV2 neural network in Python on about 4,700 leaf images and tested it on images it had never seen. Then I exported it so it runs inside the phone's browser. My first version had real bugs, like feeding the model the wrong color order, and fixing them taught me how to test AI honestly. Next, I want to test CropHealth AI with local growers and add Valley crops like grapes and almonds. Thanks for watching!

## End card (2:45–2:50)

`CropHealth AI · github.com/vyom-aggarwal/AVIS · [live app link]`

---

## Before you hit record

1. **Install it like a real app.** Open the live link on the phone → Share → **Add to Home Screen** (iPhone) or ⋮ → **Install app** (Android). Open it once while online so the AI model downloads.
2. **Pick your web images ahead of time** and save them to the phone's gallery:
   - Use **close-ups of a single leaf** that fills most of the frame. Plain or blurred backgrounds work best.
   - Use **one image per disease CropHealth AI knows**: tomato late blight, potato late blight, bell pepper bacterial spot, and one healthy leaf.
   - Have **one intentionally bad photo** (blurry, or not a leaf) for the "not sure" moment.
   - **Test each one before recording.** Busy field shots can come back "not sure." Keep the images that work for scenes 4 and 6.
   - Only use images you have the right to use (your own, Creative Commons, or PlantVillage), and credit sources in the video description.
3. **Backup images** are in `demo/leaves/` (held-out test leaves the model never trained on).
4. **Airplane mode**: turn it on *after* the app has loaded once, and make sure the icon is visible in the recording.
5. **Screen recording**: iPhone Control Center → ⏺ Screen Recording; Android Quick Settings → Screen record. Turn on Do Not Disturb.
6. **Audio**: record the voiceover separately in a quiet room if you can. A phone held about 6 inches from your mouth works fine.
7. **Editing**: CapCut, iMovie or DaVinci Resolve (all free). Add the on-screen text above. Keep it **under 3:00**.

## Claims to keep accurate

- Say "about a second," not a specific number of milliseconds, unless you timed it on your phone.
- Say the accuracy number **only** from `app/public/model/model-info.json`, and call it "on held-out test images."
- Don't claim drone mode is field-proven. Say it "marks where to walk first."
- Don't quote farming statistics unless you've checked them on USDA, CDFA or USGS.
