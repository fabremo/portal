import { BarChart3 } from "lucide-react";

import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { getFacebookSalesReport } from "@/lib/facebook/sales-report";

function formatCurrency(value: number) {
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

function formatRoas(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)}x`;
}

export default async function SalesReportPage() {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext?.activeAdAccount) {
    return null;
  }

  const report = await getFacebookSalesReport(accessContext.activeAdAccount.id);
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
              <BarChart3 className="h-3.5 w-3.5" />
              Relatorio de vendas
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Campanhas de vendas</h2>
              <p className="mt-2 max-w-3xl">
                A tabela mostra apenas campanhas cujo nome contenha <span className="font-medium text-ink">[VENDAS]</span>.
              </p>
              <p className="mt-1 text-sm text-ink/70">
                Conta ativa:{" "}
                <span className="font-medium text-ink">{accessContext.activeAdAccount.name}</span>
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
          <h3 className="text-xl font-semibold">Sem campanhas de vendas com dados</h3>
          <p className="mt-3 text-sm">
            Existem campanhas com [VENDAS], mas a Meta nao retornou resultados para o periodo selecionado.
          </p>
        </article>
      ) : (
        <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="text-xl font-semibold">Tabela de campanhas</h3>
            <p className="mt-2 text-sm">
              Acompanhe investimento, compras, faturamento e retorno das campanhas de vendas.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-background text-left text-ink">
                <tr>
                  <th className="px-6 py-4 font-semibold">Campanha</th>
                  <th className="px-6 py-4 font-semibold">Custo</th>
                  <th className="px-6 py-4 font-semibold">Compras</th>
                  <th className="px-6 py-4 font-semibold">Faturamento</th>
                  <th className="px-6 py-4 font-semibold">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {report.rows.map((row) => (
                  <tr className="align-top" key={row.campaignId}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink">{row.campaignName}</p>
                    </td>
                    <td className="px-6 py-4">{formatCurrency(row.amountSpent)}</td>
                    <td className="px-6 py-4">{formatNumber(row.purchases)}</td>
                    <td className="px-6 py-4">{formatCurrency(row.purchaseValue)}</td>
                    <td className="px-6 py-4">{formatRoas(row.roas)}</td>
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
