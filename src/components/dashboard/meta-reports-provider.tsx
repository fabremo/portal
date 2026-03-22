"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react";

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
  getSalesReport: (adAccountId: string) => Promise<ClientSalesReportResult>;
};

type ApiErrorResponse = {
  message?: string;
};

type MetaReportsProviderProps = PropsWithChildren<{
  userId: string;
}>;

type ReportKind = "messages" | "sales";

const MetaReportsContext = createContext<MetaReportsContextValue | null>(null);

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

    return `${year}-${month}-${day}`;
  };

  return {
    since: format(since),
    until: format(until),
  };
}

function buildCacheKey(userId: string, adAccountId: string, kind: ReportKind) {
  const { since, until } = getDateRange();
  return `${META_REPORT_CACHE_PREFIX}:${userId}:${adAccountId}:${kind}:${since}:${until}`;
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

function readSessionValue<T>(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(key);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
}

function writeSessionValue(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(key, JSON.stringify(value));
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
    async function loadReport<T>(kind: ReportKind, adAccountId: string) {
      const cacheKey = buildCacheKey(userId, adAccountId, kind);
      const memoryValue = memoryCacheRef.current.get(cacheKey);

      if (memoryValue) {
        return normalizeReport(kind, memoryValue as T);
      }

      const sessionValue = readSessionValue<T>(cacheKey);

      if (sessionValue) {
        const normalizedSessionValue = normalizeReport(kind, sessionValue);
        memoryCacheRef.current.set(cacheKey, normalizedSessionValue);
        writeSessionValue(cacheKey, normalizedSessionValue);
        return normalizedSessionValue;
      }

      const inflightRequest = inflightRequestsRef.current.get(cacheKey);

      if (inflightRequest) {
        return inflightRequest as Promise<T>;
      }

      const request = fetch(
        `/api/dashboard/reports/${kind}?adAccountId=${encodeURIComponent(adAccountId)}`,
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
          writeSessionValue(cacheKey, normalizedPayload);
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
      getSalesReport: (adAccountId: string) =>
        loadReport<ClientSalesReportResult>("sales", adAccountId),
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
