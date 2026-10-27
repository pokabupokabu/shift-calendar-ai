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
  slot: 'home' | 'calendar-view' | 'payroll' | 'template' | 'settings' | 'photo-select';
  size?: AdPlaceholderSize;
  style?: StyleProp<ViewStyle>;
}

/**
 * Slots allowed to raise the ATT prompt. Excluded slots still show ads — they just fall back
 * to non-personalized ones. 'photo-select' は含めない: 写真を選んでスキャンしようとしている
 * 最中（チュートリアルのお試しのスキャンも通る）に、トラッキングの許可の確認を割り込ませないため。
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
 *
 * 置き場所（2026-10-27 ユーザー決定。docs/design-system.md 6章）: カレンダー・マイカスタム・給与・設定の
 * 各タブと写真選択の画面で、見出し（写真選択は上のバー）のすぐ下・スクロールする中身の一番上に置き、
 * 画面と一緒に流れる。下の中身とは押し間違えないよう24pt空ける。
 * 要件定義書21節は、写真のアップロード直後・AI解析中・カレンダー登録の直前への広告を
 * 「慎重に設計する」としている（禁止ではない）。写真選択の画面に置くことはユーザーが決めた。
 * 解析中の画面には置かない。登録完了の画面にも置かない（Google の方針で、お礼・終了の画面には
 * 広告を置かないため）。写真を選んだときなどに広告を取り直す作りにはしない（表示回数の水増しに当たる）。
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
    borderWidth: 1,
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
