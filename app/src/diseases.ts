import type { Lang } from "./i18n";

export type Crop = "pepper" | "potato" | "tomato";
export type ClassId =
  | "bell-pepper-diseased" | "bell-pepper-healthy"
  | "potato-diseased" | "potato-healthy"
  | "tomato-diseased" | "tomato-healthy";

export const CLASS_CROP: Record<ClassId, Crop> = {
  "bell-pepper-diseased": "pepper", "bell-pepper-healthy": "pepper",
  "potato-diseased": "potato", "potato-healthy": "potato",
  "tomato-diseased": "tomato", "tomato-healthy": "tomato",
};
export const isHealthy = (c: ClassId) => c.endsWith("healthy");

interface Info {
  name: string;
  pathogen?: string;
  summary: string;
  urgent: string[];
  symptoms: string[];
  conditions: string[];
  prevention: string[];
}
export interface Disease {
  crop: Crop;
  ipm: string;
  info: Record<Lang, Info>;
}

const HEALTHY = (crop: Crop, ipm: string, en: string, es: string): Disease => ({
  crop, ipm,
  info: {
    en: {
      name: `Healthy ${en}`,
      summary: "No signs of the diseases CropHealth AI knows were found on this leaf.",
      urgent: ["Keep scouting weekly: check 20+ plants spread across the field.", "Scan again if you see new spots, yellowing or wilting.", "Check the Risk tab: humid or rainy weeks call for closer scouting."],
      symptoms: ["Even green color", "No spots, rings, water-soaked patches or fuzzy growth"],
      conditions: [],
      prevention: ["Use certified disease-free seed and transplants", "Water at the base (drip or furrow) instead of overhead when possible", "Rotate crops and remove volunteer plants and cull piles"],
    },
    es: {
      name: `${es} sana`,
      summary: "No se encontraron señales de las enfermedades que CropHealth AI conoce en esta hoja.",
      urgent: ["Siga revisando cada semana: más de 20 plantas repartidas por el campo.", "Escanee otra vez si ve manchas nuevas, amarillamiento o marchitez.", "Revise la pestaña Riesgo: en semanas húmedas o lluviosas revise más seguido."],
      symptoms: ["Color verde parejo", "Sin manchas, anillos, zonas aguadas ni moho"],
      conditions: [],
      prevention: ["Use semilla y plántulas certificadas libres de enfermedades", "Riegue en la base (goteo o surco) en vez de aspersión cuando sea posible", "Rote cultivos y elimine plantas voluntarias y montones de desecho"],
    },
  },
});

const LATE_BLIGHT_CONDITIONS = {
  en: ["Cool, wet weather: about 60–70°F with rain, fog or heavy dew", "Humidity above 90% for many hours, common during valley fog", "Spores travel miles on the wind, so one infected field puts neighbors at risk"],
  es: ["Clima fresco y húmedo: unos 60–70°F con lluvia, neblina o rocío fuerte", "Humedad mayor a 90% por muchas horas, común con la neblina del valle", "Las esporas viajan millas con el viento: un campo infectado pone en riesgo a los vecinos"],
};
const LATE_BLIGHT_URGENT = {
  en: ["Act fast: late blight can destroy a field within 1–2 weeks in cool, wet weather.", "Flag the spot and check nearby plants for more dark, greasy-looking lesions.", "Bag and remove infected plants; never leave them on cull piles.", "Contact your UC Cooperative Extension farm advisor or PCA today about registered protectant fungicides, and warn neighboring growers."],
  es: ["Actúe rápido: el tizón tardío puede destruir un campo en 1–2 semanas con clima fresco y húmedo.", "Marque el lugar y revise las plantas cercanas buscando más lesiones oscuras y grasosas.", "Embolse y retire las plantas infectadas; nunca las deje en montones de desecho.", "Contacte hoy a su asesor de UC Cooperative Extension o PCA sobre fungicidas protectores registrados, y avise a los agricultores vecinos."],
};

