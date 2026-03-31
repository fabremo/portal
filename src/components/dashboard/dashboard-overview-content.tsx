import { BellDot, DollarSign, ShoppingBag } from "lucide-react";

import { type ClientSalesReportResult } from "@/components/dashboard/meta-reports-provider";

type FacebookStatusTone = "success" | "warning" | "danger" | "neutral";

type FacebookAccountStatusView = {
  accountName: string;
  disableReasonText: string | null;
  lastCheckedAt: string;
  rawStatusCode: number | null;
  statusLabel: string;
  statusTone: FacebookStatusTone;
};

type DashboardOverviewContentProps = {
  activeAdAccountName: string;
  facebookStatus: FacebookAccountStatusView;
  salesReport: ClientSalesReportResult;
};

const toneStyles = {
  danger: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-gray-200 bg-white text-ink",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

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

export function DashboardOverviewContent({
  activeAdAccountName,
  facebookStatus,
  salesReport,
}: DashboardOverviewContentProps) {
  const lastCheckedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(facebookStatus.lastCheckedAt));
  const shouldShowRawStatusCode =
    facebookStatus.statusTone === "warning" || facebookStatus.statusTone === "danger";
  const dateRangeLabel = `${formatDate(salesReport.since)} a ${formatDate(salesReport.until)}`;
  const shouldShowSalesError =
    salesReport.state === "not_configured" || salesReport.state === "error";
  const totalPurchases =
    salesReport.state === "ok" || salesReport.state === "empty"
      ? salesReport.rows.reduce((total, row) => total + row.purchases, 0)
      : null;
  const totalAmountSpent =
    salesReport.state === "ok" || salesReport.state === "empty"
      ? salesReport.rows.reduce((total, row) => total + row.amountSpent, 0)
      : null;

  return (
    <section className="space-y-6">
      <header className="section-shell px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <BellDot className="h-3.5 w-3.5" />
              Resumo da operação
            </span>
            <div>
              <h2 className="text-3xl font-semibold">Visão geral do cliente</h2>
              <p className="mt-2 max-w-2xl">
                Aqui você acompanha o status da sua conta de anúncios e confirma qual conta está
                ativa no portal.
              </p>
              <p className="mt-1 text-sm text-ink/70">
                Conta ativa: <span className="font-medium text-ink">{activeAdAccountName}</span>
              </p>
              <p className="mt-1 text-sm text-ink/70">
                Intervalo utilizado: <span className="font-medium text-ink">{dateRangeLabel}</span>
              </p>
            </div>
          </div>
          <div
            className={[
              "w-full max-w-sm rounded-2xl border px-5 py-4 shadow-card",
              toneStyles[facebookStatus.statusTone],
            ].join(" ")}
          >
            <p className="text-xs uppercase tracking-[0.22em] opacity-70">
              Status da conta no Facebook
            </p>
            <p className="mt-2 text-xl font-semibold">{facebookStatus.statusLabel}</p>
            <div className="mt-3 space-y-1 text-sm">
              <p>{facebookStatus.accountName}</p>
              {shouldShowRawStatusCode ? <p>Código bruto: {facebookStatus.rawStatusCode ?? "N/A"}</p> : null}
              {facebookStatus.disableReasonText ? <p>Motivo: {facebookStatus.disableReasonText}</p> : null}
              <p>Última consulta: {lastCheckedAt}</p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/55">
                Total de compras
              </p>
              {totalPurchases !== null ? (
                <p className="mt-4 text-4xl font-semibold text-ink">{formatNumber(totalPurchases)}</p>
              ) : (
                <p className="mt-4 text-2xl font-semibold text-ink">Indisponível</p>
              )}
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <ShoppingBag className="h-5 w-5" />
            </span>
          </div>

          {shouldShowSalesError ? (
            <div className="mt-5 text-sm text-ink/70">
              <p>{salesReport.message}</p>
            </div>
          ) : null}
        </article>

        <article className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-card md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/55">
                Total investido
              </p>
              {totalAmountSpent !== null ? (
                <p className="mt-4 text-4xl font-semibold text-ink">{formatCurrency(totalAmountSpent)}</p>
              ) : (
                <p className="mt-4 text-2xl font-semibold text-ink">Indisponível</p>
              )}
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <DollarSign className="h-5 w-5" />
            </span>
          </div>

          {shouldShowSalesError ? (
            <div className="mt-5 text-sm text-ink/70">
              <p>{salesReport.message}</p>
            </div>
          ) : null}
        </article>
      </section>
    </section>
  );
}