import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, ChevronDown, Database, RefreshCcw, Webhook } from "lucide-react";

import { reprocessWebhookLogAction } from "@/app/dashboard/compradores/webhooks/actions";
import { canAccessBuyersModule, getDashboardAccessContext } from "@/lib/dashboard/access";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

type WebhookLogRow = {
  buyer_email: string | null;
  created_at: string;
  creation_date: string | null;
  event: string;
  id: string;
  last_processing_attempt_at: string | null;
  last_processing_success_at: string | null;
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

const WEBHOOK_ROW_GRID_CLASS =
  "grid min-w-[1360px] grid-cols-[minmax(210px,1.25fr)_minmax(180px,1fr)_minmax(240px,1.2fr)_140px_150px_170px_170px_160px_72px] items-start";

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

function renderProcessingStatus(log: WebhookLogRow) {
  if (log.processed) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Processado
      </span>
    );
  }

  if (log.processing_error) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
        <AlertCircle className="h-3.5 w-3.5" />
        Com erro
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
      <Webhook className="h-3.5 w-3.5" />
      Pendente
    </span>
  );
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
      last_processing_attempt_at,
      last_processing_success_at,
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
                Consulte os 50 registros mais recentes salvos na tabela <code>webhook_logs</code>, com status de
                processamento, tentativas e payload completo para auditoria.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
            <Database className="h-4 w-4 text-accent" />
            {logs.length} {logs.length === 1 ? "registro carregado" : "registros carregados"}
          </div>
        </div>
      </header>

      <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <div className="min-w-[1360px] divide-y divide-gray-200 text-sm">
            <div
              className={`${WEBHOOK_ROW_GRID_CLASS} bg-ink/[0.03] text-left text-xs uppercase tracking-[0.18em] text-ink/55`}
            >
              <div className="px-5 py-4 font-semibold">Evento</div>
              <div className="px-5 py-4 font-semibold">Transação</div>
              <div className="px-5 py-4 font-semibold">E-mail</div>
              <div className="px-5 py-4 font-semibold">Criação Hotmart</div>
              <div className="px-5 py-4 font-semibold">Recebido em</div>
              <div className="px-5 py-4 font-semibold">Tentativas</div>
              <div className="px-5 py-4 font-semibold">Última tentativa</div>
              <div className="px-5 py-4 font-semibold">Último sucesso</div>
              <div className="px-5 py-4 font-semibold">Status</div>
              <div className="px-5 py-4" aria-label="Expandir payload" />
            </div>

            <div className="divide-y divide-gray-100">
              {logs.length ? (
                logs.map((log) => (
                  <details className="group w-full" key={log.id}>
                    <summary className={`${WEBHOOK_ROW_GRID_CLASS} cursor-pointer list-none transition hover:bg-black/[0.015]`}>
                      <div className="min-w-0 px-5 py-4">
                        <p className="font-medium text-ink">{log.event}</p>
                        <p className="mt-1 break-all text-xs text-ink/55">{log.webhook_id}</p>
                      </div>
                      <div className="min-w-0 px-5 py-4 text-ink/72">{log.transaction ?? "-"}</div>
                      <div className="min-w-0 px-5 py-4 text-ink/72">{log.buyer_email ?? "-"}</div>
                      <div className="px-5 py-4 text-ink/72">{formatDateTime(log.creation_date)}</div>
                      <div className="px-5 py-4 text-ink/72">{formatDateTime(log.created_at)}</div>
                      <div className="px-5 py-4 text-ink/72">{log.processing_attempts}</div>
                      <div className="px-5 py-4 text-ink/72">{formatDateTime(log.last_processing_attempt_at)}</div>
                      <div className="px-5 py-4 text-ink/72">{formatDateTime(log.last_processing_success_at)}</div>
                      <div className="px-5 py-4">{renderProcessingStatus(log)}</div>
                      <div className="flex justify-end px-5 py-4">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-ink/55 transition group-open:border-accent/30 group-open:text-accent">
                          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                        </span>
                      </div>
                    </summary>

                    <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                      <div className="w-full rounded-2xl border border-gray-200 bg-background/80 p-4 md:p-5">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          {log.processing_error ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:max-w-3xl">
                              {log.processing_error}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                              Nenhum erro registrado para este webhook.
                            </div>
                          )}

                          {log.processing_error ? (
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
                        <pre className="overflow-x-auto rounded-2xl bg-ink px-4 py-4 text-xs leading-6 text-white/88">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </details>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-ink/60">
                  Nenhum webhook foi registrado até o momento para a sua sessão.
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
