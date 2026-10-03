import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
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
 * iOS/Android build: real AdMob banner for 'banner'/'rectangle' slots. Unit IDs are
 * Google's public test IDs (TestIds) — swap for the real AdMob ad unit IDs before
 * submitting to the App Store (see README "7. MVPの最小実装順序" Phase 9).
 * 'inline' slots stay a static placeholder: no standard AdMob banner format is small
 * enough (minimum is 320x50) to fit that 120x40 spot without breaking the layout.
 * Requirements section 21 forbids ads immediately after photo upload, during AI
 * analysis, or immediately before calendar registration — this component is
 * intentionally only used outside that flow.
 */
export function AdPlaceholder({ size = 'banner', style }: AdPlaceholderProps) {
  const theme = useTheme();
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);

  if (isPro) return null;

  if (size === 'inline') {
    return (
      <View
        style={[
          styles.base,
          AD_PLACEHOLDER_DIMENSIONS.inline,
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

  return (
    <View style={[styles.adContainer, style]}>
      <BannerAd
        unitId={TestIds.BANNER}
        size={size === 'rectangle' ? BannerAdSize.MEDIUM_RECTANGLE : BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
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
  adContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
