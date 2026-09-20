import type { CalendarEventRecord, CalendarProviderId } from '@/models';

export interface CreateCalendarEventInput {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  title: string;
  /** All-day event, used for day-off entries (section 16, Pro feature). */
  isAllDay?: boolean;
}

/**
 * Apple Calendar (EventKit) and Google Calendar are deliberately separate
 * implementations behind one interface, never a shared abstraction that
 * leaks either SDK's shape (requirements section 10, 13-15, 20).
 */
export interface CalendarProvider {
  readonly id: CalendarProviderId;
  /** Google needs an OAuth sign-in step first; Apple does not (section 19). */
  readonly requiresAuthentication: boolean;

  isAuthenticated(): Promise<boolean>;
  authenticate(): Promise<void>;

  requestCalendarPermission(): Promise<boolean>;

  /** Creates the event on the user's default calendar and records it for future overwrite detection. */
  createEvent(input: CreateCalendarEventInput): Promise<CalendarEventRecord>;
  updateEvent(externalEventId: string, input: CreateCalendarEventInput): Promise<void>;
  deleteEvent(externalEventId: string): Promise<void>;

  /** Opens the native/Google calendar app for the "カレンダーを見る" completion action (section 17). */
  openCalendarApp(): Promise<void>;
}
