"use client";

import { useEffect, useState } from "react";
import { BarChart3, LoaderCircle, Sparkles } from "lucide-react";

import {
  type ClientSalesReportResult,
  useMetaReports,
} from "@/components/dashboard/meta-reports-provider";
import type { CompanyAiSettingsStatus } from "@/lib/dashboard/company-ai-settings-types";
import {
  getReportDateRange,
  type ReportDatePreset,
} from "@/lib/facebook/report-date-range";

type SalesReportContentProps = {
  activeAdAccountName: string;
  adAccountId: string;
  activeCompanyId: string;
  companyAiStatus: CompanyAiSettingsStatus;
  initialPreset?: ReportDatePreset;
  initialReport: ClientSalesReportResult;
};

type FunnelStageDefinition = {
  accentClassName: string;
  metricLabel: string;
  title: string;
  valueLabel: string;
  widthClassName: string;
};

const SALES_PERIOD_OPTIONS: Array<{ label: string; preset: ReportDatePreset }> = [
  { label: "7 dias", preset: "last_7_days" },
  { label: "Este mês", preset: "current_month" },
  { label: "Mês anterior", preset: "previous_month" },
];

const FUNNEL_STAGE_DEFINITIONS: FunnelStageDefinition[] = [
  {
    accentClassName:
      "border-amber-200 bg-gradient-to-r from-amber-500 via-orange-500 to-orange-400 text-white",
    metricLabel: "CPM",
    title: "Impressões",
    valueLabel: "volume total",
    widthClassName: "md:w-full",
  },
  {
    accentClassName:
      "border-rose-200 bg-gradient-to-r from-rose-500 via-red-500 to-red-400 text-white",
    metricLabel: "CTR e CPC",
    title: "Cliques no link",
    valueLabel: "tráfego qualificado",
    widthClassName: "md:w-[88%]",
  },
  {
    accentClassName:
      "border-emerald-200 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 text-white",
    metricLabel: "Connect rate",
    title: "Visualizações de página",
    valueLabel: "página de destino",
    widthClassName: "md:w-[76%]",
  },
  {
    accentClassName:
      "border-sky-200 bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 text-white",
    metricLabel: "Custo por checkout",
    title: "Checkouts",
    valueLabel: "avanço para compra",
    widthClassName: "md:w-[64%]",
  },
  {
    accentClassName:
      "border-violet-200 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 text-white",
    metricLabel: "Custo por venda",
    title: "Vendas",
    valueLabel: "conversões finais",
    widthClassName: "md:w-[52%]",
  },
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
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

function formatOptionalCurrency(value: number | null) {
  return value === null ? "-" : formatCurrency(value);
}

function createSalesErrorResult(
  message: string,
  preset: ReportDatePreset
): ClientSalesReportResult {
  const { since, until } = getReportDateRange(preset);

  return {
    adRows: [],
    dailyRows: [],
    funnelSummary: null,
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

function buildAiContextPreview(
  report: ClientSalesReportResult,
  activeAdAccountName: string,
  activeCompanyId: string,
  adAccountId: string
) {
  const context = {
    campaigns:
      report.state === "ok"
        ? report.rows.map((row) => ({
            amountSpent: row.amountSpent,
            campaignId: row.campaignId,
            campaignName: row.campaignName,
            purchaseValue: row.purchaseValue,
            purchases: row.purchases,
            roas: row.roas,
          }))
        : [],
    funnel:
      report.state === "ok" && report.funnelSummary
        ? {
            checkouts: report.funnelSummary.checkouts,
            connectRate: report.funnelSummary.connectRate,
            costPerCheckout: report.funnelSummary.costPerCheckout,
            costPerLinkClick: report.funnelSummary.costPerLinkClick,
            costPerPurchase: report.funnelSummary.costPerPurchase,
            cpm: report.funnelSummary.cpm,
            impressions: report.funnelSummary.impressions,
            landingPageViews: report.funnelSummary.landingPageViews,
            linkClicks: report.funnelSummary.linkClicks,
            linkCtr: report.funnelSummary.linkCtr,
            purchases: report.funnelSummary.purchases,
          }
        : null,
    meta: {
      activeAdAccountName,
      adAccountId,
      companyId: activeCompanyId,
      since: report.since,
      state: report.state,
      until: report.until,
    },
    summary:
      report.state === "ok"
        ? {
            campaignCount: report.rows.length,
            totalAmountSpent: report.rows.reduce((total, row) => total + row.amountSpent, 0),
            totalPurchaseValue: report.rows.reduce((total, row) => total + row.purchaseValue, 0),
            totalPurchases: report.rows.reduce((total, row) => total + row.purchases, 0),
          }
        : {
            campaignCount: 0,
            totalAmountSpent: 0,
            totalPurchaseValue: 0,
            totalPurchases: 0,
          },
  };

  return JSON.stringify(context, null, 2);
}

function renderMarkdownInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderAiAnswer(answer: string) {
  const lines = answer.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let bulletItems: string[] = [];
  let orderedItems: string[] = [];

  function flushBullets() {
    if (!bulletItems.length) {
      return;
    }

    blocks.push(
      <ul className="list-disc space-y-2 pl-5" key={`bullets-${blocks.length}`}>
        {bulletItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderMarkdownInline(item)}</li>
        ))}
      </ul>
    );
    bulletItems = [];
  }

  function flushOrdered() {
    if (!orderedItems.length) {
      return;
    }

    blocks.push(
      <ol className="list-decimal space-y-2 pl-5" key={`ordered-${blocks.length}`}>
        {orderedItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderMarkdownInline(item)}</li>
        ))}
      </ol>
    );
    orderedItems = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushBullets();
      flushOrdered();
      continue;
    }

    if (line === "---") {
      flushBullets();
      flushOrdered();
      blocks.push(<hr className="border-emerald-200" key={`hr-${blocks.length}`} />);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushBullets();
      orderedItems.push(orderedMatch[1]);
      continue;
    }

    if (line.startsWith("*   ") || line.startsWith("* ")) {
      flushOrdered();
      bulletItems.push(line.replace(/^\*\s+/, ""));
      continue;
    }

    flushBullets();
    flushOrdered();

    if (line.startsWith("### ")) {
      blocks.push(
        <h4 className="text-lg font-semibold text-emerald-950" key={`h3-${blocks.length}`}>
          {renderMarkdownInline(line.slice(4))}
        </h4>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h4 className="text-xl font-semibold text-emerald-950" key={`h2-${blocks.length}`}>
          {renderMarkdownInline(line.slice(3))}
        </h4>
      );
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h4 className="text-2xl font-semibold text-emerald-950" key={`h1-${blocks.length}`}>
          {renderMarkdownInline(line.slice(2))}
        </h4>
      );
      continue;
    }

    blocks.push(
      <p className="leading-7 text-emerald-950" key={`p-${blocks.length}`}>
        {renderMarkdownInline(line)}
      </p>
    );
  }

  flushBullets();
  flushOrdered();

  return <div className="space-y-4">{blocks}</div>;
}

