import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  type CalendarEventRecord,
  DEFAULT_USER_SETTINGS,
  type ShiftType,
  type User,
  type UserSettings,
} from '@/models';

/** Seed values from requirements section 8, editable by the user afterwards. */
const DEFAULT_SHIFT_TYPES: ShiftType[] = [
  { id: 'early', name: '早番', startTime: '09:00', endTime: '18:00' },
  { id: 'late', name: '遅番', startTime: '13:00', endTime: '22:00' },
  { id: 'night', name: '夜勤', startTime: '22:00', endTime: '07:00' },
];

interface AppState {
  user: User | null;
  shiftTypes: ShiftType[];
  /** Events the app itself created, used for overwrite detection (section 12, 14). */
  calendarEvents: CalendarEventRecord[];
  /** Gates the first-launch tutorial; backfilled to true for pre-existing users, see migrate below. */
  hasSeenTutorial: boolean;

  setShiftName: (shiftName: string) => void;
  setDisplayName: (displayName: string) => void;
  setHasSeenTutorial: () => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  upsertShiftType: (shiftType: ShiftType) => void;
  removeShiftType: (id: string) => void;
  recordCalendarEvent: (event: CalendarEventRecord) => void;
  updateCalendarEvent: (id: string, patch: Partial<CalendarEventRecord>) => void;
  removeCalendarEvent: (id: string) => void;
  findCalendarEventForDate: (date: string) => CalendarEventRecord | undefined;
  resetAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      shiftTypes: DEFAULT_SHIFT_TYPES,
      calendarEvents: [],
      hasSeenTutorial: false,

      setHasSeenTutorial: () => set({ hasSeenTutorial: true }),

      setShiftName: (shiftName) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, shiftName }
            : { shiftName, settings: DEFAULT_USER_SETTINGS },
        })),

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

      upsertShiftType: (shiftType) =>
        set((state) => {
          const exists = state.shiftTypes.some((t) => t.id === shiftType.id);
          return {
            shiftTypes: exists
              ? state.shiftTypes.map((t) => (t.id === shiftType.id ? shiftType : t))
              : [...state.shiftTypes, shiftType],
          };
        }),

      removeShiftType: (id) =>
        set((state) => ({ shiftTypes: state.shiftTypes.filter((t) => t.id !== id) })),

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

      resetAll: () =>
        set({
          user: null,
          shiftTypes: DEFAULT_SHIFT_TYPES,
          calendarEvents: [],
          hasSeenTutorial: false,
        }),
    }),
    {
      name: 'shift-calendar-ai-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 7,
      migrate: (persisted, version) => {
        const state = persisted as AppState;
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
          state.shiftTypes = state.shiftTypes.map(({ id, name, startTime, endTime }) => ({
            id,
            name,
            startTime,
            endTime,
          }));
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
                ...DEFAULT_USER_SETTINGS.lateNightPremium,
                ...prev.lateNightPremium,
              },
              earlyMorningPremium: {
                ...DEFAULT_USER_SETTINGS.earlyMorningPremium,
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
        return state;
      },
    },
  ),
);
