export type CalendarProviderId = 'apple' | 'google';

/**
 * Record of a calendar event the app itself created, linked back to the Shift
 * it came from. This is the basis for overwrite/duplicate detection without
 * having to read the whole calendar back (sections 12, 14, 20).
 */
export interface CalendarEventRecord {
  id: string;
  shiftId: string;
  /** Which workplace (掛け持ち job) this shift belongs to; resolves wage settings and shift-type colors. */
  workplaceId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  title: string;
  /** Shift type name (e.g. "早番") at creation time, used to look up a wage rate for payroll. */
  shiftType?: string;
  calendarProvider: CalendarProviderId;
  /** The event id returned by EventKit / Google Calendar API. */
  externalEventId: string;
}
