import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

/** "2026-09-20" -> "9/20（日）" (requirements section 9 display format). */
export function formatShiftDate(date: string): string {
  return format(parseISO(date), 'M/d（E）', { locale: ja });
}

export function formatShiftTimeRange(
  startTime: string,
  endTime: string,
  isOvernight: boolean,
): string {
  return isOvernight ? `${startTime}〜翌${endTime}` : `${startTime}〜${endTime}`;
}
