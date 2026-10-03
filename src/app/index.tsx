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

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;
  if (!hasSeenTutorial) return <Redirect href="/tutorial" />;
  if (!shiftName) return <Redirect href="/name-input" />;
  return <Redirect href="/(tabs)/calendar-view" />;
}
