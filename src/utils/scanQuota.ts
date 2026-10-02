/** Free-plan monthly limit on AI shift-table scans (PRO is unlimited). */
export const FREE_SCAN_MONTHLY_LIMIT = 4;

export interface ScanUsage {
  /** "YYYY-MM" of the month `count` applies to; any other month's count is stale (treated as 0). */
  yearMonth: string;
  count: number;
}

export const DEFAULT_SCAN_USAGE: ScanUsage = { yearMonth: '', count: 0 };

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Scans already used this calendar month (0 if the stored usage is from an earlier month). */
export function usedScansThisMonth(usage: ScanUsage): number {
  return usage.yearMonth === currentYearMonth() ? usage.count : 0;
}

/** Free scans still available this month (never negative; PRO has no limit so this is free-plan-only). */
export function remainingFreeScans(usage: ScanUsage): number {
  return Math.max(0, FREE_SCAN_MONTHLY_LIMIT - usedScansThisMonth(usage));
}

/** Usage after recording one more scan now; rolls over to a fresh count on a new month. */
export function nextScanUsage(usage: ScanUsage): ScanUsage {
  const yearMonth = currentYearMonth();
  return { yearMonth, count: usedScansThisMonth(usage) + 1 };
}
