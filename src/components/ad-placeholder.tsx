import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

export interface AdPlaceholderProps {
  /** Identifies the placement for future ad-SDK wiring/analytics; purely a label today. */
  slot: 'home' | 'calendar-view' | 'payroll' | 'complete' | 'template' | 'settings';
  size?: 'banner' | 'rectangle' | 'inline';
  style?: StyleProp<ViewStyle>;
}

/**
 * Reserved, layout-only ad space (no ad SDK yet). Requirements section 21 forbids ads
 * immediately after photo upload, during AI analysis, or immediately before calendar
 * registration — this component is intentionally only used outside that flow.
 */
export function AdPlaceholder({ size = 'banner', style }: AdPlaceholderProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.base,
        size === 'rectangle' ? styles.rectangle : size === 'inline' ? styles.inline : styles.banner,
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
  banner: {
    height: 56,
  },
  rectangle: {
    height: 250,
  },
  inline: {
    height: 40,
    width: 120,
  },
});
