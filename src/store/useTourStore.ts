import { create } from 'zustand';

/**
 * チュートリアルの「やってみる」で始まる案内付き操作の手順。
 * 画面ごとに対応する手順が決まっていて、各画面が開いたときに自分の手順へ進める。
 */
export type TourStep =
  | 'tabMyCustom'
  | 'keywordRow'
  | 'keywordDialog'
  | 'tabScan'
  | 'pickPhoto'
  | 'analyze'
  | 'analyzing'
  | 'analyzeFailed'
  | 'userMatch'
  | 'confirm'
  | 'done';

export type TourTargetId =
  | 'tab-mycustom'
  | 'keyword-row'
  | 'tab-scan'
  | 'photo-buttons'
  | 'analyze-button'
  | 'register-button';

export interface TourRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourState {
  /** 案内中かどうか。アプリを終了したら案内も終わる（保存しない）。 */
  step: TourStep | null;
  targets: Partial<Record<TourTargetId, TourRect>>;
  start: () => void;
  /** 案内中のときだけ手順を進める（案内していないときに呼んでも何もしない）。 */
  goTo: (step: TourStep) => void;
  end: () => void;
  setTarget: (id: TourTargetId, rect: TourRect) => void;
  clearTarget: (id: TourTargetId) => void;
}

export const useTourStore = create<TourState>()((set) => ({
  step: null,
  targets: {},
  start: () => set({ step: 'tabMyCustom', targets: {} }),
  goTo: (step) => set((state) => (state.step ? { step } : {})),
  end: () => set({ step: null, targets: {} }),
  clearTarget: (id) =>
    set((state) => {
      if (!state.targets[id]) return {};
      const targets = { ...state.targets };
      delete targets[id];
      return { targets };
    }),
  setTarget: (id, rect) =>
    set((state) => {
      const prev = state.targets[id];
      if (
        prev &&
        prev.x === rect.x &&
        prev.y === rect.y &&
        prev.width === rect.width &&
        prev.height === rect.height
      ) {
        return {};
      }
      return { targets: { ...state.targets, [id]: rect } };
    }),
}));
