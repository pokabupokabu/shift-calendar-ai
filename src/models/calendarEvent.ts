export type CalendarProviderId = 'apple' | 'google';

/**
 * Record of a calendar event the app itself created, linked back to the Shift
 * it came from. This is the basis for overwrite/duplicate detection without
 * having to read the whole calendar back (sections 12, 14, 20).
 */
export interface CalendarEventRecord {
  id: string;
  shiftId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  title: string;
  calendarProvider: CalendarProviderId;
  /** The event id returned by EventKit / Google Calendar API. */
  externalEventId: string;
}
