// apps/mobile/lib/reports-api.ts
// Cliente de /api/reports (informes evolutivos) con Bearer — mismo patrón que
// synastry-api.ts. El backend YA acepta Bearer (requirePlus → authenticateRoute,
// sin cambios de este build). Móvil nunca importa @aluna/ephemeris ni
// @aluna/core/reports; solo llama las rutas Next.
import { apiUrl } from "./config";

export interface NatalReportSection {
  key: string;
  title: string;
  body: string;
}

export interface NatalReport {
  intro: string;
  sections: NatalReportSection[];
  outro: string;
}

export interface SolarReportTheme {
  title: string;
  why: string;
  invitation: string;
}

export interface SolarReport {
  year: number;
  essay: string;
  themes: SolarReportTheme[];
  mantra: string;
}

export type ReportContent = NatalReport | SolarReport;
export type ReportKind = "natal" | "solar_return";

export type ReportStatusResponse =
  | { status: "none" }
  | { status: "ready"; content: ReportContent; model_used: string | null }
  | { status: "generating" }
  | { status: "error"; stale?: boolean }
  | { available: false };

export class ReportsApiError extends Error {
  constructor(public status: number) {
    super(`reports_${status}`);
  }
}

interface ReportParams {
  accessToken: string;
  kind: ReportKind;
  locale: "es" | "en";
  year: number | null;
}

function authHeaders(accessToken: string) {
  return { "content-type": "application/json", authorization: `Bearer ${accessToken}` };
}

export async function fetchReport(params: ReportParams): Promise<ReportStatusResponse> {
  const qs = new URLSearchParams({ kind: params.kind, locale: params.locale });
  if (params.kind === "solar_return" && params.year !== null) qs.set("year", String(params.year));
  const res = await fetch(`${apiUrl()}/api/reports?${qs.toString()}`, { headers: authHeaders(params.accessToken) });
  if (!res.ok) throw new ReportsApiError(res.status);
  return (await res.json()) as ReportStatusResponse;
}

interface MutateParams extends ReportParams {
  profileId: string;
}

async function postReportAction(path: string, params: MutateParams): Promise<ReportStatusResponse> {
  const res = await fetch(`${apiUrl()}/api/reports/${path}`, {
    method: "POST",
    headers: authHeaders(params.accessToken),
    body: JSON.stringify({ profileId: params.profileId, kind: params.kind, year: params.year, locale: params.locale }),
  });
  if (!res.ok) throw new ReportsApiError(res.status);
  return (await res.json()) as ReportStatusResponse;
}

export function generateReport(params: MutateParams): Promise<ReportStatusResponse> {
  return postReportAction("generate", params);
}

export function regenerateReport(params: MutateParams): Promise<ReportStatusResponse> {
  return postReportAction("regenerate", params);
}
