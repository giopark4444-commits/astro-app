"use client";
// Modo manual (Tarot T3, spec §3): alguien con mazo físico baraja y escoge
// él mismo — le pedimos QUÉ salió y le devolvemos la interpretación. Flujo:
// plantilla (three/daily) o libre (1-10) → selector de cartas (buscador +
// filtro por palo, toggle invertida, sin duplicados) → jumpers (mismo
// selector, máx 3, opcional) → lectura (composer v2 + jumpers) → chat →
// guardar. Estado local con useState (no useReducer: los pasos avanzan
// linealmente sin reglas de coreografía como la ceremonia digital).
import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { TAROT_DECK, spreadById, type TarotCard } from "@aluna/core";
import { TAROT_CARDS_ES, composeReadingProse } from "@/lib/content/tarot-es";
import { TAROT_CARDS_EN } from "@/lib/content/tarot-en";
import { ReadingChat } from "./reading-chat";
import tarot from "./tarot.module.css";
import styles from "./manual-entry.module.css";

type Template = "three" | "daily" | "free";
type Step = "template" | "select" | "jumpers" | "reading";
type SaveState = "idle" | "saving" | "saved" | "free_limit" | "error";

interface PickedCard {
  cardId: string;
  reversed: boolean;
  position: string;
}

const FREE_MIN = 1;
const FREE_MAX = 10;
const MAX_JUMPERS = 3;

const SUIT_TABS = ["all", "major", "wands", "cups", "swords", "pentacles"] as const;
type SuitTab = (typeof SUIT_TABS)[number];
const SUIT_LABEL_KEY: Record<SuitTab, string> = {
  all: "manualSuitAll",
  major: "manualSuitMajor",
  wands: "manualSuitWands",
  cups: "manualSuitCups",
  swords: "manualSuitSwords",
  pentacles: "manualSuitPentacles",
};

const POSITION_KEY: Record<string, string> = {
  day: "positionDay",
  past: "positionPast",
  present: "positionPresent",
  future: "positionFuture",
};

function cardMatchesSuit(card: TarotCard, suit: SuitTab): boolean {
  if (suit === "all") return true;
  if (suit === "major") return card.arcana === "major";
  return card.suit === suit;
}

