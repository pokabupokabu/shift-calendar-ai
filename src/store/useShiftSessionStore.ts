import { create } from 'zustand';

import type { Shift, ShiftAnalysisResult } from '@/models';

import type { AiTier, ShiftImage } from '@/services/ai';
import { deleteShiftImageFiles } from '@/utils/deleteShiftImageFiles';

/**
 * Transient, in-memory state for one "撮る → 解析 → 確認 → 登録" run (section 3).
 * Deliberately not persisted: a half-finished upload has no value across app restarts.
 */
interface ShiftSessionState {
  images: ShiftImage[];
  /** Which workplace this scan run is for, chosen on 写真選択 (defaults to the active workplace there). */
  scanWorkplaceId: string;
  /**
   * どの精度で読むか。写真選択で「高度なスキャンで読む」を選んだとき、または結果の画面から
   * 「高度なスキャンで読み直す」を押したときに 'advanced' になる。本人確認の画面での再照合も同じ精度で読む。
   */
  scanTier: AiTier;
  /** 解析画面が「もう一度解析する」合図。同じ画像のまま読み直すたびに1つ増やす。 */
  analysisRunId: number;
  analysisResult: ShiftAnalysisResult | null;
  analysisError: string | null;
  /**
   * 今の失敗（analysisError）を回数に数えなかったか。AIまで届かなかった失敗（AnalysisNotPerformedError）と、
   * チュートリアルのお試し中の失敗が true。失敗の画面で「今回の分は回数を使っていないので、…」を出すかに使う。
   */
  analysisErrorNotCounted: boolean;
  shifts: Shift[];
  /** Soft-deleted shift ids (section: 登録内容の確認 - "消す"+"元に戻す" instead of a select-to-include list). */
  removedShiftIds: string[];

  setImages: (images: ShiftImage[]) => void;
  setScanWorkplaceId: (workplaceId: string) => void;
  setScanTier: (tier: AiTier) => void;
  /**
   * 同じ画像を別の精度で読み直す準備をする（前の結果・エラー・修正内容は捨てる）。
   * このあと解析画面（/analyzing）を開くか、開いている解析画面がそのまま読み直す。
   */
  startRescan: (tier: AiTier) => void;
  setAnalysisResult: (result: ShiftAnalysisResult, workplaceId: string) => void;
  setAnalysisError: (message: string, options?: { notCounted?: boolean }) => void;
  updateShift: (id: string, patch: Partial<Shift>) => void;
  addShift: (
    input: Pick<Shift, 'date' | 'startTime' | 'endTime' | 'shiftType' | 'isOvernight' | 'isAllDay'>,
    workplaceId: string,
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

export const useShiftSessionStore = create<ShiftSessionState>((set, get) => ({
  images: [],
  scanWorkplaceId: '',
  scanTier: 'standard',
  analysisRunId: 0,
  analysisResult: null,
  analysisError: null,
  analysisErrorNotCounted: false,
  shifts: [],
  removedShiftIds: [],

  setImages: (images) => {
    // The previous run's photos stop being referenced here, so drop their cache files
    // before they are replaced (see deleteShiftImageFiles for why this matters).
    deleteShiftImageFiles(get().images);
    set({
      images,
      analysisResult: null,
      analysisError: null,
      analysisErrorNotCounted: false,
      shifts: [],
      removedShiftIds: [],
    });
  },

  setScanWorkplaceId: (workplaceId) => set({ scanWorkplaceId: workplaceId }),

  setScanTier: (tier) => set({ scanTier: tier }),

  startRescan: (tier) =>
    set((state) => ({
      scanTier: tier,
      analysisRunId: state.analysisRunId + 1,
      analysisResult: null,
      analysisError: null,
      analysisErrorNotCounted: false,
      shifts: [],
      removedShiftIds: [],
    })),

  setAnalysisResult: (result, workplaceId) =>
    set({
      analysisResult: result,
      analysisError: null,
      analysisErrorNotCounted: false,
      removedShiftIds: [],
      shifts: result.shifts.map((raw) => ({
        id: createLocalShiftId(),
        workplaceId,
        date: raw.date,
        startTime: raw.startTime,
        endTime: raw.endTime,
        shiftType: raw.shiftType,
        isOvernight: raw.isOvernight,
        isAllDay: raw.isAllDay ?? false,
        confidence: raw.confidence,
        source: 'ai_extracted' as const,
      })),
    }),

  setAnalysisError: (message, options) =>
    set({
      analysisError: message,
      analysisErrorNotCounted: options?.notCounted ?? false,
      analysisResult: null,
    }),

  updateShift: (id, patch) =>
    set((state) => ({
      shifts: state.shifts.map((shift) =>
        shift.id === id ? { ...shift, ...patch, source: 'manual' as const } : shift,
      ),
    })),

  addShift: (input, workplaceId) =>
    set((state) => ({
      shifts: [
        ...state.shifts,
        {
          id: createLocalShiftId(),
          workplaceId,
          ...input,
          confidence: 1,
          source: 'manual' as const,
        },
      ],
    })),

  removeShift: (id) => set((state) => ({ removedShiftIds: [...state.removedShiftIds, id] })),

  restoreAllShifts: () => set({ removedShiftIds: [] }),

  reset: () => {
    deleteShiftImageFiles(get().images);
    set({
      images: [],
      scanWorkplaceId: '',
      scanTier: 'standard',
      analysisResult: null,
      analysisError: null,
      analysisErrorNotCounted: false,
      shifts: [],
      removedShiftIds: [],
    });
  },
}));
