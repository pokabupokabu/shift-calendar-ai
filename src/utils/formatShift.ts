import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

/** "2026-09-20" -> "9/20（日）" (requirements section 9 display format). */
export function formatShiftDate(date: string): string {
  return format(parseISO(date), 'M/d（E）', { locale: ja });
}

/** 時刻が読み取れなかったシフトの表示。カレンダーには終日イベントとして登録される。 */
export const ALL_DAY_LABEL = '終日';

export function formatShiftTimeRange(
  startTime: string,
  endTime: string,
  isOvernight: boolean,
  isAllDay?: boolean,
): string {
  if (isAllDay) return ALL_DAY_LABEL;
  return isOvernight ? `${startTime}〜翌${endTime}` : `${startTime}〜${endTime}`;
}
