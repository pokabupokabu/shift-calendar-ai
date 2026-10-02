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

  async createEvent(input: CreateCalendarEventInput): Promise<CalendarEventRecord> {
    const calendar = Calendar.getDefaultCalendarSync();
    const isOvernight = input.endTime <= input.startTime;
    const event = await calendar.createEvent({
      title: input.title,
      startDate: toDate(input.date, input.startTime, false),
      endDate: toDate(input.date, input.endTime, isOvernight),
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
      calendarProvider: this.id,
      externalEventId: event.id,
    };
  }

  async updateEvent(externalEventId: string, input: CreateCalendarEventInput): Promise<void> {
    const isOvernight = input.endTime <= input.startTime;
    const event = await Calendar.ExpoCalendarEvent.get(externalEventId);
    await event.update({
      title: input.title,
      startDate: toDate(input.date, input.startTime, false),
      endDate: toDate(input.date, input.endTime, isOvernight),
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
