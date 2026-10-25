import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  type CalendarEventRecord,
  DEFAULT_USER_SETTINGS,
  DEFAULT_WORKPLACE_SETTINGS,
  type ShiftType,
  type User,
  type UserSettings,
  type Workplace,
  type WorkplaceSettings,
} from '@/models';
import {
  DEFAULT_SCAN_USAGE,
  grantBonusScan,
  MAX_ADVANCED_SCANS,
  nextAdvancedScanUsage,
  nextScanUsage,
  type ScanUsage,
} from '@/utils/scanQuota';

/**
 * 新しい勤務先に最初から並べる基本の3種別。時刻は本人が入れるまで持たない（「未登録」）。
 * 以前は仮の時刻（下の `LEGACY_PLACEHOLDER_TIMES`）が最初から入っていたが、本人の勤務と違う時刻が
 * AIの読み取りの手がかりや給与の見込みに使われてしまうため、version 17 でやめた。
 */
const DEFAULT_SHIFT_TYPES: ShiftType[] = [
  { id: 'early', name: '早番' },
  { id: 'late', name: '遅番' },
  { id: 'night', name: '夜勤' },
];

/**
 * version 16 までに基本の3種別へ最初から入れていた仮の時刻。version 17 の移行で、
 * これと全く同じ時刻のままの種別は「未登録」に戻す（本人が同じ時刻を入れた場合と見分けられないための割り切り）。
 */
const LEGACY_PLACEHOLDER_TIMES: Record<string, { startTime: string; endTime: string }> = {
  early: { startTime: '09:00', endTime: '18:00' },
  late: { startTime: '13:00', endTime: '22:00' },
  night: { startTime: '22:00', endTime: '07:00' },
};

function createWorkplace(id: string, name: string): Workplace {
  return {
    id,
    name,
    settings: { ...DEFAULT_WORKPLACE_SETTINGS },
    shiftTypes: DEFAULT_SHIFT_TYPES.map((shiftType) => ({ ...shiftType })),
  };
}

let nextWorkplaceSuffix = 0;
function nextWorkplaceId(): string {
  nextWorkplaceSuffix += 1;
  return `workplace-${Date.now()}-${nextWorkplaceSuffix}`;
}

export type TutorialFreeScanState = 'unoffered' | 'available' | 'used' | 'forfeited';

interface AppState {
  user: User | null;
  /** Events the app itself created, used for overwrite detection (section 12, 14). */
  calendarEvents: CalendarEventRecord[];
  /** Gates the first-launch tutorial; backfilled to true for pre-existing users, see migrate below. */
  hasSeenTutorial: boolean;
  /**
   * チュートリアルの「回数を使わずに1回試せる」枠の状態。
   * - unoffered: まだ分岐画面に来ていない
   * - available: 「やってみる」を選び、まだ解析に成功していない（失敗しても残る）
   * - used: お試しで解析に成功した
   * - forfeited: 「やらない」を選んだ（「今だけ」なので二度と出さない）
   */
  tutorialFreeScan: TutorialFreeScanState;
  /**
   * AI解析の回数（ふつうの解析と、PROの「高度なスキャン」の両方）。15日で回復する時計を共有する。
   * 数え方は src/utils/scanQuota.ts。
   */
  scanUsage: ScanUsage;
  /**
   * 初めてスキャンする前の同意（シフト表の写真と登録者キーワードを Anthropic のAIに送ること）に
   * 同意した日時（ISO 8601）。null は未同意で、「スキャンする」「高度なスキャンする」を押したときに
   * 同意の小窓を出す（App Review 5.1.2(i)。docs/ui-review/group-b.md の決定5・6）。
   */
  aiConsentAt: string | null;

