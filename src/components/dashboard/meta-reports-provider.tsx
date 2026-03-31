"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react";

import { getSalesDateRange, type SalesDatePreset } from "@/lib/facebook/sales-date-range";

const META_REPORT_CACHE_PREFIX = "meta-report";

type SalesRow = {
  amountSpent: number;
  campaignId: string;
  campaignName: string;
  purchaseValue: number;
  purchases: number;
  roas: number | null;
};

type SalesDailyRow = {
  amountSpent: number;
  date: string;
  purchaseValue: number;
  purchases: number;
  roas: number | null;
};

type SalesAdRow = {
  adName: string;
  amountSpent: number;
  costPerLinkClick: number | null;
  costPerPurchase: number | null;
  linkCtr: number | null;
  purchases: number;
  purchaseValue: number;
  roas: number | null;
};

export type ClientSalesReportResult =
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
      adRows: SalesAdRow[];
      dailyRows: SalesDailyRow[];
      lastCheckedAt: string;
      rows: SalesRow[];
      since: string;
      state: "empty" | "ok";
      until: string;
    };

type MessagesRow = {
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

type MessagesDailyRow = {
  amountSpent: number;
  costPerLinkClick: number | null;
  costPerStartedMessage: number | null;
  date: string;
  impressions: number;
  linkClicks: number;
  linkCtr: number | null;
  startedMessages: number;
};

type MessagesAdRow = {
  adName: string;
  amountSpent: number;
  costPerLinkClick: number | null;
  costPerStartedMessage: number | null;
  linkCtr: number | null;
  startedMessages: number;
};

export type ClientMessagesReportResult =
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
      adRows: MessagesAdRow[];
      campaignLabel: string;
      dailyRows: MessagesDailyRow[];
      lastCheckedAt: string;
      rows: MessagesRow[];
      since: string;
      state: "empty" | "ok";
      until: string;
    };

type MetaReportsContextValue = {
  getMessagesReport: (adAccountId: string) => Promise<ClientMessagesReportResult>;
  getSalesReport: (
    adAccountId: string,
    preset?: SalesDatePreset
  ) => Promise<ClientSalesReportResult>;
};

type ApiErrorResponse = {
  message?: string;
};

type MetaReportsProviderProps = PropsWithChildren<{
  userId: string;
}>;

type ReportKind = "messages" | "sales";

const MetaReportsContext = createContext<MetaReportsContextValue | null>(null);

function buildCacheKey(
  userId: string,
  adAccountId: string,
  kind: ReportKind,
  preset: SalesDatePreset = "last_7_days"
) {
  const { since, until } = getSalesDateRange(preset);
  return `${META_REPORT_CACHE_PREFIX}:${userId}:${adAccountId}:${kind}:${preset}:${since}:${until}`;
}

function normalizeMessagesReport(report: ClientMessagesReportResult) {
  return {
    ...report,
    adRows: Array.isArray((report as { adRows?: unknown }).adRows) ? report.adRows : [],
    dailyRows: Array.isArray((report as { dailyRows?: unknown }).dailyRows)
      ? report.dailyRows
      : [],
    rows: Array.isArray((report as { rows?: unknown }).rows) ? report.rows : [],
  } as ClientMessagesReportResult;
}

function normalizeReport<T>(kind: ReportKind, report: T) {
  if (kind === "messages") {
    return normalizeMessagesReport(report as ClientMessagesReportResult) as T;
  }

  return report;
}

function createApiError(status: number, payload: ApiErrorResponse | null) {
  const fallbackMessage =
    status === 401
      ? "Sua sessão expirou. Entre novamente para continuar."
      : status === 403
        ? "Você não tem acesso a esta conta de anúncios."
        : "Não foi possível carregar o relatório.";

  return new Error(payload?.message || fallbackMessage);
}

export function clearMetaReportsSessionCache() {
  if (typeof window === "undefined") {
    return;
  }

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);

    if (key?.startsWith(META_REPORT_CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
}

export function MetaReportsProvider({ children, userId }: MetaReportsProviderProps) {
  const memoryCacheRef = useRef(new Map<string, unknown>());
  const inflightRequestsRef = useRef(new Map<string, Promise<unknown>>());

  const contextValue = useMemo<MetaReportsContextValue>(() => {
    async function loadReport<T>(
      kind: ReportKind,
      adAccountId: string,
      preset: SalesDatePreset = "last_7_days"
    ) {
      const cacheKey = buildCacheKey(userId, adAccountId, kind, preset);
      const memoryValue = memoryCacheRef.current.get(cacheKey);

      if (memoryValue) {
        return normalizeReport(kind, memoryValue as T);
      }

      const inflightRequest = inflightRequestsRef.current.get(cacheKey);

      if (inflightRequest) {
        return inflightRequest as Promise<T>;
      }

      const request = fetch(
        `/api/dashboard/reports/${kind}?adAccountId=${encodeURIComponent(adAccountId)}&preset=${encodeURIComponent(preset)}`,
        {
          cache: "no-store",
        }
      )
        .then(async (response) => {
          const payload = (await response.json()) as T | ApiErrorResponse;

          if (!response.ok) {
            throw createApiError(response.status, payload as ApiErrorResponse);
          }

          const normalizedPayload = normalizeReport(kind, payload as T);

          memoryCacheRef.current.set(cacheKey, normalizedPayload);
          return normalizedPayload;
        })
        .finally(() => {
          inflightRequestsRef.current.delete(cacheKey);
        });

      inflightRequestsRef.current.set(cacheKey, request);

      return request;
    }

    return {
      getMessagesReport: (adAccountId: string) =>
        loadReport<ClientMessagesReportResult>("messages", adAccountId),
      getSalesReport: (adAccountId: string, preset = "last_7_days") =>
        loadReport<ClientSalesReportResult>("sales", adAccountId, preset),
    };
  }, [userId]);

  return (
    <MetaReportsContext.Provider value={contextValue}>{children}</MetaReportsContext.Provider>
  );
}

export function useMetaReports() {
  const context = useContext(MetaReportsContext);

  if (!context) {
    throw new Error("useMetaReports precisa ser usado dentro de MetaReportsProvider.");
  }

  return context;
}