import { isSameMonth, parseISO } from 'date-fns';

import type { CalendarEventRecord, ShiftType } from '@/models';

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

export interface PayrollShiftTypeBreakdown {
  name: string;
  hours: number;
  hourlyWage: number;
  subtotal: number;
}

export interface MonthlyPayroll {
  byShiftType: PayrollShiftTypeBreakdown[];
  /** Events with no shiftType, an unknown shiftType, or a shiftType with no hourlyWage set. */
  unclassifiedCount: number;
  total: number;
}

/** Groups the given month's events by shiftType name and sums wages using each ShiftType's hourlyWage. */
export function computeMonthlyPayroll(
  events: CalendarEventRecord[],
  shiftTypes: ShiftType[],
  month: Date,
): MonthlyPayroll {
  const monthEvents = events.filter((event) => isSameMonth(parseISO(event.date), month));

  const breakdownByName = new Map<string, PayrollShiftTypeBreakdown>();
  let unclassifiedCount = 0;

  for (const event of monthEvents) {
    const shiftType = shiftTypes.find((candidate) => candidate.name === event.shiftType);
    if (!shiftType || shiftType.hourlyWage === undefined) {
      unclassifiedCount += 1;
      continue;
    }

    const hours = hoursBetween(event.startTime, event.endTime);
    const existing = breakdownByName.get(shiftType.name);
    if (existing) {
      existing.hours += hours;
      existing.subtotal += hours * shiftType.hourlyWage;
    } else {
      breakdownByName.set(shiftType.name, {
        name: shiftType.name,
        hours,
        hourlyWage: shiftType.hourlyWage,
        subtotal: hours * shiftType.hourlyWage,
      });
    }
  }

  const byShiftType = [...breakdownByName.values()];
  const total = byShiftType.reduce((sum, entry) => sum + entry.subtotal, 0);

  return { byShiftType, unclassifiedCount, total };
}

export interface DailyEarning {
  date: string; // "YYYY-MM-DD"
  shiftType?: string;
  hours: number;
  earnings: number; // 0 if the shift type has no hourlyWage set yet
}

/** Per-event earnings for the given month, most recent first. */
export function computeDailyEarnings(
  events: CalendarEventRecord[],
  shiftTypes: ShiftType[],
  month: Date,
): DailyEarning[] {
  const monthEvents = events.filter((event) => isSameMonth(parseISO(event.date), month));

  return monthEvents
    .map((event) => {
      const shiftType = shiftTypes.find((candidate) => candidate.name === event.shiftType);
      const hours = hoursBetween(event.startTime, event.endTime);
      const earnings = shiftType?.hourlyWage !== undefined ? hours * shiftType.hourlyWage : 0;

      return {
        date: event.date,
        shiftType: event.shiftType,
        hours,
        earnings,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
