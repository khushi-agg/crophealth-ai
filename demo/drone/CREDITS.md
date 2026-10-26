# Drone demo images

Real drone photographs from Wikimedia Commons, taken straight down (gimbal −90°) with a DJI drone (camera FC8482).
They were resized to 3000 px wide for this repo; the drone's original EXIF and XMP flight data (GPS, altitude, gimbal angle, heading,
camera) were copied over unchanged so CropHealth AI can measure real ground area and GPS-locate problem zones.

| File | What it shows | Altitude | Expected result | Source |
|---|---|---|---|---|
| `drone-damaged-field-73m.jpg` | Crop field with a visibly thinned, damaged area | 73 m | Red problem zones on the damaged area, ≈ 9% of a ≈ 3,200 m² field | [Nottuln, Gladbeck, Felder -- 2024 -- 0141](https://commons.wikimedia.org/wiki/File:Nottuln,_Gladbeck,_Felder_--_2024_--_0141.jpg) |
| `drone-grain-field-35m.jpg` | Healthy grain field with tramlines and a grass margin | 35 m | Mostly blue; tramlines ignored; a few small bare spots | [Dülmen, Merfeld, Felder -- 2024 -- 0102](https://commons.wikimedia.org/wiki/File:D%C3%BClmen,_Merfeld,_Felder_--_2024_--_0102.jpg) |
| `drone-mixed-fields-76m.jpg` | Several fields, trees and a road; tap each field to check it | 76 m | Healthy fields with real acreage (≈ 1.3–2.3 ac) | [Dülmen, Merfeld, Felder -- 2024 -- 0089](https://commons.wikimedia.org/wiki/File:D%C3%BClmen,_Merfeld,_Felder_--_2024_--_0089.jpg) |

All three: © Dietmar Rabich, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), resized. Credit line for a video description:
"Drone photos: Dietmar Rabich / Wikimedia Commons / CC BY-SA 4.0 (resized)."

The damaged area in the first photo is real visible crop damage. Its cause is not documented, so present it as
"a problem zone the app found", not as a confirmed disease.
