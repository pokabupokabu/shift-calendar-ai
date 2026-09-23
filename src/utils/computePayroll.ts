import { isSameMonth, parseISO } from 'date-fns';

import type { CalendarEventRecord, WageType } from '@/models';

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

/** Every shift earns at the same app-wide rate (section 13: 給与形態), so this never returns undefined. */
export function computeShiftEarning(
  hours: number,
  wageType: WageType,
  hourlyWage: number,
  dailyWage: number,
): number {
  return wageType === 'daily' ? dailyWage : hourlyWage * hours;
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

/** Groups the given month's events by shiftType name and sums wages at the app-wide rate. */
export function computeMonthlyPayroll(
  events: CalendarEventRecord[],
  month: Date,
  wageType: WageType,
  hourlyWage: number,
  dailyWage: number,
): MonthlyPayroll {
  const monthEvents = events.filter((event) => isSameMonth(parseISO(event.date), month));

  const breakdownByName = new Map<string, PayrollShiftTypeBreakdown>();

  for (const event of monthEvents) {
    const hours = hoursBetween(event.startTime, event.endTime);
    const earning = computeShiftEarning(hours, wageType, hourlyWage, dailyWage);
    const name = event.shiftType || '未分類';

    const existing = breakdownByName.get(name);
    if (existing) {
      existing.hours += hours;
      existing.count += 1;
      existing.subtotal += earning;
    } else {
      breakdownByName.set(name, { name, hours, count: 1, subtotal: earning });
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
  earnings: number;
}

/** Per-event earnings for the given month, most recent first. */
export function computeDailyEarnings(
  events: CalendarEventRecord[],
  month: Date,
  wageType: WageType,
  hourlyWage: number,
  dailyWage: number,
): DailyEarning[] {
  const monthEvents = events.filter((event) => isSameMonth(parseISO(event.date), month));

  return monthEvents
    .map((event) => {
      const hours = hoursBetween(event.startTime, event.endTime);
      return {
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        shiftType: event.shiftType,
        earnings: computeShiftEarning(hours, wageType, hourlyWage, dailyWage),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
