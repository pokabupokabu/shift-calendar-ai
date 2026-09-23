import { create } from 'zustand';

import type { Shift, ShiftAnalysisResult } from '@/models';

import type { ShiftImage } from '@/services/ai';

/**
 * Transient, in-memory state for one "撮る → 解析 → 確認 → 登録" run (section 3).
 * Deliberately not persisted: a half-finished upload has no value across app restarts.
 */
interface ShiftSessionState {
  images: ShiftImage[];
  analysisResult: ShiftAnalysisResult | null;
  analysisError: string | null;
  shifts: Shift[];
  /** Soft-deleted shift ids (section: 登録内容の確認 - "消す"+"元に戻す" instead of a select-to-include list). */
  removedShiftIds: string[];

  setImages: (images: ShiftImage[]) => void;
  setAnalysisResult: (result: ShiftAnalysisResult) => void;
  setAnalysisError: (message: string) => void;
  updateShift: (id: string, patch: Partial<Shift>) => void;
  addShift: (
    input: Pick<Shift, 'date' | 'startTime' | 'endTime' | 'shiftType' | 'isOvernight'>,
  ) => void;
  removeShift: (id: string) => void;
  restoreAllShifts: () => void;
  reset: () => void;
}

let nextLocalId = 0;
export function createLocalShiftId(): string {
  nextLocalId += 1;
  return `local-${Date.now()}-${nextLocalId}`;
}

export const useShiftSessionStore = create<ShiftSessionState>((set) => ({
  images: [],
  analysisResult: null,
  analysisError: null,
  shifts: [],
  removedShiftIds: [],

  setImages: (images) =>
    set({ images, analysisResult: null, analysisError: null, shifts: [], removedShiftIds: [] }),

  setAnalysisResult: (result) =>
    set({
      analysisResult: result,
      analysisError: null,
      removedShiftIds: [],
      shifts: result.shifts.map((raw) => ({
        id: createLocalShiftId(),
        date: raw.date,
        startTime: raw.startTime,
        endTime: raw.endTime,
        shiftType: raw.shiftType,
        isOvernight: raw.isOvernight,
        confidence: raw.confidence,
        source: 'ai_extracted' as const,
      })),
    }),

  setAnalysisError: (message) => set({ analysisError: message, analysisResult: null }),

  updateShift: (id, patch) =>
    set((state) => ({
      shifts: state.shifts.map((shift) =>
        shift.id === id ? { ...shift, ...patch, source: 'manual' as const } : shift,
      ),
    })),

  addShift: (input) =>
    set((state) => ({
      shifts: [
        ...state.shifts,
        {
          id: createLocalShiftId(),
          ...input,
          confidence: 1,
          source: 'manual' as const,
        },
      ],
    })),

  removeShift: (id) => set((state) => ({ removedShiftIds: [...state.removedShiftIds, id] })),

  restoreAllShifts: () => set({ removedShiftIds: [] }),

  reset: () =>
    set({ images: [], analysisResult: null, analysisError: null, shifts: [], removedShiftIds: [] }),
}));
