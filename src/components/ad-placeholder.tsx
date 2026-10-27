import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';

import { AD_PLACEHOLDER_DIMENSIONS, type AdPlaceholderSize } from './ad-placeholder-sizes';
import { ThemedText } from './themed-text';

export interface AdPlaceholderProps {
  /** Identifies the placement for analytics; purely a label today. */
  slot: 'home' | 'calendar-view' | 'payroll' | 'template' | 'settings' | 'photo-select';
  size?: AdPlaceholderSize;
  style?: StyleProp<ViewStyle>;
}

/**
 * Web build: react-native-google-mobile-ads has no web implementation, so this stays a
 * reserved, layout-only placeholder (see ad-placeholder.native.tsx for the real ad on
 * iOS/Android). 置き場所の決まり（全画面で見出しのすぐ下・写真選択にも・登録完了には置かない）は
 * ad-placeholder.native.tsx と docs/design-system.md 6章を参照。
 */
export function AdPlaceholder({ size = 'banner', style }: AdPlaceholderProps) {
  const theme = useTheme();
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);

  if (isPro) return null;

  return (
    <View
      style={[
        styles.base,
        AD_PLACEHOLDER_DIMENSIONS[size],
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
      ]}
    >
      <ThemedText themeColor="textSecondary" type="footnote">
        広告
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
