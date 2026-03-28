export const SALES_DATE_PRESETS = ["last_7_days", "current_month", "previous_month"] as const;

export type SalesDatePreset = (typeof SALES_DATE_PRESETS)[number];

export type SalesDateRange = {
  since: string;
  until: string;
};

const DEFAULT_SALES_DATE_PRESET: SalesDatePreset = "last_7_days";

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getReferenceToday(now = new Date()) {
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  return today;
}

export function resolveSalesDatePreset(value: string | null | undefined): SalesDatePreset {
  if (value && SALES_DATE_PRESETS.includes(value as SalesDatePreset)) {
    return value as SalesDatePreset;
  }

  return DEFAULT_SALES_DATE_PRESET;
}

export function getSalesDateRange(
  preset: SalesDatePreset = DEFAULT_SALES_DATE_PRESET,
  now = new Date()
): SalesDateRange {
  const today = getReferenceToday(now);
  const until = new Date(today);
  until.setDate(today.getDate() - 1);

  switch (preset) {
    case "current_month": {
      const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0, 0);
      const since = until < firstDayOfCurrentMonth ? new Date(until) : firstDayOfCurrentMonth;

      return {
        since: formatDate(since),
        until: formatDate(until),
      };
    }
    case "previous_month": {
      const since = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12, 0, 0, 0);
      const previousMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0, 12, 0, 0, 0);

      return {
        since: formatDate(since),
        until: formatDate(previousMonthLastDay),
      };
    }
    case "last_7_days":
    default: {
      const since = new Date(until);
      since.setDate(until.getDate() - 6);

      return {
        since: formatDate(since),
        until: formatDate(until),
      };
    }
  }
}
