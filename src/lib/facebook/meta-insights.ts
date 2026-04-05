import "server-only";

import { randomUUID } from "crypto";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

const META_GRAPH_VERSION = "v25.0";
const LOCK_TTL_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 90_000;
const INITIAL_SYNC_DAYS = 30;
const UPSERT_BATCH_SIZE = 200;

type MetaAction = {
  action_type?: string;
  value?: string;
};

type MetaMetricValue = {
  value?: string;
};

type MetaInsightRow = {
  actions?: MetaAction[];
  action_values?: MetaAction[];
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  clicks?: string;
  date_start?: string;
  impressions?: string;
  inline_link_clicks?: string;
  reach?: string;
  spend?: string;
  video_p100_watched_actions?: MetaMetricValue[];
  video_p25_watched_actions?: MetaMetricValue[];
  video_p50_watched_actions?: MetaMetricValue[];
  video_p75_watched_actions?: MetaMetricValue[];
  video_p95_watched_actions?: MetaMetricValue[];
  video_play_actions?: MetaMetricValue[];
  video_thruplay_watched_actions?: MetaMetricValue[];
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

type MetaSyncStateRow = {
  ad_account_id: string;
  company_id: string;
  current_run_id: string | null;
  last_error: string | null;
  last_synced_until: string | null;
  lock_expires_at: string | null;
  status: "idle" | "running" | "failed";
  sync_from_date: string | null;
  sync_until_date: string | null;
};

type MetaDailyAdInsightRow = {
  ad_account_id: string;
  ad_id: string;
  ad_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  clicks: number;
  company_id: string;
  impressions: number;
  insight_date: string;
  inline_link_clicks: number;
  landing_page_views: number;
  leads: number;
  checkouts: number;
  messaging_conversations_started: number;
  purchase_value: number;
  purchases: number;
  raw_payload: MetaInsightRow;
  reach: number;
  spend: number;
  synced_at: string;
  thruplays: number;
  video_p100_watched: number;
  video_p25_watched: number;
  video_p50_watched: number;
  video_p75_watched: number;
  video_p95_watched: number;
  video_play_actions: number;
  video_plays: number;
};

type SyncWindow = {
  from: string;
  until: string;
};

export class MetaSyncNotConfiguredError extends Error {
  constructor() {
    super("Defina FACEBOOK_ACCESS_TOKEN para habilitar a sincronização da Meta.");
    this.name = "MetaSyncNotConfiguredError";
  }
}

function getServiceRoleClient() {
  const supabase = createServiceRoleSupabaseClient();

  if (!supabase) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  return supabase;
}

function sleep(timeMs: number) {
  return new Promise((resolve) => setTimeout(resolve, timeMs));
}

function toDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterday(now = new Date()) {
  const reference = new Date(now);
  reference.setHours(12, 0, 0, 0);
  reference.setDate(reference.getDate() - 1);
  return reference;
}

function resolveSyncWindow(lastSyncedUntil: string | null, now = new Date()): SyncWindow | null {
  const yesterday = getYesterday(now);

  if (lastSyncedUntil) {
    const nextDay = new Date(`${lastSyncedUntil}T12:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);

    if (nextDay > yesterday) {
      return null;
    }

    return {
      from: toDateOnly(nextDay),
      until: toDateOnly(yesterday),
    };
  }

  const firstSyncStart = new Date(yesterday);
  firstSyncStart.setDate(firstSyncStart.getDate() - (INITIAL_SYNC_DAYS - 1));

  return {
    from: toDateOnly(firstSyncStart),
    until: toDateOnly(yesterday),
  };
}

function parseNumber(value?: string | number | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getActionValue(actions: MetaAction[] | undefined, predicate: (actionType: string) => boolean) {
  if (!actions?.length) {
    return 0;
  }

  return actions.reduce((total, action) => {
    const actionType = action.action_type || "";

    if (!predicate(actionType)) {
      return total;
    }

    return total + parseNumber(action.value);
  }, 0);
}

function getMetricValue(values?: MetaMetricValue[]) {
  if (!values?.length) {
    return 0;
  }

  return values.reduce((total, value) => total + parseNumber(value.value), 0);
}

function isPurchaseAction(actionType: string) {
  return actionType === "purchase";
}

function isLandingPageViewAction(actionType: string) {
  return actionType === "landing_page_view";
}

function isMessagingConversationStartedAction(actionType: string) {
  return actionType.includes("messaging_conversation_started");
}

function isCheckoutAction(actionType: string) {
  return actionType === "initiate_checkout";
}

function isLeadAction(actionType: string) {
  return (
    actionType === "lead" ||
    actionType.endsWith(".lead") ||
    actionType.includes("lead_grouped") ||
    actionType.includes("fb_pixel_lead")
  );
}

function isVideoViewAction(actionType: string) {
  return actionType === "video_view";
}

function buildInsightUpsertRow(
  companyId: string,
  adAccountId: string,
  row: MetaInsightRow,
  syncedAt: string
): MetaDailyAdInsightRow | null {
  const insightDate = row.date_start;
  const adId = row.ad_id?.trim();

  if (!insightDate || !adId) {
    return null;
  }

  return {
    ad_account_id: adAccountId,
    ad_id: adId,
    ad_name: row.ad_name?.trim() || null,
    adset_id: row.adset_id?.trim() || null,
    adset_name: row.adset_name?.trim() || null,
    campaign_id: row.campaign_id?.trim() || null,
    campaign_name: row.campaign_name?.trim() || null,
    clicks: parseNumber(row.clicks),
    company_id: companyId,
    impressions: parseNumber(row.impressions),
    insight_date: insightDate,
    inline_link_clicks: parseNumber(row.inline_link_clicks),
    landing_page_views: getActionValue(row.actions, isLandingPageViewAction),
    leads: getActionValue(row.actions, isLeadAction),
    checkouts: getActionValue(row.actions, isCheckoutAction),
    messaging_conversations_started: getActionValue(row.actions, isMessagingConversationStartedAction),
    purchase_value: getActionValue(row.action_values, isPurchaseAction),
    purchases: getActionValue(row.actions, isPurchaseAction),
    raw_payload: row,
    reach: parseNumber(row.reach),
    spend: parseNumber(row.spend),
    synced_at: syncedAt,
    thruplays: getMetricValue(row.video_thruplay_watched_actions),
    video_p100_watched: getMetricValue(row.video_p100_watched_actions),
    video_p25_watched: getMetricValue(row.video_p25_watched_actions),
    video_p50_watched: getMetricValue(row.video_p50_watched_actions),
    video_p75_watched: getMetricValue(row.video_p75_watched_actions),
    video_p95_watched: getMetricValue(row.video_p95_watched_actions),
    video_play_actions: getMetricValue(row.video_play_actions),
    video_plays: getActionValue(row.actions, isVideoViewAction),
  };
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

async function fetchMetaInsightsRange(adAccountId: string, window: SyncWindow) {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!accessToken) {
    throw new MetaSyncNotConfiguredError();
  }

  let nextUrl =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${adAccountId}/insights?` +
    new URLSearchParams({
      access_token: accessToken,
      fields:
        "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,date_start,spend,impressions,reach,clicks,inline_link_clicks,actions,action_values,video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions,video_thruplay_watched_actions",
      level: "ad",
      limit: "500",
      time_increment: "1",
      time_range: JSON.stringify({ since: window.from, until: window.until }),
    }).toString();

  const rows: MetaInsightRow[] = [];

  while (nextUrl) {
    const payload = await fetchMetaJson<MetaInsightResponse>(nextUrl);
    rows.push(...(payload.data ?? []));
    nextUrl = payload.paging?.next ?? "";
  }

  return rows;
}

async function ensureSyncState(companyId: string, adAccountId: string) {
  const supabase = getServiceRoleClient();

  const { error } = await supabase.from("meta_sync_state").upsert(
    {
      ad_account_id: adAccountId,
      company_id: companyId,
    },
    {
      ignoreDuplicates: true,
      onConflict: "company_id,ad_account_id",
    }
  );

  if (error) {
    throw new Error("Não foi possível preparar o estado de sincronização da Meta.");
  }
}

async function getSyncState(companyId: string, adAccountId: string) {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("meta_sync_state")
    .select(
      "ad_account_id, company_id, current_run_id, last_error, last_synced_until, lock_expires_at, status, sync_from_date, sync_until_date"
    )
    .eq("company_id", companyId)
    .eq("ad_account_id", adAccountId)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar o estado de sincronização da Meta.");
  }

  return (data ?? null) as MetaSyncStateRow | null;
}

async function tryAcquireSyncLock(
  companyId: string,
  adAccountId: string,
  userId: string,
  window: SyncWindow
) {
  const supabase = getServiceRoleClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const lockExpiresAt = new Date(now.getTime() + LOCK_TTL_MS).toISOString();
  const runId = randomUUID();

  const { data, error } = await supabase
    .from("meta_sync_state")
    .update({
      current_run_id: runId,
      last_attempt_at: nowIso,
      lock_expires_at: lockExpiresAt,
      locked_at: nowIso,
      started_by_user_id: userId,
      status: "running",
      sync_from_date: window.from,
      sync_until_date: window.until,
    })
    .eq("company_id", companyId)
    .eq("ad_account_id", adAccountId)
    .or(`status.neq.running,lock_expires_at.is.null,lock_expires_at.lt.${nowIso}`)
    .select("current_run_id")
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível adquirir o lock de sincronização da Meta.");
  }

  return {
    acquired: Boolean(data?.current_run_id === runId),
    runId,
  };
}

async function markSyncSuccess(companyId: string, adAccountId: string, runId: string, window: SyncWindow) {
  const supabase = getServiceRoleClient();
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("meta_sync_state")
    .update({
      current_run_id: null,
      last_error: null,
      last_success_at: nowIso,
      last_synced_until: window.until,
      lock_expires_at: null,
      locked_at: null,
      started_by_user_id: null,
      status: "idle",
    })
    .eq("company_id", companyId)
    .eq("ad_account_id", adAccountId)
    .eq("current_run_id", runId);

  if (error) {
    throw new Error("Não foi possível finalizar a sincronização da Meta com sucesso.");
  }
}

async function markSyncFailure(companyId: string, adAccountId: string, runId: string, errorMessage: string) {
  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from("meta_sync_state")
    .update({
      current_run_id: null,
      last_error: errorMessage,
      lock_expires_at: null,
      locked_at: null,
      started_by_user_id: null,
      status: "failed",
    })
    .eq("company_id", companyId)
    .eq("ad_account_id", adAccountId)
    .eq("current_run_id", runId);

  if (error) {
    throw new Error("Não foi possível registrar a falha da sincronização da Meta.");
  }
}

async function upsertInsightRows(rows: MetaDailyAdInsightRow[]) {
  if (!rows.length) {
    return;
  }

  const supabase = getServiceRoleClient();

  for (let index = 0; index < rows.length; index += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + UPSERT_BATCH_SIZE);
    const { error } = await supabase.from("meta_daily_ad_insights").upsert(batch, {
      onConflict: "company_id,ad_account_id,insight_date,campaign_id,adset_id,ad_id",
    });

    if (error) {
      throw new Error("Não foi possível salvar os insights diários da Meta.");
    }
  }
}

