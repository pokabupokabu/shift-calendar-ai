import { Redirect } from 'expo-router';

/**
 * Never actually reached in normal use - the tab bar intercepts taps on this
 * tab via `tabPress` and pushes `/photo-select` directly (see (tabs)/_layout.tsx).
 * This only guards against a stray deep link landing here.
 */
export default function ScanTabFallback() {
  return <Redirect href="/(tabs)/calendar-view" />;
}
