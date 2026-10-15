import { router } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HakobuMascot } from '@/components/hakobu-mascot';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import { useTourStore } from '@/store/useTourStore';

import { TOUR_STEPS } from './tour-steps';

const HOLE_PADDING = 6;
const DIM = 'rgba(0,0,0,0.55)';
const HIGHLIGHT = '#FFD43B';

/** 押せない暗い部分。触っても下の画面に届かないよう、自分で受け止める。 */
function Blocker({ style }: { style: object }) {
  return (
    <View
      style={[styles.blocker, style]}
      onStartShouldSetResponder={() => true}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/**
 * 案内付き操作の重ね絵。光らせる場所の周りを暗くして押せなくし、はこブーの吹き出しで次の操作を伝える。
 * ルートのレイアウトに1つだけ置き、今の手順に合わせて中身を切り替える。
 */
export function TourOverlay() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const step = useTourStore((state) => state.step);
  const targets = useTourStore((state) => state.targets);
  const endTour = useTourStore((state) => state.end);
  const forfeitTutorialFreeScan = useAppStore((state) => state.forfeitTutorialFreeScan);

  if (!step) return null;
  const config = TOUR_STEPS[step];
  if (config.hidden) return null;

  const rect = config.target ? targets[config.target] : undefined;
  // 光らせる部品が今の画面に無い（まだ測れていない・別の画面にいる）ときは何も出さない。
  // 全面を暗くすると、戻る操作などで別の画面に来たときに抜け出せなくなるため
  if (config.target && !rect) return null;

  const hole = rect && {
    x: Math.max(0, rect.x - HOLE_PADDING),
    y: Math.max(0, rect.y - HOLE_PADDING),
    width: rect.width + HOLE_PADDING * 2,
    height: rect.height + HOLE_PADDING * 2,
  };
  // 光らせる場所が画面の下半分なら吹き出しは上に、上半分なら下に出す
  const bubbleAbove = hole ? hole.y + hole.height / 2 > height / 2 : true;
  const bubblePosition = hole
    ? bubbleAbove
      ? { bottom: height - hole.y + Spacing.three }
      : { top: hole.y + hole.height + Spacing.three }
    : { bottom: insets.bottom + 96 };

  const handleNoTable = () => {
    forfeitTutorialFreeScan();
    endTour();
    router.replace({ pathname: '/tour-exit', params: { reason: 'noTable' } });
  };

  const handleFinish = () => {
    endTour();
    router.replace('/(tabs)/calendar-view');
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hole && config.blocking && (
        <>
          <Blocker style={{ top: 0, left: 0, right: 0, height: hole.y }} />
          <Blocker style={{ top: hole.y + hole.height, left: 0, right: 0, bottom: 0 }} />
          <Blocker style={{ top: hole.y, left: 0, width: hole.x, height: hole.height }} />
          <Blocker
            style={{
              top: hole.y,
              left: hole.x + hole.width,
              width: Math.max(0, width - hole.x - hole.width),
              height: hole.height,
            }}
          />
        </>
      )}
      {hole && (
        <View
          pointerEvents="none"
          style={[
            styles.highlight,
            { left: hole.x, top: hole.y, width: hole.width, height: hole.height },
          ]}
        />
      )}

      <View
        style={[styles.bubble, bubblePosition, { backgroundColor: theme.backgroundElement }]}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.bubbleRow}>
          <HakobuMascot pose={config.pose} size={56} />
          <ThemedText type="subheadline" style={styles.bubbleText}>
            {config.message}
          </ThemedText>
        </View>
        {step === 'pickPhoto' && (
          <Pressable onPress={handleNoTable} hitSlop={Spacing.two} style={styles.bubbleLink}>
            <ThemedText type="footnote" themeColor="primary">
              シフト表が手元にない
            </ThemedText>
          </Pressable>
        )}
        {step === 'done' && <PrimaryButton label="はじめる" onPress={handleFinish} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blocker: {
    position: 'absolute',
    backgroundColor: DIM,
  },
  highlight: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: HIGHLIGHT,
    borderRadius: Radius.smallLarge,
  },
  bubble: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  bubbleText: {
    flex: 1,
  },
  bubbleLink: {
    alignSelf: 'flex-end',
  },
});
