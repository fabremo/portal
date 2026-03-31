export const REPORT_DATE_PRESETS = ["last_7_days", "current_month", "previous_month"] as const;

export type ReportDatePreset = (typeof REPORT_DATE_PRESETS)[number];

export type ReportDateRange = {
  since: string;
  until: string;
};

const DEFAULT_REPORT_DATE_PRESET: ReportDatePreset = "last_7_days";

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

export function resolveReportDatePreset(value: string | null | undefined): ReportDatePreset {
  if (value && REPORT_DATE_PRESETS.includes(value as ReportDatePreset)) {
    return value as ReportDatePreset;
  }

  return DEFAULT_REPORT_DATE_PRESET;
}

export function getReportDateRange(
  preset: ReportDatePreset = DEFAULT_REPORT_DATE_PRESET,
  now = new Date()
): ReportDateRange {
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

export const SALES_DATE_PRESETS = REPORT_DATE_PRESETS;
export type SalesDatePreset = ReportDatePreset;
export type SalesDateRange = ReportDateRange;
export const resolveSalesDatePreset = resolveReportDatePreset;
export const getSalesDateRange = getReportDateRange;