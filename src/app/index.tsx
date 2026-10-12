import * as SplashScreen from 'expo-splash-screen';
import { Redirect } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';

import { useAppStore } from '@/store/useAppStore';

/**
 * Pure routing gate, no UI (requirements section 3/4). Waits for zustand's
 * persist middleware to finish hydrating from AsyncStorage before deciding
 * where to send the user - deciding earlier would risk a flash-redirect to
 * the tutorial for returning users whose data hasn't loaded yet.
 */
export default function IndexGate() {
  const hydrated = useSyncExternalStore(
    (onChange) => useAppStore.persist.onFinishHydration(onChange),
    () => useAppStore.persist.hasHydrated(),
  );
  const hasSeenTutorial = useAppStore((state) => state.hasSeenTutorial);
  const shiftName = useAppStore((state) => state.user?.shiftName);
  // 「シフト表に名前が載っていない」を選んだ人は shiftName が空のままなので、
  // 名前の有無だけで判定すると名前入力画面から出られなくなる。
  const shiftTableHasNoNames = useAppStore((state) => state.user?.shiftTableHasNoNames);

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;
  if (!hasSeenTutorial) return <Redirect href="/tutorial" />;
  if (!shiftName && !shiftTableHasNoNames) return <Redirect href="/name-input" />;
  return <Redirect href="/(tabs)/calendar-view" />;
}
