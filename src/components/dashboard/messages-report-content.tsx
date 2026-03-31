import { MessageSquareText } from "lucide-react";

import { type ClientMessagesReportResult } from "@/components/dashboard/meta-reports-provider";

type MessagesReportContentProps = {
  activeAdAccountName: string;
  initialReport: ClientMessagesReportResult;
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

export function MessagesReportContent({
  activeAdAccountName,
  initialReport,
}: MessagesReportContentProps) {
  const report = initialReport;
  const campaignRows = report.rows;
  const dailyRows = report.dailyRows;
  const adRows = report.adRows;
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
              Relatório de mensagens
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
            Última consulta: {lastCheckedAt}
          </div>
        </div>
      </header>

      {report.state === "error" || report.state === "not_configured" || report.state === "not_found" ? (
        <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-8">
          <h3 className="text-xl font-semibold">Não foi possível carregar o relatório</h3>
          <p className="mt-3 text-sm">{report.message}</p>
        </article>
      ) : report.state === "empty" ? (
        <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-8">
          <h3 className="text-xl font-semibold">Sem dados no período</h3>
          <p className="mt-3 text-sm">
            Existem campanhas com [WHATS], mas a Meta não retornou dados para o intervalo selecionado.
          </p>
        </article>
      ) : (
        <div className="space-y-6">
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
                    <th className="px-6 py-4 font-semibold">Impressões</th>
                    <th className="px-6 py-4 font-semibold">Cliques</th>
                    <th className="px-6 py-4 font-semibold">CTR%</th>
                    <th className="px-6 py-4 font-semibold">CPC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {campaignRows.map((row) => (
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

          <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
            <div className="border-b border-gray-200 px-6 py-5">
              <h3 className="text-xl font-semibold">Tabela por dia</h3>
              <p className="mt-2 text-sm">
                Veja o consolidado diário das campanhas de mensagens, do dia mais recente para o mais antigo.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-background text-left text-ink">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Dia</th>
                    <th className="px-6 py-4 font-semibold">Custo</th>
                    <th className="px-6 py-4 font-semibold">Mensagens</th>
                    <th className="px-6 py-4 font-semibold">Custo por mensagem</th>
                    <th className="px-6 py-4 font-semibold">Impressões</th>
                    <th className="px-6 py-4 font-semibold">Cliques</th>
                    <th className="px-6 py-4 font-semibold">CTR%</th>
                    <th className="px-6 py-4 font-semibold">CPC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dailyRows.map((row) => (
                    <tr className="align-top" key={row.date}>
                      <td className="px-6 py-4"><p className="font-medium text-ink">{formatDate(row.date)}</p></td>
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

          <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
            <div className="border-b border-gray-200 px-6 py-5">
              <h3 className="text-xl font-semibold">Tabela por anúncio</h3>
              <p className="mt-2 text-sm">
                Consolide os anúncios pelo nome e priorize os que mais geraram mensagens no período.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-background text-left text-ink">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nome do anúncio</th>
                    <th className="px-6 py-4 font-semibold">Custo</th>
                    <th className="px-6 py-4 font-semibold">Mensagens</th>
                    <th className="px-6 py-4 font-semibold">CTR%</th>
                    <th className="px-6 py-4 font-semibold">CPC</th>
                    <th className="px-6 py-4 font-semibold">Custo por mensagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adRows.map((row) => (
                    <tr className="align-top" key={row.adName}>
                      <td className="px-6 py-4"><p className="font-medium text-ink">{row.adName}</p></td>
                      <td className="px-6 py-4">{formatCurrency(row.amountSpent)}</td>
                      <td className="px-6 py-4">{formatNumber(row.startedMessages)}</td>
                      <td className="px-6 py-4">{formatPercentage(row.linkCtr)}</td>
                      <td className="px-6 py-4">{formatCurrency(row.costPerLinkClick)}</td>
                      <td className="px-6 py-4">{formatCurrency(row.costPerStartedMessage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}