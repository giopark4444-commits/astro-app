"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { personalCycles, type BirthDate } from "@aluna/core";
import { PERSONAL_DAY_ES } from "@/lib/content/personal-day-es";
import { PERSONAL_DAY_EN } from "@/lib/content/personal-day-en";
import styles from "./day-number.module.css";

/** Parsea "YYYY-MM-DD" (fecha civil de nacimiento) a BirthDate, o null si no cuadra. */
function parseBirth(date: string): BirthDate | null {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

/** Hoy como fecha civil local (la numerología usa la fecha del calendario, sin TZ). */
function todayCivil(): BirthDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/**
 * "Numerología de hoy": el día personal del perfil activo (cómputo en cliente con
 * @aluna/core), con su mes y año personal como contexto, y una línea cálida según
 * el número. Toca para ir a /numeros. Vibración del día = pertenece a esta persona,
 * hoy: por eso el número va en la serif del nombre.
 */
export function DayNumberCard({ birthDate }: { birthDate: string }) {
  const t = useTranslations("hoy");
  const locale = useLocale();

  const cycles = useMemo(() => {
    const birth = parseBirth(birthDate);
    if (!birth) return null;
    return personalCycles(birth, todayCivil());
  }, [birthDate]);

  if (!cycles) return null;

  const meanings = locale === "en" ? PERSONAL_DAY_EN : PERSONAL_DAY_ES;
  const day = cycles.personalDay.value;
  const month = cycles.personalMonth.value;
  const year = cycles.personalYear.value;
  const meaning = meanings[day] ?? "";
  const isMaster = cycles.personalDay.isMaster;

  return (
    <Link
      href="/numeros"
      className={`card card--interactive ${styles.card} reveal`}
      style={{ ["--i" as string]: 1 }}
      aria-label={t("dayNumberAria", { n: day })}
    >
      <span className={`${styles.num} ${isMaster ? styles.master : ""}`} aria-hidden>
        {day}
      </span>
      <span className={styles.body}>
        <span className={styles.eyebrow}>{t("dayNumberTitle")}</span>
        <span className={styles.meaning}>{meaning}</span>
        <span className={styles.context}>
          <span className={styles.chip}>
            {t("dayNumberMonth")} <b>{month}</b>
          </span>
          <span className={styles.dot} aria-hidden>
            ·
          </span>
          <span className={styles.chip}>
            {t("dayNumberYear")} <b>{year}</b>
          </span>
        </span>
      </span>
    </Link>
  );
}
