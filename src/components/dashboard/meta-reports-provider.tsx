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

export type ClientMessagesReportResult =
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
      rows: MessagesRow[];
      since: string;
      state: "empty" | "ok";
      until: string;
    };

type MetaReportsContextValue = {
  getMessagesReport: (adAccountId: string) => Promise<ClientMessagesReportResult>;
  getSalesReport: (adAccountId: string) => Promise<ClientSalesReportResult>;
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
        return memoryValue as T;
      }

      const sessionValue = readSessionValue<T>(cacheKey);

      if (sessionValue) {
        memoryCacheRef.current.set(cacheKey, sessionValue);
        return sessionValue;
      }

      const inflightRequest = inflightRequestsRef.current.get(cacheKey);

      if (inflightRequest) {
        return inflightRequest as Promise<T>;
      }

      const request = fetch(`/api/dashboard/reports/${kind}?adAccountId=${encodeURIComponent(adAccountId)}`, {
        cache: "no-store",
      })
        .then(async (response) => {
          const payload = (await response.json()) as T;

          if (!response.ok) {
            throw new Error("Nao foi possivel carregar o relatorio.");
          }

          memoryCacheRef.current.set(cacheKey, payload);
          writeSessionValue(cacheKey, payload);
          return payload;
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
