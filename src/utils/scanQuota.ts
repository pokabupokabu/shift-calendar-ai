/** Free-plan monthly base limit on AI shift-table scans (PRO is unlimited). */
export const FREE_SCAN_MONTHLY_LIMIT = 4;

/** Extra scans obtainable by watching a rewarded ad, capped per month so PRO (unlimited) keeps its value. */
export const MAX_BONUS_SCANS_PER_MONTH = 5;

export interface ScanUsage {
  /** "YYYY-MM" of the month `count`/`bonusScans` apply to; any other month's values are stale (treated as 0). */
  yearMonth: string;
  count: number;
  /** Bonus scans earned this month by watching rewarded ads (see MAX_BONUS_SCANS_PER_MONTH). */
  bonusScans: number;
}

export const DEFAULT_SCAN_USAGE: ScanUsage = { yearMonth: '', count: 0, bonusScans: 0 };

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Scans already used this calendar month (0 if the stored usage is from an earlier month). */
export function usedScansThisMonth(usage: ScanUsage): number {
  return usage.yearMonth === currentYearMonth() ? usage.count : 0;
}

/** Bonus scans already earned this month (0 if the stored usage is from an earlier month). */
export function bonusScansEarnedThisMonth(usage: ScanUsage): number {
  return usage.yearMonth === currentYearMonth() ? usage.bonusScans : 0;
}

/** Free scans still available this month, base + earned bonus (never negative; PRO has no limit). */
export function remainingFreeScans(usage: ScanUsage): number {
  const limit = FREE_SCAN_MONTHLY_LIMIT + bonusScansEarnedThisMonth(usage);
  return Math.max(0, limit - usedScansThisMonth(usage));
}

/** Whether another rewarded-ad bonus scan can still be earned this month. */
export function canEarnBonusScan(usage: ScanUsage): boolean {
  return bonusScansEarnedThisMonth(usage) < MAX_BONUS_SCANS_PER_MONTH;
}

/** Usage after recording one more scan now; rolls over to a fresh count on a new month. */
export function nextScanUsage(usage: ScanUsage): ScanUsage {
  const yearMonth = currentYearMonth();
  return {
    yearMonth,
    count: usedScansThisMonth(usage) + 1,
    bonusScans: bonusScansEarnedThisMonth(usage),
  };
}

/** Usage after earning one rewarded-ad bonus scan now; rolls over to a fresh count on a new month. */
export function grantBonusScan(usage: ScanUsage): ScanUsage {
  const yearMonth = currentYearMonth();
  return {
    yearMonth,
    count: usedScansThisMonth(usage),
    bonusScans: bonusScansEarnedThisMonth(usage) + 1,
  };
}
