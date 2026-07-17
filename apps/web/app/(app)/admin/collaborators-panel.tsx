"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { grantRole, listRoles, revokeRole, type RoleRow } from "./actions";
import styles from "./admin.module.css";

type ListState = { s: "loading" } | { s: "error" } | { s: "ready"; rows: RoleRow[] };
type Role = "superadmin" | "collaborator";

/** Client component: lista de roles (rpc admin_list_roles) + conceder/quitar
 * (rpc admin_grant_role/admin_revoke_role). Si admin_list_roles falla —
 * típicamente porque la migración 0015 aún no está aplicada— se muestra el
 * banner de migración pendiente en vez de reventar. */
export function CollaboratorsPanel() {
  const t = useTranslations("admin");
  const [state, setState] = useState<ListState>({ s: "loading" });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("collaborator");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function load() {
    setState({ s: "loading" });
    const res = await listRoles();
    setState(res.ok ? { s: "ready", rows: res.roles } : { s: "error" });
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setFormError(null);
    const res = await grantRole(trimmed, role);
    setSubmitting(false);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setEmail("");
    await load();
  }

  async function remove(rowEmail: string) {
    setBusyEmail(rowEmail);
    setRowError(null);
    const res = await revokeRole(rowEmail);
    setBusyEmail(null);
    if (!res.ok) {
      setRowError(res.error);
      return;
    }
    await load();
  }

  return (
    <section className="card">
      <h2 className={styles.eyebrow}>{t("collabTitle")}</h2>

      {state.s === "loading" && <p className={styles.hint}>{t("loading")}</p>}

      {state.s === "error" && (
        <div className={`card card--dashed ${styles.migrationBanner}`}>
          <p role="alert">{t("migrationPending")}</p>
        </div>
      )}

      {state.s === "ready" && (
        <ul className={styles.rolesList}>
          {state.rows.length === 0 && <li className={styles.hint}>{t("collabEmpty")}</li>}
          {state.rows.map((r) => (
            <li key={r.user_id} className={styles.roleRow}>
              <span className={styles.roleEmail}>{r.email}</span>
              <span className={`chip ${styles.roleChip}`}>{t(r.role === "superadmin" ? "roleSuperadmin" : "roleCollaborator")}</span>
              <button
                type="button"
                className={styles.removeBtn}
                disabled={busyEmail === r.email}
                onClick={() => void remove(r.email)}
              >
                {busyEmail === r.email ? t("removing") : t("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {rowError && (
        <p role="alert" className={styles.feedbackError}>
          {rowError}
        </p>
      )}

      <form className={styles.grantForm} onSubmit={(e) => void submit(e)}>
        <input
          type="email"
          className={styles.grantEmail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          required
        />
        <div className="seg" role="group" aria-label={t("roleLabel")}>
          {(["collaborator", "superadmin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`seg__item ${role === r ? "seg__item--active" : ""}`}
              aria-pressed={role === r}
              onClick={() => setRole(r)}
            >
              {t(r === "superadmin" ? "roleSuperadmin" : "roleCollaborator")}
            </button>
          ))}
        </div>
        <button type="submit" className={styles.grantBtn} disabled={submitting || !email.trim()}>
          {submitting ? t("granting") : t("grant")}
        </button>
        {formError && (
          <p role="alert" className={styles.feedbackError}>
            {formError}
          </p>
        )}
      </form>
    </section>
  );
}
