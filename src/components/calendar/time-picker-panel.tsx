import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { isValidTimeString } from '@/utils/shiftTime';

/** 時刻を選ぶ刻み（分）。iPhone標準の回す時刻選択の `minuteInterval` と、Web版の選択肢の両方に使う。 */
const MINUTE_STEP = 15;
/** 値が空（終日シフトなど）のとき、回す部分を最初に合わせておく時刻。値そのものは回すまで変えない。 */
const DEFAULT_PICKER_TIME = '09:00';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, index) => index * MINUTE_STEP);

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toTimeString(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

function parseTime(value: string): { hour: number; minute: number } {
  const [hour, minute] = (isValidTimeString(value) ? value : DEFAULT_PICKER_TIME)
    .split(':')
    .map(Number);
  return { hour, minute };
}

export interface TimePickerPanelProps {
  /** "HH:mm"。空文字（終日シフト）も受け付ける。 */
  value: string;
  onChange: (value: string) => void;
  /** 回す部分の上に出す説明（例「開始時刻を選択（15分刻み）」）。 */
  caption: string;
}

/**
 * 時刻の欄を押したときに、その下に開く時刻選択。
 * iPhoneでは標準の回す時刻選択（15分刻み）。Expo Webではこの部品が動かないため、確認用に
 * 「時」と「分（15分刻み）」の選択肢を並べた簡易版を出す。
 * 15分刻みでない元の値（例 17:10）は、回して選び直すまで `onChange` を呼ばないのでそのまま残る。
 */
export function TimePickerPanel({ value, onChange, caption }: TimePickerPanelProps) {
  const theme = useTheme();
  const colorScheme = useResolvedColorScheme();
  const { hour, minute } = parseTime(value);

  return (
    <View style={[styles.panel, { backgroundColor: theme.fill, borderColor: theme.border }]}>
      <ThemedText type="footnote" themeColor="textSecondary" style={styles.caption}>
        {caption}
      </ThemedText>

      {Platform.OS === 'web' ? (
        <View style={styles.webPicker}>
          <ThemedText type="caption1" themeColor="textSecondary">
            時
          </ThemedText>
          <View style={styles.webOptions}>
            {HOURS.map((optionHour) => (
              <WebOption
                key={optionHour}
                label={pad2(optionHour)}
                selected={optionHour === hour}
                onPress={() => onChange(toTimeString(optionHour, minute))}
              />
            ))}
          </View>
          <ThemedText type="caption1" themeColor="textSecondary">
            分
          </ThemedText>
          <View style={styles.webOptions}>
            {MINUTES.map((optionMinute) => (
              <WebOption
                key={optionMinute}
                label={pad2(optionMinute)}
                selected={optionMinute === minute}
                onPress={() => onChange(toTimeString(hour, optionMinute))}
              />
            ))}
          </View>
        </View>
      ) : (
        <DateTimePicker
          mode="time"
          display="spinner"
          minuteInterval={MINUTE_STEP}
          locale="ja-JP"
          is24Hour
          themeVariant={colorScheme}
          textColor={theme.text}
          value={new Date(2000, 0, 1, hour, minute)}
          onValueChange={(_event, date) =>
            onChange(toTimeString(date.getHours(), date.getMinutes()))
          }
          style={styles.nativePicker}
        />
      )}
    </View>
  );
}

function WebOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.webOption,
        { backgroundColor: selected ? theme.primary : theme.backgroundElement },
      ]}
    >
      <ThemedText type="footnote" style={{ color: selected ? theme.onPrimary : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
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
