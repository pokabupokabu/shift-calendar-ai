import type { WageType } from './shiftType';

/** One tier of the Labor Standards Act break-time rule: shifts at or above `minHours` get `minutes` of unpaid break auto-deducted. */
export interface BreakRule {
  minHours: number;
  minutes: number;
}

/** A recurring daily time band (may wrap past midnight, e.g. 22:00〜05:00) that pays hourlyWage at a premium. */
export interface PremiumRule {
  enabled: boolean;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm", may be earlier than startTime for a band crossing midnight
  /** Extra percentage on top of the base hourly wage, e.g. 25 means ×1.25. */
  ratePercent: number;
}

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
  /** Whether the break tiers below are auto-deducted from worked hours at all. */
  breakDeductionEnabled: boolean;
  /** Auto-deducted break tiers by shift length, editable defaults matching the Labor Standards Act. */
  breakRules: BreakRule[];
  /** Late-night premium (hourly wage type only). Default 22:00〜05:00 +25%. */
  lateNightPremium: PremiumRule;
  /** Early-morning premium (hourly wage type only). Default 05:00〜07:00 +25%; no legal minimum. */
  earlyMorningPremium: PremiumRule;
  /** Manual override for light/dark mode; 'system' follows the OS setting. */
  themeOverride: 'system' | 'light' | 'dark';
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
  breakDeductionEnabled: true,
  breakRules: [
    { minHours: 6, minutes: 45 },
    { minHours: 8, minutes: 60 },
  ],
  lateNightPremium: { enabled: true, startTime: '22:00', endTime: '05:00', ratePercent: 25 },
  earlyMorningPremium: { enabled: true, startTime: '05:00', endTime: '07:00', ratePercent: 25 },
  themeOverride: 'system',
};
