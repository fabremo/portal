import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Gauge,
  RefreshCcw,
  RotateCcw,
  Webhook,
} from "lucide-react";

import { reprocessWebhookLogAction } from "@/app/dashboard/compradores/webhooks/actions";
import { canAccessBuyersModule, getDashboardAccessContext } from "@/lib/dashboard/access";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

type WebhookLogRow = {
  buyer_email: string | null;
  created_at: string;
  creation_date: string | null;
  event: string;
  first_failure_stage: string | null;
  first_processing_error: string | null;
  id: string;
  initial_processing_duration_ms: number | null;
  initial_response_status_code: number | null;
  last_processing_attempt_at: string | null;
  last_processing_success_at: string | null;
  last_reprocessing_error: string | null;
  last_reprocessing_result: string | null;
  payload: unknown;
  processed: boolean;
  processing_attempts: number;
  processing_error: string | null;
  transaction: string | null;
  webhook_id: string;
};

type DashboardWebhookLogsPageProps = {
  searchParams?: Promise<{
    message?: string;
    status?: string;
  }>;
};

type SummaryMetric = {
  description: string;
  label: string;
  value: number;
};

export const metadata: Metadata = {
  title: "Logs de webhook",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(parsedDate);
}

function formatDuration(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${value} ms`;
}

function formatFailureStage(value: string | null) {
  switch (value) {
    case "resolve_company":
      return "Resolver empresa";
    case "insert_log":
      return "Registrar log";
    case "process_approved":
      return "Processar aprovação";
    case "process_refunded":
      return "Processar reembolso";
    case "process_chargeback":
      return "Processar chargeback";
    default:
      return "-";
  }
}

function formatReprocessingResult(value: string | null) {
  switch (value) {
    case "success":
      return "Último reprocessamento com sucesso";
    case "error":
      return "Último reprocessamento com erro";
    case "pending":
      return "Reprocessamento em andamento";
    default:
      return "Nenhum reprocessamento registrado";
  }
}

function renderProcessingStatus(log: WebhookLogRow) {
  if (log.processed) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Processado
      </span>
    );
  }

  if (log.processing_error || log.first_processing_error) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
        <AlertCircle className="h-3.5 w-3.5" />
        Com erro
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
      <Clock3 className="h-3.5 w-3.5" />
      Pendente
    </span>
  );
}

function renderTechnicalChip(label: string, value: string, tone: "neutral" | "danger" | "accent" = "neutral") {
  const toneClassName =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "accent"
        ? "border-accent/20 bg-accent/8 text-accent"
        : "border-gray-200 bg-white text-ink/70";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${toneClassName}`}>
      <span className="text-ink/45">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function buildSummaryMetrics(logs: WebhookLogRow[]): SummaryMetric[] {
  return [
    {
      description: "Itens carregados nesta consulta",
      label: "Total",
      value: logs.length,
    },
    {
      description: "Webhooks com erro inicial ou erro atual",
      label: "Com erro",
      value: logs.filter((log) => Boolean(log.processing_error || log.first_processing_error)).length,
    },
    {
      description: "Registros já concluídos com sucesso",
      label: "Processados",
      value: logs.filter((log) => log.processed).length,
    },
    {
      description: "Itens com tentativa manual registrada",
      label: "Reprocessados",
      value: logs.filter((log) => log.processing_attempts > 0 || Boolean(log.last_reprocessing_result)).length,
    },
  ];
}

