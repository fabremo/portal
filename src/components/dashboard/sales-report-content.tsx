"use client";

import { useEffect, useState } from "react";
import { BarChart3, LoaderCircle } from "lucide-react";

import {
  type ClientSalesReportResult,
  useMetaReports,
} from "@/components/dashboard/meta-reports-provider";
import {
  getReportDateRange,
  type ReportDatePreset,
} from "@/lib/facebook/report-date-range";

type SalesReportContentProps = {
  activeAdAccountName: string;
  adAccountId: string;
  initialPreset?: ReportDatePreset;
  initialReport: ClientSalesReportResult;
};

const SALES_PERIOD_OPTIONS: Array<{ label: string; preset: ReportDatePreset }> = [
  { label: "7 dias", preset: "last_7_days" },
  { label: "Este m\u00eas", preset: "current_month" },
  { label: "M\u00eas anterior", preset: "previous_month" },
];

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

function createSalesErrorResult(
  message: string,
  preset: ReportDatePreset
): ClientSalesReportResult {
  const { since, until } = getReportDateRange(preset);

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

function renderPresetButtons(
  selectedPreset: ReportDatePreset,
  onSelect: (preset: ReportDatePreset) => void
) {
  return SALES_PERIOD_OPTIONS.map((option) => {
    const isActive = option.preset === selectedPreset;

    return (
      <button
        aria-pressed={isActive}
        className={[
          "rounded-full border px-4 py-2 text-sm font-medium transition",
          isActive
            ? "border-accent bg-accent text-white shadow-card"
            : "border-black/10 bg-white text-ink/75 hover:border-accent/40 hover:text-ink",
        ].join(" ")}
        key={option.preset}
        onClick={() => onSelect(option.preset)}
        type="button"
      >
        {option.label}
      </button>
    );
  });
}

export function SalesReportContent({
  activeAdAccountName,
  adAccountId,
  initialPreset = "last_7_days",
  initialReport,
}: SalesReportContentProps) {
  const { getSalesReport } = useMetaReports();
  const [selectedPreset, setSelectedPreset] = useState<ReportDatePreset>(initialPreset);
  const [asyncReport, setAsyncReport] = useState<ClientSalesReportResult | null>(null);

  function handlePresetSelect(preset: ReportDatePreset) {
    if (preset === selectedPreset) {
      return;
    }

    setSelectedPreset(preset);

    if (preset !== initialPreset) {
      setAsyncReport(null);
    }
  }

  useEffect(() => {
    if (selectedPreset === initialPreset) {
      return;
    }

    let isMounted = true;

    getSalesReport(adAccountId, selectedPreset)
      .then((nextReport) => {
        if (isMounted) {
          setAsyncReport(nextReport);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setAsyncReport(
            createSalesErrorResult(
              error instanceof Error
                ? error.message
                : "N\u00e3o foi poss\u00edvel carregar o relat\u00f3rio de vendas.",
              selectedPreset
            )
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [adAccountId, getSalesReport, initialPreset, selectedPreset]);

  const report = selectedPreset === initialPreset ? initialReport : asyncReport;

  if (!report) {
    return (
      <section className="space-y-6">
        <header className="section-shell px-6 py-6 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                <BarChart3 className="h-3.5 w-3.5" />
                {"Relat\u00f3rio de vendas"}
              </span>
              <div>
                <h2 className="text-3xl font-semibold">Campanhas de vendas</h2>
                <p className="mt-2 max-w-3xl text-ink/72">Estamos consultando a Meta.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="flex flex-wrap gap-2">
                {renderPresetButtons(selectedPreset, handlePresetSelect)}
              </div>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
                <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
                Buscando dados...
              </div>
            </div>
          </div>
        </header>

        {[1, 2, 3].map((item) => (
          <article
            className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card"
            key={item}
          >
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
              {"Relat\u00f3rio de vendas"}
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Campanhas de vendas</h2>
              <p className="mt-2 max-w-3xl">
                A tabela mostra apenas campanhas cujo nome contenha <span className="font-medium text-ink">[VENDAS]</span>.
              </p>
              <p className="mt-1 text-sm text-ink/70">
                Conta ativa: <span className="font-medium text-ink">{activeAdAccountName}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {renderPresetButtons(selectedPreset, handlePresetSelect)}
              </div>
              <p className="mt-3 text-sm text-ink/70">
                Intervalo utilizado: <span className="font-medium text-ink">{dateRangeLabel}</span>
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-black/5 bg-background px-5 py-4 text-sm text-ink/70">
            {"\u00daltima consulta"}: {lastCheckedAt}
          </div>
        </div>
      </header>

      {report.state === "error" || report.state === "not_configured" || report.state === "not_found" ? (
        <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-8">
          <h3 className="text-xl font-semibold">{"N\u00e3o foi poss\u00edvel carregar o relat\u00f3rio"}</h3>
          <p className="mt-3 text-sm">{report.message}</p>
        </article>
      ) : report.state === "empty" ? (
        <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-8">
          <h3 className="text-xl font-semibold">Sem campanhas de vendas com dados</h3>
          <p className="mt-3 text-sm">
            {"Existem campanhas com [VENDAS], mas a Meta n\u00e3o retornou resultados para o per\u00edodo selecionado."}
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

          <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
            <div className="border-b border-gray-200 px-6 py-5">
              <h3 className="text-xl font-semibold">Tabela por dia</h3>
              <p className="mt-2 text-sm">
                {"Veja o consolidado di\u00e1rio das campanhas de vendas, do dia mais recente para o mais antigo."}
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
                      <td className="px-6 py-4">
                        <p className="font-medium text-ink">{formatDate(row.date)}</p>
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

          <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
            <div className="border-b border-gray-200 px-6 py-5">
              <h3 className="text-xl font-semibold">{"Tabela por an\u00fancio"}</h3>
              <p className="mt-2 text-sm">
                {"Consolide os an\u00fancios pelo nome e priorize os que mais geraram compras no per\u00edodo."}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-background text-left text-ink">
                  <tr>
                    <th className="px-6 py-4 font-semibold">{"Nome do an\u00fancio"}</th>
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
                      <td className="px-6 py-4">
                        <p className="font-medium text-ink">{row.adName}</p>
                      </td>
                      <td className="px-6 py-4">{formatCurrency(row.amountSpent)}</td>
                      <td className="px-6 py-4">{formatNumber(row.purchases)}</td>
                      <td className="px-6 py-4">{formatPercent(row.linkCtr)}</td>
                      <td className="px-6 py-4">
                        {row.costPerLinkClick === null ? "-" : formatCurrency(row.costPerLinkClick)}
                      </td>
                      <td className="px-6 py-4">
                        {row.costPerPurchase === null ? "-" : formatCurrency(row.costPerPurchase)}
                      </td>
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
