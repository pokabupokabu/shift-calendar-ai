import { isSameMonth, parseISO } from 'date-fns';

import type { BreakRule, CalendarEventRecord, PremiumRule, WageType } from '@/models';

/** "09:00"→"18:00" is 9h; end <= start is treated as crossing midnight (+24h). */
export function hoursBetween(startTime: string, endTime: string): number {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const startMinutes = toMinutes(startTime);
  let endMinutes = toMinutes(endTime);
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return (endMinutes - startMinutes) / 60;
}

function toMinutesOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Minutes of unpaid break for a shift of this length, per the Labor Standards Act tiers (highest matching tier wins). */
export function resolveBreakMinutes(grossHours: number, breakRules: BreakRule[]): number {
  const applicable = breakRules
    .filter((rule) => grossHours >= rule.minHours)
    .sort((a, b) => b.minHours - a.minHours);
  return applicable[0]?.minutes ?? 0;
}

/**
 * Hours of the [shiftStart, shiftEnd) interval (absolute minutes, end may exceed 1440 for
 * overnight shifts) that fall inside the given daily-recurring band (may itself wrap past midnight).
 */
function bandOverlapHours(
  shiftStartAbs: number,
  shiftEndAbs: number,
  band: Pick<PremiumRule, 'startTime' | 'endTime'>,
): number {
  const bandStart = toMinutesOfDay(band.startTime);
  const bandEndRaw = toMinutesOfDay(band.endTime);
  const bandLength =
    bandEndRaw <= bandStart ? bandEndRaw + 24 * 60 - bandStart : bandEndRaw - bandStart;
  if (bandLength <= 0) return 0;

  let overlapMinutes = 0;
  // The shift interval can span at most ~48h in this normalized space; check every
  // daily occurrence of the band that could possibly intersect it.
  for (let day = -1; day <= 2; day += 1) {
    const occStart = bandStart + day * 24 * 60;
    const occEnd = occStart + bandLength;
    const overlapStart = Math.max(shiftStartAbs, occStart);
    const overlapEnd = Math.min(shiftEndAbs, occEnd);
    if (overlapEnd > overlapStart) overlapMinutes += overlapEnd - overlapStart;
  }
  return overlapMinutes / 60;
}

export interface ShiftBreakdown {
  /** Raw shift length before break deduction. */
  grossHours: number;
  breakMinutes: number;
  /** grossHours minus the deducted break, i.e. actual paid working time. */
  workedHours: number;
  lateNightHours: number;
  earlyMorningHours: number;
  earnings: number;
}

/**
 * Computes actual worked time (after break deduction) and its earnings, including
 * late-night/early-morning premiums. Premiums only apply to wageType 'hourly' — a flat
 * daily rate (wageType 'daily') is unaffected by hours, so it stays a plain lookup.
 */
export function computeShiftBreakdown(
  startTime: string,
  endTime: string,
  wageType: WageType,
  hourlyWage: number,
  dailyWage: number,
  breakDeductionEnabled: boolean,
  breakRules: BreakRule[],
  lateNightPremium: PremiumRule,
  earlyMorningPremium: PremiumRule,
): ShiftBreakdown {
  const grossHours = hoursBetween(startTime, endTime);
  const breakMinutes = breakDeductionEnabled ? resolveBreakMinutes(grossHours, breakRules) : 0;
  const workedHours = Math.max(0, grossHours - breakMinutes / 60);

  const shiftStartAbs = toMinutesOfDay(startTime);
  const shiftEndAbs = shiftStartAbs + grossHours * 60;
  // Break time's exact placement within the shift is unknown, so premium-band hours
  // found in the gross interval are scaled down proportionally by how much of the
  // shift survived break deduction.
  const breakScale = grossHours > 0 ? workedHours / grossHours : 0;
  const lateNightHours = lateNightPremium.enabled
    ? bandOverlapHours(shiftStartAbs, shiftEndAbs, lateNightPremium) * breakScale
    : 0;
  const earlyMorningHours = earlyMorningPremium.enabled
    ? bandOverlapHours(shiftStartAbs, shiftEndAbs, earlyMorningPremium) * breakScale
    : 0;

  if (wageType === 'daily') {
    return {
      grossHours,
      breakMinutes,
      workedHours,
      lateNightHours,
      earlyMorningHours,
      earnings: dailyWage,
    };
  }

  const premiumHours = Math.min(workedHours, lateNightHours + earlyMorningHours);
  const scaleDown =
    lateNightHours + earlyMorningHours > 0
      ? premiumHours / (lateNightHours + earlyMorningHours)
      : 1;
  const scaledLateNight = lateNightHours * scaleDown;
  const scaledEarlyMorning = earlyMorningHours * scaleDown;
  const normalHours = workedHours - scaledLateNight - scaledEarlyMorning;

  const earnings =
    hourlyWage * normalHours +
    hourlyWage * (1 + lateNightPremium.ratePercent / 100) * scaledLateNight +
    hourlyWage * (1 + earlyMorningPremium.ratePercent / 100) * scaledEarlyMorning;

  return { grossHours, breakMinutes, workedHours, lateNightHours, earlyMorningHours, earnings };
}