export const DISEASES: Record<ClassId, Disease> = {
  "bell-pepper-diseased": {
    crop: "pepper",
    ipm: "https://ipm.ucanr.edu/agriculture/peppers/",
    info: {
      en: {
        name: "Bacterial spot", pathogen: "Xanthomonas spp.",
        summary: "A bacterial disease that causes leaf spots, leaf drop and scabby fruit. It spreads by splashing water and cannot be cured once plants are infected, so the goal is to slow it down.",
        urgent: ["Avoid working in the field while plants are wet; that is how it spreads on hands and tools.", "Switch from overhead sprinklers to drip or furrow irrigation if you can.", "Remove badly infected plants and sanitize tools and bins.", "Ask your farm advisor or PCA whether a registered copper program makes sense; copper resistance is common, so it may not help."],
        symptoms: ["Small, water-soaked spots that turn brown with a yellow edge", "Spots run together and leaves turn yellow and drop", "Raised, scabby brown spots on fruit"],
        conditions: ["Warm, wet weather: about 75–86°F", "Rain, overhead irrigation and heavy dew", "Spread on infected seed and transplants, and by workers moving through wet plants"],
        prevention: ["Buy certified, tested seed and clean transplants", "Plant resistant varieties", "Rotate 2–3 years away from pepper and tomato", "Plow under or remove crop residue after harvest"],
      },
      es: {
        name: "Mancha bacteriana", pathogen: "Xanthomonas spp.",
        summary: "Enfermedad bacteriana que causa manchas en las hojas, caída de hojas y fruta con costras. Se propaga con el agua que salpica y no tiene cura una vez infectada la planta; la meta es frenarla.",
        urgent: ["No trabaje en el campo mientras las plantas estén mojadas; así se propaga en manos y herramientas.", "Cambie de aspersión a goteo o riego por surco si puede.", "Retire las plantas muy infectadas y desinfecte herramientas y cajas.", "Pregunte a su asesor o PCA si un programa con cobre registrado tiene sentido; la resistencia al cobre es común."],
        symptoms: ["Manchas pequeñas y aguadas que se vuelven cafés con borde amarillo", "Las manchas se juntan y las hojas se ponen amarillas y se caen", "Manchas cafés con costra en la fruta"],
        conditions: ["Clima cálido y húmedo: unos 75–86°F", "Lluvia, riego por aspersión y rocío fuerte", "Se propaga en semilla y plántulas infectadas, y por trabajadores entre plantas mojadas"],
        prevention: ["Compre semilla certificada y plántulas limpias", "Siembre variedades resistentes", "Rote 2–3 años sin chile ni tomate", "Incorpore o retire los residuos después de la cosecha"],
      },
    },
  },
  "bell-pepper-healthy": HEALTHY("pepper", "https://ipm.ucanr.edu/agriculture/peppers/", "bell pepper", "Chile morrón"),
  "potato-diseased": {
    crop: "potato",
    ipm: "https://ipm.ucanr.edu/agriculture/potato/",
    info: {
      en: {
        name: "Late blight", pathogen: "Phytophthora infestans",
        summary: "The disease behind the Irish potato famine. It moves very fast in cool, humid weather and can also rot tubers in storage.",
        urgent: LATE_BLIGHT_URGENT.en.concat(["Kill vines 2–3 weeks before harvest so tubers are not infected at digging."]),
        symptoms: ["Dark, water-soaked patches on leaves, often starting at the tips or edges", "White fuzzy growth on the underside of leaves in humid mornings", "Brown, collapsed stems; reddish-brown dry rot inside tubers"],
        conditions: LATE_BLIGHT_CONDITIONS.en,
        prevention: ["Plant certified seed potatoes", "Destroy cull piles and volunteer potatoes", "Avoid evening overhead irrigation", "Watch the Risk tab and protect plants before blight weather arrives"],
      },
      es: {
        name: "Tizón tardío", pathogen: "Phytophthora infestans",
        summary: "La enfermedad que causó la hambruna de la papa en Irlanda. Avanza muy rápido con clima fresco y húmedo y también pudre los tubérculos almacenados.",
        urgent: LATE_BLIGHT_URGENT.es.concat(["Mate el follaje 2–3 semanas antes de cosechar para que los tubérculos no se infecten al sacarlos."]),
        symptoms: ["Manchas oscuras y aguadas en las hojas, muchas veces desde las puntas o bordes", "Moho blanco en el envés de las hojas en mañanas húmedas", "Tallos cafés y caídos; pudrición café rojiza dentro de los tubérculos"],
        conditions: LATE_BLIGHT_CONDITIONS.es,
        prevention: ["Siembre semilla de papa certificada", "Destruya montones de desecho y papas voluntarias", "Evite el riego por aspersión en la tarde", "Revise la pestaña Riesgo y proteja las plantas antes del clima favorable al tizón"],
      },
    },
  },
  "potato-healthy": HEALTHY("potato", "https://ipm.ucanr.edu/agriculture/potato/", "potato", "Papa"),
  "tomato-diseased": {
    crop: "tomato",
    ipm: "https://ipm.ucanr.edu/agriculture/tomato/",
    info: {
      en: {
        name: "Late blight", pathogen: "Phytophthora infestans",
        summary: "A fast-moving water mold that kills tomato leaves, stems and fruit in cool, humid weather. Spores blow between fields, so early reporting protects the whole area.",
        urgent: LATE_BLIGHT_URGENT.en,
        symptoms: ["Large, greasy gray-green to brown patches on leaves", "White fuzzy growth at the edge of patches in humid mornings", "Firm, brown, greasy-looking rot on green fruit"],
        conditions: LATE_BLIGHT_CONDITIONS.en,
        prevention: ["Use clean transplants and remove volunteer tomatoes and potatoes", "Space and stake plants so leaves dry quickly", "Avoid overhead irrigation, especially late in the day", "Watch the Risk tab and protect plants before blight weather arrives"],
      },
      es: {
        name: "Tizón tardío", pathogen: "Phytophthora infestans",
        summary: "Un moho de agua que avanza rápido y mata hojas, tallos y fruta del tomate con clima fresco y húmedo. Las esporas vuelan entre campos, así que avisar pronto protege a toda la zona.",
        urgent: LATE_BLIGHT_URGENT.es,
        symptoms: ["Manchas grandes, grasosas, de verde grisáceo a café en las hojas", "Moho blanco en el borde de las manchas en mañanas húmedas", "Pudrición café, firme y grasosa en fruta verde"],
        conditions: LATE_BLIGHT_CONDITIONS.es,
        prevention: ["Use plántulas limpias y elimine tomates y papas voluntarias", "Deje espacio y tutore las plantas para que las hojas se sequen rápido", "Evite el riego por aspersión, sobre todo en la tarde", "Revise la pestaña Riesgo y proteja las plantas antes del clima favorable al tizón"],
      },
    },
  },
  "tomato-healthy": HEALTHY("tomato", "https://ipm.ucanr.edu/agriculture/tomato/", "tomato", "Tomate"),
};
