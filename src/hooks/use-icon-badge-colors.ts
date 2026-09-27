import { IconBadgeTones, type IconBadgeTone } from '@/constants/theme';
import { useResolvedColorScheme } from './use-resolved-color-scheme';

/** Resolves a tone name (e.g. "blue") to its {background, icon} pair for the current color scheme. */
export function useIconBadgeColors(tone: IconBadgeTone) {
  const resolved = useResolvedColorScheme();
  return IconBadgeTones[resolved][tone];
}
