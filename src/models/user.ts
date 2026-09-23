import type { WageType } from './shiftType';

export interface UserSettings {
  /** Default calendar provider used for registration (section 13). */
  defaultCalendarProvider: 'apple' | 'google';
  /** Event title template, e.g. "バイト｜{shiftType}" (section 13). */
  eventTitleTemplate: string;
  /** Pro feature: create an all-day event for detected days off (section 16). */
  createDayOffEvents: boolean;
  /** App-wide: whether every shift earns a per-hour or a flat per-shift rate. */
  wageType: WageType;
  /** Yen per hour, used when wageType is 'hourly'. */
  hourlyWage: number;
  /** Yen per shift (flat rate), used when wageType is 'daily'. */
  dailyWage: number;
}

export interface User {
  /** The name the user goes by in their own shift table, used to find their row (section 7). */
  shiftName: string;
  /** Optional display name for in-app UI, defaults to shiftName. */
  displayName?: string;
  settings: UserSettings;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultCalendarProvider: 'apple',
  eventTitleTemplate: 'バイト｜{shiftType}',
  createDayOffEvents: false,
  wageType: 'hourly',
  hourlyWage: 1300,
  dailyWage: 10400,
};
