import {
  Briefcase,
  Clock,
  Coffee,
  Home,
  MoonStar,
  Star,
  Sun,
  Sunset,
  Umbrella,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import type { IconBadgeTone } from '@/constants/theme';

/** シフト種別カードのアイコン選択肢。`key`をShiftType.iconに保存し、未設定分はindexで循環表示する。 */
export const SHIFT_TYPE_ICON_PRESETS: { key: string; Icon: LucideIcon; tone: IconBadgeTone }[] = [
  { key: 'sun', Icon: Sun, tone: 'orange' },
  { key: 'sunset', Icon: Sunset, tone: 'purple' },
  { key: 'moon-star', Icon: MoonStar, tone: 'blue' },
  { key: 'coffee', Icon: Coffee, tone: 'green' },
  { key: 'briefcase', Icon: Briefcase, tone: 'red' },
  { key: 'star', Icon: Star, tone: 'neutral' },
  { key: 'umbrella', Icon: Umbrella, tone: 'orange' },
  { key: 'zap', Icon: Zap, tone: 'purple' },
  { key: 'home', Icon: Home, tone: 'blue' },
  { key: 'clock', Icon: Clock, tone: 'green' },
];

export type ShiftTypeIconPreset = (typeof SHIFT_TYPE_ICON_PRESETS)[number];

/**
 * シフト種別のアイコンと色を決める唯一の規則（マイカスタム・カレンダーの月表示/リストで共通）。
 * `icon` が設定されていればそのプリセット。未設定（基本3種など）や不明なキーは、勤務先の
 * シフト種別の並び順（`index`）でプリセットを循環させた既定値（早番＝太陽・オレンジ、
 * 遅番＝夕日・紫、夜勤＝月・青 …）。
 */
export function resolveShiftTypePreset(
  icon: string | undefined,
  index: number,
): ShiftTypeIconPreset {
  const fallbackPreset = SHIFT_TYPE_ICON_PRESETS[index % SHIFT_TYPE_ICON_PRESETS.length];
  if (!icon) return fallbackPreset;
  return SHIFT_TYPE_ICON_PRESETS.find((preset) => preset.key === icon) ?? fallbackPreset;
}
