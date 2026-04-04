import "server-only";

import {
  ensureMetaInsightsReady,
  hasStoredCampaignTag,
  listStoredMetaInsights,
  MetaSyncNotConfiguredError,
} from "@/lib/facebook/meta-insights";
import { getReportDateRange, type ReportDatePreset } from "@/lib/facebook/report-date-range";

const SALES_CAMPAIGN_TAG = "[VENDAS]";

type StoredInsightRow = Awaited<ReturnType<typeof listStoredMetaInsights>>[number];

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

export type FacebookSalesFunnelSummary = {
  checkouts: number;
  connectRate: number | null;
  costPerCheckout: number | null;
  costPerLinkClick: number | null;
  costPerPurchase: number | null;
  cpm: number | null;
  impressions: number;
  landingPageViews: number;
  linkClicks: number;
  linkCtr: number | null;
  purchases: number;
};

export type FacebookSalesReportResult =
  | {
      adRows: [];
      dailyRows: [];
      funnelSummary: null;
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
      funnelSummary: FacebookSalesFunnelSummary | null;
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

function calculateRoas(amountSpent: number, purchaseValue: number) {
  return amountSpent > 0 ? purchaseValue / amountSpent : null;
}

function divideOrNull(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function getLatestSyncedAt(rows: StoredInsightRow[]) {
  return rows.reduce((latest, row) => {
    return row.synced_at > latest ? row.synced_at : latest;
  }, rows[0]?.synced_at ?? new Date().toISOString());
}

function filterSalesRows(rows: StoredInsightRow[]) {
  return rows.filter((row) => row.campaign_name?.includes(SALES_CAMPAIGN_TAG));
}

function buildCampaignRows(rows: StoredInsightRow[]) {
  const groupedRows = new Map<string, FacebookSalesRow>();

  for (const row of rows) {
    const campaignId = row.campaign_id || row.campaign_name || "campanha-sem-id";
    const campaignName = row.campaign_name || "Campanha sem nome";
    const existingRow = groupedRows.get(campaignId);

    if (!existingRow) {
      groupedRows.set(campaignId, {
        amountSpent: row.spend,
        campaignId,
        campaignName,
        purchaseValue: row.purchase_value,
        purchases: row.purchases,
        roas: calculateRoas(row.spend, row.purchase_value),
      });
      continue;
    }

    existingRow.amountSpent += row.spend;
    existingRow.purchaseValue += row.purchase_value;
    existingRow.purchases += row.purchases;
    existingRow.roas = calculateRoas(existingRow.amountSpent, existingRow.purchaseValue);
  }

  return Array.from(groupedRows.values()).sort((left, right) =>
    left.campaignName.localeCompare(right.campaignName, "pt-BR")
  );
}

function buildDailyRows(rows: StoredInsightRow[]) {
  const groupedRows = new Map<string, FacebookSalesDailyRow>();

  for (const row of rows) {
    const existingRow = groupedRows.get(row.insight_date);

    if (!existingRow) {
      groupedRows.set(row.insight_date, {
        amountSpent: row.spend,
        date: row.insight_date,
        purchaseValue: row.purchase_value,
        purchases: row.purchases,
        roas: calculateRoas(row.spend, row.purchase_value),
      });
      continue;
    }

    existingRow.amountSpent += row.spend;
    existingRow.purchaseValue += row.purchase_value;
    existingRow.purchases += row.purchases;
    existingRow.roas = calculateRoas(existingRow.amountSpent, existingRow.purchaseValue);
  }

  return Array.from(groupedRows.values()).sort((left, right) =>
    right.date.localeCompare(left.date, "pt-BR")
  );
}

function buildAdRows(rows: StoredInsightRow[]) {
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

    const existingRow = groupedRows.get(adName);

    if (!existingRow) {
      groupedRows.set(adName, {
        adName,
        amountSpent: row.spend,
        impressions: row.impressions,
        linkClicks: row.inline_link_clicks,
        purchaseValue: row.purchase_value,
        purchases: row.purchases,
      });
      continue;
    }

    existingRow.amountSpent += row.spend;
    existingRow.impressions += row.impressions;
    existingRow.linkClicks += row.inline_link_clicks;
    existingRow.purchaseValue += row.purchase_value;
    existingRow.purchases += row.purchases;
  }

  return Array.from(groupedRows.values())
    .map((row) => ({
      adName: row.adName,
      amountSpent: row.amountSpent,
      costPerLinkClick: divideOrNull(row.amountSpent, row.linkClicks),
      costPerPurchase: divideOrNull(row.amountSpent, row.purchases),
      linkCtr: divideOrNull(row.linkClicks * 100, row.impressions),
      purchaseValue: row.purchaseValue,
      purchases: row.purchases,
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

function buildFunnelSummary(rows: StoredInsightRow[]): FacebookSalesFunnelSummary {
  const totals = rows.reduce(
    (summary, row) => {
      summary.amountSpent += row.spend;
      summary.checkouts += row.checkouts;
      summary.impressions += row.impressions;
      summary.landingPageViews += row.landing_page_views;
      summary.linkClicks += row.inline_link_clicks;
      summary.purchases += row.purchases;
      return summary;
    },
    {
      amountSpent: 0,
      checkouts: 0,
      impressions: 0,
      landingPageViews: 0,
      linkClicks: 0,
      purchases: 0,
    }
  );

  return {
    checkouts: totals.checkouts,
    connectRate: divideOrNull(totals.landingPageViews * 100, totals.linkClicks),
    costPerCheckout: divideOrNull(totals.amountSpent, totals.checkouts),
    costPerLinkClick: divideOrNull(totals.amountSpent, totals.linkClicks),
    costPerPurchase: divideOrNull(totals.amountSpent, totals.purchases),
    cpm: divideOrNull(totals.amountSpent * 1000, totals.impressions),
    impressions: totals.impressions,
    landingPageViews: totals.landingPageViews,
    linkClicks: totals.linkClicks,
    linkCtr: divideOrNull(totals.linkClicks * 100, totals.impressions),
    purchases: totals.purchases,
  };
}

export async function getFacebookSalesReport(
  companyId: string,
  adAccountId: string,
  userId: string,
  preset: ReportDatePreset = "last_7_days"
): Promise<FacebookSalesReportResult> {
  const { since, until } = getReportDateRange(preset);

  try {
    await ensureMetaInsightsReady(companyId, adAccountId, userId);
  } catch (error) {
    if (error instanceof MetaSyncNotConfiguredError) {
      return {
        adRows: [],
        dailyRows: [],
        funnelSummary: null,
        lastCheckedAt: new Date().toISOString(),
        message: error.message,
        rows: [],
        since,
        state: "not_configured",
        until,
      };
    }

    return {
      adRows: [],
      dailyRows: [],
      funnelSummary: null,
      lastCheckedAt: new Date().toISOString(),
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível sincronizar os dados da Meta para o relatório de vendas.",
      rows: [],
      since,
      state: "error",
      until,
    };
  }

  try {
    const storedRows = await listStoredMetaInsights(companyId, adAccountId, since, until);
    const salesRows = filterSalesRows(storedRows);

    if (!salesRows.length) {
      const hasSalesCampaigns = await hasStoredCampaignTag(companyId, adAccountId, SALES_CAMPAIGN_TAG);

      if (!hasSalesCampaigns) {
        return {
          adRows: [],
          dailyRows: [],
          funnelSummary: null,
          lastCheckedAt: new Date().toISOString(),
          message: "Não há campanha com [VENDAS] na conta de anúncios selecionada.",
          rows: [],
          since,
          state: "not_found",
          until,
        };
      }

      return {
        adRows: [],
        dailyRows: [],
        funnelSummary: null,
        lastCheckedAt: new Date().toISOString(),
        rows: [],
        since,
        state: "empty",
        until,
      };
    }

    return {
      adRows: buildAdRows(salesRows),
      dailyRows: buildDailyRows(salesRows),
      funnelSummary: buildFunnelSummary(salesRows),
      lastCheckedAt: getLatestSyncedAt(salesRows),
      rows: buildCampaignRows(salesRows),
      since,
      state: "ok",
      until,
    };
  } catch (error) {
    return {
      adRows: [],
      dailyRows: [],
      funnelSummary: null,
      lastCheckedAt: new Date().toISOString(),
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados persistidos da Meta para o relatório de vendas.",
      rows: [],
      since,
      state: "error",
      until,
    };
  }
}

export async function getFacebookSalesOverviewSummary(
  companyId: string,
  adAccountId: string,
  userId: string
): Promise<FacebookSalesOverviewSummary> {
  const report = await getFacebookSalesReport(companyId, adAccountId, userId);

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
