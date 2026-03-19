"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, MessageSquareText } from "lucide-react";

import {
  type ClientMessagesReportResult,
  useMetaReports,
} from "@/components/dashboard/meta-reports-provider";

type MessagesReportContentProps = {
  activeAdAccountName: string;
  adAccountId: string;
};

function formatCurrency(value: number | null) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)}%`;
}

function getDateRange() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const until = new Date(today);
  until.setDate(today.getDate() - 1);

  const since = new Date(until);
  since.setDate(until.getDate() - 6);

  const format = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return {
    since: format(since),
    until: format(until),
  };
}

function createMessagesErrorResult(message: string): ClientMessagesReportResult {
  const { since, until } = getDateRange();

  return {
    campaignLabel: "Campanhas [WHATS] da conta",
    lastCheckedAt: new Date().toISOString(),
    message,
    rows: [],
    since,
    state: "error",
    until,
  };
}

export function MessagesReportContent({
  activeAdAccountName,
  adAccountId,
}: MessagesReportContentProps) {
  const { getMessagesReport } = useMetaReports();
  const [report, setReport] = useState<ClientMessagesReportResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    getMessagesReport(adAccountId)
      .then((nextReport) => {
        if (isMounted) {
          setReport(nextReport);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReport(createMessagesErrorResult("Nao foi possivel carregar o relatorio de mensagens."));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [adAccountId, getMessagesReport]);

  if (!report) {
    return (
      <section className="space-y-6">
        <header className="section-shell px-6 py-6 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                <MessageSquareText className="h-3.5 w-3.5" />
                Relatorio de mensagens
              </span>
              <div>
                <h2 className="text-3xl font-semibold">Campanhas de mensagens</h2>
                <p className="mt-2 max-w-3xl text-ink/72">
                  Estamos consultando a Meta e reaproveitando os dados da sessao quando possivel.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-3 rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
              <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
              Buscando dados...
            </div>
          </div>
        </header>

        <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
          <div className="space-y-3 px-6 py-6">
            <div className="h-6 w-48 animate-pulse rounded-xl bg-background" />
            <div className="h-12 animate-pulse rounded-2xl bg-background" />
            <div className="h-12 animate-pulse rounded-2xl bg-background" />
          </div>
        </article>
      </section>
    );
  }

  const lastCheckedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(report.lastCheckedAt));
  const dateRangeLabel = `${formatDate(report.since)} a ${formatDate(report.until)}`;

  return (
    <section className="space-y-6">
      <header className="section-shell px-6 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <MessageSquareText className="h-3.5 w-3.5" />
              Relatorio de mensagens
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Campanhas de mensagens</h2>
              <p className="mt-2 max-w-3xl">
                Campanha analisada: <span className="font-medium text-ink">{report.campaignLabel}</span>.
              </p>
              <p className="mt-1 text-sm text-ink/70">
                Conta ativa: <span className="font-medium text-ink">{activeAdAccountName}</span>
              </p>
              <p className="mt-1 text-sm text-ink/70">
                Intervalo utilizado: <span className="font-medium text-ink">{dateRangeLabel}</span>
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
            Ultima consulta: {lastCheckedAt}
          </div>
        </div>
      </header>

      {report.state === "error" || report.state === "not_configured" || report.state === "not_found" ? (
        <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-8">
          <h3 className="text-xl font-semibold">Nao foi possivel carregar o relatorio</h3>
          <p className="mt-3 text-sm">{report.message}</p>
        </article>
      ) : report.state === "empty" ? (
        <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-8">
          <h3 className="text-xl font-semibold">Sem dados no periodo</h3>
          <p className="mt-3 text-sm">
            Existem campanhas com [WHATS], mas a Meta nao retornou dados para o intervalo selecionado.
          </p>
        </article>
      ) : (
        <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="text-xl font-semibold">Tabela de campanhas</h3>
            <p className="mt-2 text-sm">
              Acompanhe investimento, mensagens iniciadas e desempenho de link de cada campanha.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-background text-left text-ink">
                <tr>
                  <th className="px-6 py-4 font-semibold">Campanha</th>
                  <th className="px-6 py-4 font-semibold">Custo</th>
                  <th className="px-6 py-4 font-semibold">Mensagens</th>
                  <th className="px-6 py-4 font-semibold">Custo por mensagem</th>
                  <th className="px-6 py-4 font-semibold">Impressoes</th>
                  <th className="px-6 py-4 font-semibold">Cliques</th>
                  <th className="px-6 py-4 font-semibold">CTR%</th>
                  <th className="px-6 py-4 font-semibold">CPC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {report.rows.map((row) => (
                  <tr className="align-top" key={row.campaignId}>
                    <td className="px-6 py-4"><p className="font-medium text-ink">{row.campaignName}</p></td>
                    <td className="px-6 py-4">{formatCurrency(row.amountSpent)}</td>
                    <td className="px-6 py-4">{formatNumber(row.startedMessages)}</td>
                    <td className="px-6 py-4">{formatCurrency(row.costPerStartedMessage)}</td>
                    <td className="px-6 py-4">{formatNumber(row.impressions)}</td>
                    <td className="px-6 py-4">{formatNumber(row.linkClicks)}</td>
                    <td className="px-6 py-4">{formatPercentage(row.linkCtr)}</td>
                    <td className="px-6 py-4">{formatCurrency(row.costPerLinkClick)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </section>
  );
}
