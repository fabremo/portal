import "server-only";

import { getSalesDateRange, type SalesDatePreset } from "@/lib/facebook/sales-date-range";
const META_GRAPH_VERSION = "v25.0";
const SALES_CAMPAIGN_TAG = "[VENDAS]";

const PURCHASE_ACTION_TYPES = ["purchase"] as const;

type MetaAction = {
  action_type?: string;
  value?: string;
};

type MetaCampaign = {
  id: string;
  name: string;
};

type MetaCampaignResponse = {
  data?: MetaCampaign[];
  error?: {
    message?: string;
  };
  paging?: {
    next?: string;
  };
};

type MetaInsightRow = {
  ad_id?: string;
  ad_name?: string;
  action_values?: MetaAction[];
  actions?: MetaAction[];
  campaign_id?: string;
  campaign_name?: string;
  date_start?: string;
  impressions?: string;
  inline_link_clicks?: string;
  spend?: string;
};

type MetaInsightResponse = {
  data?: MetaInsightRow[];
  error?: {
    message?: string;
  };
  paging?: {
    next?: string;
  };
};

export type FacebookSalesRow = {
  amountSpent: number;
  campaignId: string;
  campaignName: string;
  purchaseValue: number;
  purchases: number;
  roas: number | null;
};

export type FacebookSalesDailyRow = {
  amountSpent: number;
  date: string;
  purchaseValue: number;
  purchases: number;
  roas: number | null;
};

export type FacebookSalesAdRow = {
  adName: string;
  amountSpent: number;
  costPerLinkClick: number | null;
  costPerPurchase: number | null;
  linkCtr: number | null;
  purchases: number;
  purchaseValue: number;
  roas: number | null;
};

export type FacebookSalesReportResult =
  | {
    adRows: [];
    dailyRows: [];
    lastCheckedAt: string;
    message: string;
    rows: [];
    since: string;
    state: "not_configured" | "not_found" | "error";
    until: string;
  }
  | {
    adRows: FacebookSalesAdRow[];
    dailyRows: FacebookSalesDailyRow[];
    lastCheckedAt: string;
    rows: FacebookSalesRow[];
    since: string;
    state: "empty" | "ok";
    until: string;
  };

export type FacebookSalesOverviewSummary =
  | {
    lastCheckedAt: string;
    message: string;
    since: string;
    state: "not_configured" | "not_found" | "error";
    totalAmountSpent: null;
    totalPurchases: null;
    until: string;
  }
  | {
    lastCheckedAt: string;
    since: string;
    state: "empty" | "ok";
    totalAmountSpent: number;
    totalPurchases: number;
    until: string;
  };