async function syncMetaInsightsRange(
  companyId: string,
  adAccountId: string,
  window: SyncWindow
) {
  const syncedAt = new Date().toISOString();
  const rows = await fetchMetaInsightsRange(adAccountId, window);
  const upsertRows = rows
    .map((row) => buildInsightUpsertRow(companyId, adAccountId, row, syncedAt))
    .filter((row): row is MetaDailyAdInsightRow => Boolean(row));

  await upsertInsightRows(upsertRows);
}

async function waitForRunningSync(companyId: string, adAccountId: string, pendingWindow: SyncWindow) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);

    const state = await getSyncState(companyId, adAccountId);
    const refreshedWindow = resolveSyncWindow(state?.last_synced_until ?? null);

    if (!refreshedWindow) {
      return;
    }

    if (refreshedWindow.from !== pendingWindow.from || refreshedWindow.until !== pendingWindow.until) {
      return;
    }

    const lockExpiresAt = state?.lock_expires_at ? new Date(state.lock_expires_at).getTime() : 0;

    if (state?.status !== "running" || lockExpiresAt < Date.now()) {
      return;
    }
  }

  throw new Error("A sincronização da Meta está demorando mais do que o esperado.");
}

export async function ensureMetaInsightsReady(
  companyId: string,
  adAccountId: string,
  userId: string
) {
  await ensureSyncState(companyId, adAccountId);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const state = await getSyncState(companyId, adAccountId);
    const window = resolveSyncWindow(state?.last_synced_until ?? null);

    if (!window) {
      return;
    }

    const { acquired, runId } = await tryAcquireSyncLock(companyId, adAccountId, userId, window);

    if (acquired) {
      try {
        await syncMetaInsightsRange(companyId, adAccountId, window);
        await markSyncSuccess(companyId, adAccountId, runId, window);
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Falha ao sincronizar os dados da Meta.";
        await markSyncFailure(companyId, adAccountId, runId, errorMessage);
        throw error;
      }
    }

    await waitForRunningSync(companyId, adAccountId, window);
  }

  throw new Error("Não foi possível concluir a sincronização da Meta no momento.");
}

