"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { HoroscopePeriod, WesternPayload } from "@/lib/horoscope/western";
import type { EasternPayload } from "@/lib/horoscope/eastern";
import { useProfiles } from "@/lib/profiles/profiles-provider";
import { useSheetAutoClose } from "@/lib/viewport";
import { Starfield } from "@/components/starfield";
import { BottomSheet } from "@/components/bottom-sheet";
import { ShareButton } from "@/components/share/share-button";
import type { ShareLensParams } from "@/lib/share/types";
import { WesternView } from "./western-view";
import { EasternView } from "./eastern-view";
import { HoroscopoInterpretation, horoscopoSelectionTitle } from "./interpretation-content";
import { isMobileViewport, type HoroscopoSelection } from "./selection";
import styles from "./horoscopo.module.css";

// Orquestador del Horóscopo: header + tabs de tradición (router/searchParams),
// el estado COMPARTIDO entre ambas vistas y el maestro-detalle (Task 4, espejo
// de /carta, /pilares, /numeros). El grueso de cada tradición vive en
// western-view.tsx / eastern-view.tsx (MOVE de Task 2); acá se cablea el panel
// derecho (desktop) / bottom-sheet (móvil) que rinde la HoroscopoSelection.
export function HoroscopoView() {
  const t = useTranslations("horoscopo");
  const tRoot = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const { active } = useProfiles();

  const trad = params.get("trad") === "oriental" ? "oriental" : "occidental";

  // `pro` y `period` se IZAN aquí y bajan como props a la vista montada: se
  // COMPARTEN entre occidental y oriental, así que cambiar de pestaña no
  // reinicia ni el periodo elegido ni el Modo Pro. `pro` además gobierna la
  // profundidad del panel maestro-detalle (Pro unificado con tiers, Task 4).
  // `tz` se resuelve una vez y se pasa a la vista montada.
  //
  // `sign` y `animal` también se IZAN aquí (fix de review de Task 2): en el
  // monolito original vivían en el componente raíz y sobrevivían al cambio de
  // pestaña porque router.replace no remonta; tras el split habían quedado en
  // cada subvista, que SÍ se desmonta al cambiar `trad`. Fuente de verdad aquí,
  // la subvista solo la consume.
  const [pro, setPro] = useState(false);
  const [period, setPeriod] = useState<HoroscopePeriod>("today");
  const [sign, setSign] = useState<string | null>(active ? null : "aries");
  const [animal, setAnimal] = useState<string | null>(active ? null : "rat");
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "utc", []);

  // Los payloads suben desde cada subvista vía `onReady` (useEffect post-ready)
  // y alimentan el ÚNICO renderizador de lectura del panel/sheet. Cada tradición
  // guarda el suyo por separado: al cambiar de pestaña el panel usa `trad` para
  // elegir cuál leer, sin perder el otro. Al cambiar sign/animal/period el
  // payload viejo queda hasta el próximo ready — aceptable: el reset de abajo ya
  // devuelve la selección a la lectura, que muestra la prosa del último ready.
  const [western, setWestern] = useState<WesternPayload | null>(null);
  const [eastern, setEastern] = useState<EasternPayload | null>(null);

  // Maestro-detalle: la selección viva del panel (desktop) y la del sheet
  // (móvil). null = lectura por defecto (patrón numeros: `selected ?? reading`).
  const [selected, setSelected] = useState<HoroscopoSelection | null>(null);
  const [sheetSel, setSheetSel] = useState<HoroscopoSelection | null>(null);
  useSheetAutoClose(!!sheetSel, () => setSheetSel(null));

  // Router de selección: en móvil abre el bottom-sheet; en desktop escribe el
  // panel derecho. SSR-safe (isMobileViewport → false en servidor).
  const select = (s: HoroscopoSelection) => {
    if (isMobileViewport()) setSheetSel(s);
    else setSelected(s);
  };

  // Reset de la selección al cambiar de tradición, perfil, contexto propio de la
  // subvista (sign/animal) o periodo: el panel y el sheet vuelven a la lectura
  // para no mostrar un detalle stale del contexto anterior (spec §2, patrón
  // numeros/pilares). El payload nuevo llega por `onReady` y la lectura lo toma.
  useEffect(() => {
    setSelected(null);
    setSheetSel(null);
  }, [active, trad, sign, animal, period]);

  // Fase 6 (share cards): la lente horóscopo solo soporta el signo occidental
  // (sin fecha — el server pone "hoy"); mismo default "aries" que el estado
  // inicial sin perfil, para cuando `sign` aún no llegó (p.ej. pestaña oriental).
  // `active` puede ser null acá (esta vista admite signo suelto sin perfil) —
  // sin profileId el server cae al display_name de la cuenta si el usuario
  // prende "Mostrar el nombre".
  const shareParams: ShareLensParams = {
    lens: "horoscopo",
    sign: sign ?? "aries",
    ...(active ? { profileId: active.id } : {}),
  };

  return (
    <main className={styles.wrap}>
      <div className={styles.sky} aria-hidden><Starfield /></div>

      <header className={styles.head}>
        <p className={styles.eyebrow}>{t("title")}</p>
        <h1 className={`${styles.h1} reveal`}>{t(trad === "oriental" ? "subtitleEastern" : "subtitle")}</h1>
        <div className={styles.trads} role="tablist" aria-label={t("title")}>
          <button type="button" role="tab" aria-selected={trad === "occidental"}
            className={`seg__item ${trad === "occidental" ? "seg__item--active" : ""}`}
            onClick={() => router.replace("/horoscopo")}>{t("tabWestern")}</button>
          <button type="button" role="tab" aria-selected={trad === "oriental"}
            className={`seg__item ${trad === "oriental" ? "seg__item--active" : ""}`}
            onClick={() => router.replace("/horoscopo?trad=oriental")}>{t("tabEastern")}</button>
        </div>
      </header>

      <div className={styles.deskCols}>
        {trad === "oriental" ? (
          <EasternView
            pro={pro} onProToggle={() => setPro(!pro)}
            period={period} onPeriodChange={setPeriod} tz={tz}
            animal={animal} onAnimalChange={setAnimal}
            onSelect={select} onReady={setEastern}
          />
        ) : (
          <WesternView
            pro={pro} onProToggle={() => setPro(!pro)}
            period={period} onPeriodChange={setPeriod} tz={tz}
            sign={sign} onSignChange={setSign}
            onSelect={select} onReady={setWestern}
          />
        )}

        {/* Panel de interpretación (100% desktop): en móvil lo reemplaza la
            prosa de `.readingMobile` en la técnica + el bottom-sheet de abajo. */}
        <div className={styles.interpCol}>
          <div className={`card ${styles.interpPanel}`}>
            <div className={styles.titleRow}>
              <span className={styles.cardH2}>{t("interpTitle")}</span>
              {/* Solo occidental: la card comparte un signo zodiacal; en la
                  pestaña oriental no aplica (esa identidad la cubre Pilares). */}
              {trad === "occidental" && <ShareButton params={shareParams} />}
            </div>
            <HoroscopoInterpretation
              selected={selected ?? { kind: "reading" }}
              pro={pro} trad={trad}
              western={western} eastern={eastern}
              profileName={active?.name ?? ""}
            />
          </div>
        </div>
      </div>

      <BottomSheet
        open={!!sheetSel}
        onClose={() => setSheetSel(null)}
        center
        title={sheetSel ? horoscopoSelectionTitle(sheetSel, tRoot, locale) : ""}
      >
        {sheetSel && (
          <HoroscopoInterpretation
            selected={sheetSel}
            pro={pro} trad={trad}
            western={western} eastern={eastern}
            profileName={active?.name ?? ""}
          />
        )}
      </BottomSheet>
    </main>
  );
}
