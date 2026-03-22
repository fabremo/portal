"use client";

import { useEffect, useState } from "react";
import { BarChart3, LoaderCircle } from "lucide-react";

import {
  type ClientSalesReportResult,
  useMetaReports,
} from "@/components/dashboard/meta-reports-provider";

type SalesReportContentProps = {
  activeAdAccountName: string;
  adAccountId: string;
};

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

function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)}%`;
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

function createSalesErrorResult(message: string): ClientSalesReportResult {
  const { since, until } = getDateRange();

  return {
    adRows: [],
    dailyRows: [],
    lastCheckedAt: new Date().toISOString(),
    message,
    rows: [],
    since,
    state: "error",
    until,
  };
}

export function SalesReportContent({ activeAdAccountName, adAccountId }: SalesReportContentProps) {
  const { getSalesReport } = useMetaReports();
  const [report, setReport] = useState<ClientSalesReportResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    getSalesReport(adAccountId)
      .then((nextReport) => {
        if (isMounted) {
          setReport(nextReport);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setReport(createSalesErrorResult(error instanceof Error ? error.message : "Nao foi possivel carregar o relatorio de vendas."));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [adAccountId, getSalesReport]);

  if (!report) {
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

        {[1, 2, 3].map((item) => (
          <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card" key={item}>
            <div className="space-y-3 px-6 py-6">
              <div className="h-6 w-48 animate-pulse rounded-xl bg-background" />
              <div className="h-12 animate-pulse rounded-2xl bg-background" />
              <div className="h-12 animate-pulse rounded-2xl bg-background" />
            </div>
          </article>
        ))}
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
              <BarChart3 className="h-3.5 w-3.5" />
              Relatorio de vendas
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Campanhas de vendas</h2>
              <p className="mt-2 max-w-3xl">
                A tabela mostra apenas campanhas cujo nome contenha <span className="font-medium text-ink">[VENDAS]</span>.
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
          <h3 className="text-xl font-semibold">Sem campanhas de vendas com dados</h3>
          <p className="mt-3 text-sm">
            Existem campanhas com [VENDAS], mas a Meta nao retornou resultados para o periodo selecionado.
          </p>
        </article>
      ) : (
        <div className="space-y-6">
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
                      <td className="px-6 py-4"><p className="font-medium text-ink">{row.campaignName}</p></td>
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

          <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
            <div className="border-b border-gray-200 px-6 py-5">
              <h3 className="text-xl font-semibold">Tabela por dia</h3>
              <p className="mt-2 text-sm">
                Veja o consolidado diario das campanhas de vendas, do dia mais recente para o mais antigo.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-background text-left text-ink">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Dia</th>
                    <th className="px-6 py-4 font-semibold">Custo</th>
                    <th className="px-6 py-4 font-semibold">Compras</th>
                    <th className="px-6 py-4 font-semibold">Faturamento</th>
                    <th className="px-6 py-4 font-semibold">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.dailyRows.map((row) => (
                    <tr className="align-top" key={row.date}>
                      <td className="px-6 py-4"><p className="font-medium text-ink">{formatDate(row.date)}</p></td>
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

          <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
            <div className="border-b border-gray-200 px-6 py-5">
              <h3 className="text-xl font-semibold">Tabela por anuncio</h3>
              <p className="mt-2 text-sm">
                Consolide os anuncios pelo nome e priorize os que mais geraram compras no periodo.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-background text-left text-ink">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nome do anuncio</th>
                    <th className="px-6 py-4 font-semibold">Custo</th>
                    <th className="px-6 py-4 font-semibold">Compra</th>
                    <th className="px-6 py-4 font-semibold">CTR%</th>
                    <th className="px-6 py-4 font-semibold">CPC</th>
                    <th className="px-6 py-4 font-semibold">Custo por compra</th>
                    <th className="px-6 py-4 font-semibold">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.adRows.map((row) => (
                    <tr className="align-top" key={row.adName}>
                      <td className="px-6 py-4"><p className="font-medium text-ink">{row.adName}</p></td>
                      <td className="px-6 py-4">{formatCurrency(row.amountSpent)}</td>
                      <td className="px-6 py-4">{formatNumber(row.purchases)}</td>
                      <td className="px-6 py-4">{formatPercent(row.linkCtr)}</td>
                      <td className="px-6 py-4">{row.costPerLinkClick === null ? "-" : formatCurrency(row.costPerLinkClick)}</td>
                      <td className="px-6 py-4">{row.costPerPurchase === null ? "-" : formatCurrency(row.costPerPurchase)}</td>
                      <td className="px-6 py-4">{formatRoas(row.roas)}</td>

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

