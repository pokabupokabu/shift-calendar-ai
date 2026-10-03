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
