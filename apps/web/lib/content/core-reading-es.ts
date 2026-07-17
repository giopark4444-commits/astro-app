// Lectura del núcleo (ES): teje Sol + Luna + Ascendente en un párrafo con
// negritas (mockup 06 §4.4 «Lectura del núcleo»). Voz evolutiva-yóguica,
// segunda persona, imagen concreta — misma voz que astrology-readings-es.ts,
// pero centrada en cómo el signo COLOREA la luz de cada cuerpo (no repite el
// contenido planeta+casa de ese archivo, que ya se cuenta en la hoja de
// detalle al tocar un planeta).
import { astroLabels } from "./astrology-labels";
import type { Dignity } from "@aluna/core";

const L = astroLabels("es");

export interface CoreSegment {
  b?: string; // fragmento en negrita (planeta + signo)
  t: string; // texto normal
}

export interface CoreBodyInput {
  sign: string;
  house: number;
  dignity?: Dignity | undefined;
}

/** Qué brilla en cada signo cuando el Sol lo habita. */
export const SUN_FRAGMENT: Record<string, string> = {
  aries: "brillas cuando te atreves primero, sin pedir permiso",
  taurus: "brillas cuando construyes algo que dure y lo saboreas despacio",
  gemini: "brillas cuando conectas ideas y personas que nadie más había unido",
  cancer: "brillas cuando cuidas y creas un hogar donde otros pueden ser vulnerables",
  leo: "brillas simplemente por existir con el corazón abierto",
  virgo: "brillas cuando perfeccionas con las manos algo útil para los demás",
  libra: "brillas cuando armonizas lo que estaba en tensión",
  scorpio: "brillas cuando te atreves a nombrar lo que nadie quiere mirar",
  sagittarius: "brillas cuando persigues un horizonte más ancho que el de ayer",
  capricorn: "brillas cuando sostienes con paciencia lo que otros abandonan",
  aquarius: "brillas cuando la tribu te necesita distinto",
  pisces: "brillas cuando te disuelves en algo más grande que tú",
};

/** Cómo siente la Luna en cada signo. */
export const MOON_FRAGMENT: Record<string, string> = {
  aries: "sientes primero con el cuerpo, y actúas antes de pensarlo",
  taurus: "necesitas calma y lo tangible para sentirte a salvo",
  gemini: "procesas lo que sientes hablándolo, nombrándolo en voz alta",
  cancer: "sientes con la memoria entera, como si nada se olvidara",
  leo: "necesitas que te vean sentir, no solo que te escuchen",
  virgo: "cuidas ordenando: un gesto útil vale más que mil palabras",
  libra: "sientes en relación, tu paz depende del vínculo que sostienes",
  scorpio: "sientes hondo lo que otros apenas rozan",
  sagittarius: "necesitas espacio para sentir, y te asfixia lo que te encierra",
  capricorn: "guardas lo que sientes y lo sostienes con disciplina silenciosa",
  aquarius: "sientes desde la distancia justa, observando antes de nombrarlo",
  pisces: "sientes sin bordes, y confundes tu emoción con la del otro",
};

/** Por qué te reconoce el mundo primero, según el signo ascendente. */
export const ASC_FRAGMENT: Record<string, string> = {
  aries: "el mundo te conoce primero por tu impulso, por tu manera de llegar de frente",
  taurus: "el mundo te conoce primero por tu calma, por cómo habitas el espacio sin prisa",
  gemini: "el mundo te conoce primero por tu palabra rápida y tu curiosidad despierta",
  cancer: "el mundo te conoce primero por tu ternura, aunque te cueste mostrarla",
  leo: "el mundo te conoce primero por tu brillo, por cómo entras a un lugar",
  virgo: "el mundo te conoce primero por tu atención al detalle y tu discreción",
  libra: "el mundo te conoce primero por tu encanto y tu don para mediar",
  scorpio: "el mundo te conoce primero por tu intensidad, por la mirada que no evita nada",
  sagittarius: "el mundo te conoce primero por tu entusiasmo y tu sed de horizonte",
  capricorn: "el mundo te conoce primero por tu seriedad, aunque por dentro seas más tierno",
  aquarius: "el mundo te conoce primero por tu originalidad, por no encajar del todo",
  pisces: "el mundo te conoce primero por tu marea",
};

const DIGNITY_NOTE: Record<string, string> = {
  domicile: "en domicilio",
  exaltation: "en exaltación",
  exile: "en exilio",
  fall: "en caída",
};

/** Teje sol+luna+ascendente en un párrafo con negritas (planeta+signo), sin dangerouslySetInnerHTML. */
export function composeCoreReading({ sun, moon, ascSign }: {
  sun: CoreBodyInput;
  moon: CoreBodyInput;
  ascSign: string;
}): CoreSegment[] {
  const sunSign = L.signs[sun.sign] ?? sun.sign;
  const moonSign = L.signs[moon.sign] ?? moon.sign;
  const ascSignLabel = L.signs[ascSign] ?? ascSign;
  const sunFrag = SUN_FRAGMENT[sun.sign] ?? "";
  const moonFrag = MOON_FRAGMENT[moon.sign] ?? "";
  const ascFrag = ASC_FRAGMENT[ascSign] ?? "";
  const sunDignity = sun.dignity ? DIGNITY_NOTE[sun.dignity] : null;
  const moonDignity = moon.dignity ? DIGNITY_NOTE[moon.dignity] : null;

  return [
    { t: "Tu " },
    { t: "", b: `Sol en ${sunSign}` },
    { t: ` vive en la casa ${sun.house}${sunDignity ? `, ${sunDignity}` : ""}: ${sunFrag}. Tu ` },
    { t: "", b: `Luna en ${moonSign}` },
    { t: `, casa ${moon.house}${moonDignity ? `, ${moonDignity}` : ""}, ${moonFrag}. Y con ` },
    { t: "", b: `Ascendente ${ascSignLabel}` },
    { t: `, ${ascFrag}.` },
  ];
}