  setShiftName: (shiftName: string) => void;
  setShiftTableHasNoNames: (value: boolean) => void;
  setHasSeenTutorial: () => void;
  /** 分岐画面での選択を記録する。一度決まったら（used/forfeited）上書きしない。 */
  chooseTutorialFreeScan: (accept: boolean) => void;
  markTutorialFreeScanUsed: () => void;
  /** 案内の途中で「また今度」を選んだとき。「今だけ」の枠なので、まだ使っていなければ失効させる。 */
  forfeitTutorialFreeScan: () => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  addWorkplace: (name: string) => void;
  removeWorkplace: (id: string) => void;
  renameWorkplace: (id: string, name: string) => void;
  setActiveWorkplace: (id: string) => void;
  updateWorkplaceSettings: (workplaceId: string, settings: Partial<WorkplaceSettings>) => void;
  upsertShiftType: (workplaceId: string, shiftType: ShiftType) => void;
  removeShiftType: (workplaceId: string, id: string) => void;
  recordCalendarEvent: (event: CalendarEventRecord) => void;
  updateCalendarEvent: (id: string, patch: Partial<CalendarEventRecord>) => void;
  removeCalendarEvent: (id: string) => void;
  findCalendarEventForDate: (date: string) => CalendarEventRecord | undefined;
  /** ふつうの解析を1回使った。 */
  recordScanUsage: () => void;
  /** 高度なスキャンを1回使った（ふつうの回数は減らさない）。 */
  recordAdvancedScanUsage: () => void;
  recordBonusScan: () => void;
  /** 同意の小窓で「同意してスキャン」を押した。 */
  recordAiConsent: () => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      calendarEvents: [],
      hasSeenTutorial: false,
      tutorialFreeScan: 'unoffered',
      scanUsage: DEFAULT_SCAN_USAGE,
      aiConsentAt: null,

      setHasSeenTutorial: () => set({ hasSeenTutorial: true }),

      chooseTutorialFreeScan: (accept) =>
        set((state) =>
          state.tutorialFreeScan === 'unoffered'
            ? { tutorialFreeScan: accept ? 'available' : 'forfeited' }
            : {},
        ),

      forfeitTutorialFreeScan: () =>
        set((state) =>
          state.tutorialFreeScan === 'available' ? { tutorialFreeScan: 'forfeited' } : {},
        ),

      markTutorialFreeScanUsed: () =>
        set((state) =>
          state.tutorialFreeScan === 'available' ? { tutorialFreeScan: 'used' } : {},
        ),

      setShiftName: (shiftName) =>
        set((state) => {
          if (state.user) return { user: { ...state.user, shiftName } };
          const defaultWorkplace = createWorkplace('default', '勤務先1');
          return {
            user: {
              shiftName,
              settings: { ...DEFAULT_USER_SETTINGS },
              workplaces: [defaultWorkplace],
              activeWorkplaceId: defaultWorkplace.id,
            },
          };
        }),

      setShiftTableHasNoNames: (value) =>
        set((state) => {
          if (state.user) return { user: { ...state.user, shiftTableHasNoNames: value } };
          // Onboarding can toggle this before any name is typed, so the user
          // record may not exist yet — create it the same way setShiftName does.
          const defaultWorkplace = createWorkplace('default', '勤務先1');
          return {
            user: {
              shiftName: '',
              shiftTableHasNoNames: value,
              settings: { ...DEFAULT_USER_SETTINGS },
              workplaces: [defaultWorkplace],
              activeWorkplaceId: defaultWorkplace.id,
            },
          };
        }),

