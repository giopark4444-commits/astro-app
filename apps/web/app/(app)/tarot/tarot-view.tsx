"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { dailyCard, cardById } from "@aluna/core";
import { TAROT_CARDS_ES, composeReadingProse } from "@/lib/content/tarot-es";
import { TAROT_CARDS_EN } from "@/lib/content/tarot-en";
import { BottomSheet } from "@/components/bottom-sheet";
import styles from "./tarot.module.css";

interface TarotReadingCard {
  cardId: string;
  reversed: boolean;
  position: string;
}

interface TarotReadingRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  spread: string;
  question: string | null;
  cards: TarotReadingCard[];
  notes: string | null;
  deck: string;
  created_at: string;
}

type DiaryState =
  | { s: "loading" }
  | { s: "error" }
  | { s: "ready"; readings: TarotReadingRow[]; total: number };

const DIARY_SPREAD_KEY: Record<string, string> = {
  daily: "diarySpreadDaily",
  three: "diarySpreadThree",
  "celtic-cross": "diarySpreadCeltic",
};

/** Fecha local YYYY-MM-DD del CLIENTE en su tz resuelta (mismo patrón que
 *  horoscopo-view: Intl.DateTimeFormat().resolvedOptions().timeZone), pero
 *  formateada directo a "YYYY-MM-DD" con el locale en-CA (produce ese orden
 *  sin parsear a mano). Es la clave de la semilla determinista del día
 *  (dailyCard, @aluna/core) y de la key de localStorage. */
