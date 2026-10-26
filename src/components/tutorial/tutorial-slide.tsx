import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';

/** スクリーンショットの元画像のサイズ（docs/tutorial-screenshots.md の手順で 726x1300 に切り出している）。 */
const SCREEN_ASPECT_RATIO = 726 / 1300;

export interface TutorialSlideProps {
  title: string;
  description: string;
  /** 上半分に出す絵。アプリアイコンを大きく出すか、スマホの枠に画面を入れて出すか。 */
  visual: { kind: 'appIcon' } | { kind: 'screen'; source: ImageSource };
  /** スマホの枠の上に重ねて出す飾り（5枚目のカレンダーなど）。 */
  overlay?: React.ReactNode;
}

/**
 * チュートリアル1枚分。上半分に絵、下半分に見出しと説明を出す。
 * 上半分の薄い青の地は画面のいちばん上（状態バーの下）まで塗り、絵は上の安全領域の分だけ下げる。
 */
export function TutorialSlide({ title, description, visual, overlay }: TutorialSlideProps) {
  const theme = useTheme();
  const panel = useIconBadgeColors('blue');
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.panel, { backgroundColor: panel.background, paddingTop: insets.top }]}>
        {visual.kind === 'appIcon' ? (
          <View style={styles.iconWrap}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.appIcon}
              contentFit="cover"
            />
          </View>
        ) : (
          <View style={[styles.phoneArea, { top: Spacing.five + insets.top }]}>
            <View style={[styles.phone, { borderColor: theme.text }]}>
              <Image source={visual.source} style={styles.screen} contentFit="cover" />
            </View>
            {overlay}
          </View>
        )}
      </View>

      <View style={styles.textBlock}>
        <ThemedText type="title2" style={styles.centerText}>
          {title}
        </ThemedText>
        <ThemedText type="subheadline" themeColor="textSecondary" style={styles.centerText}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  panel: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    borderRadius: 36,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  appIcon: {
    width: 152,
    height: 152,
    borderRadius: 36,
  },
  phoneArea: {
    // 枠の下側はパネルの外へはみ出させて切る（参考にした画面と同じ見せ方）
    position: 'absolute',
    width: '72%',
  },
  phone: {
    width: '100%',
    aspectRatio: SCREEN_ASPECT_RATIO,
    borderWidth: 6,
    borderRadius: 36,
    overflow: 'hidden',
  },
  screen: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  centerText: {
    textAlign: 'center',
  },
});
