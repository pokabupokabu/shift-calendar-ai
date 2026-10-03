import { useAppStore } from '@/store/useAppStore';

/** The user's 設定 > 外観 choice (light/dark only; there is no "system" option). */
export function useResolvedColorScheme(): 'light' | 'dark' {
  const override = useAppStore((state) => state.user?.settings.themeOverride ?? 'light');
  return override === 'dark' ? 'dark' : 'light';
}
