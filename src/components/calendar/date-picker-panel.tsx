import DateTimePicker from '@react-native-community/datetimepicker';
import { addMonths, format, getDaysInMonth, isValid, parseISO, setDate } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** シフトの日付の保存形式（`Shift.date`）。 */
const DATE_FORMAT = 'yyyy-MM-dd';

/** 指で押しやすい最小の大きさ。 */
const MIN_TAP_SIZE = 44;

function parseDate(value: string): Date {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date();
}

/** "2026-10-16" → "10月16日（金）"（グループB2の決定10）。読めない値はそのまま返す。 */
export function formatLongDate(value: string): string {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'M月d日（E）', { locale: ja }) : value;
}

export interface DatePickerPanelProps {
  /** "yyyy-MM-dd"。 */
  value: string;
  onChange: (value: string) => void;
  /** 回す部分の上に出す説明（例「日付を選択」）。 */
  caption: string;
}

/**
 * 日付の札を押したときに、その下に開く日付の選択。`TimePickerPanel` と同じ作り。
 * iPhoneでは標準の回す日付選択。Expo Webではこの部品が動かないため、確認用に
 * 「‹ 年月 ›」と、その月の日の選択肢を並べた簡易版を出す。
 */
export function DatePickerPanel({ value, onChange, caption }: DatePickerPanelProps) {
  const theme = useTheme();
  const colorScheme = useResolvedColorScheme();
  const current = parseDate(value);
  const emit = (date: Date) => onChange(format(date, DATE_FORMAT));

  return (
    <View style={[styles.panel, { backgroundColor: theme.fill, borderColor: theme.border }]}>
      <ThemedText type="footnote" themeColor="textSecondary" style={styles.caption}>
        {caption}
      </ThemedText>

      {Platform.OS === 'web' ? (
        <View style={styles.webPicker}>
          <View style={styles.webMonthRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="前の月"
              onPress={() => emit(addMonths(current, -1))}
              style={styles.webMonthButton}
            >
              <ChevronLeft size={IconSize.small} color={theme.primary} />
            </Pressable>
            <ThemedText type="subheadline" style={styles.webMonthLabel}>
              {format(current, 'yyyy年M月')}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="次の月"
              onPress={() => emit(addMonths(current, 1))}
              style={styles.webMonthButton}
            >
              <ChevronRight size={IconSize.small} color={theme.primary} />
            </Pressable>
          </View>
          <View style={styles.webOptions}>
            {Array.from({ length: getDaysInMonth(current) }, (_, index) => index + 1).map((day) => {
              const selected = day === current.getDate();
              return (
                <Pressable
                  key={day}
                  onPress={() => emit(setDate(current, day))}
                  style={[
                    styles.webOption,
                    { backgroundColor: selected ? theme.primary : theme.backgroundElement },
                  ]}
                >
                  <ThemedText
                    type="footnote"
                    style={{ color: selected ? theme.onPrimary : theme.text }}
                  >
                    {day}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <DateTimePicker
          mode="date"
          display="spinner"
          locale="ja-JP"
          themeVariant={colorScheme}
          textColor={theme.text}
          value={current}
          onValueChange={(_event, date) => emit(date)}
          style={styles.nativePicker}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: Radius.smallLarge,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
  },
  caption: {
    textAlign: 'center',
  },
  nativePicker: {
    alignSelf: 'stretch',
  },
  webPicker: {
    gap: Spacing.one,
  },
  webMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMonthButton: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMonthLabel: {
    fontWeight: '600',
  },
  webOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  webOption: {
    minWidth: 36,
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.small,
  },
});
