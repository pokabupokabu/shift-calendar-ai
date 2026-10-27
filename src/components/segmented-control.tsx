import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

/** ダークモードで選んでいる側の地。iOS標準の切り替え（UISegmentedControl）と同じ明るめの灰色。 */
const DARK_SELECTED_BACKGROUND = '#636366';

export interface SegmentedOption<T extends string | boolean> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | boolean> {
  options: readonly SegmentedOption<T>[];
  /** 今選んでいる値。未選択なら undefined（どれも白くならない）。 */
  value: T | undefined;
  onChange: (value: T) => void;
  /**
   * - `compact`: 設定タブの「外観」の行の右に置く小さな切り替え（今までの見た目のまま）
   * - `regular`: 画面の幅いっぱいに置く2択（扶養の壁の画面の年齢）。押せる高さは44pt
   */
  size?: 'compact' | 'regular';
  /** 読み上げ用のまとまりの名前（例「年齢」）。 */
  accessibilityLabel?: string;
}

/**
 * 灰色の溝の中で、選んだ側だけが白く浮く2〜3択の切り替え（docs/ui-review/group-d.md D1）。
 * 設定タブの「外観」と扶養の壁の画面で共通に使う。
 */
export function SegmentedControl<T extends string | boolean>({
  options,
  value,
  onChange,
  size = 'regular',
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const colorScheme = useResolvedColorScheme();
  const isCompact = size === 'compact';
  // ダークでは、どちらの大きさも選んだ側を明るい灰色にする（Stitchの案。外観の切り替えも揃える
  // 2026-10-20 ユーザー決定）。ライトは白（backgroundElement）。
  const selectedBackground =
    colorScheme === 'dark' ? DARK_SELECTED_BACKGROUND : theme.backgroundElement;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        isCompact ? styles.compactTrack : styles.regularTrack,
        { backgroundColor: theme.backgroundSelected },
      ]}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            // 押せる範囲を44pt以上にする。見た目の高さ（外観は約28pt、幅いっぱいの2択は40pt＋溝の余白）は
            // 変えずに、押せる範囲だけ上下に広げる
            hitSlop={isCompact ? { top: 8, bottom: 8 } : { top: 2, bottom: 2 }}
            style={[
              isCompact ? styles.compactChoice : styles.regularChoice,
              selected && [styles.choiceSelected, { backgroundColor: selectedBackground }],
            ]}
          >
            <ThemedText
              type={isCompact ? 'caption1' : 'subheadline'}
              numberOfLines={1}
              style={[
                {
                  color: selected ? theme.text : theme.textSecondary,
                  fontWeight: selected ? '600' : '500',
                },
              ]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  compactTrack: {
    flexDirection: 'row',
    borderRadius: Radius.small,
    padding: 2,
  },
  compactChoice: {
    paddingHorizontal: 12,
    paddingVertical: Spacing.one,
    borderRadius: 6,
  },
  regularTrack: {
    flexDirection: 'row',
    borderRadius: Radius.small,
    padding: 2,
    gap: 2,
  },
  regularChoice: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: 6,
  },
  choiceSelected: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
});
