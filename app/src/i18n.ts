import { createContext, useContext } from "react";

export type Lang = "en" | "es";
export const LANGS: { id: Lang; label: string; speech: string }[] = [
  { id: "en", label: "English", speech: "en-US" },
  { id: "es", label: "Español", speech: "es-US" },
];

const en = {
  modeLeaf: "Leaf photo", modeDrone: "Drone field map",
  droneSub: "Upload photos taken straight down from a drone. CropHealth AI maps weak or missing canopy across the field and pins each problem zone so you can walk straight to it.",
  droneTip1: "Point the camera straight down (gimbal −90°)", droneTip2: "Fly 20–60 m (65–200 ft) high in even light; avoid long shadows", droneTip3: "The drone's GPS, height and heading turn problem zones into map pins and acres",
  uploadFrames: "Upload drone photos", processing: "Mapping field health",
  fieldChecked: "Field checked", flaggedShare: "of field flagged", zonesFlagged: "problem zones", zone: "Zone", openMaps: "Navigate",
  gapKind: "Bare or dead patch", stressKind: "Weak canopy", noMeta: "No drone height/heading data in this photo, so sizes and map pins are unavailable. Upload the original file from the drone.",
  droneNote: "These zones have weaker or missing canopy than the rest of this field. Causes include disease, pests, water or nutrients. Walk to each zone and use a leaf scan to identify the cause.",
  droneRes: "Each pixel covers about {cm} cm of ground: enough to map crop health, too coarse to name a disease from the air.",
  gpsFromPhoto: "GPS from photo", noZones: "No problem zones found in this field.",
  appTagline: "Crop disease checks for Central Valley growers. Works offline in the field.",
  navHome: "Home", navScan: "Scan", navRisk: "Risk", navLog: "Field log", navGuide: "Guide",
  scanLeaf: "Scan a leaf",
  scanLeafSub: "Take a photo of one leaf. CropHealth AI checks it on your phone. No signal needed.",
  offline: "Offline: scans still work", online: "Online",
  today: "Today's disease risk", setLocation: "Choose your area", useGps: "Use my location",
  last7: "Scans in the last 7 days", flagged: "flagged as diseased", recent: "Recent scans",
  noScans: "No scans yet. Your scans are saved only on this phone.",
  whatCrop: "What are you scanning?", auto: "Not sure", pepper: "Bell pepper", potato: "Potato", tomato: "Tomato",
  takePhoto: "Take photo", upload: "Choose from gallery", analyzing: "Checking the leaf…",
  loadingModel: "Loading the AI model (first time only)…",
  tipsTitle: "For the best result",
  tip1: "One leaf, filling most of the photo", tip2: "Shade or even light, no harsh glare", tip3: "Hold steady so the photo is sharp",
  resultHealthy: "Looks healthy", resultDiseased: "Possible disease found", resultUnsure: "Not sure — please retake",
  unsureBody: "CropHealth AI is not confident about this photo. Try a closer, sharper photo of a single leaf, or ask your farm advisor.",
  confidence: "Confidence", heatmap: "Red areas show where CropHealth AI saw signs of disease.",
  showHeatmap: "Show where", hideHeatmap: "Hide",
  warnNoLeaf: "We can't find much leaf in this photo.", warnDark: "Photo is too dark.", warnBright: "Photo is too bright or has glare.", warnBlur: "Photo looks blurry.",
  fieldName: "Field or block name (optional)", notes: "Notes (optional)", save: "Save to field log", saved: "Saved",
  attachGps: "Attach my GPS location", readAloud: "Read aloud", scanAgain: "Scan another leaf",
  whatToDo: "What to do now", symptoms: "What to look for", conditions: "When it spreads", prevention: "Prevention",
  moreInfo: "Official UC IPM guidance", callAdvisor: "Talk to your UC Cooperative Extension farm advisor or licensed PCA before applying any treatment.",
  disclaimer: "CropHealth AI is a screening tool, not a lab diagnosis. Confirm serious problems with an expert.",
  riskTitle: "7-day disease risk forecast", riskSub: "Based on the weather forecast for your area and published disease models.",
  lateBlight: "Late blight (tomato & potato)", bacterialSpot: "Bacterial spot (pepper & tomato)",
  low: "Low", moderate: "Moderate", high: "High",
  riskWhyLB: "Late blight spreads in cool, very humid weather: nights above 50°F with 6+ hours of humidity over 90% (Hutton criteria).",
  riskWhyBS: "Bacterial spot spreads in warm, wet weather: 75–86°F with rain, dew or high humidity.",
  hoursWet: "humid hours", updated: "Updated", riskOffline: "Connect once to download the forecast. It is saved for offline use.",
  logTitle: "Field log", exportCsv: "Export CSV", printReport: "Print report", map: "Map", list: "List",
  noGps: "Scans with GPS show up on this map.", del: "Delete", confirmDel: "Delete this scan?",
  guideTitle: "Disease guide", about: "About CropHealth AI", language: "Language",
  privacy: "Privacy: photos and scan history never leave this phone unless you export them.",
  install: "Install app", healthy: "Healthy",
  location: "Area",
};
export type Key = keyof typeof en;

