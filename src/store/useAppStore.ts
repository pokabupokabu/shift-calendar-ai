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
  nextScanUsage,
  type ScanUsage,
} from '@/utils/scanQuota';

/** Seed values from requirements section 8, editable by the user afterwards. */
const DEFAULT_SHIFT_TYPES: ShiftType[] = [
  { id: 'early', name: '早番', startTime: '09:00', endTime: '18:00' },
  { id: 'late', name: '遅番', startTime: '13:00', endTime: '22:00' },
  { id: 'night', name: '夜勤', startTime: '22:00', endTime: '07:00' },
];

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

interface AppState {
  user: User | null;
  /** Events the app itself created, used for overwrite detection (section 12, 14). */
  calendarEvents: CalendarEventRecord[];
  /** Gates the first-launch tutorial; backfilled to true for pre-existing users, see migrate below. */
  hasSeenTutorial: boolean;
  /** Free-plan monthly AI scan count (section: 画像シフト読み取り枠 PRO limit), unused for PRO users. */
  scanUsage: ScanUsage;

  setShiftName: (shiftName: string) => void;
  setDisplayName: (displayName: string) => void;
  setHasSeenTutorial: () => void;
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
  recordScanUsage: () => void;
  recordBonusScan: () => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      calendarEvents: [],
      hasSeenTutorial: false,
      scanUsage: DEFAULT_SCAN_USAGE,

      setHasSeenTutorial: () => set({ hasSeenTutorial: true }),

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

      setDisplayName: (displayName) =>
        set((state) => ({
          user: state.user ? { ...state.user, displayName } : null,
        })),

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

      recordBonusScan: () => set((state) => ({ scanUsage: grantBonusScan(state.scanUsage) })),

      resetAll: () =>
        set({
          user: null,
          calendarEvents: [],
          hasSeenTutorial: false,
          scanUsage: DEFAULT_SCAN_USAGE,
        }),
    }),
    {
      name: 'shift-calendar-ai-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 13,
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
        return state;
      },
    },
  ),
);