function parseNumber(value?: string | number | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPurchaseActionType(actionType?: string) {
  return Boolean(
    actionType &&
    PURCHASE_ACTION_TYPES.includes(actionType as (typeof PURCHASE_ACTION_TYPES)[number])
  );
}

function extractPurchaseCount(actions?: MetaAction[]) {
  if (!actions?.length) {
    return 0;
  }

  return actions.reduce((total, action) => {
    if (!isPurchaseActionType(action.action_type)) {
      return total;
    }

    return total + parseNumber(action.value);
  }, 0);
}

function extractPurchaseValue(actionValues?: MetaAction[]) {
  if (!actionValues?.length) {
    return 0;
  }

  return actionValues.reduce((total, action) => {
    if (!isPurchaseActionType(action.action_type)) {
      return total;
    }

    return total + parseNumber(action.value);
  }, 0);
}

function calculateRoas(amountSpent: number, purchaseValue: number) {
  return amountSpent > 0 ? purchaseValue / amountSpent : null;
}

function buildDailyRows(rows: MetaInsightRow[]) {
  const groupedRows = new Map<string, FacebookSalesDailyRow>();

  for (const row of rows) {
    const date = row.date_start;

    if (!date) {
      continue;
    }

    const amountSpent = parseNumber(row.spend);
    const purchases = extractPurchaseCount(row.actions);
    const purchaseValue = extractPurchaseValue(row.action_values);
    const existingRow = groupedRows.get(date);

    if (!existingRow) {
      groupedRows.set(date, {
        amountSpent,
        date,
        purchaseValue,
        purchases,
        roas: calculateRoas(amountSpent, purchaseValue),
      });
      continue;
    }

    existingRow.amountSpent += amountSpent;
    existingRow.purchaseValue += purchaseValue;
    existingRow.purchases += purchases;
    existingRow.roas = calculateRoas(existingRow.amountSpent, existingRow.purchaseValue);
  }

  return Array.from(groupedRows.values()).sort((left, right) =>
    right.date.localeCompare(left.date, "pt-BR")
  );
}

/**
 * Consolida as linhas brutas de insights por anúncio retornadas pela Meta.
 *
 * Agrupa os registros pelo nome do anúncio, soma os principais indicadores
 * (gasto, impressões, cliques, compras e faturamento) e calcula métricas
 * derivadas como CTR, CPC, custo por compra e ROAS.
 *
 * O resultado final dessa função alimenta a tabela "por anúncio" do relatório.
 */

function buildAdRows(rows: MetaInsightRow[]) {
  const groupedRows = new Map<
    string,
    {
      adName: string;
      amountSpent: number;
      impressions: number;
      linkClicks: number;
      purchases: number;
      purchaseValue: number;
    }
  >();

  for (const row of rows) {
    const adName = row.ad_name?.trim();

    if (!adName) {
      continue;
    }

    const amountSpent = parseNumber(row.spend);
    const impressions = parseNumber(row.impressions);
    const linkClicks = parseNumber(row.inline_link_clicks);
    const purchases = extractPurchaseCount(row.actions);
    const existingRow = groupedRows.get(adName);
    const purchaseValue = extractPurchaseValue(row.action_values);





    if (!existingRow) {
      groupedRows.set(adName, {
        adName,
        amountSpent,
        impressions,
        linkClicks,
        purchases,
        purchaseValue,
      });
      continue;
    }

    existingRow.amountSpent += amountSpent;
    existingRow.impressions += impressions;
    existingRow.linkClicks += linkClicks;
    existingRow.purchases += purchases;
    existingRow.purchaseValue += purchaseValue;

  }

  return Array.from(groupedRows.values())
    .map((row) => ({
      adName: row.adName,
      amountSpent: row.amountSpent,
      costPerLinkClick: row.linkClicks > 0 ? row.amountSpent / row.linkClicks : null,
      costPerPurchase: row.purchases > 0 ? row.amountSpent / row.purchases : null,
      linkCtr: row.impressions > 0 ? (row.linkClicks / row.impressions) * 100 : null,
      purchases: row.purchases,
      purchaseValue: row.purchaseValue,
      roas: calculateRoas(row.amountSpent, row.purchaseValue),
    }))
    .sort((left, right) => {
      if (right.purchases !== left.purchases) {
        return right.purchases - left.purchases;
      }

      if (right.amountSpent !== left.amountSpent) {
        return right.amountSpent - left.amountSpent;
      }

      return left.adName.localeCompare(right.adName, "pt-BR");
    });
}

async function fetchMetaJson<T>(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
  });

  const payload = (await response.json()) as T & { error?: { message?: string } };

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || "Falha ao consultar a API da Meta.");
  }

  return payload;
}

async function findSalesCampaigns(accessToken: string, adAccountId: string) {
  let nextUrl =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${adAccountId}/campaigns?` +
    new URLSearchParams({
      access_token: accessToken,
      fields: "id,name",
      limit: "100",
    }).toString();

  const campaigns: MetaCampaign[] = [];

  while (nextUrl) {
    const payload = await fetchMetaJson<MetaCampaignResponse>(nextUrl);
    const matchingCampaigns =
      payload.data?.filter((campaign) => campaign.name?.includes(SALES_CAMPAIGN_TAG)) ?? [];

    campaigns.push(...matchingCampaigns);
    nextUrl = payload.paging?.next ?? "";
  }

  return campaigns;
}

async function fetchCampaignSalesInsight(
  accessToken: string,
  campaign: MetaCampaign,
  since: string,
  until: string
) {
  const insightUrl =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${campaign.id}/insights?` +
    new URLSearchParams({
      access_token: accessToken,
      fields: "campaign_id,campaign_name,spend,actions,action_values",
      time_increment: "all_days",
      time_range: JSON.stringify({ since, until }),
    }).toString();

  const payload = await fetchMetaJson<MetaInsightResponse>(insightUrl);
  const row = payload.data?.[0];

  if (!row) {
    return null;
  }

  const amountSpent = parseNumber(row.spend);
  const purchases = extractPurchaseCount(row.actions);
  const purchaseValue = extractPurchaseValue(row.action_values);

  return {
    amountSpent,
    campaignId: row.campaign_id || campaign.id,
    campaignName: row.campaign_name || campaign.name,
    purchaseValue,
    purchases,
    roas: calculateRoas(amountSpent, purchaseValue),
  } satisfies FacebookSalesRow;
}

