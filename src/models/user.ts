export interface UserSettings {
  /** Default calendar provider used for registration (section 13). */
  defaultCalendarProvider: 'apple' | 'google';
  /** Event title template, e.g. "バイト｜{shiftType}" (section 13). */
  eventTitleTemplate: string;
  /** Pro feature: create an all-day event for detected days off (section 16). */
  createDayOffEvents: boolean;
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
};