function SalesFunnel({ report }: { report: Extract<ClientSalesReportResult, { state: "ok" }> }) {
  const summary = report.funnelSummary;

  if (!summary) {
    return null;
  }

  const stages = [
    {
      ...FUNNEL_STAGE_DEFINITIONS[0],
      metricValue: formatOptionalCurrency(summary.cpm),
      value: formatNumber(summary.impressions),
    },
    {
      ...FUNNEL_STAGE_DEFINITIONS[1],
      metricValue: `${formatPercent(summary.linkCtr)} • ${formatOptionalCurrency(summary.costPerLinkClick)}`,
      value: formatNumber(summary.linkClicks),
    },
    {
      ...FUNNEL_STAGE_DEFINITIONS[2],
      metricValue: formatPercent(summary.connectRate),
      value: formatNumber(summary.landingPageViews),
    },
    {
      ...FUNNEL_STAGE_DEFINITIONS[3],
      metricValue: formatOptionalCurrency(summary.costPerCheckout),
      value: formatNumber(summary.checkouts),
    },
    {
      ...FUNNEL_STAGE_DEFINITIONS[4],
      metricValue: formatOptionalCurrency(summary.costPerPurchase),
      value: formatNumber(summary.purchases),
    },
  ];

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
      <div className="border-b border-gray-200 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Leitura do funil</p>
            <h3 className="mt-2 text-xl font-semibold">Funil visual de vendas</h3>
            <p className="mt-2 max-w-3xl text-sm text-ink/72">
              A progressão abaixo consolida a jornada das campanhas de vendas da conta ativa, da entrega até a conversão final.
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-background px-4 py-3 text-sm text-ink/68">
            Baseado no mesmo período e nos mesmos insights exibidos nas tabelas acima.
          </div>
        </div>
      </div>

      <div className="bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.10),transparent_28%)] px-4 py-6 md:px-6 lg:px-8">
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div className="flex justify-center" key={stage.title}>
              <div className={["w-full", stage.widthClassName].join(" ")}>
                <div
                  className={[
                    "group relative overflow-hidden rounded-[1.7rem] border shadow-[0_20px_55px_-28px_rgba(15,23,42,0.55)]",
                    stage.accentClassName,
                  ].join(" ")}
                >
                  <div className="absolute inset-y-0 right-10 hidden w-24 -skew-x-[20deg] bg-white/12 blur-[1px] md:block" />
                  <div className="absolute inset-y-0 right-0 hidden w-16 bg-black/8 md:block" />
                  <div className="relative grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:px-6 md:py-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                      <div className="min-w-[120px] border-white/35 pb-3 md:border-r md:pb-0 md:pr-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/78">
                          Etapa {index + 1}
                        </p>
                        <p className="mt-2 text-sm font-medium text-white/88">{stage.valueLabel}</p>
                      </div>
                      <div>
                        <h4 className="text-2xl font-semibold tracking-tight text-white md:text-[2rem]">
                          {stage.title}
                        </h4>
                        <p className="mt-2 text-sm text-white/82">
                          {stage.metricLabel}: <span className="font-semibold text-white">{stage.metricValue}</span>
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/20 bg-black/10 px-4 py-4 backdrop-blur-sm md:min-w-[180px] md:px-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">Valor</p>
                      <p className="mt-2 text-3xl font-semibold text-white md:text-4xl">{stage.value}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function SalesAiAssistantCard({
  activeCompanyId,
  activeAdAccountName,
  adAccountId,
  companyAiStatus,
  report,
  selectedPreset,
}: {
  activeCompanyId: string;
  activeAdAccountName: string;
  adAccountId: string;
  companyAiStatus: CompanyAiSettingsStatus;
  report: ClientSalesReportResult;
  selectedPreset: ReportDatePreset;
}) {
  const [prompt, setPrompt] = useState("");
  const [includeReportContext, setIncludeReportContext] = useState(true);
  const [answer, setAnswer] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contextPreview = buildAiContextPreview(
    report,
    activeAdAccountName,
    activeCompanyId,
    adAccountId
  );
  const isConfigured = companyAiStatus.isConfigured;

  async function handleSubmit() {
    if (!prompt.trim()) {
      setErrorMessage("Digite um prompt antes de enviar.");
      setAnswer("");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setAnswer("");

    try {
      const response = await fetch("/api/dashboard/reports/sales/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adAccountId,
          includeReportContext,
          preset: selectedPreset,
          prompt: prompt.trim(),
        }),
      });

      const payload = (await response.json()) as {
        answer?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Não foi possível obter a resposta da IA.");
      }

      setAnswer(payload.answer || "");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível obter a resposta da IA."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
      <div className="border-b border-gray-200 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Inteligência artificial
            </div>
            <h3 className="mt-3 text-xl font-semibold text-ink">Assistente do relatório de vendas</h3>
            <p className="mt-2 max-w-3xl text-sm text-ink/72">
              Escreva um prompt como se estivesse em um chat. Agora o envio usa Gemini e pode seguir com um contexto JSON estruturado de funil e campanhas.
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-background px-4 py-3 text-sm text-ink/68 lg:max-w-sm">
            {isConfigured ? (
              <>
                <p className="font-medium text-ink">Configuração ativa</p>
                <p className="mt-1">
                  {companyAiStatus.provider?.toUpperCase()} • {companyAiStatus.model}
                </p>
                {companyAiStatus.updatedAt ? (
                  <p className="mt-1 text-xs text-ink/55">
                    Atualizada em {formatDateTime(companyAiStatus.updatedAt)}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="font-medium text-ink">Configuração pendente</p>
                <p className="mt-1">A empresa ativa ainda não tem uma API key e um modelo Gemini salvos.</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)]">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">Prompt</span>
            <textarea
              className="min-h-[220px] w-full rounded-[1.5rem] border border-gray-200 bg-background px-4 py-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-accent/45 focus:ring-2 focus:ring-accent/12"
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ex.: Analise os dados deste período, aponte gargalos no funil e sugira três próximos testes para as campanhas de vendas."
              value={prompt}
            />
          </label>

          <label className="flex items-start gap-3 rounded-[1.35rem] border border-gray-200 bg-background/55 px-4 py-4 text-sm text-ink transition hover:border-accent/25">
            <input
              checked={includeReportContext}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
              onChange={(event) => setIncludeReportContext(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block font-medium text-ink">Incluir contexto do relatório atual</span>
              <span className="mt-1 block text-ink/62">
                O envio pode incluir um JSON estruturado com metadados, resumo, funil e campanhas do período selecionado.
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink/60">
              {isConfigured
                ? "A empresa já possui uma configuração Gemini válida para responder ao seu prompt."
                : "A integração real depende de cadastrar a API key e o modelo da empresa na aba IA."}
            </p>
            <button
              className="inline-flex items-center justify-center rounded-2xl bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-ink/92 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isSubmitting || !prompt.trim()}
              onClick={handleSubmit}
              type="button"
            >
              {isSubmitting ? "Consultando IA..." : "Enviar para IA"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-gray-200 bg-background/55 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/48">Contexto disponível</p>
            <p className="mt-2 text-sm text-ink/66">
              {includeReportContext
                ? "Prévia do JSON estruturado que acompanhará o prompt nesta etapa."
                : "O envio do contexto automático está desativado neste envio."}
            </p>
            <div className="mt-4 rounded-[1.25rem] border border-gray-200 bg-white p-4">
              {includeReportContext ? (
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words text-sm text-ink/74">{contextPreview}</pre>
              ) : (
                <p className="text-sm text-ink/55">Somente o texto digitado no editor será considerado.</p>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-dashed border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/48">Rascunho atual</p>
            <div className="mt-3 rounded-[1.25rem] bg-background px-4 py-4 text-sm text-ink/70">
              {prompt.trim() ? prompt : "Seu prompt vai aparecer aqui conforme você escreve."}
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {answer ? (
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Resposta da IA
              </p>
              <div className="mt-3 text-sm">{renderAiAnswer(answer)}</div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function SalesReportContent({
  activeCompanyId,
  activeAdAccountName,
  adAccountId,
  companyAiStatus,
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
                : "Não foi possível carregar o relatório de vendas.",
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
                Relatório de vendas
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

  const lastCheckedAt = formatDateTime(report.lastCheckedAt);
  const dateRangeLabel = `${formatDate(report.since)} a ${formatDate(report.until)}`;

  return (
    <section className="space-y-6">
      <header className="section-shell px-6 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <BarChart3 className="h-3.5 w-3.5" />
              Relatório de vendas
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
          <h3 className="text-xl font-semibold">Sem campanhas de vendas com dados</h3>
          <p className="mt-3 text-sm">
            Existem campanhas com [VENDAS], mas a Meta não retornou resultados para o período selecionado.
          </p>
        </article>
      ) : report.state === "ok" ? (
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
                Veja o consolidado diário das campanhas de vendas, do dia mais recente para o mais antigo.
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
              <h3 className="text-xl font-semibold">Tabela por anúncio</h3>
              <p className="mt-2 text-sm">
                Consolide os anúncios pelo nome e priorize os que mais geraram compras no período.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-background text-left text-ink">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nome do anúncio</th>
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
                      <td className="px-6 py-4">{formatOptionalCurrency(row.costPerLinkClick)}</td>
                      <td className="px-6 py-4">{formatOptionalCurrency(row.costPerPurchase)}</td>
                      <td className="px-6 py-4">{formatRoas(row.roas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <SalesFunnel report={report} />
        </div>
      ) : null}

      <SalesAiAssistantCard
        activeCompanyId={activeCompanyId}
        activeAdAccountName={activeAdAccountName}
        adAccountId={adAccountId}
        companyAiStatus={companyAiStatus}
        report={report}
        selectedPreset={selectedPreset}
      />
    </section>
  );
}