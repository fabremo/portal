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
  actions?: MetaAction[];
  campaign_id?: string;
  campaign_name?: string;
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

export type FacebookMessagesReportResult =
  | {
      campaignLabel: string;
      lastCheckedAt: string;
      message: string;
      rows: [];
      since: string;
      state: "not_configured" | "not_found" | "error";
      until: string;
    }
  | {
      campaignLabel: string;
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

export async function getFacebookMessagesReport(
  adAccountId: string
): Promise<FacebookMessagesReportResult> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const lastCheckedAt = new Date().toISOString();
  const { since, until } = getDateRange();
  const campaignLabel = "Campanhas [WHATS] da conta";

  if (!accessToken) {
    return {
      campaignLabel,
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
        campaignLabel,
        lastCheckedAt,
        message: "Nao ha campanha com [WHATS] na conta de anuncios selecionada.",
        rows: [],
        since,
        state: "not_found",
        until,
      };
    }

    const rows = (await Promise.all(
      campaigns.map((campaign) => fetchCampaignInsights(accessToken, campaign, since, until))
    ))
      .filter((row): row is FacebookMessagesCampaignRow => Boolean(row))
      .sort((left, right) => left.campaignName.localeCompare(right.campaignName, "pt-BR"));

    if (!rows.length) {
      return {
        campaignLabel,
        lastCheckedAt,
        rows: [],
        since,
        state: "empty",
        until,
      };
    }

    return {
      campaignLabel,
      lastCheckedAt,
      rows,
      since,
      state: "ok",
      until,
    };
  } catch (error) {
    return {
      campaignLabel,
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
