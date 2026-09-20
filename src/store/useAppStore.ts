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

  setShiftName: (shiftName: string) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  upsertShiftType: (shiftType: ShiftType) => void;
  removeShiftType: (id: string) => void;
  recordCalendarEvent: (event: CalendarEventRecord) => void;
  updateCalendarEvent: (id: string, patch: Partial<CalendarEventRecord>) => void;
  findCalendarEventForDate: (date: string) => CalendarEventRecord | undefined;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      shiftTypes: DEFAULT_SHIFT_TYPES,
      calendarEvents: [],

      setShiftName: (shiftName) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, shiftName }
            : { shiftName, settings: DEFAULT_USER_SETTINGS },
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

      findCalendarEventForDate: (date) => get().calendarEvents.find((e) => e.date === date),
    }),
    {
      name: 'shift-calendar-ai-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
