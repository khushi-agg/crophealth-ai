# CropHealth AI: Congressional App Challenge video script

**Format:** two parts, one presenter.
1. **On camera** (≈ 0:00–0:55): you, talking to the camera. No cutaways.
2. **Faceless demo** (≈ 0:55–2:50): phone screen recording only, with your voice over it.

**Target length: 2:50** (hard limit 3:00), about 400 spoken words at a calm pace. Upload to YouTube as Public or Unlisted (check your district's rule).

Replace `[NAME]`, `[SCHOOL]` and `[CITY]`. Lines in quote blocks are spoken. Wording in *[brackets]* is optional and can be cut if you run long.

---

## PART 1: On camera (0:00–0:55)

**Setup:** sit or stand facing the camera at eye level, in quiet, even light (a window in front of you, not behind you). If you can, film outdoors near a field, an orchard or a farm road, so the background shows where you live. One continuous take is fine. Jump cuts between sentences are fine too.

**Lower-third text (add in editing):** `[NAME] · [SCHOOL] · [CITY], California`

> Hi, I'm [NAME], and I'm a student at [SCHOOL] in [CITY], right in the middle of California's Central Valley.
>
> Where I live, farming isn't just something you read about. It's the fields on the drive to school, the orchards along the highway, and the jobs that so many families here depend on. The Central Valley is one of the most productive farming regions in the world, and a lot of the food on America's tables starts right here.
>
> But growing it is hard. A disease like late blight can spread through a tomato field in a week or two of cool, foggy weather, and by the time it's obvious, a big part of the crop can be gone. Out in the fields, cell signal is often weak, and most plant apps need the internet and only work in English.
>
> So I built **CropHealth AI**: a free app that checks crops for disease right on the phone, in the field, with no signal needed. Let me show you how it works.

*(≈ 140 words, ≈ 55 seconds. Hard cut to the screen recording.)*

---

## PART 2: Faceless demo (0:55–2:50)

**Everything below is screen recording with your voice-over.** Record the voice separately in a quiet room and lay it over the footage. Each scene lists what to show and what to say.

### Demo 1: Works offline (0:55–1:05)

**Show:** the phone's status bar with **airplane mode on**, then tap the CropHealth AI icon on the home screen. The app opens to the Home screen.

**On-screen text:** `✈️ No internet`

> This is CropHealth AI in airplane mode, just like out in a field with no signal.

### Demo 2: Leaf scan (1:05–1:40)

**Show:** **Scan** → tap **🍅 Tomato** → **Choose from gallery** → pick a tomato late blight leaf (`demo/web_samples/phone-1-tomato-late-blight.jpg`). The result appears: **"Possible disease found · Late blight"** with a confidence of about 99%. Tap **Show where**, then scroll slowly through **What to do now**.

**On-screen text:** `AI runs on the phone · about 1 second`

> I pick tomato and choose a photo of a leaf. The AI runs right on the phone, and in about a second it says this is likely late blight. "Show where" highlights the part of the leaf the AI focused on, so a farmer can see why it made that call.
>
> Then it gives clear next steps, based on University of California pest-management guidance: what to look for, how it spreads, and to check with a farm advisor before spraying anything.

### Demo 3: Honest when unsure (1:40–1:52)

**Show:** **Scan another leaf** → upload a photo that isn't a plant (a car, a desk). The amber **"Not sure — please retake"** result appears.

**On-screen text:** `Says "not sure" instead of guessing`

> If the photo isn't clear, or the AI isn't confident, it says "not sure" instead of guessing. A wrong answer could cost a farmer a crop or money spent on sprays they didn't need.

### Demo 4: Spanish and read-aloud (1:52–2:05)

**Show:** go back to the late blight result. Open the language menu → **Español** (the whole screen switches) → tap **🔊 Leer en voz alta** and let about 3 seconds of audio play.

**On-screen text:** `English · Español · Read aloud`

> The whole app works in English and Spanish, and it can read results out loud, so it's easier to use for everyone. *(Let the Spanish audio play.)*

### Demo 5: Drone field analysis (2:05–2:30)

**Show:** **Scan** → **Drone field map** → upload `demo/drone/drone-damaged-field-73m.jpg`. Hold on the result: the chips (**73 m · 10.6 cm/px · GPS**), then **2 problem zones · 19% of field flagged · ≈ 2,122 m²**. Scroll to the zone list and tap **Navigate** on zone 1 (cut away before the map app opens if you're offline).

**On-screen text:** `Real drone photo` · `Drone photo: D. Rabich, CC BY-SA 4.0`

> Farms here are big, so CropHealth AI can also check a whole field from a drone photo. It reads the drone's own flight data, like its height and GPS, and finds the parts of the field where the crop is weaker or thinner than the rest. Here it found two problem zones covering about a fifth of the field, measured each one, and gave its exact location, so a farmer can walk straight there and scan a leaf to find out what's wrong.

### Demo 6: Disease forecast and field log (2:30–2:42)

**Show:** **Risk** tab with **Fresno** (or your town) selected, showing the 7-day cards. Then **Field log** → **Map** with saved scan pins → tap **Export CSV**.

> The Risk tab uses the weather forecast and published disease models to warn farmers before conditions favor blight, which matters during our foggy winters. Every scan is saved privately on the phone and can be shared with a farm advisor.

### Demo 7: Closing (2:42–2:50)

**Show:** the Home screen, then an end card.

**End card:** `CropHealth AI · vyom-aggarwal.github.io/crophealth-ai · github.com/vyom-aggarwal/crophealth-ai`

> I built CropHealth AI for the farms and families I grew up around. Next, I want to test it with local growers and add more Valley crops, like grapes and almonds. Thanks for watching.

---

## Before you hit record

1. **Install it like a real app.** Open the live link on your phone, then use **Share → Add to Home Screen** (iPhone) or **⋮ → Install app** (Android). Open it once while online so the AI model downloads.
2. **Save these images to your phone's gallery:**
   - `demo/web_samples/phone-1-tomato-late-blight.jpg` (Demo 2)
   - a photo of something that isn't a plant (Demo 3)
   - `demo/drone/drone-damaged-field-73m.jpg` (Demo 5)
3. **Do a dry run in airplane mode.** Run every step above once before recording, so you know each result appears the way the script says.
4. **Screen recording:** iPhone Control Center → ⏺ Screen Recording; Android Quick Settings → Screen record. Turn on **Do Not Disturb** first.
5. **Voice-over:** record in a quiet room, phone about 6 inches from your mouth. Read slowly. It's easier to trim than to re-record.
6. **On-camera part:** film horizontally (landscape), with the camera at eye level. If you're outdoors, check for wind noise.
7. **Edit:** use CapCut, iMovie or DaVinci Resolve (all free). Add the on-screen text and end card, and keep the video **under 3:00**.
8. **Credits in the YouTube description:** "Drone photo: Dietmar Rabich / Wikimedia Commons / CC BY-SA 4.0 (resized). Leaf photo: Scot Nelson / Wikimedia Commons / CC0."

## Keep these claims accurate

- Only say "about a second" for scan speed; don't give a specific time unless you've timed it on your phone.
- If you mention accuracy, say "99% on over a thousand test images it had never seen," and add that real-field photos are harder.
- Don't say the drone analysis identifies a specific disease. It finds weak or thinning crop and shows where to look. The damaged area in the demo photo has no documented cause.
- Keep the Central Valley lines general (as written above) unless you've checked a specific statistic on USDA, CDFA or USGS.
