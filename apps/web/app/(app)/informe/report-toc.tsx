"use client";
import { useEffect, useState } from "react";
import type { TocGroup } from "./informe-view";
import styles from "./informe.module.css";

/** Riel de índice del informe (patrón C, spec §4.4): ancla + indicador de
 * sección activa por scroll (IntersectionObserver). InformeView solo lo monta
 * cuando `buildTocGroups(...)` devuelve al menos 1 grupo (algún informe
 * `ready`) — ver informe-view.tsx. */
export function ReportToc({ groups, ariaLabel }: { groups: TocGroup[]; ariaLabel: string }) {
  const ids = groups.flatMap((g) => g.entries.map((e) => e.id));
  const idsKey = ids.join("|");
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleIds = entries.filter((e) => e.isIntersecting).map((e) => e.target.id);
        if (visibleIds.length === 0) return;
        // El primero en orden de documento entre los visibles: la sección
        // "actual" mientras se hace scroll (scrollspy clásico).
        const current = ids.find((id) => visibleIds.includes(id));
        if (current) setActiveId(current);
      },
      { rootMargin: "-84px 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return (
    <nav className={styles.toc} aria-label={ariaLabel}>
      {groups.map((g) => (
        <div key={g.heading} className={styles.tocGroup}>
          <span className={styles.tocHeading}>{g.heading}</span>
          <ul className={styles.tocList}>
            {g.entries.map((e) => (
              <li key={e.id}>
                <a href={`#${e.id}`} className={styles.tocLink} data-on={activeId === e.id || undefined}>
                  {e.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
