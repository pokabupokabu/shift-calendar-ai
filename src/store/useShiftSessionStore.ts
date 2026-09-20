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

  setImages: (images: ShiftImage[]) => void;
  setAnalysisResult: (result: ShiftAnalysisResult) => void;
  setAnalysisError: (message: string) => void;
  updateShift: (id: string, patch: Partial<Shift>) => void;
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

  setImages: (images) => set({ images, analysisResult: null, analysisError: null, shifts: [] }),

  setAnalysisResult: (result) =>
    set({
      analysisResult: result,
      analysisError: null,
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

  reset: () => set({ images: [], analysisResult: null, analysisError: null, shifts: [] }),
}));