export async function listStoredMetaInsights(
  companyId: string,
  adAccountId: string,
  since: string,
  until: string
) {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("meta_daily_ad_insights")
    .select(
      `
      ad_account_id,
      ad_id,
      ad_name,
      adset_id,
      adset_name,
      campaign_id,
      campaign_name,
      clicks,
      company_id,
      impressions,
      insight_date,
      checkouts,
      inline_link_clicks,
      landing_page_views,
      leads,
      messaging_conversations_started,
      purchase_value,
      purchases,
      reach,
      spend,
      synced_at,
      thruplays,
      video_p100_watched,
      video_p25_watched,
      video_p50_watched,
      video_p75_watched,
      video_p95_watched,
      video_play_actions,
      video_plays
    `
    )
    .eq("company_id", companyId)
    .eq("ad_account_id", adAccountId)
    .gte("insight_date", since)
    .lte("insight_date", until);

  if (error) {
    throw new Error("Não foi possível carregar os insights persistidos da Meta.");
  }

  return (data ?? []) as Omit<MetaDailyAdInsightRow, "raw_payload">[];
}

export async function hasStoredCampaignTag(
  companyId: string,
  adAccountId: string,
  tag: string
) {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("meta_daily_ad_insights")
    .select("ad_id")
    .eq("company_id", companyId)
    .eq("ad_account_id", adAccountId)
    .like("campaign_name", `%${tag}%`)
    .limit(1);

  if (error) {
    throw new Error("Não foi possível verificar as campanhas persistidas da Meta.");
  }

  return Boolean(data?.length);
}




