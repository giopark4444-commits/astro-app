import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getLegalDoc, isLegalSlug, LEGAL_SLUGS } from "@/lib/legal/slug";
import styles from "./legal.module.css";

export function generateStaticParams() {
  return LEGAL_SLUGS.map((doc) => ({ doc }));
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!isLegalSlug(doc)) notFound();

  const locale = await getLocale();
  const legalDoc = getLegalDoc(doc, locale);
  if (!legalDoc) notFound();

  const t = await getTranslations("legal");

  return (
    <main className={styles.page}>
      {/* El middleware ya resuelve dónde caes sin sesión (público) o con ella
          (dentro del shell) — no hace falta decidir aquí a dónde vuelve "←". */}
      <Link href="/" className={styles.back}>
        ← {t("back")}
      </Link>
      <h1 className={styles.title}>{legalDoc.title}</h1>
      <p className={styles.updated}>{t("updated", { date: legalDoc.updated })}</p>
      <p className={styles.intro}>{legalDoc.intro}</p>
      {legalDoc.sections.map((section) => (
        <section key={section.h} className={styles.section}>
          <h2 className={styles.h2}>{section.h}</h2>
          {section.p.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </section>
      ))}
      <p className={styles.draftNote}>{t("draftNote")}</p>
    </main>
  );
}
