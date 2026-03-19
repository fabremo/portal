import "server-only";

const META_GRAPH_VERSION = "v25.0";
const META_AD_ACCOUNT_ID = "act_570278580327487";
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
  paging?: {
    next?: string;
  };
  error?: {
    message?: string;
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
  startedMessages: number;
};

export type FacebookMessagesReportResult =
  | {
      campaignName: string;
      lastCheckedAt: string;
      message: string;
      rows: [];
      state: "not_configured" | "not_found" | "error";
    }
  | {
      campaignId: string;
      campaignName: string;
      lastCheckedAt: string;
      rows: FacebookMessagesRow[];
      state: "empty" | "ok";
    };

function getDateRange() {
  const until = new Date();
  const since = new Date();
  since.setDate(until.getDate() - 6);

  const format = (value: Date) => value.toISOString().slice(0, 10);

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

async function findCampaignId(accessToken: string) {
  let nextUrl =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_AD_ACCOUNT_ID}/campaigns?` +
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

export async function getFacebookMessagesReport(): Promise<FacebookMessagesReportResult> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const lastCheckedAt = new Date().toISOString();

  if (!accessToken) {
    return {
      campaignName: META_MESSAGES_CAMPAIGN_NAME,
      lastCheckedAt,
      message: "Defina FACEBOOK_ACCESS_TOKEN para habilitar o relatório de Mensagens.",
      rows: [],
      state: "not_configured",
    };
  }

  try {
    const campaignId = await findCampaignId(accessToken);

    if (!campaignId) {
      return {
        campaignName: META_MESSAGES_CAMPAIGN_NAME,
        lastCheckedAt,
        message: "A campanha informada não foi encontrada na conta de anúncios.",
        rows: [],
        state: "not_found",
      };
    }

    const { since, until } = getDateRange();
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
    const rows =
      insightsPayload.data?.map((row) => {
        const amountSpent = parseNumber(row.spend);
        const startedMessages = extractStartedMessages(row.actions);
        const linkClicks = parseNumber(row.inline_link_clicks);

        return {
          adId: row.ad_id ?? "sem-id",
          adName: row.ad_name ?? "Anúncio sem nome",
          amountSpent,
          costPerLinkClick: linkClicks > 0 ? amountSpent / linkClicks : null,
          costPerStartedMessage:
            startedMessages > 0 ? amountSpent / startedMessages : null,
          impressions: parseNumber(row.impressions),
          linkClicks,
          startedMessages,
        } satisfies FacebookMessagesRow;
      }) ?? [];

    if (!rows.length) {
      return {
        campaignId,
        campaignName: META_MESSAGES_CAMPAIGN_NAME,
        lastCheckedAt,
        rows: [],
        state: "empty",
      };
    }

    return {
      campaignId,
      campaignName: META_MESSAGES_CAMPAIGN_NAME,
      lastCheckedAt,
      rows,
      state: "ok",
    };
  } catch (error) {
    return {
      campaignName: META_MESSAGES_CAMPAIGN_NAME,
      lastCheckedAt,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível consultar a API da Meta para o relatório.",
      rows: [],
      state: "error",
    };
  }
}
