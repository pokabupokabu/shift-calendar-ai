import type { Workplace } from './workplace';

export interface UserSettings {
  /** Manual override for light/dark mode. */
  themeOverride: 'light' | 'dark';
  /** Local dev flag for toggling Pro features before real billing exists. */
  isPro: boolean;
}

export interface User {
  /** The name the user goes by in their own shift table, used to find their row (section 7). */
  shiftName: string;
  /** Optional display name for in-app UI, defaults to shiftName. */
  displayName?: string;
  settings: UserSettings;
  /** Job profiles (掛け持ち). Everyone has at least one; additional ones are PRO-gated. */
  workplaces: Workplace[];
  /** Which workplace is active in the テンプレ tab and used when registering new shifts. */
  activeWorkplaceId: string;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  themeOverride: 'light',
  isPro: false,
};
