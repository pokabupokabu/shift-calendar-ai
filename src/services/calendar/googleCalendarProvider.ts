import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { env } from '@/config/env';
import type { CalendarEventRecord } from '@/models';

import type { CalendarProvider, CreateCalendarEventInput } from './types';

// Required so the auth session resolves correctly when the browser redirects back to the app.
WebBrowser.maybeCompleteAuthSession();

// Stable, well-known Google OAuth2 endpoints (no discovery fetch needed).
const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Only event write access is needed (section 14's "minimal privacy footprint" principle,
// applied to Google the same way it was to Apple Calendar's permission request).
const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const TOKEN_STORAGE_KEY = 'shift-calendar-ai:google-oauth-token';

interface StoredGoogleToken {
  accessToken: string;
  refreshToken?: string;
  /** Epoch seconds. */
  expiresAt: number;
}

/** Combines "YYYY-MM-DD" + "HH:mm" into a floating (timezone-less) local datetime string for the Calendar API. */
function toGoogleDateTime(date: string, time: string, rollToNextDay: boolean): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(year, month - 1, day, hours, minutes);
  if (rollToNextDay) {
    result.setDate(result.getDate() + 1);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}T${pad(result.getHours())}:${pad(result.getMinutes())}:00`;
}

/**
 * Google Calendar API v3 + OAuth PKCE via expo-auth-session (Phase 5). The
 * generic AuthRequest/exchangeCodeAsync/refreshAsync functions are used
 * directly rather than the expo-auth-session/providers/google hook helpers,
 * which are React hooks (unusable from this plain class) and, as of this
 * Expo version, deprecated in favor of this lower-level API.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  readonly id = 'google' as const;
  readonly requiresAuthentication = true;

  private token: StoredGoogleToken | null = null;

  private get clientId(): string {
    return env.google.iosClientId;
  }

  private async loadToken(): Promise<StoredGoogleToken | null> {
    if (this.token) return this.token;
    const raw = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    this.token = raw ? (JSON.parse(raw) as StoredGoogleToken) : null;
    return this.token;
  }

  private async saveToken(token: StoredGoogleToken): Promise<void> {
    this.token = token;
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
  }

  private async clearToken(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  private async getValidAccessToken(): Promise<string> {
    const token = await this.loadToken();
    if (!token) {
      throw new Error('Google認証が必要です。カレンダー登録の確認画面からサインインしてください。');
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (token.expiresAt - 60 > nowInSeconds) {
      return token.accessToken;
    }

    if (!token.refreshToken) {
      await this.clearToken();
      throw new Error('Google認証の有効期限が切れました。再度サインインしてください。');
    }

    try {
      const refreshed = await AuthSession.refreshAsync(
        { clientId: this.clientId, refreshToken: token.refreshToken },
        GOOGLE_DISCOVERY,
      );
      const nextToken: StoredGoogleToken = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? token.refreshToken,
        expiresAt: nowInSeconds + (refreshed.expiresIn ?? 3600),
      };
      await this.saveToken(nextToken);
      return nextToken.accessToken;
    } catch {
      await this.clearToken();
      throw new Error('Google認証の更新に失敗しました。再度サインインしてください。');
    }
  }

  async isAuthenticated(): Promise<boolean> {
    return (await this.loadToken()) !== null;
  }

  async authenticate(): Promise<void> {
    if (!this.clientId) {
      throw new Error(
        'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is not set. Add it to .env (see .env.example).',
      );
    }

    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'shiftcalendarai' });
    const request = new AuthSession.AuthRequest({
      clientId: this.clientId,
      scopes: GOOGLE_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    });

    const result = await request.promptAsync(GOOGLE_DISCOVERY);
    if (result.type !== 'success') {
      throw new Error('Google認証がキャンセルまたは失敗しました。');
    }

    const exchanged = await AuthSession.exchangeCodeAsync(
      {
        clientId: this.clientId,
        code: result.params.code,
        redirectUri,
        extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
      },
      GOOGLE_DISCOVERY,
    );

    await this.saveToken({
      accessToken: exchanged.accessToken,
      refreshToken: exchanged.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (exchanged.expiresIn ?? 3600),
    });
  }

  async requestCalendarPermission(): Promise<boolean> {
    // Google has no separate device permission step: the calendar.events OAuth
    // scope granted during authenticate() already covers event write access.
    return this.isAuthenticated();
  }

  private async apiFetch(path: string, init: RequestInit): Promise<Response> {
    const accessToken = await this.getValidAccessToken();
    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => undefined);
      const message =
        errorBody && typeof errorBody === 'object' && 'error' in errorBody
          ? String(
              (errorBody as { error?: { message?: string } }).error?.message ?? response.statusText,
            )
          : response.statusText;
      throw new Error(`Google Calendarとの通信に失敗しました（${response.status}）: ${message}`);
    }

    return response;
  }

  private buildEventBody(input: CreateCalendarEventInput) {
    if (input.isAllDay) {
      return {
        summary: input.title,
        start: { date: input.date },
        end: { date: input.date },
      };
    }

    const isOvernight = input.endTime <= input.startTime;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      summary: input.title,
      start: { dateTime: toGoogleDateTime(input.date, input.startTime, false), timeZone },
      end: { dateTime: toGoogleDateTime(input.date, input.endTime, isOvernight), timeZone },
    };
  }

  async createEvent(input: CreateCalendarEventInput): Promise<CalendarEventRecord> {
    const response = await this.apiFetch('/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(this.buildEventBody(input)),
    });
    const event = (await response.json()) as { id: string };

    return {
      id: event.id,
      shiftId: '', // caller fills this in when linking the record back to its Shift
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      title: input.title,
      calendarProvider: this.id,
      externalEventId: event.id,
    };
  }

  async updateEvent(externalEventId: string, input: CreateCalendarEventInput): Promise<void> {
    await this.apiFetch(`/calendars/primary/events/${externalEventId}`, {
      method: 'PATCH',
      body: JSON.stringify(this.buildEventBody(input)),
    });
  }

  async deleteEvent(externalEventId: string): Promise<void> {
    await this.apiFetch(`/calendars/primary/events/${externalEventId}`, {
      method: 'DELETE',
    });
  }

  async openCalendarApp(): Promise<void> {
    await Linking.openURL('https://calendar.google.com/calendar/r');
  }
}