export function ManualEntry({ onClose }: { onClose: () => void }) {
  const t = useTranslations("tarot");
  const locale = useLocale();
  const cardsDict = locale === "en" ? TAROT_CARDS_EN : TAROT_CARDS_ES;

  const [step, setStep] = useState<Step>("template");
  const [template, setTemplate] = useState<Template>("three");
  const [freeCount, setFreeCount] = useState(3);
  const [main, setMain] = useState<PickedCard[]>([]);
  const [jumpers, setJumpers] = useState<PickedCard[]>([]);
  const [query, setQuery] = useState("");
  const [suitTab, setSuitTab] = useState<SuitTab>("all");
  const [save, setSave] = useState<SaveState>("idle");

  const positions = useMemo(() => {
    if (template === "free") return Array.from({ length: freeCount }, (_, i) => `free-${i + 1}`);
    const spread = spreadById(template)!;
    return spread.positions.map((p) => p.key);
  }, [template, freeCount]);

  const usedIds = useMemo(() => new Set([...main, ...jumpers].map((c) => c.cardId)), [main, jumpers]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TAROT_DECK.filter((card) => {
      if (usedIds.has(card.id)) return false;
      if (!cardMatchesSuit(card, suitTab)) return false;
      if (q === "") return true;
      const name = cardsDict[card.id]?.name ?? card.id;
      return name.toLowerCase().includes(q);
    });
  }, [usedIds, suitTab, query, cardsDict]);

  function positionLabel(position: string): string {
    const known = POSITION_KEY[position];
    if (known) return t(known);
    const m = /^free-(\d+)$/.exec(position);
    if (m) return t("manualFreePositionLabel", { n: m[1] });
    return position;
  }

  function pickMain(cardId: string) {
    if (main.length >= positions.length) return;
    const position = positions[main.length]!;
    setMain((prev) => [...prev, { cardId, reversed: false, position }]);
  }
  function toggleMainReversed(cardId: string) {
    setMain((prev) => prev.map((c) => (c.cardId === cardId ? { ...c, reversed: !c.reversed } : c)));
  }
  function removeMain(cardId: string) {
    setMain((prev) => {
      const kept = prev.filter((c) => c.cardId !== cardId);
      return kept.map((c, i) => ({ ...c, position: positions[i]! }));
    });
  }

  function pickJumper(cardId: string) {
    if (jumpers.length >= MAX_JUMPERS) return;
    setJumpers((prev) => [...prev, { cardId, reversed: false, position: `jumper-${prev.length + 1}` }]);
  }
  function toggleJumperReversed(cardId: string) {
    setJumpers((prev) => prev.map((c) => (c.cardId === cardId ? { ...c, reversed: !c.reversed } : c)));
  }
  function removeJumper(cardId: string) {
    setJumpers((prev) => {
      const kept = prev.filter((c) => c.cardId !== cardId);
      return kept.map((c, i) => ({ ...c, position: `jumper-${i + 1}` }));
    });
  }

  const prose = useMemo(
    () =>
      step === "reading"
        ? composeReadingProse(locale === "en" ? "en" : "es", template, main, undefined, {
            jumpers: jumpers.map(({ cardId, reversed }) => ({ cardId, reversed })),
          })
        : [],
    [step, locale, template, main, jumpers],
  );

  const chatCards = useMemo(
    () => [...main, ...jumpers.map((j) => ({ ...j, jumper: true as const }))],
    [main, jumpers],
  );

  function saveReading() {
    if (save === "saving" || save === "saved") return;
    setSave("saving");
    const cards = [...main, ...jumpers.map((j) => ({ ...j, jumper: true }))];
    void fetch("/api/tarot/readings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ spread: template, deck: "rws", cards }),
    })
      .then(async (res) => {
        if (res.status === 201) return setSave("saved");
        if (res.status === 403) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          if (data?.error === "free_limit") return setSave("free_limit");
        }
        setSave("error");
      })
      .catch(() => setSave("error"));
  }

  function renderPicker(opts: { picked: PickedCard[]; limit: number; onPick: (id: string) => void; onToggle: (id: string) => void; onRemove: (id: string) => void }) {
    const { picked, limit, onPick, onToggle, onRemove } = opts;
    return (
      <>
        {picked.length > 0 && (
          <ul className={styles.pickedList}>
            {picked.map((c) => {
              const content = cardsDict[c.cardId];
              return (
                <li key={c.cardId} className={styles.pickedItem}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/tarot/rws/${c.cardId}.webp`}
                    alt={content?.name ?? c.cardId}
                    className={`${styles.pickedThumb} ${c.reversed ? tarot.reversedImg : ""}`}
                  />
                  <div className={styles.pickedBody}>
                    <span className={styles.pickedName}>{content?.name ?? c.cardId}</span>
                    <span className={styles.pickedPosition}>{positionLabel(c.position)}</span>
                  </div>
                  <button
                    type="button"
                    className={`chip chip--control ${c.reversed ? "chip--control-on" : ""}`}
                    aria-pressed={c.reversed}
                    onClick={() => onToggle(c.cardId)}
                  >
                    {t("manualToggleReversed")}
                  </button>
                  <button type="button" className={styles.removeBtn} aria-label={t("manualRemove")} onClick={() => onRemove(c.cardId)}>
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {picked.length < limit && (
          <>
            <input
              type="text"
              className={styles.search}
              placeholder={t("manualSearchPlaceholder")}
              aria-label={t("manualSearchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className={styles.suitTabs}>
              {SUIT_TABS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`seg__item ${styles.suitTab} ${suitTab === s ? "seg__item--active" : ""}`}
                  aria-pressed={suitTab === s}
                  onClick={() => setSuitTab(s)}
                >
                  {t(SUIT_LABEL_KEY[s])}
                </button>
              ))}
            </div>
            {candidates.length === 0 ? (
              <p className={styles.noResults}>{t("manualNoResults")}</p>
            ) : (
              <div className={styles.grid}>
                {candidates.map((card) => {
                  const content = cardsDict[card.id];
                  return (
                    <button
                      key={card.id}
                      type="button"
                      data-testid="manual-card-option"
                      className={styles.gridCard}
                      onClick={() => onPick(card.id)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/tarot/rws/${card.id}.webp`} alt={content?.name ?? card.id} className={styles.gridThumb} />
                      <span className={styles.gridName}>{content?.name ?? card.id}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </>
    );
  }

  return (
    <section className={styles.manual} data-testid="manual-entry">
      {step === "template" && (
        <div className={styles.pane}>
          <h3 className={styles.paneTitle}>{t("manualTemplateTitle")}</h3>
          <div className={styles.templateRow}>
            {(["three", "daily", "free"] as const).map((tpl) => (
              <button
                key={tpl}
                type="button"
                className={`seg__item ${styles.templateBtn} ${template === tpl ? "seg__item--active" : ""}`}
                aria-pressed={template === tpl}
                onClick={() => setTemplate(tpl)}
              >
                {t(tpl === "three" ? "manualTemplateThree" : tpl === "daily" ? "manualTemplateDaily" : "manualTemplateFree")}
              </button>
            ))}
          </div>

          {template === "free" && (
            <div className={styles.freeStepper}>
              <span className={styles.freeLabel}>{t("manualFreeCountLabel")}</span>
              <div className={styles.stepperRow}>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  aria-label="-"
                  onClick={() => setFreeCount((n) => Math.max(FREE_MIN, n - 1))}
                  disabled={freeCount <= FREE_MIN}
                >
                  −
                </button>
                <span className={styles.stepperValue}>{t("manualFreeCountValue", { n: freeCount })}</span>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  aria-label="+"
                  onClick={() => setFreeCount((n) => Math.min(FREE_MAX, n + 1))}
                  disabled={freeCount >= FREE_MAX}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setMain([]);
              setJumpers([]);
              setQuery("");
              setSuitTab("all");
              setStep("select");
            }}
          >
            {t("manualTemplateContinue")}
          </button>
        </div>
      )}

      {step === "select" && (
        <div className={styles.pane}>
          <h3 className={styles.paneTitle}>{t("manualSelectTitle")}</h3>
          <p className={styles.hint}>{t("manualSelectHint")}</p>
          {renderPicker({ picked: main, limit: positions.length, onPick: pickMain, onToggle: toggleMainReversed, onRemove: removeMain })}
          {main.length === positions.length && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => {
                setQuery("");
                setSuitTab("all");
                setStep("jumpers");
              }}
            >
              {t("manualContinue")}
            </button>
          )}
        </div>
      )}

      {step === "jumpers" && (
        <div className={styles.pane}>
          <h3 className={styles.paneTitle}>{t("manualJumpersTitle")}</h3>
          <p className={styles.hint}>{t("manualJumpersHint")}</p>
          {renderPicker({ picked: jumpers, limit: MAX_JUMPERS, onPick: pickJumper, onToggle: toggleJumperReversed, onRemove: removeJumper })}
          {jumpers.length >= MAX_JUMPERS && <p className={styles.hint}>{t("manualJumpersLimit")}</p>}
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setQuery("");
              setStep("reading");
            }}
          >
            {t("manualJumpersContinue")}
          </button>
        </div>
      )}

      {step === "reading" && (
        <div className={styles.pane}>
          <h3 className={styles.paneTitle}>{t("readingTitle")}</h3>
          <div className={styles.readingCards}>
            {main.map((c) => {
              const content = cardsDict[c.cardId];
              const ambit = content ? (c.reversed ? content.reversed.path : content.upright.path) : "";
              return (
                <article key={c.cardId} className={`card card--tight ${styles.readingCard}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/tarot/rws/${c.cardId}.webp`}
                    alt={content?.name ?? c.cardId}
                    className={`${styles.readingImg} ${c.reversed ? tarot.reversedImg : ""}`}
                  />
                  <div className={styles.readingCardBody}>
                    <span className={styles.readingPosition}>{positionLabel(c.position)}</span>
                    <p className={styles.readingName}>
                      {content?.name ?? c.cardId}
                      {c.reversed && <span className={tarot.reversedTag}> {t("dailyReversed")}</span>}
                    </p>
                    <p className={styles.readingAmbit}>{ambit}</p>
                  </div>
                </article>
              );
            })}
          </div>

          {jumpers.length > 0 && (
            <div className={styles.jumpersReading}>
              <span className={styles.jumpersLabel}>{t("manualJumpersReadingLabel")}</span>
              <div className={styles.readingCards}>
                {jumpers.map((c) => {
                  const content = cardsDict[c.cardId];
                  return (
                    <article key={c.cardId} className={`card card--dashed ${styles.readingCard}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/tarot/rws/${c.cardId}.webp`}
                        alt={content?.name ?? c.cardId}
                        className={`${styles.readingImg} ${c.reversed ? tarot.reversedImg : ""}`}
                      />
                      <div className={styles.readingCardBody}>
                        <p className={styles.readingName}>
                          {content?.name ?? c.cardId}
                          {c.reversed && <span className={tarot.reversedTag}> {t("dailyReversed")}</span>}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.readingProse}>
            {prose.map((p, i) => (
              <p key={i} className={tarot.sheetParagraph}>
                {p}
              </p>
            ))}
          </div>

          <ReadingChat spreadId={template} cards={chatCards} />

          {save === "free_limit" ? (
            <p className={styles.freeLimit}>
              {t("ceremonyFreeLimit")}{" "}
              <Link href="/perfil" className={styles.freeLimitCta}>
                {t("ceremonyFreeLimitCta")}
              </Link>
            </p>
          ) : save === "saved" ? (
            <p className={styles.savedOk}>{t("savedOk")}</p>
          ) : (
            <>
              {save === "error" && <p className={styles.saveError}>{t("saveError")}</p>}
              <button type="button" className={styles.primaryBtn} onClick={saveReading} disabled={save === "saving"}>
                {t("saveReading")}
              </button>
            </>
          )}
          <button type="button" className={styles.ghostBtn} onClick={onClose}>
            {t("readingBack")}
          </button>
        </div>
      )}
    </section>
  );
}
