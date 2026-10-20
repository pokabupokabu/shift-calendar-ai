import { CalendarDays, Layers } from 'lucide-react-native';

import { IconBadge } from '@/components/icon-badge';
import type { IconBadgeTone } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import type { CalendarProviderId } from '@/models';

/** 行の先頭の絵の大きさ（マイカスタムの他の行と同じ）。 */
const ICON_SIZE = 20;

/**
 * 連携カレンダーの行の先頭の絵。
 * - Apple: オリジナルのカレンダーの絵（灰色の丸）。Appleのアイコンは商標の決まりで使えない。
 * - Google: TODO（docs/ui-review/group-a.md サブグループ④の決定5）: Googleカレンダーの正式な
 *   アイコン画像に差し替える（色を変えず・切り取らず・丸い地を付けずにそのまま置く）。
 *   画像の入手方法と利用条件をユーザーと確認するまでは、今の青い丸のカレンダーの絵のまま。
 *   差し替えるときはこの `google` の分岐だけを変えればよい。
 */
const PROVIDER_TONE: Record<CalendarProviderId, IconBadgeTone> = {
  apple: 'neutral',
  google: 'blue',
};

export function CalendarProviderIcon({ provider }: { provider: CalendarProviderId }) {
  const tone = PROVIDER_TONE[provider];
  const colors = useIconBadgeColors(tone);
  return (
    <IconBadge tone={tone}>
      <CalendarDays size={ICON_SIZE} color={colors.icon} />
    </IconBadge>
  );
}

/** 「その他カレンダーとの連携」の行の絵（複数のカレンダーを表す重なった絵・灰色の丸）。 */
export function OtherCalendarsIcon() {
  const colors = useIconBadgeColors('neutral');
  return (
    <IconBadge tone="neutral">
      <Layers size={ICON_SIZE} color={colors.icon} />
    </IconBadge>
  );
}
