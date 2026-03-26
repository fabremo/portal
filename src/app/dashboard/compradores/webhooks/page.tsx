import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, Database, Webhook } from "lucide-react";

import { canAccessBuyersModule, getDashboardAccessContext } from "@/lib/dashboard/access";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

type WebhookLogRow = {
  id: string;
  webhook_id: string;
  event: string;
  creation_date: string | null;
  transaction: string | null;
  buyer_email: string | null;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
  payload: unknown;
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

async function getWebhookLogs() {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  const { data, error } = await supabase
    .from("webhook_logs")
    .select(
      "id, webhook_id, event, creation_date, transaction, buyer_email, processed, processing_error, created_at, payload"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error("Não foi possível carregar os logs de webhook.");
  }

  return (data ?? []) as WebhookLogRow[];
}

export default async function DashboardWebhookLogsPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext) {
    redirect("/login");
  }

  if (!canAccessBuyersModule(accessContext.role)) {
    redirect("/dashboard");
  }

  const logs = await getWebhookLogs();

  return (
    <section className="space-y-6">
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
                Consulta dos 50 registros mais recentes salvos na tabela <code>webhook_logs</code>.
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
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-ink/[0.03] text-left text-xs uppercase tracking-[0.18em] text-ink/55">
              <tr>
                <th className="px-5 py-4 font-semibold">Evento</th>
                <th className="px-5 py-4 font-semibold">Transação</th>
                <th className="px-5 py-4 font-semibold">E-mail</th>
                <th className="px-5 py-4 font-semibold">Criação Hotmart</th>
                <th className="px-5 py-4 font-semibold">Recebido em</th>
                <th className="px-5 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length ? (
                logs.map((log) => (
                  <tr className="align-top" key={log.id}>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p className="font-medium text-ink">{log.event}</p>
                        <p className="break-all text-xs text-ink/55">{log.webhook_id}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-ink/72">{log.transaction ?? "-"}</td>
                    <td className="px-5 py-4 text-ink/72">{log.buyer_email ?? "-"}</td>
                    <td className="px-5 py-4 text-ink/72">{formatDateTime(log.creation_date)}</td>
                    <td className="px-5 py-4 text-ink/72">{formatDateTime(log.created_at)}</td>
                    <td className="px-5 py-4">
                      {log.processed ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Processado
                        </span>
                      ) : log.processing_error ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Com erro
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                          <Webhook className="h-3.5 w-3.5" />
                          Pendente
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-ink/60" colSpan={6}>
                    Nenhum webhook foi registrado até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {logs.length ? (
        <div className="grid gap-4">
          {logs.map((log) => (
            <details className="rounded-[1.5rem] border border-gray-200 bg-white p-5 shadow-card" key={`${log.id}-payload`}>
              <summary className="cursor-pointer list-none text-sm font-medium text-ink">
                Payload bruto: {log.event} {log.transaction ? `- ${log.transaction}` : ""}
              </summary>
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-ink px-4 py-4 text-xs leading-6 text-white/88">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      ) : null}
    </section>
  );
}
