import type { Workplace } from './workplace';

export interface UserSettings {
  /** Manual override for light/dark mode. */
  themeOverride: 'light' | 'dark';
  /** Local dev flag for toggling Pro features before real billing exists. */
  isPro: boolean;
  /** Whether the 扶養の壁 alert card shows on the 給与 tab (PRO feature, user-dismissible). */
  dependencyAlertEnabled: boolean;
  /**
   * 生まれ年（西暦4桁）。年収の壁は「その年の12月31日時点で19歳以上23歳未満か」で変わるため、
   * 固定の年齢ではなく生まれ年を持ち、毎年自動で判定し直す。未設定なら年齢による出し分けをしない。
   */
  birthYear?: number;
  /**
   * 昼間部の学生か。しきい値自体は変わらないが、勤務時間による社会保険加入
   * （週20時間以上・従業員51人以上・学生でないこと）の注意書きの出し分けに使う。
   */
  isDaytimeStudent?: boolean;
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
  dependencyAlertEnabled: true,
};
