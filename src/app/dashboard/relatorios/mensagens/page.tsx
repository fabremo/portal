import { MessageSquareText } from "lucide-react";

import { getFacebookMessagesReport } from "@/lib/facebook/messages-report";

function formatCurrency(value: number | null) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export default async function MessagesReportPage() {
  const report = await getFacebookMessagesReport();
  const lastCheckedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(report.lastCheckedAt));

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
              <h2 className="text-3xl font-semibold">Mensagens por anúncio</h2>
              <p className="mt-2 max-w-3xl">
                Campanha analisada: <span className="font-medium text-ink">{report.campaignName}</span>.
                Período padrão desta tela: últimos 7 dias.
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
            A campanha foi encontrada, mas não retornou anúncios com dados para os últimos 7 dias.
          </p>
        </article>
      ) : (
        <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="text-xl font-semibold">Tabela de anúncios</h3>
            <p className="mt-2 text-sm">
              Acompanhe investimento, mensagens iniciadas e desempenho de link de cada anúncio.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-background text-left text-ink">
                <tr>
                  <th className="px-6 py-4 font-semibold">Anúncio</th>
                  <th className="px-6 py-4 font-semibold">Montante investido</th>
                  <th className="px-6 py-4 font-semibold">Mensagens iniciadas</th>
                  <th className="px-6 py-4 font-semibold">Impressões</th>
                  <th className="px-6 py-4 font-semibold">Cliques no link</th>
                  <th className="px-6 py-4 font-semibold">Custo por mensagem iniciada</th>
                  <th className="px-6 py-4 font-semibold">Custo por clique no link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {report.rows.map((row) => (
                  <tr className="align-top" key={row.adId}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink">{row.adName}</p>
                      <p className="mt-1 text-xs text-ink/52">ID: {row.adId}</p>
                    </td>
                    <td className="px-6 py-4">{formatCurrency(row.amountSpent)}</td>
                    <td className="px-6 py-4">{formatNumber(row.startedMessages)}</td>
                    <td className="px-6 py-4">{formatNumber(row.impressions)}</td>
                    <td className="px-6 py-4">{formatNumber(row.linkClicks)}</td>
                    <td className="px-6 py-4">{formatCurrency(row.costPerStartedMessage)}</td>
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
