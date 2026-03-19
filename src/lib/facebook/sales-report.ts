import "server-only";

const META_GRAPH_VERSION = "v25.0";
const SALES_CAMPAIGN_TAG = "[VENDAS]";

const PURCHASE_ACTION_TYPES = [
  //"omni_purchase",
  "purchase",
  // "onsite_web_purchase",
  // "offsite_conversion.fb_pixel_purchase",
  // "offsite_conversion.purchase",
] as const;

type MetaAction = {
  action_type?: string;
  value?: string;
};

type MetaRoas = {
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
  action_values?: MetaAction[];
  actions?: MetaAction[];
  campaign_id?: string;
  campaign_name?: string;
  purchase_roas?: MetaRoas[];
  spend?: string;
};

type MetaInsightResponse = {
  data?: MetaInsightRow[];
  error?: {
    message?: string;
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

export type FacebookSalesReportResult =
  | {
    lastCheckedAt: string;
    message: string;
    rows: [];
    since: string;
    state: "not_configured" | "not_found" | "error";
    until: string;
  }
  | {
    lastCheckedAt: string;
    rows: FacebookSalesRow[];
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

function isPurchaseActionType(actionType?: string) {
  return Boolean(actionType && PURCHASE_ACTION_TYPES.includes(actionType as (typeof PURCHASE_ACTION_TYPES)[number]));
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

function extractPurchaseRoas(purchaseRoas?: MetaRoas[]) {
  if (!purchaseRoas?.length) {
    return null;
  }

  const match = purchaseRoas.find((entry) => isPurchaseActionType(entry.action_type));

  if (!match) {
    return null;
  }

  const value = parseNumber(match.value);
  return value > 0 ? value : null;
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
      fields: "campaign_id,campaign_name,spend,actions,action_values,purchase_roas",
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
    campaignId: row.campaign_id ?? campaign.id,
    campaignName: row.campaign_name ?? campaign.name,
    purchaseValue,
    purchases,
    roas: extractPurchaseRoas(row.purchase_roas),
  } satisfies FacebookSalesRow;
}

export async function getFacebookSalesReport(
  adAccountId: string
): Promise<FacebookSalesReportResult> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const lastCheckedAt = new Date().toISOString();
  const { since, until } = getDateRange();

  if (!accessToken) {
    return {
      lastCheckedAt,
      message: "Defina FACEBOOK_ACCESS_TOKEN para habilitar o relatorio de Vendas.",
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
        lastCheckedAt,
        message: "Nao ha campanha com [VENDAS] na conta de anuncios selecionada.",
        rows: [],
        since,
        state: "not_found",
        until,
      };
    }

    const rows = (await Promise.all(
      campaigns.map((campaign) => fetchCampaignSalesInsight(accessToken, campaign, since, until))
    ))
      .filter((row): row is FacebookSalesRow => Boolean(row))
      .sort((left, right) => left.campaignName.localeCompare(right.campaignName, "pt-BR"));

    if (!rows.length) {
      return {
        lastCheckedAt,
        rows: [],
        since,
        state: "empty",
        until,
      };
    }

    return {
      lastCheckedAt,
      rows,
      since,
      state: "ok",
      until,
    };
  } catch (error) {
    return {
      lastCheckedAt,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel consultar a API da Meta para o relatorio de vendas.",
      rows: [],
      since,
      state: "error",
      until,
    };
  }
}