export interface PayrollShiftTypeBreakdown {
  name: string;
  hours: number;
  count: number;
  subtotal: number;
}

export interface MonthlyPayroll {
  byShiftType: PayrollShiftTypeBreakdown[];
  total: number;
}

export interface PayrollSettings {
  wageType: WageType;
  hourlyWage: number;
  dailyWage: number;
  breakDeductionEnabled: boolean;
  breakRules: BreakRule[];
  lateNightPremium: PremiumRule;
  earlyMorningPremium: PremiumRule;
}

/** Groups the given month's events by shiftType name and sums wages at the app-wide rate. */
export function computeMonthlyPayroll(
  events: CalendarEventRecord[],
  month: Date,
  settings: PayrollSettings,
): MonthlyPayroll {
  const monthEvents = events.filter((event) => isSameMonth(parseISO(event.date), month));

  const breakdownByName = new Map<string, PayrollShiftTypeBreakdown>();

  for (const event of monthEvents) {
    const breakdown = computeShiftBreakdown(
      event.startTime,
      event.endTime,
      settings.wageType,
      settings.hourlyWage,
      settings.dailyWage,
      settings.breakDeductionEnabled,
      settings.breakRules,
      settings.lateNightPremium,
      settings.earlyMorningPremium,
    );
    const name = event.shiftType || '未分類';

    const existing = breakdownByName.get(name);
    if (existing) {
      existing.hours += breakdown.workedHours;
      existing.count += 1;
      existing.subtotal += breakdown.earnings;
    } else {
      breakdownByName.set(name, {
        name,
        hours: breakdown.workedHours,
        count: 1,
        subtotal: breakdown.earnings,
      });
    }
  }

  const byShiftType = [...breakdownByName.values()];
  const total = byShiftType.reduce((sum, entry) => sum + entry.subtotal, 0);

  return { byShiftType, total };
}

export interface DailyEarning {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  shiftType?: string;
  workedHours: number;
  breakMinutes: number;
  earnings: number;
}

/** Per-event earnings for the given month, earliest date first. */
export function computeDailyEarnings(
  events: CalendarEventRecord[],
  month: Date,
  settings: PayrollSettings,
): DailyEarning[] {
  const monthEvents = events.filter((event) => isSameMonth(parseISO(event.date), month));

  return monthEvents
    .map((event) => {
      const breakdown = computeShiftBreakdown(
        event.startTime,
        event.endTime,
        settings.wageType,
        settings.hourlyWage,
        settings.dailyWage,
        settings.breakDeductionEnabled,
        settings.breakRules,
        settings.lateNightPremium,
        settings.earlyMorningPremium,
      );
      return {
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        shiftType: event.shiftType,
        workedHours: breakdown.workedHours,
        breakMinutes: breakdown.breakMinutes,
        earnings: breakdown.earnings,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
