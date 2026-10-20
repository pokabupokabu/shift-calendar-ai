import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Workplace } from '@/models';

/** タブに出す勤務先の名前の文字数。7文字以上は先頭6文字＋「…」（入力の文字数は制限しない）。 */
const TAB_NAME_MAX_CHARS = 6;
/** 指で押しやすい最小の高さ。 */
const MIN_TAP_HEIGHT = 44;

/** 勤務先の名前をタブ用に詰める。絵文字などの2文字分の文字でも途中で切れないよう、1文字ずつ数える。 */
export function formatWorkplaceTabName(name: string): string {
  const chars = Array.from(name);
  return chars.length > TAB_NAME_MAX_CHARS
    ? `${chars.slice(0, TAB_NAME_MAX_CHARS).join('')}…`
    : name;
}

export interface WorkplaceTabsProps {
  workplaces: Workplace[];
  activeWorkplaceId: string | undefined;
  onSelect: (id: string) => void;
  onLongPress: (workplace: Workplace) => void;
  /** 「＋ 追加」を出すか（勤務先が上限の3つのときは出さない）。 */
  showAddButton: boolean;
  /** 無料のとき、「＋ 追加」の横に金の「PRO」札を出す。 */
  showProTag: boolean;
  onPressAdd: () => void;
}

/**
 * マイカスタムの勤務先のタブ（サブグループ④の決定A）。
 * iPhone SE（使える幅327pt）で、タブ3つ、またはタブ2つ＋「＋ 追加」(＋PRO札)が1行に収まるよう、
 * 文字は13pt・名前は先頭6文字まで・左右の余白12pt・間隔4pt。それでも幅が足りないとき
 * （全角6文字の名前が3つ並ぶなど）は、タブの側が縮んで名前をさらに「…」で詰める（「＋ 追加」は縮めない）。
 */
export function WorkplaceTabs({
  workplaces,
  activeWorkplaceId,
  onSelect,
  onLongPress,
  showAddButton,
  showProTag,
  onPressAdd,
}: WorkplaceTabsProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {workplaces.map((workplace) => {
        const isActive = workplace.id === activeWorkplaceId;
        return (
          <Pressable
            key={workplace.id}
            onPress={() => onSelect(workplace.id)}
            onLongPress={() => onLongPress(workplace)}
            accessibilityRole="tab"
            accessibilityLabel={workplace.name}
            accessibilityState={{ selected: isActive }}
            style={[
              styles.tab,
              isActive && [
                styles.tabSelected,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ],
            ]}
          >
            <ThemedText
              type="footnote"
              numberOfLines={1}
              style={[styles.tabLabel, { fontWeight: isActive ? '700' : '500' }]}
            >
              {formatWorkplaceTabName(workplace.name)}
            </ThemedText>
          </Pressable>
        );
      })}

      {showAddButton && (
        <Pressable
          onPress={onPressAdd}
          accessibilityRole="button"
          accessibilityLabel={showProTag ? '勤務先を追加（PRO）' : '勤務先を追加'}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Plus size={IconSize.small} color={theme.primary} />
          <ThemedText type="footnote" themeColor="primary" style={styles.addLabel}>
            追加
          </ThemedText>
          {showProTag && (
            <View style={[styles.proTag, { backgroundColor: theme.gold }]}>
              <ThemedText type="caption2" style={[styles.proTagLabel, { color: theme.onGold }]}>
                PRO
              </ThemedText>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tab: {
    flexShrink: 1,
    minWidth: 0,
    minHeight: MIN_TAP_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two + Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabLabel: {
    textAlign: 'center',
  },
  addButton: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    minHeight: MIN_TAP_HEIGHT,
    paddingHorizontal: Spacing.two + Spacing.one,
    borderRadius: Radius.pill,
  },
  addLabel: {
    fontWeight: '600',
  },
  proTag: {
    marginLeft: Spacing.one,
    paddingHorizontal: Spacing.one + Spacing.half,
    paddingVertical: Spacing.half,
    borderRadius: Radius.small,
  },
  proTagLabel: {
    fontWeight: '700',
  },
});
