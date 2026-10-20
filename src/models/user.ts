import type { Workplace } from './workplace';

/** 扶養の壁の画面の「年齢（YYYY年12月31日時点）」の答え。 */
export interface AgeBracketAnswer {
  /** 何年について答えたか（西暦）。 */
  year: number;
  /** その年の12月31日時点で19歳以上23歳未満（19〜22歳）か。 */
  isAge19to22: boolean;
}

export interface UserSettings {
  /** Manual override for light/dark mode. */
  themeOverride: 'light' | 'dark';
  /** Local dev flag for toggling Pro features before real billing exists. */
  isPro: boolean;
  /** Whether the 扶養の壁 alert card shows on the 給与 tab (PRO feature, user-dismissible). */
  dependencyAlertEnabled: boolean;
  /**
   * 年齢区分の答え（「その年の12月31日時点で19〜22歳か」）と、それが何年の答えかの組。
   * 年収の壁（社会保険の扶養）はこの区分で変わる。生まれ年を聞くのはやめ（version 18、
   * docs/ui-review/group-d.md の決定7）、**答えた年と今年が違えば未設定として扱う**
   * （22歳→23歳で壁が150万→130万に下がる人が、古い答えのまま壁を超えないようにするため）。
   * 年を見て読み分けるのは `ageBracketForYear`（src/constants/dependencyWalls.ts）。
   */
  ageBracket?: AgeBracketAnswer;
}

export interface User {
  /** The name the user goes by in their own shift table, used to find their row (section 7). */
  shiftName: string;
  /**
   * True when the user's shift table lists no names at all — a personal or
   * single-person table (printed per-person sheets, a month calendar, etc.).
   * There is then no row to match against `shiftName`, and every shift in the
   * image is the user's own. Without this, the AI correctly reports
   * `not_found` for such tables and the user lands on a dead-end screen asking
   * them to type a name that the table does not contain.
   */
  shiftTableHasNoNames?: boolean;
  settings: UserSettings;
  /** Job profiles (掛け持ち). Everyone has at least one; additional ones are PRO-gated. */
  workplaces: Workplace[];
  /** Which workplace is active in the マイカスタム tab and used when registering new shifts. */
  activeWorkplaceId: string;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  themeOverride: 'light',
  isPro: false,
  dependencyAlertEnabled: true,
};
