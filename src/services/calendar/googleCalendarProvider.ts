import type { CalendarEventRecord } from '@/models';

import type { CalendarProvider, CreateCalendarEventInput } from './types';

/**
 * Phase 5 target implementation: OAuth via expo-auth-session against
 * EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, then plain REST calls to
 * https://www.googleapis.com/calendar/v3/. Left unimplemented here so the
 * CalendarProvider wiring (settings screen provider switch, confirmation
 * screen) can be built against a stable shape before the OAuth flow exists.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  readonly id = 'google' as const;
  readonly requiresAuthentication = true;

  async isAuthenticated(): Promise<boolean> {
    return false;
  }

  async authenticate(): Promise<void> {
    throw new Error('GoogleCalendarProvider.authenticate is not implemented yet (Phase 5).');
  }

  async requestCalendarPermission(): Promise<boolean> {
    throw new Error(
      'GoogleCalendarProvider.requestCalendarPermission is not implemented yet (Phase 5).',
    );
  }

  async createEvent(_input: CreateCalendarEventInput): Promise<CalendarEventRecord> {
    throw new Error('GoogleCalendarProvider.createEvent is not implemented yet (Phase 5).');
  }

  async updateEvent(_externalEventId: string, _input: CreateCalendarEventInput): Promise<void> {
    throw new Error('GoogleCalendarProvider.updateEvent is not implemented yet (Phase 5).');
  }

  async deleteEvent(_externalEventId: string): Promise<void> {
    throw new Error('GoogleCalendarProvider.deleteEvent is not implemented yet (Phase 5).');
  }

  async openCalendarApp(): Promise<void> {
    throw new Error('GoogleCalendarProvider.openCalendarApp is not implemented yet (Phase 5).');
  }
}