const es: Record<Key, string> = {
  modeLeaf: "Foto de hoja", modeDrone: "Mapa del campo con dron",
  droneSub: "Suba fotos tomadas desde un dron apuntando hacia abajo. CropHealth AI marca dónde el cultivo está débil o falta en el campo y pone cada zona problema en el mapa para que pueda ir directo.",
  droneTip1: "Apunte la cámara directo hacia abajo (gimbal −90°)", droneTip2: "Vuele a 20–60 m (65–200 pies) con luz pareja; evite sombras largas", droneTip3: "El GPS, la altura y el rumbo del dron convierten las zonas problema en puntos del mapa y acres",
  uploadFrames: "Subir fotos de dron", processing: "Mapeando la salud del campo",
  fieldChecked: "Campo revisado", flaggedShare: "del campo marcado", zonesFlagged: "zonas problema", zone: "Zona", openMaps: "Navegar",
  gapKind: "Parche sin plantas o seco", stressKind: "Cultivo débil", noMeta: "Esta foto no tiene datos de altura ni rumbo del dron, así que no hay tamaños ni puntos en el mapa. Suba el archivo original del dron.",
  droneNote: "Estas zonas tienen cultivo más débil o faltante que el resto del campo. Puede ser enfermedad, plagas, agua o nutrientes. Vaya a cada zona y use un escaneo de hoja para saber la causa.",
  droneRes: "Cada píxel cubre unos {cm} cm del suelo: suficiente para mapear la salud del cultivo, pero no para nombrar una enfermedad desde el aire.",
  gpsFromPhoto: "GPS de la foto", noZones: "No se encontraron zonas problema en este campo.",
  appTagline: "Revisión de enfermedades de cultivos para agricultores del Valle Central. Funciona sin internet en el campo.",
  navHome: "Inicio", navScan: "Escanear", navRisk: "Riesgo", navLog: "Registro", navGuide: "Guía",
  scanLeaf: "Escanear una hoja",
  scanLeafSub: "Tome una foto de una hoja. CropHealth AI la revisa en su teléfono. No necesita señal.",
  offline: "Sin conexión: el escaneo sigue funcionando", online: "En línea",
  today: "Riesgo de enfermedad hoy", setLocation: "Elija su zona", useGps: "Usar mi ubicación",
  last7: "Escaneos en los últimos 7 días", flagged: "marcados como enfermos", recent: "Escaneos recientes",
  noScans: "Todavía no hay escaneos. Se guardan solo en este teléfono.",
  whatCrop: "¿Qué está escaneando?", auto: "No estoy seguro", pepper: "Chile morrón", potato: "Papa", tomato: "Tomate",
  takePhoto: "Tomar foto", upload: "Elegir de la galería", analyzing: "Revisando la hoja…",
  loadingModel: "Cargando el modelo de IA (solo la primera vez)…",
  tipsTitle: "Para un mejor resultado",
  tip1: "Una sola hoja que llene casi toda la foto", tip2: "Sombra o luz pareja, sin reflejos fuertes", tip3: "No mueva el teléfono para que la foto salga nítida",
  resultHealthy: "Se ve sana", resultDiseased: "Posible enfermedad", resultUnsure: "No estoy seguro — tome otra foto",
  unsureBody: "CropHealth AI no tiene confianza en esta foto. Intente una foto más cercana y nítida de una sola hoja, o consulte a su asesor agrícola.",
  confidence: "Confianza", heatmap: "Las zonas rojas muestran dónde CropHealth AI vio señales de enfermedad.",
  showHeatmap: "Mostrar dónde", hideHeatmap: "Ocultar",
  warnNoLeaf: "No se ve suficiente hoja en esta foto.", warnDark: "La foto está muy oscura.", warnBright: "La foto tiene demasiada luz o reflejo.", warnBlur: "La foto se ve borrosa.",
  fieldName: "Nombre del campo o bloque (opcional)", notes: "Notas (opcional)", save: "Guardar en el registro", saved: "Guardado",
  attachGps: "Agregar mi ubicación GPS", readAloud: "Leer en voz alta", scanAgain: "Escanear otra hoja",
  whatToDo: "Qué hacer ahora", symptoms: "Qué buscar", conditions: "Cuándo se propaga", prevention: "Prevención",
  moreInfo: "Guía oficial de UC IPM", callAdvisor: "Hable con su asesor de UC Cooperative Extension o con un PCA con licencia antes de aplicar cualquier tratamiento.",
  disclaimer: "CropHealth AI es una herramienta de detección, no un diagnóstico de laboratorio. Confirme los problemas graves con un experto.",
  riskTitle: "Pronóstico de riesgo de 7 días", riskSub: "Según el pronóstico del clima de su zona y modelos publicados de enfermedades.",
  lateBlight: "Tizón tardío (tomate y papa)", bacterialSpot: "Mancha bacteriana (chile y tomate)",
  low: "Bajo", moderate: "Moderado", high: "Alto",
  riskWhyLB: "El tizón tardío se propaga con clima fresco y muy húmedo: noches arriba de 50°F con 6+ horas de humedad mayor a 90% (criterios de Hutton).",
  riskWhyBS: "La mancha bacteriana se propaga con clima cálido y húmedo: 75–86°F con lluvia, rocío o humedad alta.",
  hoursWet: "horas húmedas", updated: "Actualizado", riskOffline: "Conéctese una vez para descargar el pronóstico. Se guarda para usarlo sin conexión.",
  logTitle: "Registro del campo", exportCsv: "Exportar CSV", printReport: "Imprimir reporte", map: "Mapa", list: "Lista",
  noGps: "Los escaneos con GPS aparecen en este mapa.", del: "Borrar", confirmDel: "¿Borrar este escaneo?",
  guideTitle: "Guía de enfermedades", about: "Acerca de CropHealth AI", language: "Idioma",
  privacy: "Privacidad: las fotos y el historial nunca salen de este teléfono a menos que usted los exporte.",
  install: "Instalar app", healthy: "Sana",
  location: "Zona",
};

;

export const STRINGS: Record<Lang, Record<Key, string>> = { en, es };

export const LangContext = createContext<{ lang: Lang; t: (k: Key) => string }>({
  lang: "en",
  t: (k) => en[k],
});
export const useT = () => useContext(LangContext);

export function speak(text: string, lang: Lang) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANGS.find((l) => l.id === lang)!.speech;
  u.rate = 0.95;
  speechSynthesis.speak(u);
}
