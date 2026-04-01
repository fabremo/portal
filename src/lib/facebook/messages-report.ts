import "server-only";

import {
  ensureMetaInsightsReady,
  hasStoredCampaignTag,
  listStoredMetaInsights,
  MetaSyncNotConfiguredError,
} from "@/lib/facebook/meta-insights";
import { getReportDateRange } from "@/lib/facebook/report-date-range";

const MESSAGES_CAMPAIGN_TAG = "[WHATS]";

type StoredInsightRow = Awaited<ReturnType<typeof listStoredMetaInsights>>[number];

export type FacebookMessagesCampaignRow = {
  amountSpent: number;
  campaignId: string;
  campaignName: string;
  costPerLinkClick: number | null;
  costPerStartedMessage: number | null;
  impressions: number;
  linkClicks: number;
  linkCtr: number | null;
  startedMessages: number;
};

export type FacebookMessagesDailyRow = {
  amountSpent: number;
  costPerLinkClick: number | null;
  costPerStartedMessage: number | null;
  date: string;
  impressions: number;
  linkClicks: number;
  linkCtr: number | null;
  startedMessages: number;
};

export type FacebookMessagesAdRow = {
  adName: string;
  amountSpent: number;
  costPerLinkClick: number | null;
  costPerStartedMessage: number | null;
  linkCtr: number | null;
  startedMessages: number;
};

export type FacebookMessagesReportResult =
  | {
      adRows: [];
      campaignLabel: string;
      dailyRows: [];
      lastCheckedAt: string;
      message: string;
      rows: [];
      since: string;
      state: "not_configured" | "not_found" | "error";
      until: string;
    }
  | {
      adRows: FacebookMessagesAdRow[];
      campaignLabel: string;
      dailyRows: FacebookMessagesDailyRow[];
      lastCheckedAt: string;
      rows: FacebookMessagesCampaignRow[];
      since: string;
      state: "empty" | "ok";
      until: string;
    };

function getLatestSyncedAt(rows: StoredInsightRow[]) {
  return rows.reduce((latest, row) => {
    return row.synced_at > latest ? row.synced_at : latest;
  }, rows[0]?.synced_at ?? new Date().toISOString());
}

function filterMessageRows(rows: StoredInsightRow[]) {
  return rows.filter((row) => row.campaign_name?.includes(MESSAGES_CAMPAIGN_TAG));
}

function buildCampaignRows(rows: StoredInsightRow[]) {
  const groupedRows = new Map<string, FacebookMessagesCampaignRow>();

  for (const row of rows) {
    const campaignId = row.campaign_id || row.campaign_name || "campanha-sem-id";
    const campaignName = row.campaign_name || "Campanha sem nome";
    const existingRow = groupedRows.get(campaignId);

    if (!existingRow) {
      groupedRows.set(campaignId, {
        amountSpent: row.spend,
        campaignId,
        campaignName,
        costPerLinkClick: row.inline_link_clicks > 0 ? row.spend / row.inline_link_clicks : null,
        costPerStartedMessage:
          row.messaging_conversations_started > 0
            ? row.spend / row.messaging_conversations_started
            : null,
        impressions: row.impressions,
        linkClicks: row.inline_link_clicks,
        linkCtr: row.impressions > 0 ? (row.inline_link_clicks / row.impressions) * 100 : null,
        startedMessages: row.messaging_conversations_started,
      });
      continue;
    }

    existingRow.amountSpent += row.spend;
    existingRow.impressions += row.impressions;
    existingRow.linkClicks += row.inline_link_clicks;
    existingRow.startedMessages += row.messaging_conversations_started;
    existingRow.costPerLinkClick =
      existingRow.linkClicks > 0 ? existingRow.amountSpent / existingRow.linkClicks : null;
    existingRow.costPerStartedMessage =
      existingRow.startedMessages > 0 ? existingRow.amountSpent / existingRow.startedMessages : null;
    existingRow.linkCtr =
      existingRow.impressions > 0 ? (existingRow.linkClicks / existingRow.impressions) * 100 : null;
  }

  return Array.from(groupedRows.values()).sort((left, right) =>
    left.campaignName.localeCompare(right.campaignName, "pt-BR")
  );
}

