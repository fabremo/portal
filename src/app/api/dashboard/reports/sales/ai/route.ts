import { NextRequest, NextResponse } from "next/server";

import { generateGeminiText } from "@/lib/ai/gemini";
import { getCompanyAiSettingsRecord } from "@/lib/dashboard/company-ai-settings";
import { getDashboardAccessContext } from "@/lib/dashboard/access";
import { resolveReportDatePreset } from "@/lib/facebook/report-date-range";
import { getFacebookSalesReport } from "@/lib/facebook/sales-report";

type SalesAiRequestBody = {
  adAccountId?: string;
  includeReportContext?: boolean;
  preset?: string;
  prompt?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function createReportContext({
  activeAdAccountName,
  adAccountId,
  companyId,
  report,
}: {
  activeAdAccountName: string;
  adAccountId: string;
  companyId: string;
  report: Awaited<ReturnType<typeof getFacebookSalesReport>>;
}) {
  const summary =
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
        };

  return {
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
      companyId,
      since: report.since,
      state: report.state,
      until: report.until,
    },
    summary,
  };
}

function createGeminiPrompt({
  prompt,
  reportContext,
}: {
  prompt: string;
  reportContext?: ReturnType<typeof createReportContext>;
}) {
  const sections = [
    "Você é um analista de mídia e vendas. Responda em PT-BR de forma objetiva, prática e orientada a ação.",
    "Use apenas os dados fornecidos. Se algo não estiver disponível no contexto, diga isso claramente sem inventar.",
    "",
    `Solicitação do usuário:\n${prompt}`,
  ];

  if (reportContext) {
    sections.push("", `Contexto estruturado do relatório:\n${JSON.stringify(reportContext, null, 2)}`);
    sections.push(
      "",
      "Considere o funil e as campanhas para identificar padrões, gargalos e oportunidades. Não use dados de anúncios ou dados diários porque eles não foram enviados nesta etapa."
    );
  }

  return sections.join("\n");
}

export async function POST(request: NextRequest) {
  const accessContext = await getDashboardAccessContext();

  if (!accessContext) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SalesAiRequestBody | null;
  const adAccountId = typeof body?.adAccountId === "string" ? body.adAccountId.trim() : "";
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const includeReportContext = body?.includeReportContext === true;
  const preset = resolveReportDatePreset(body?.preset);

  if (!adAccountId) {
    return NextResponse.json({ message: "Conta de anúncios não informada." }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ message: "Digite um prompt antes de enviar." }, { status: 400 });
  }

  const hasAccess = accessContext.accessibleAccounts.some((account) => account.id === adAccountId);

  if (!hasAccess) {
    return NextResponse.json({ message: "Conta de anúncios não autorizada." }, { status: 403 });
  }

  const companyId = accessContext.accountCompanyIds[adAccountId];

  if (!companyId) {
    return NextResponse.json(
      { message: "A conta de anúncios selecionada não está vinculada a nenhuma empresa." },
      { status: 400 }
    );
  }

  const aiSettings = await getCompanyAiSettingsRecord(companyId);

  if (!aiSettings?.apiKey || !aiSettings.model) {
    return NextResponse.json(
      { message: "A empresa ativa ainda não possui uma configuração Gemini válida." },
      { status: 400 }
    );
  }

  if (!aiSettings.isEnabled) {
    return NextResponse.json(
      { message: "A IA desta empresa está desabilitada no momento." },
      { status: 400 }
    );
  }

  if (aiSettings.provider !== "gemini") {
    return NextResponse.json(
      { message: `Provider não suportado nesta etapa: ${aiSettings.provider}.` },
      { status: 400 }
    );
  }

  const report = await getFacebookSalesReport(companyId, adAccountId, accessContext.userId, preset);
  const activeAdAccountName =
    accessContext.accessibleAccounts.find((account) => account.id === adAccountId)?.name ||
    "Conta sem nome";

  const reportContext = includeReportContext
    ? createReportContext({
        activeAdAccountName,
        adAccountId,
        companyId,
        report,
      })
    : undefined;

  try {
    const answer = await generateGeminiText({
      apiKey: aiSettings.apiKey,
      model: aiSettings.model,
      prompt: createGeminiPrompt({ prompt, reportContext }),
    });

    return NextResponse.json({
      answer,
      contextIncluded: includeReportContext,
      model: aiSettings.model,
      provider: "gemini" as const,
      reportSummary:
        report.state === "ok"
          ? `Investimento ${formatCurrency(
              report.rows.reduce((total, row) => total + row.amountSpent, 0)
            )} em ${report.rows.length} campanhas.`
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível obter uma resposta da IA para o relatório de vendas.",
      },
      { status: 500 }
    );
  }
}
