import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, InteractionManager } from 'react-native';

import { prepareAds, type AdRequestState } from '@/utils/prepareAds';

/**
 * Resolves the request options for the first ad slot that actually becomes visible — the point
 * where the ATT prompt is raised (see utils/prepareAds.native.ts). Returns null until then so
 * callers can reserve the slot's height instead of reflowing when the ad pops in.
 *
 * Waits for the hosting screen to be focused AND the app to be `active` with the launch/
 * navigation transition finished: iOS silently skips the ATT dialog when it's requested before
 * the app is active, and ATT can only ever be asked once per install.
 *
 * Assumes the caller sits inside a navigator route (true for all current AdPlaceholder usages);
 * `useIsFocused` would throw inside a bare modal with no navigation context.
 */
export function useAdRequestState(enabled: boolean): AdRequestState | null {
  const isFocused = useIsFocused();
  const [state, setState] = useState<AdRequestState | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || !isFocused || started.current) return;

    let cancelled = false;
    let appStateSub: ReturnType<typeof AppState.addEventListener> | undefined;

    const start = () => {
      started.current = true;
      void prepareAds().then((next) => {
        if (!cancelled) setState(next);
      });
    };

    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      if (AppState.currentState === 'active') {
        start();
        return;
      }
      appStateSub = AppState.addEventListener('change', (next) => {
        if (next !== 'active' || cancelled) return;
        appStateSub?.remove();
        start();
      });
    });

    return () => {
      cancelled = true;
      task.cancel();
      appStateSub?.remove();
    };
  }, [enabled, isFocused]);

  return state;
}