function buildDailyRows(rows: StoredInsightRow[]) {
  const groupedRows = new Map<string, FacebookMessagesDailyRow>();

  for (const row of rows) {
    const existingRow = groupedRows.get(row.insight_date);

    if (!existingRow) {
      groupedRows.set(row.insight_date, {
        amountSpent: row.spend,
        costPerLinkClick: row.inline_link_clicks > 0 ? row.spend / row.inline_link_clicks : null,
        costPerStartedMessage:
          row.messaging_conversations_started > 0
            ? row.spend / row.messaging_conversations_started
            : null,
        date: row.insight_date,
        impressions: row.impressions,
        linkClicks: row.inline_link_clicks,
        linkCtr: row.impressions > 0 ? (row.inline_link_clicks / row.impressions) * 100 : null,
        startedMessages: row.messaging_conversations_started,
      });
      continue;
    }

    existingRow.amountSpent += row.spend;
    existingRow.impressions += row.impressions;
    existingRow.linkClicks += row.inline_link_clicks;
    existingRow.startedMessages += row.messaging_conversations_started;
    existingRow.costPerLinkClick =
      existingRow.linkClicks > 0 ? existingRow.amountSpent / existingRow.linkClicks : null;
    existingRow.costPerStartedMessage =
      existingRow.startedMessages > 0 ? existingRow.amountSpent / existingRow.startedMessages : null;
    existingRow.linkCtr =
      existingRow.impressions > 0 ? (existingRow.linkClicks / existingRow.impressions) * 100 : null;
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
      startedMessages: number;
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
        startedMessages: row.messaging_conversations_started,
      });
      continue;
    }

    existingRow.amountSpent += row.spend;
    existingRow.impressions += row.impressions;
    existingRow.linkClicks += row.inline_link_clicks;
    existingRow.startedMessages += row.messaging_conversations_started;
  }

  return Array.from(groupedRows.values())
    .map((row) => ({
      adName: row.adName,
      amountSpent: row.amountSpent,
      costPerLinkClick: row.linkClicks > 0 ? row.amountSpent / row.linkClicks : null,
      costPerStartedMessage:
        row.startedMessages > 0 ? row.amountSpent / row.startedMessages : null,
      linkCtr: row.impressions > 0 ? (row.linkClicks / row.impressions) * 100 : null,
      startedMessages: row.startedMessages,
    }))
    .sort((left, right) => {
      if (right.startedMessages !== left.startedMessages) {
        return right.startedMessages - left.startedMessages;
      }

      if (right.amountSpent !== left.amountSpent) {
        return right.amountSpent - left.amountSpent;
      }

      return left.adName.localeCompare(right.adName, "pt-BR");
    });
}

export async function getFacebookMessagesReport(
  companyId: string,
  adAccountId: string,
  userId: string
): Promise<FacebookMessagesReportResult> {
  const { since, until } = getReportDateRange("last_7_days");
  const campaignLabel = "Campanhas [WHATS] da conta";

  try {
    await ensureMetaInsightsReady(companyId, adAccountId, userId);
  } catch (error) {
    if (error instanceof MetaSyncNotConfiguredError) {
      return {
        adRows: [],
        campaignLabel,
        dailyRows: [],
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
      campaignLabel,
      dailyRows: [],
      lastCheckedAt: new Date().toISOString(),
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível sincronizar os dados da Meta para o relatório de mensagens.",
      rows: [],
      since,
      state: "error",
      until,
    };
  }

  try {
    const storedRows = await listStoredMetaInsights(companyId, adAccountId, since, until);
    const messageRows = filterMessageRows(storedRows);

    if (!messageRows.length) {
      const hasMessageCampaigns = await hasStoredCampaignTag(companyId, adAccountId, MESSAGES_CAMPAIGN_TAG);

      if (!hasMessageCampaigns) {
        return {
          adRows: [],
          campaignLabel,
          dailyRows: [],
          lastCheckedAt: new Date().toISOString(),
          message: "Não há campanha com [WHATS] na conta de anúncios selecionada.",
          rows: [],
          since,
          state: "not_found",
          until,
        };
      }

      return {
        adRows: [],
        campaignLabel,
        dailyRows: [],
        lastCheckedAt: new Date().toISOString(),
        rows: [],
        since,
        state: "empty",
        until,
      };
    }

    return {
      adRows: buildAdRows(messageRows),
      campaignLabel,
      dailyRows: buildDailyRows(messageRows),
      lastCheckedAt: getLatestSyncedAt(messageRows),
      rows: buildCampaignRows(messageRows),
      since,
      state: "ok",
      until,
    };
  } catch (error) {
    return {
      adRows: [],
      campaignLabel,
      dailyRows: [],
      lastCheckedAt: new Date().toISOString(),
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados persistidos da Meta para o relatório.",
      rows: [],
      since,
      state: "error",
      until,
    };
  }
}