      updateSettings: (settings) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, settings: { ...state.user.settings, ...settings } }
            : null,
        })),

      addWorkplace: (name) =>
        set((state) => {
          if (!state.user) return {};
          const workplace = createWorkplace(nextWorkplaceId(), name);
          return {
            user: {
              ...state.user,
              workplaces: [...state.user.workplaces, workplace],
              activeWorkplaceId: workplace.id,
            },
          };
        }),

      removeWorkplace: (id) =>
        set((state) => {
          if (!state.user || state.user.workplaces.length <= 1) return {};
          const workplaces = state.user.workplaces.filter((w) => w.id !== id);
          const activeWorkplaceId =
            state.user.activeWorkplaceId === id ? workplaces[0].id : state.user.activeWorkplaceId;
          return { user: { ...state.user, workplaces, activeWorkplaceId } };
        }),

      renameWorkplace: (id, name) =>
        set((state) => {
          if (!state.user) return {};
          return {
            user: {
              ...state.user,
              workplaces: state.user.workplaces.map((w) => (w.id === id ? { ...w, name } : w)),
            },
          };
        }),

      setActiveWorkplace: (id) =>
        set((state) => (state.user ? { user: { ...state.user, activeWorkplaceId: id } } : {})),

      updateWorkplaceSettings: (workplaceId, settings) =>
        set((state) => {
          if (!state.user) return {};
          return {
            user: {
              ...state.user,
              workplaces: state.user.workplaces.map((w) =>
                w.id === workplaceId ? { ...w, settings: { ...w.settings, ...settings } } : w,
              ),
            },
          };
        }),

      upsertShiftType: (workplaceId, shiftType) =>
        set((state) => {
          if (!state.user) return {};
          return {
            user: {
              ...state.user,
              workplaces: state.user.workplaces.map((w) => {
                if (w.id !== workplaceId) return w;
                const exists = w.shiftTypes.some((t) => t.id === shiftType.id);
                return {
                  ...w,
                  shiftTypes: exists
                    ? w.shiftTypes.map((t) => (t.id === shiftType.id ? shiftType : t))
                    : [...w.shiftTypes, shiftType],
                };
              }),
            },
          };
        }),

      removeShiftType: (workplaceId, id) =>
        set((state) => {
          if (!state.user) return {};
          return {
            user: {
              ...state.user,
              workplaces: state.user.workplaces.map((w) =>
                w.id === workplaceId
                  ? { ...w, shiftTypes: w.shiftTypes.filter((t) => t.id !== id) }
                  : w,
              ),
            },
          };
        }),

      recordCalendarEvent: (event) =>
        set((state) => ({ calendarEvents: [...state.calendarEvents, event] })),

      updateCalendarEvent: (id, patch) =>
        set((state) => ({
          calendarEvents: state.calendarEvents.map((event) =>
            event.id === id ? { ...event, ...patch } : event,
          ),
        })),

      removeCalendarEvent: (id) =>
        set((state) => ({
          calendarEvents: state.calendarEvents.filter((event) => event.id !== id),
        })),

      findCalendarEventForDate: (date) => get().calendarEvents.find((e) => e.date === date),

      recordScanUsage: () => set((state) => ({ scanUsage: nextScanUsage(state.scanUsage) })),

      recordAdvancedScanUsage: () =>
        set((state) => ({ scanUsage: nextAdvancedScanUsage(state.scanUsage) })),

      recordBonusScan: () => set((state) => ({ scanUsage: grantBonusScan(state.scanUsage) })),

      recordAiConsent: () => set({ aiConsentAt: new Date().toISOString() }),

      resetAll: () =>
        set({
          user: null,
          calendarEvents: [],
          hasSeenTutorial: false,
          tutorialFreeScan: 'unoffered',
          scanUsage: DEFAULT_SCAN_USAGE,
          aiConsentAt: null,
        }),
    }),
    {
      name: 'shift-calendar-ai-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 20,
      migrate: (persisted, version) => {
        // Migration spans many historical shapes (pre-workplace, pre-isPro, etc.),
        // so this intentionally works on an untyped view rather than `AppState`.
        const state = persisted as any;
        if (version < 1) {
          // Anyone who already finished the old onboarding flow has clearly
          // already "gotten it" - don't show them the new tutorial retroactively.
          state.hasSeenTutorial = Boolean(state.user?.shiftName);
        }
        if (version < 3) {
          // Wage settings moved from per-shiftType to a single app-wide rate
          // (settings.wageType/hourlyWage/dailyWage); older per-type wage
          // fields (however they were shaped across earlier dev iterations)
          // don't map onto that cleanly, so they're just dropped here in
          // favor of the new app-wide defaults.
          if (state.user) {
            state.user.settings = { ...DEFAULT_USER_SETTINGS, ...state.user.settings };
          }
          state.shiftTypes = (state.shiftTypes ?? []).map(
            ({ id, name, startTime, endTime }: ShiftType) => ({ id, name, startTime, endTime }),
          );
        }
        if (version < 4) {
          // Added break-time auto-deduction and late-night/early-morning wage
          // premiums; backfill the new settings fields with their defaults.
          if (state.user) {
            state.user.settings = { ...DEFAULT_USER_SETTINGS, ...state.user.settings };
          }
        }
        if (version < 5) {
          // Break deduction and each premium became individually toggleable;
          // backfill the new "enabled" flags (defaulting to on, matching the
          // always-on behavior these settings had before the toggle existed).
          if (state.user) {
            const prev = state.user.settings;
            state.user.settings = {
              ...DEFAULT_USER_SETTINGS,
              ...prev,
              breakDeductionEnabled: prev.breakDeductionEnabled ?? true,
              lateNightPremium: {
                ...DEFAULT_WORKPLACE_SETTINGS.lateNightPremium,
                ...prev.lateNightPremium,
              },
              earlyMorningPremium: {
                ...DEFAULT_WORKPLACE_SETTINGS.earlyMorningPremium,
                ...prev.earlyMorningPremium,
              },
            };
          }
        }
        if (version < 6) {
          // Added a manual light/dark/system override; backfill the default.
          if (state.user) {
            state.user.settings.themeOverride ??= DEFAULT_USER_SETTINGS.themeOverride;
          }
        }
        if (version < 7) {
          // ShiftType に icon フィールド追加、任意項目のため backfill 不要。
        }
        if (version < 8) {
          // isPro フラグ追加、および themeOverride の 'system' 選択肢廃止。
          if (state.user) {
            state.user.settings.isPro ??= false;
            if (state.user.settings.themeOverride === 'system') {
              state.user.settings.themeOverride = 'light';
            }
          }
        }
        if (version < 9) {
          // 複数勤務先プロファイル対応: それまで単一だった user.settings の勤務先依存
          // フィールドと、トップレベルの shiftTypes 配列を、1つの Workplace にまとめる。
          // isPro/themeOverride だけが User.settings に残る。
          if (state.user) {
            const legacy = state.user.settings ?? {};
            const legacyShiftTypes: ShiftType[] = Array.isArray(state.shiftTypes)
              ? state.shiftTypes
              : DEFAULT_SHIFT_TYPES;
            const defaultWorkplace: Workplace = {
              id: 'default',
              name: '勤務先1',
              settings: {
                defaultCalendarProvider:
                  legacy.defaultCalendarProvider ??
                  DEFAULT_WORKPLACE_SETTINGS.defaultCalendarProvider,
                eventTitleTemplate:
                  legacy.eventTitleTemplate ?? DEFAULT_WORKPLACE_SETTINGS.eventTitleTemplate,
                createDayOffEvents:
                  legacy.createDayOffEvents ?? DEFAULT_WORKPLACE_SETTINGS.createDayOffEvents,
                wageType: legacy.wageType ?? DEFAULT_WORKPLACE_SETTINGS.wageType,
                hourlyWage: legacy.hourlyWage ?? DEFAULT_WORKPLACE_SETTINGS.hourlyWage,
                dailyWage: legacy.dailyWage ?? DEFAULT_WORKPLACE_SETTINGS.dailyWage,
                breakDeductionEnabled:
                  legacy.breakDeductionEnabled ?? DEFAULT_WORKPLACE_SETTINGS.breakDeductionEnabled,
                breakRules: legacy.breakRules ?? DEFAULT_WORKPLACE_SETTINGS.breakRules,
                lateNightPremium:
                  legacy.lateNightPremium ?? DEFAULT_WORKPLACE_SETTINGS.lateNightPremium,
                earlyMorningPremium:
                  legacy.earlyMorningPremium ?? DEFAULT_WORKPLACE_SETTINGS.earlyMorningPremium,
              },
              shiftTypes: legacyShiftTypes,
            };
            state.user.settings = {
              themeOverride: legacy.themeOverride ?? DEFAULT_USER_SETTINGS.themeOverride,
              isPro: legacy.isPro ?? DEFAULT_USER_SETTINGS.isPro,
            };
            state.user.workplaces = [defaultWorkplace];
            state.user.activeWorkplaceId = defaultWorkplace.id;
          }
          delete state.shiftTypes;
          if (Array.isArray(state.calendarEvents)) {
            state.calendarEvents = state.calendarEvents.map((event: CalendarEventRecord) => ({
              ...event,
              workplaceId: (event as { workplaceId?: string }).workplaceId ?? 'default',
            }));
          }
        }
        if (version < 10) {
          // 扶養の壁アラート表示トグル追加; backfill the default (on).
          if (state.user) {
            state.user.settings.dependencyAlertEnabled ??=
              DEFAULT_USER_SETTINGS.dependencyAlertEnabled;
          }
        }
        if (version < 11) {
          // 無料プランの画像シフト読み取り月4回制限用カウンター追加。
          state.scanUsage ??= DEFAULT_SCAN_USAGE;
        }
        if (version < 12) {
          // リワード広告視聴で獲得するボーナススキャン枠を追加。
          if (state.scanUsage) {
            state.scanUsage.bonusScans ??= 0;
          }
        }
        if (version < 13) {
          // 年収の壁の出し分け用に settings.birthYear / settings.isDaytimeStudent を追加。
          // どちらも任意項目で「未設定 = 年齢による出し分けをしない」が正しい初期状態のため、
          // backfill はしない（既存ユーザーには設定を促す導線が給与タブに出る）。
        }
        if (version < 15) {
          // 解析回数を「暦月ごとの付与」から「使い始めて15日で回復」へ変更した。
          // 旧形式（yearMonth / count / bonusScans）とは数え方そのものが違うため移し替えられない。
          // 既存ユーザーが損をしないよう、満タンの状態から始める。
          state.scanUsage = { ...DEFAULT_SCAN_USAGE };
        }
        if (version < 16) {
          // チュートリアルのお試し枠を追加。すでにチュートリアルを終えた人には出さない。
          state.tutorialFreeScan = state.hasSeenTutorial ? 'forfeited' : 'unoffered';
        }
        if (version < 17) {
          // 基本の3種別の仮の時刻をやめ、時刻の無い「未登録」を持てるようにした。
          // 仮の時刻と全く同じ値のままの基本種別は、本人が入れた時刻ではないとみなして未登録に戻す。
          if (Array.isArray(state.user?.workplaces)) {
            for (const workplace of state.user.workplaces) {
              if (!Array.isArray(workplace?.shiftTypes)) continue;
              workplace.shiftTypes = workplace.shiftTypes.map((shiftType: ShiftType) => {
                const placeholder = LEGACY_PLACEHOLDER_TIMES[shiftType.id];
                if (
                  placeholder &&
                  shiftType.startTime === placeholder.startTime &&
                  shiftType.endTime === placeholder.endTime
                ) {
                  const { startTime: _startTime, endTime: _endTime, ...rest } = shiftType;
                  return rest;
                }
                return shiftType;
              });
            }
          }
        }
        if (version < 18) {
          // 扶養の壁の年齢を「生まれ年」から「その年に19〜22歳か」の2択（答えた年つき）へ変更した
          // （docs/ui-review/group-d.md の決定7）。生まれ年が入っていた人は、移行した時点の年について
          // 今までと同じ式（その年の12月31日時点の年齢 = 年 - 生まれ年、19歳以上23歳未満）で判定して移す。
          // 年が変わったら未設定に戻り、選び直してもらう。
          // あわせて学生区分（isDaytimeStudent）も聞くのをやめたため消す（注意書きは学生かどうかによらず出す）。
          const settings = state.user?.settings;
          if (settings) {
            const legacyBirthYear = settings.birthYear;
            if (typeof legacyBirthYear === 'number' && Number.isFinite(legacyBirthYear)) {
              const year = new Date().getFullYear();
              const age = year - legacyBirthYear;
              settings.ageBracket = { year, isAge19to22: age >= 19 && age < 23 };
            }
            delete settings.birthYear;
            delete settings.isDaytimeStudent;
          }
        }
        if (version < 19) {
          // PROの「高度なスキャン」の残り回数を追加した。満タン（5回）から始める。
          // 時計（cycleStartedAt）やふつうの回数はそのまま引き継ぐ。
          if (state.scanUsage && typeof state.scanUsage === 'object') {
            state.scanUsage.advancedRemaining ??= MAX_ADVANCED_SCANS;
          } else {
            state.scanUsage = { ...DEFAULT_SCAN_USAGE };
          }
        }
        if (version < 20) {
          // 初めてスキャンする前の同意を追加した。既存の人もまだ同意していないので、未同意から始める
          // （次に「スキャンする」を押したときに1回だけ同意の小窓が出る）。
          state.aiConsentAt = null;
        }
        return state;
      },
    },
  ),
);
