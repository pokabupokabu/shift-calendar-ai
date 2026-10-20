import * as Calendar from 'expo-calendar';
import { Linking } from 'react-native';

import type { CalendarEventRecord } from '@/models';

import type { CalendarProvider, CreateCalendarEventInput } from './types';

/** Combines a "YYYY-MM-DD" date with an "HH:mm" time, rolling to the next day past midnight for overnight shifts. */
function toDate(date: string, time: string, rollToNextDay: boolean): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(year, month - 1, day, hours, minutes);
  if (rollToNextDay) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

/**
 * 終日シフトは時刻を持たない（startTime/endTime が空文字）ため、時刻から日付を組み立てられない。
 * その日の 0:00〜翌0:00 を範囲にし、allDay フラグと整合させる。
 */
function resolveEventRange(input: CreateCalendarEventInput): { startDate: Date; endDate: Date } {
  if (input.isAllDay) {
    return {
      startDate: toDate(input.date, '00:00', false),
      endDate: toDate(input.date, '00:00', true),
    };
  }

  const isOvernight = input.endTime <= input.startTime;
  return {
    startDate: toDate(input.date, input.startTime, false),
    endDate: toDate(input.date, input.endTime, isOvernight),
  };
}

/**
 * EventKit-backed implementation. No sign-in is needed (requirements section 19) -
 * only calendar permission, which requestCalendarPermission asks for explicitly
 * rather than reading the whole calendar, to keep the privacy footprint minimal
 * (section 14).
 */
export class AppleCalendarProvider implements CalendarProvider {
  readonly id = 'apple' as const;
  readonly requiresAuthentication = false;

  async isAuthenticated(): Promise<boolean> {
    return true;
  }

  async authenticate(): Promise<void> {
    // No-op: Apple Calendar needs calendar permission only, not account sign-in.
  }

  async requestCalendarPermission(): Promise<boolean> {
    const { status } = await Calendar.requestCalendarPermissions();
    return status === 'granted';
  }

  async hasCalendarPermission(): Promise<boolean> {
    // getCalendarPermissions only reads the current state; it never shows the iOS prompt.
    // On web it always reports "undetermined", so Apple shows as not connected there.
    try {
      const { status } = await Calendar.getCalendarPermissions();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  async createEvent(input: CreateCalendarEventInput): Promise<CalendarEventRecord> {
    const calendar = Calendar.getDefaultCalendarSync();
    const { startDate, endDate } = resolveEventRange(input);
    const event = await calendar.createEvent({
      title: input.title,
      startDate,
      endDate,
      allDay: input.isAllDay ?? false,
    });

    return {
      id: event.id,
      shiftId: '', // caller fills this in when linking the record back to its Shift
      workplaceId: '', // caller fills this in when linking the record back to its Workplace

      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      title: input.title,
      isAllDay: input.isAllDay ?? false,
      calendarProvider: this.id,
      externalEventId: event.id,
    };
  }

  async updateEvent(externalEventId: string, input: CreateCalendarEventInput): Promise<void> {
    const { startDate, endDate } = resolveEventRange(input);
    const event = await Calendar.ExpoCalendarEvent.get(externalEventId);
    await event.update({
      title: input.title,
      startDate,
      endDate,
      allDay: input.isAllDay ?? false,
    });
  }

  async deleteEvent(externalEventId: string): Promise<void> {
    const event = await Calendar.ExpoCalendarEvent.get(externalEventId);
    await event.delete();
  }

  async openCalendarApp(): Promise<void> {
    await Linking.openURL('calshow:');
  }
}
