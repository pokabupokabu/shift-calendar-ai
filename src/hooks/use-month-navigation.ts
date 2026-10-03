import { addMonths, format, startOfMonth, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useState } from 'react';

/** Shared "prev/next month" state for カレンダービュー and 給与計算. */
export function useMonthNavigation(initialMonth: Date = new Date()) {
  const [month, setMonth] = useState(startOfMonth(initialMonth));

  return {
    month,
    goToPrevMonth: () => setMonth((current) => subMonths(current, 1)),
    goToNextMonth: () => setMonth((current) => addMonths(current, 1)),
    goToToday: () => setMonth(startOfMonth(new Date())),
    label: format(month, 'yyyy年M月', { locale: ja }),
  };
}
