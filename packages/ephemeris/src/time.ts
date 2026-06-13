// packages/ephemeris/src/time.ts
import { DateTime } from "luxon";
import sweph from "sweph";

export interface LocalTimeInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timeZone: string; // IANA
}

export interface JulianDayResult {
  julianDayEt: number; // tiempo de efemérides (para planetas)
  julianDayUt: number; // tiempo universal (para casas)
  utcHour: number; // hora UTC decimal (verificación de cabecera)
}

/** Fecha/hora civil local + zona IANA -> UTC -> Día Juliano (ET y UT). */
export function localToJulianDay(input: LocalTimeInput): JulianDayResult {
  const local = DateTime.fromObject(
    { year: input.year, month: input.month, day: input.day, hour: input.hour, minute: input.minute },
    { zone: input.timeZone },
  );
  if (!local.isValid) {
    throw new Error(`Fecha/zona inválida: ${local.invalidReason ?? "desconocido"}`);
  }
  const utc = local.toUTC();
  const jd = sweph.utc_to_jd(
    utc.year, utc.month, utc.day, utc.hour, utc.minute, utc.second,
    sweph.constants.SE_GREG_CAL,
  );
  if (jd.flag !== sweph.constants.OK) {
    throw new Error(`utc_to_jd falló: ${jd.error}`);
  }
  const [julianDayEt, julianDayUt] = jd.data;
  return {
    julianDayEt,
    julianDayUt,
    utcHour: utc.hour + utc.minute / 60 + utc.second / 3600,
  };
}