async function fetchDailySalesInsights(
  accessToken: string,
  adAccountId: string,
  since: string,
  until: string
) {
  let nextUrl =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${adAccountId}/insights?` +
    new URLSearchParams({
      access_token: accessToken,
      fields: "campaign_id,campaign_name,date_start,spend,actions,action_values",
      level: "campaign",
      time_increment: "1",
      time_range: JSON.stringify({ since, until }),
    }).toString();

  const rows: MetaInsightRow[] = [];

  while (nextUrl) {
    const payload = await fetchMetaJson<MetaInsightResponse>(nextUrl);
    const matchingRows =
      payload.data?.filter((row) => row.campaign_name?.includes(SALES_CAMPAIGN_TAG)) ?? [];

    rows.push(...matchingRows);
    nextUrl = payload.paging?.next ?? "";
  }

  return buildDailyRows(rows);
}

async function fetchAdSalesInsights(
  accessToken: string,
  adAccountId: string,
  since: string,
  until: string
) {
  let nextUrl =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${adAccountId}/insights?` +
    new URLSearchParams({
      access_token: accessToken,
      fields: "ad_id,ad_name,campaign_id,campaign_name,spend,impressions,inline_link_clicks,actions,action_values",
      level: "ad",
      time_increment: "all_days",
      time_range: JSON.stringify({ since, until }),
    }).toString();

  const rows: MetaInsightRow[] = [];

  while (nextUrl) {
    const payload = await fetchMetaJson<MetaInsightResponse>(nextUrl);
    const matchingRows =
      payload.data?.filter((row) => row.campaign_name?.includes(SALES_CAMPAIGN_TAG)) ?? [];

    rows.push(...matchingRows);
    nextUrl = payload.paging?.next ?? "";
  }

  return buildAdRows(rows);
}

/**
 * Monta o relatório completo de vendas da conta de anúncios selecionada.
 *
 * Fluxo:
 * 1. Valida se existe token da Meta configurado.
 * 2. Busca as campanhas da conta cujo nome contenha [VENDAS].
 * 3. Consulta, em paralelo, os dados agregados por campanha, por dia e por anúncio.
 * 4. Normaliza os dados retornados pela API da Meta e calcula métricas como compras,
 *    faturamento, custo por compra e ROAS.
 * 5. Retorna um objeto único para a UI, com estados de sucesso, vazio, erro ou
 *    configuração ausente.
 *
 * Essa é a função principal do relatório de vendas e serve como ponto central de
 * orquestração dos fetches e transformações feitas neste arquivo.
 */

export async function getFacebookSalesReport(
  adAccountId: string,
  preset: SalesDatePreset = "last_7_days"
): Promise<FacebookSalesReportResult> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const lastCheckedAt = new Date().toISOString();
  const { since, until } = getSalesDateRange(preset);
  if (!accessToken) {
    return {
      adRows: [],
      dailyRows: [],
      lastCheckedAt,
      message: "Defina FACEBOOK_ACCESS_TOKEN para habilitar o relatório de Vendas.",
      rows: [],
      since,
      state: "not_configured",
      until,
    };
  }

  try {
    const campaigns = await findSalesCampaigns(accessToken, adAccountId);

    if (!campaigns.length) {
      return {
        adRows: [],
        dailyRows: [],
        lastCheckedAt,
        message: "Não há campanha com [VENDAS] na conta de anúncios selecionada.",
        rows: [],
        since,
        state: "not_found",
        until,
      };
    }

    const [rows, dailyRows, adRows] = await Promise.all([
      Promise.all(
        campaigns.map((campaign) => fetchCampaignSalesInsight(accessToken, campaign, since, until))
      ),
      fetchDailySalesInsights(accessToken, adAccountId, since, until),
      fetchAdSalesInsights(accessToken, adAccountId, since, until),
    ]);

    const campaignRows = rows
      .filter((row): row is FacebookSalesRow => Boolean(row))
      .sort((left, right) => left.campaignName.localeCompare(right.campaignName, "pt-BR"));

    if (!campaignRows.length) {
      return {
        adRows: [],
        dailyRows: [],
        lastCheckedAt,
        rows: [],
        since,
        state: "empty",
        until,
      };
    }

    return {
      adRows,
      dailyRows,
      lastCheckedAt,
      rows: campaignRows,
      since,
      state: "ok",
      until,
    };
  } catch (error) {
    return {
      adRows: [],
      dailyRows: [],
      lastCheckedAt,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível consultar a API da Meta para o relatório de vendas.",
      rows: [],
      since,
      state: "error",
      until,
    };
  }
}

export async function getFacebookSalesOverviewSummary(
  adAccountId: string
): Promise<FacebookSalesOverviewSummary> {
  const report = await getFacebookSalesReport(adAccountId);

  switch (report.state) {
    case "ok": {
      const totalPurchases = report.rows.reduce((total, row) => total + row.purchases, 0);
      const totalAmountSpent = report.rows.reduce((total, row) => total + row.amountSpent, 0);

      return {
        lastCheckedAt: report.lastCheckedAt,
        since: report.since,
        state: "ok",
        totalAmountSpent,
        totalPurchases,
        until: report.until,
      };
    }
    case "empty":
      return {
        lastCheckedAt: report.lastCheckedAt,
        since: report.since,
        state: "empty",
        totalAmountSpent: 0,
        totalPurchases: 0,
        until: report.until,
      };
    default:
      return {
        lastCheckedAt: report.lastCheckedAt,
        message: report.message,
        since: report.since,
        state: report.state,
        totalAmountSpent: null,
        totalPurchases: null,
        until: report.until,
      };
  }
}