function localDateKey(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function TarotView({ userId }: { userId: string }) {
  const t = useTranslations("tarot");
  const locale = useLocale();
  const cardsDict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc", []);
  const localDate = useMemo(() => localDateKey(tz), [tz]);
  const storageKey = `tarot-daily-${userId}-${localDate}`;

  const daily = useMemo(() => dailyCard(userId, localDate, { reversals: true }), [userId, localDate]);
  const dailyContent = cardsDict[daily.card.id]!;

  const [revealed, setRevealed] = useState(false);
  const [dailySheetOpen, setDailySheetOpen] = useState(false);
  // Ceremonia de tirada: null = nada activo; "three" = la tarjeta Tres cartas
  // fue tocada. La ceremonia en sí (dibujar, componer, guardar) es Task 5 —
  // este componente solo deja el punto de montaje listo.
  const [ceremony, setCeremony] = useState<"three" | null>(null);
  const postedDailyRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey) === "1") {
      setRevealed(true);
      postedDailyRef.current = true;
    }
  }, [storageKey]);

  function handleFlip() {
    if (revealed) return;
    setRevealed(true);
    if (typeof window !== "undefined") window.localStorage.setItem(storageKey, "1");
    if (postedDailyRef.current) return;
    postedDailyRef.current = true;
    void fetch("/api/tarot/readings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        spread: "daily",
        deck: "rws",
        cards: [{ cardId: daily.card.id, reversed: daily.reversed, position: "day" }],
      }),
    });
  }

  const dailyProse = useMemo(
    () =>
      composeReadingProse(locale === "en" ? "en" : "es", "daily", [
        { cardId: daily.card.id, reversed: daily.reversed, position: "day" },
      ]),
    [locale, daily],
  );

  const [diary, setDiary] = useState<DiaryState>({ s: "loading" });
  const [openReadingId, setOpenReadingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/tarot/readings", { method: "GET" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { readings: TarotReadingRow[]; total: number };
        if (!alive) return;
        setDiary({ s: "ready", readings: data.readings, total: data.total });
      } catch {
        if (alive) setDiary({ s: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale === "en" ? "en" : "es", { day: "numeric", month: "short", year: "numeric" }),
    [locale],
  );

  const openReading = diary.s === "ready" ? diary.readings.find((r) => r.id === openReadingId) ?? null : null;
  const openReadingProse = useMemo(() => {
    if (!openReading) return [];
    return composeReadingProse(
      locale === "en" ? "en" : "es",
      openReading.spread,
      openReading.cards,
      openReading.question ?? undefined,
    );
  }, [openReading, locale]);

  return (
    <main className={styles.wrap}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 className={styles.title}>{t("title")}</h1>
      </div>

      <section className={styles.dailySection}>
        <h2 className={styles.sectionTitle}>{t("dailyTitle")}</h2>
        <div className={styles.flipScene}>
          <button
            type="button"
            className={`${styles.flipCard} ${revealed ? styles.flipped : ""}`}
            onClick={handleFlip}
            aria-label={revealed ? dailyContent.name : t("dailyFlipCta")}
          >
            <span className={`${styles.face} ${styles.faceBack}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tarot/rws/back.webp" alt={t("dailyFlipCta")} className={styles.cardImg} />
            </span>
            <span className={`${styles.face} ${styles.faceFront}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/tarot/rws/${daily.card.id}.webp`}
                alt={dailyContent.name}
                className={`${styles.cardImg} ${daily.reversed ? styles.reversedImg : ""}`}
              />
            </span>
          </button>

          {revealed && (
            <div className={styles.dailyRevealBody}>
              <p className={styles.dailyName}>{dailyContent.name}</p>
              {daily.reversed && <span className={styles.reversedTag}>{t("dailyReversed")}</span>}
              <p className={styles.dailyKeywords}>
                {dailyContent.keywords.map((kw) => (
                  <span key={kw} className="chip">
                    {kw}
                  </span>
                ))}
              </p>
              <p className={styles.dailyEssence}>{dailyContent.essence}</p>
              <button type="button" className={styles.dailyRevealBtn} onClick={() => setDailySheetOpen(true)}>
                {t("dailyReveal")}
              </button>
            </div>
          )}
        </div>
      </section>

      <BottomSheet open={dailySheetOpen} onClose={() => setDailySheetOpen(false)} title={dailyContent.name}>
        {dailyProse.map((p, i) => (
          <p key={i} className={styles.sheetParagraph}>
            {p}
          </p>
        ))}
      </BottomSheet>

      <section className={styles.spreadsSection}>
        <h2 className={styles.sectionTitle}>{t("spreadsTitle")}</h2>
        <div className={styles.spreadsGrid}>
          <button
            type="button"
            className={`card card--interactive card--tight ${styles.spreadCard}`}
            onClick={() => setCeremony("three")}
          >
            <span className={styles.spreadName}>{t("spreadThree")}</span>
            <span className={styles.spreadDesc}>{t("spreadThreeDesc")}</span>
          </button>
          <div
            className={`card card--dashed card--tight ${styles.spreadCard} ${styles.spreadDisabled}`}
            role="button"
            aria-disabled="true"
          >
            <span className={styles.spreadName}>{t("spreadCeltic")}</span>
            <span className="chip">{t("spreadCelticSoon")}</span>
          </div>
        </div>
      </section>

      {ceremony === "three" && (
        // Punto de montaje de Task 5: la ceremonia real (dibujar 3 cartas,
        // componer la prosa, guardar) reemplaza este placeholder.
        <div data-testid="ceremony-placeholder" />
      )}

      <section className={styles.diarySection}>
        <h2 className={styles.sectionTitle}>{t("diaryTitle")}</h2>
        {diary.s !== "ready" || diary.readings.length === 0 ? (
          <div className={`card card--dashed ${styles.diaryEmpty}`}>
            <p>{t("diaryEmpty")}</p>
          </div>
        ) : (
          <>
            <ul className={styles.diaryList}>
              {diary.readings.map((r) => (
                <li key={r.id}>
                  <button type="button" className={`card card--interactive card--tight ${styles.diaryItem}`} onClick={() => setOpenReadingId(r.id)}>
                    <span className={styles.diarySpread}>{t(DIARY_SPREAD_KEY[r.spread] ?? "diarySpreadDaily")}</span>
                    <span className={styles.diaryDate}>{dateFmt.format(new Date(r.created_at))}</span>
                  </button>
                </li>
              ))}
            </ul>
            {diary.total > diary.readings.length && (
              <p className={styles.freeLimitNote}>
                {t("freeLimitNote", { count: diary.readings.length, total: diary.total })}
              </p>
            )}
          </>
        )}
      </section>

      <BottomSheet
        open={openReading !== null}
        onClose={() => setOpenReadingId(null)}
        {...(openReading ? { title: t(DIARY_SPREAD_KEY[openReading.spread] ?? "diarySpreadDaily") } : {})}
      >
        {openReading && (
          <>
            {openReading.question && (
              <p className={styles.sheetQuestion}>
                <strong>{t("diaryQuestionLabel")}:</strong> {openReading.question}
              </p>
            )}
            <p className={styles.sheetCardsLabel}>{t("diaryCardsLabel")}</p>
            <ul className={styles.sheetCardsList}>
              {openReading.cards.map((c) => {
                const card = cardById(c.cardId);
                const content = card ? cardsDict[card.id] : undefined;
                return (
                  <li key={`${c.cardId}-${c.position}`}>
                    <span>{content?.name ?? c.cardId}</span>
                    {c.reversed && <span className={styles.reversedTag}> · {t("dailyReversed")}</span>}
                  </li>
                );
              })}
            </ul>
            {openReadingProse.map((p, i) => (
              <p key={i} className={styles.sheetParagraph}>
                {p}
              </p>
            ))}
          </>
        )}
      </BottomSheet>
    </main>
  );
}
