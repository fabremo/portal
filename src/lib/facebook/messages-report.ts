import "server-only";

const META_GRAPH_VERSION = "v25.0";
const META_MESSAGES_CAMPAIGN_NAME = "[ENGAJAMENTO] [WHATS] [IVAN] [REGULAR]";

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
  actions?: MetaAction[];
  ad_id?: string;
  ad_name?: string;
  impressions?: string;
  inline_link_clicks?: string;
  spend?: string;
};

type MetaInsightResponse = {
  data?: MetaInsightRow[];
  error?: {
    message?: string;
  };
};

export type FacebookMessagesRow = {
  adId: string;
  adName: string;
  amountSpent: number;
  costPerLinkClick: number | null;
  costPerStartedMessage: number | null;
  impressions: number;
  linkClicks: number;
  linkCtr: number | null;
  startedMessages: number;
};

export type FacebookMessagesReportResult =
  | {
      campaignName: string;
      lastCheckedAt: string;
      message: string;
      rows: [];
      since: string;
      state: "not_configured" | "not_found" | "error";
      until: string;
    }
  | {
      campaignId: string;
      campaignName: string;
      lastCheckedAt: string;
      rows: FacebookMessagesRow[];
      since: string;
      state: "empty" | "ok";
      until: string;
    };

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

    return year + "-" + month + "-" + day;
  };

  return {
    since: format(since),
    until: format(until),
  };
}

function parseNumber(value?: string | number | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractStartedMessages(actions?: MetaAction[]) {
  if (!actions?.length) {
    return 0;
  }

  const match = actions.find((action) =>
    action.action_type?.includes("messaging_conversation_started")
  );

  return parseNumber(match?.value);
}

function getAdGroupKey(row: Pick<FacebookMessagesRow, "adName">) {
  return row.adName.trim().toLocaleLowerCase("pt-BR");
}

function aggregateRowsByAd(rows: FacebookMessagesRow[]) {
  const groupedRows = new Map<string, FacebookMessagesRow>();

  for (const row of rows) {
    const groupKey = getAdGroupKey(row);
    const existingRow = groupedRows.get(groupKey);

    if (!existingRow) {
      groupedRows.set(groupKey, { ...row });
      continue;
    }

    existingRow.amountSpent += row.amountSpent;
    existingRow.impressions += row.impressions;
    existingRow.linkClicks += row.linkClicks;
    existingRow.startedMessages += row.startedMessages;
  }

  return Array.from(groupedRows.values()).map((row) => ({
    ...row,
    costPerLinkClick: row.linkClicks > 0 ? row.amountSpent / row.linkClicks : null,
    costPerStartedMessage:
      row.startedMessages > 0 ? row.amountSpent / row.startedMessages : null,
    linkCtr: row.impressions > 0 ? (row.linkClicks / row.impressions) * 100 : null,
  }));
}

async function fetchMetaJson<T>(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
  });

  const payload = (await response.json()) as T & { error?: { message?: string } };

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Falha ao consultar a API da Meta.");
  }

  return payload;
}

async function findCampaignId(accessToken: string, adAccountId: string) {
  let nextUrl =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${adAccountId}/campaigns?` +
    new URLSearchParams({
      access_token: accessToken,
      fields: "id,name",
      limit: "100",
    }).toString();

  while (nextUrl) {
    const payload = await fetchMetaJson<MetaCampaignResponse>(nextUrl);
    const campaign = payload.data?.find((item) => item.name === META_MESSAGES_CAMPAIGN_NAME);

    if (campaign) {
      return campaign.id;
    }

    nextUrl = payload.paging?.next ?? "";
  }

  return null;
}

export async function getFacebookMessagesReport(
  adAccountId: string
): Promise<FacebookMessagesReportResult> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const lastCheckedAt = new Date().toISOString();
  const { since, until } = getDateRange();

  if (!accessToken) {
    return {
      campaignName: META_MESSAGES_CAMPAIGN_NAME,
      lastCheckedAt,
      message: "Defina FACEBOOK_ACCESS_TOKEN para habilitar o relatorio de Mensagens.",
      rows: [],
      since,
      state: "not_configured",
      until,
    };
  }

  try {
    const campaignId = await findCampaignId(accessToken, adAccountId);

    if (!campaignId) {
      return {
        campaignName: META_MESSAGES_CAMPAIGN_NAME,
        lastCheckedAt,
        message: "A campanha informada nao foi encontrada na conta de anuncios selecionada.",
        rows: [],
        since,
        state: "not_found",
        until,
      };
    }

    const insightsUrl =
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${campaignId}/insights?` +
      new URLSearchParams({
        access_token: accessToken,
        fields: "ad_id,ad_name,spend,impressions,inline_link_clicks,actions",
        level: "ad",
        time_increment: "all_days",
        time_range: JSON.stringify({ since, until }),
      }).toString();

    const insightsPayload = await fetchMetaJson<MetaInsightResponse>(insightsUrl);
    const rows = aggregateRowsByAd(
      insightsPayload.data?.map((row) => {
        const amountSpent = parseNumber(row.spend);
        const startedMessages = extractStartedMessages(row.actions);
        const linkClicks = parseNumber(row.inline_link_clicks);
        const impressions = parseNumber(row.impressions);

        return {
          adId: row.ad_id ?? "sem-id",
          adName: row.ad_name ?? "Anuncio sem nome",
          amountSpent,
          costPerLinkClick: linkClicks > 0 ? amountSpent / linkClicks : null,
          costPerStartedMessage:
            startedMessages > 0 ? amountSpent / startedMessages : null,
          impressions,
          linkClicks,
          linkCtr: impressions > 0 ? (linkClicks / impressions) * 100 : null,
          startedMessages,
        } satisfies FacebookMessagesRow;
      }) ?? []
    );

    if (!rows.length) {
      return {
        campaignId,
        campaignName: META_MESSAGES_CAMPAIGN_NAME,
        lastCheckedAt,
        rows: [],
        since,
        state: "empty",
        until,
      };
    }

    return {
      campaignId,
      campaignName: META_MESSAGES_CAMPAIGN_NAME,
      lastCheckedAt,
      rows,
      since,
      state: "ok",
      until,
    };
  } catch (error) {
    return {
      campaignName: META_MESSAGES_CAMPAIGN_NAME,
      lastCheckedAt,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel consultar a API da Meta para o relatorio.",
      rows: [],
      since,
      state: "error",
      until,
    };
  }
}
