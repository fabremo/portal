import "server-only";

const META_GRAPH_VERSION = "v25.0";
const MESSAGES_CAMPAIGN_TAG = "[WHATS]";

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

function buildDailyRows(rows: MetaInsightRow[]) {
  const groupedRows = new Map<string, FacebookMessagesDailyRow>();

  for (const row of rows) {
    const date = row.date_start;

    if (!date) {
      continue;
    }

    const amountSpent = parseNumber(row.spend);
    const startedMessages = extractStartedMessages(row.actions);
    const linkClicks = parseNumber(row.inline_link_clicks);
    const impressions = parseNumber(row.impressions);
    const existingRow = groupedRows.get(date);

    if (!existingRow) {
      groupedRows.set(date, {
        amountSpent,
        costPerLinkClick: linkClicks > 0 ? amountSpent / linkClicks : null,
        costPerStartedMessage: startedMessages > 0 ? amountSpent / startedMessages : null,
        date,
        impressions,
        linkClicks,
        linkCtr: impressions > 0 ? (linkClicks / impressions) * 100 : null,
        startedMessages,
      });
      continue;
    }

    existingRow.amountSpent += amountSpent;
    existingRow.startedMessages += startedMessages;
    existingRow.impressions += impressions;
    existingRow.linkClicks += linkClicks;
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

function buildAdRows(rows: MetaInsightRow[]) {
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

    const amountSpent = parseNumber(row.spend);
    const impressions = parseNumber(row.impressions);
    const linkClicks = parseNumber(row.inline_link_clicks);
    const startedMessages = extractStartedMessages(row.actions);
    const existingRow = groupedRows.get(adName);

    if (!existingRow) {
      groupedRows.set(adName, {
        adName,
        amountSpent,
        impressions,
        linkClicks,
        startedMessages,
      });
      continue;
    }

    existingRow.amountSpent += amountSpent;
    existingRow.impressions += impressions;
    existingRow.linkClicks += linkClicks;
    existingRow.startedMessages += startedMessages;
  }

  return Array.from(groupedRows.values())
    .map((row) => ({
      adName: row.adName,
      amountSpent: row.amountSpent,
      costPerLinkClick: row.linkClicks > 0 ? row.amountSpent / row.linkClicks : null,
      costPerStartedMessage: row.startedMessages > 0 ? row.amountSpent / row.startedMessages : null,
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

async function findWhatsCampaigns(accessToken: string, adAccountId: string) {
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
      payload.data?.filter((campaign) => campaign.name?.includes(MESSAGES_CAMPAIGN_TAG)) ?? [];

    campaigns.push(...matchingCampaigns);
    nextUrl = payload.paging?.next ?? "";
  }

  return campaigns;
}

async function fetchCampaignInsights(
  accessToken: string,
  campaign: MetaCampaign,
  since: string,
  until: string
) {
  const insightsUrl =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${campaign.id}/insights?` +
    new URLSearchParams({
      access_token: accessToken,
      fields: "campaign_id,campaign_name,spend,impressions,inline_link_clicks,actions",
      level: "campaign",
      time_increment: "all_days",
      time_range: JSON.stringify({ since, until }),
    }).toString();

  const payload = await fetchMetaJson<MetaInsightResponse>(insightsUrl);
  const row = payload.data?.[0];

  if (!row) {
    return null;
  }

  const amountSpent = parseNumber(row.spend);
  const startedMessages = extractStartedMessages(row.actions);
  const linkClicks = parseNumber(row.inline_link_clicks);
  const impressions = parseNumber(row.impressions);

  return {
    amountSpent,
    campaignId: row.campaign_id ?? campaign.id,
    campaignName: row.campaign_name ?? campaign.name,
    costPerLinkClick: linkClicks > 0 ? amountSpent / linkClicks : null,
    costPerStartedMessage: startedMessages > 0 ? amountSpent / startedMessages : null,
    impressions,
    linkClicks,
    linkCtr: impressions > 0 ? (linkClicks / impressions) * 100 : null,
    startedMessages,
  } satisfies FacebookMessagesCampaignRow;
}

async function fetchDailyMessagesInsights(
  accessToken: string,
  adAccountId: string,
  since: string,
  until: string
) {
  let nextUrl =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${adAccountId}/insights?` +
    new URLSearchParams({
      access_token: accessToken,
      fields: "campaign_id,campaign_name,date_start,spend,impressions,inline_link_clicks,actions",
      level: "campaign",
      time_increment: "1",
      time_range: JSON.stringify({ since, until }),
    }).toString();

  const rows: MetaInsightRow[] = [];

  while (nextUrl) {
    const payload = await fetchMetaJson<MetaInsightResponse>(nextUrl);
    const matchingRows =
      payload.data?.filter((row) => row.campaign_name?.includes(MESSAGES_CAMPAIGN_TAG)) ?? [];

    rows.push(...matchingRows);
    nextUrl = payload.paging?.next ?? "";
  }

  return buildDailyRows(rows);
}

async function fetchAdMessagesInsights(
  accessToken: string,
  adAccountId: string,
  since: string,
  until: string
) {
  let nextUrl =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${adAccountId}/insights?` +
    new URLSearchParams({
      access_token: accessToken,
      fields: "ad_id,ad_name,campaign_id,campaign_name,spend,impressions,inline_link_clicks,actions",
      level: "ad",
      time_increment: "all_days",
      time_range: JSON.stringify({ since, until }),
    }).toString();

  const rows: MetaInsightRow[] = [];

  while (nextUrl) {
    const payload = await fetchMetaJson<MetaInsightResponse>(nextUrl);
    const matchingRows =
      payload.data?.filter((row) => row.campaign_name?.includes(MESSAGES_CAMPAIGN_TAG)) ?? [];

    rows.push(...matchingRows);
    nextUrl = payload.paging?.next ?? "";
  }

  return buildAdRows(rows);
}

export async function getFacebookMessagesReport(
  adAccountId: string
): Promise<FacebookMessagesReportResult> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const lastCheckedAt = new Date().toISOString();
  const { since, until } = getDateRange();
  const campaignLabel = "Campanhas [WHATS] da conta";

  if (!accessToken) {
    return {
      adRows: [],
      campaignLabel,
      dailyRows: [],
      lastCheckedAt,
      message: "Defina FACEBOOK_ACCESS_TOKEN para habilitar o relatorio de Mensagens.",
      rows: [],
      since,
      state: "not_configured",
      until,
    };
  }

  try {
    const campaigns = await findWhatsCampaigns(accessToken, adAccountId);

    if (!campaigns.length) {
      return {
        adRows: [],
        campaignLabel,
        dailyRows: [],
        lastCheckedAt,
        message: "Nao ha campanha com [WHATS] na conta de anuncios selecionada.",
        rows: [],
        since,
        state: "not_found",
        until,
      };
    }

    const [rows, dailyRows, adRows] = await Promise.all([
      Promise.all(
        campaigns.map((campaign) => fetchCampaignInsights(accessToken, campaign, since, until))
      ),
      fetchDailyMessagesInsights(accessToken, adAccountId, since, until),
      fetchAdMessagesInsights(accessToken, adAccountId, since, until),
    ]);

    const campaignRows = rows
      .filter((row): row is FacebookMessagesCampaignRow => Boolean(row))
      .sort((left, right) => left.campaignName.localeCompare(right.campaignName, "pt-BR"));

    if (!campaignRows.length) {
      return {
        adRows: [],
        campaignLabel,
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
      campaignLabel,
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
      campaignLabel,
      dailyRows: [],
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