async function getWebhookLogs(accessContext: Awaited<ReturnType<typeof getDashboardAccessContext>>) {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  let query = supabase
    .from("webhook_logs")
    .select(
      `
      id,
      webhook_id,
      event,
      creation_date,
      transaction,
      buyer_email,
      processed,
      processing_attempts,
      processing_error,
      first_failure_stage,
      first_processing_error,
      initial_processing_duration_ms,
      initial_response_status_code,
      last_processing_attempt_at,
      last_processing_success_at,
      last_reprocessing_error,
      last_reprocessing_result,
      created_at,
      payload
    `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (accessContext && !accessContext.isAdmin) {
    query = query.in("company_id", accessContext.accessibleCompanyIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Não foi possível carregar os logs de webhook.");
  }

  return (data ?? []) as WebhookLogRow[];
}

export default async function DashboardWebhookLogsPage({ searchParams }: DashboardWebhookLogsPageProps) {
  const accessContext = await getDashboardAccessContext();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!accessContext) {
    redirect("/login");
  }

  if (!canAccessBuyersModule(accessContext)) {
    redirect("/dashboard");
  }

  const logs = await getWebhookLogs(accessContext);
  const summaryMetrics = buildSummaryMetrics(logs);
  const message = resolvedSearchParams?.message;
  const status = resolvedSearchParams?.status === "success" ? "success" : "error";

  return (
    <section className="space-y-6">
      {message ? (
        <div
          className={`rounded-[1.5rem] border px-5 py-4 text-sm ${
            status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <p>{message}</p>
        </div>
      ) : null}

      <header className="section-shell px-6 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <Webhook className="h-3.5 w-3.5" />
              Hotmart
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Logs de webhook</h2>
              <p className="mt-2 max-w-3xl text-ink/72">
                Acompanhe rapidamente o status dos webhooks, identifique a primeira falha e consulte o histórico de
                reprocessamento sem depender de uma tabela técnica extensa.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
            <Database className="h-4 w-4 text-accent" />
            {logs.length} {logs.length === 1 ? "registro carregado" : "registros carregados"}
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryMetrics.map((metric) => (
          <article className="rounded-[1.5rem] border border-gray-200 bg-white px-5 py-5 shadow-card" key={metric.label}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{metric.value}</p>
            <p className="mt-2 text-sm leading-6 text-ink/65">{metric.description}</p>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        {logs.length ? (
          logs.map((log) => (
            <details className="group overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card" key={log.id}>
              <summary className="list-none cursor-pointer px-5 py-5 transition hover:bg-black/[0.015] md:px-6 md:py-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {renderProcessingStatus(log)}
                      {log.initial_response_status_code ? renderTechnicalChip("HTTP", String(log.initial_response_status_code), log.initial_response_status_code >= 500 ? "danger" : "accent") : null}
                      {log.initial_processing_duration_ms !== null ? renderTechnicalChip("Duração", formatDuration(log.initial_processing_duration_ms), "neutral") : null}
                      {log.first_failure_stage ? renderTechnicalChip("Etapa", formatFailureStage(log.first_failure_stage), "neutral") : null}
                      {log.processing_attempts > 0 ? renderTechnicalChip("Tentativas", String(log.processing_attempts), "accent") : null}
                    </div>

                    <div>
                      <p className="text-lg font-semibold text-ink">{log.event}</p>
                      <p className="mt-1 break-all text-xs text-ink/50">{log.webhook_id}</p>
                    </div>

                    <div className="grid gap-3 text-sm text-ink/72 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Transação</p>
                        <p className="mt-2 break-all text-sm text-ink/80">{log.transaction ?? "-"}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">E-mail</p>
                        <p className="mt-2 break-all text-sm text-ink/80">{log.buyer_email ?? "-"}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Criação Hotmart</p>
                        <p className="mt-2 text-sm text-ink/80">{formatDateTime(log.creation_date)}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Recebido em</p>
                        <p className="mt-2 text-sm text-ink/80">{formatDateTime(log.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4 lg:flex-col lg:items-end">
                    <div className="text-right text-sm text-ink/60">
                      <p>Toque para ver diagnóstico e reprocessamento</p>
                    </div>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-ink/55 transition group-open:border-accent/30 group-open:text-accent">
                      <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                    </span>
                  </div>
                </div>
              </summary>

              <div className="border-t border-gray-100 bg-background/60 px-5 py-5 md:px-6 md:py-6">
                <div className="space-y-5">
                  <article className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700/75">Primeira falha</p>
                        <h3 className="text-lg font-semibold text-red-900">Diagnóstico inicial</h3>
                        <p className="max-w-3xl text-sm leading-6 text-red-800">
                          {log.first_processing_error ?? "Nenhum erro inicial registrado."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {renderTechnicalChip("Etapa", formatFailureStage(log.first_failure_stage), "danger")}
                        {renderTechnicalChip("HTTP", log.initial_response_status_code ? String(log.initial_response_status_code) : "-", "danger")}
                        {renderTechnicalChip("Duração", formatDuration(log.initial_processing_duration_ms), "danger")}
                      </div>
                    </div>
                  </article>

                  <article className="rounded-[1.5rem] border border-gray-200 bg-white px-5 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Reprocessamento</p>
                        <h3 className="text-lg font-semibold text-ink">Histórico operacional</h3>
                        <p className="text-sm leading-6 text-ink/65">
                          Consulte tentativas manuais, resultado mais recente e o estado atual do webhook.
                        </p>
                      </div>
                      {!log.processed ? (
                        <form action={reprocessWebhookLogAction}>
                          <input name="webhookLogId" type="hidden" value={log.id} />
                          <input name="webhookId" type="hidden" value={log.webhook_id} />
                          <button
                            className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                            type="submit"
                          >
                            <RefreshCcw className="h-4 w-4" />
                            Reprocessar
                          </button>
                        </form>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Tentativas manuais</p>
                        <p className="mt-2 text-sm text-ink/80">{log.processing_attempts}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Última tentativa</p>
                        <p className="mt-2 text-sm text-ink/80">{formatDateTime(log.last_processing_attempt_at)}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Último sucesso</p>
                        <p className="mt-2 text-sm text-ink/80">{formatDateTime(log.last_processing_success_at)}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-background/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Resultado do último retry</p>
                        <p className="mt-2 text-sm text-ink/80">{formatReprocessingResult(log.last_reprocessing_result)}</p>
                      </div>
                    </div>

                    {log.last_reprocessing_error ? (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <p className="font-medium">Último erro de reprocessamento</p>
                        <p className="mt-1">{log.last_reprocessing_error}</p>
                      </div>
                    ) : null}

                    {log.processing_error ? (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <p className="font-medium">Erro atual</p>
                        <p className="mt-1">{log.processing_error}</p>
                      </div>
                    ) : null}
                  </article>

                  <article className="rounded-[1.5rem] border border-gray-200 bg-white px-5 py-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">Payload bruto</p>
                        <h3 className="mt-2 text-lg font-semibold text-ink">Dados técnicos completos</h3>
                        <p className="mt-2 text-sm leading-6 text-ink/65">
                          JSON original recebido da Hotmart para apoio de auditoria e comparação técnica.
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-background px-3 py-1.5 text-xs text-ink/60">
                        <Gauge className="h-3.5 w-3.5" />
                        Visual secundário
                      </div>
                    </div>
                    <details className="mt-4 rounded-2xl border border-gray-200 bg-ink text-white">
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-white/88">
                        Mostrar payload bruto
                      </summary>
                      <pre className="overflow-x-auto border-t border-white/10 px-4 py-4 text-xs leading-6 text-white/88">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </details>
                  </article>
                </div>
              </div>
            </details>
          ))
        ) : (
          <article className="rounded-[1.75rem] border border-gray-200 bg-white px-6 py-10 text-center text-sm text-ink/60 shadow-card">
            Nenhum webhook foi registrado até o momento para a sua sessão.
          </article>
        )}
      </section>
    </section>
  );
}

