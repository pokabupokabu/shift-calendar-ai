import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { type TourStep, useTourStore } from '@/store/useTourStore';

/** 案内中なら、この画面が開いたときに指定の手順へ進める（案内していなければ何もしない）。 */
export function useTourStepOnFocus(step: TourStep | (() => TourStep | null)) {
  useFocusEffect(
    useCallback(() => {
      const next = typeof step === 'function' ? step() : step;
      if (next) useTourStore.getState().goTo(next);
    }, [step]),
  );
}
