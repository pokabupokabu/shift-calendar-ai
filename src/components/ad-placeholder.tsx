import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';

import { AD_PLACEHOLDER_DIMENSIONS, type AdPlaceholderSize } from './ad-placeholder-sizes';
import { ThemedText } from './themed-text';

export interface AdPlaceholderProps {
  /** Identifies the placement for analytics; purely a label today. */
  slot: 'home' | 'calendar-view' | 'payroll' | 'complete' | 'template' | 'settings';
  size?: AdPlaceholderSize;
  style?: StyleProp<ViewStyle>;
}

/**
 * Web build: react-native-google-mobile-ads has no web implementation, so this stays a
 * reserved, layout-only placeholder (see ad-placeholder.native.tsx for the real ad on
 * iOS/Android). Requirements section 21 forbids ads immediately after photo upload, during
 * AI analysis, or immediately before calendar registration — this component is
 * intentionally only used outside that flow.
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
        { backgroundColor: theme.backgroundElement },
        style,
      ]}
    >
      <ThemedText themeColor="textSecondary" type="small">
        広告
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
