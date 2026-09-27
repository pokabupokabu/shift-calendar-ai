import { useAppStore } from '@/store/useAppStore';
import { useColorScheme } from './use-color-scheme';

/** System color scheme, overridden by the user's 設定 > 外観 choice when it isn't "system". */
export function useResolvedColorScheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const override = useAppStore((state) => state.user?.settings.themeOverride ?? 'system');
  const resolved = override === 'system' ? systemScheme : override;
  return resolved === 'dark' ? 'dark' : 'light';
}
