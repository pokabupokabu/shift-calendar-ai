import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useAdRequestState } from '@/hooks/use-ad-request-state';
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
 * Slots allowed to raise the ATT prompt. 'complete' is excluded on purpose: requirements
 * section 21 forbids disturbing the moment right after a successful calendar registration,
 * and that screen is only ever reached after 'calendar-view' already resolved ATT anyway.
 * Excluded slots still show ads — they just fall back to non-personalized ones.
 */
const ATT_TRIGGER_SLOTS: readonly AdPlaceholderProps['slot'][] = [
  'home',
  'calendar-view',
  'payroll',
];

const NON_PERSONALIZED: { requestNonPersonalizedAdsOnly: boolean } = {
  requestNonPersonalizedAdsOnly: true,
};

/**
 * iOS/Android build: real AdMob banner for 'banner'/'rectangle' slots. Unit IDs are
 * Google's public test IDs (TestIds) — swap for the real AdMob ad unit IDs before
 * submitting to the App Store (see README "7. MVPの最小実装順序" Phase 9).
 * 'inline' slots stay a static placeholder: no standard AdMob banner format is small
 * enough (minimum is 320x50) to fit that 120x40 spot without breaking the layout, so they
 * never load an ad and never trigger ATT.
 * Requirements section 21 forbids ads immediately after photo upload, during AI
 * analysis, or immediately before calendar registration — this component is
 * intentionally only used outside that flow.
 */
export function AdPlaceholder({ slot, size = 'banner', style }: AdPlaceholderProps) {
  const theme = useTheme();
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);

  // Hooks must run unconditionally, so this sits above the isPro/inline early returns.
  const canTriggerAtt = !isPro && size !== 'inline' && ATT_TRIGGER_SLOTS.includes(slot);
  const resolved = useAdRequestState(canTriggerAtt);

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

  // Slots that may raise ATT wait for the answer before mounting BannerAd: changing
  // requestOptions after mount makes the native view re-request, which would bill a second
  // impression for the same slot.
  const requestOptions = canTriggerAtt ? resolved : NON_PERSONALIZED;

  return (
    <View
      style={[styles.adContainer, { minHeight: AD_PLACEHOLDER_DIMENSIONS[size].height }, style]}
    >
      {requestOptions ? (
        <BannerAd
          unitId={TestIds.BANNER}
          size={size === 'rectangle' ? BannerAdSize.MEDIUM_RECTANGLE : BannerAdSize.BANNER}
          requestOptions={requestOptions}
        />
      ) : null}
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
    justifyContent: 'center',
  },
});
