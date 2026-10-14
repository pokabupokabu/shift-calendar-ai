import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';

/** はこブーの場面ごとのポーズ。仕様は docs/character/hakobu.md の「5. 表情」。 */
export type HakobuPose = 'running' | 'happy' | 'puzzled';

const POSES = {
  running: { source: require('@/assets/images/hakobu/run.png'), aspectRatio: 346 / 412 },
  happy: { source: require('@/assets/images/hakobu/happy.png'), aspectRatio: 324 / 404 },
  puzzled: { source: require('@/assets/images/hakobu/puzzled.png'), aspectRatio: 323 / 387 },
} as const;

export interface HakobuMascotProps {
  pose: HakobuPose;
  /** 絵の高さ(pt)。元画像の解像度の都合上、120前後までにとどめる。 */
  size?: number;
}

/**
 * アプリのマスコット「はこブー」。ポーズごとに決まった動きを付けて表示する。
 * 端末の「視差効果を減らす」がオンのときは動かさずに静止画で出す。
 */
export function HakobuMascot({ pose, size = 112 }: HakobuMascotProps) {
  const reduceMotion = useReducedMotion();
  const { source, aspectRatio } = POSES[pose];

  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(reduceMotion || pose !== 'happy' ? 1 : 0.3);
  const questionOpacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    const ease = Easing.inOut(Easing.quad);

    if (pose === 'running') {
      // 上下に弾みながら、少し前後に揺れて走り続ける
      translateY.value = withRepeat(
        withSequence(
          withTiming(-size * 0.06, { duration: 220, easing: ease }),
          withTiming(0, { duration: 220, easing: ease }),
        ),
        -1,
      );
      rotate.value = withRepeat(
        withSequence(
          withTiming(2, { duration: 220, easing: ease }),
          withTiming(-3, { duration: 220, easing: ease }),
        ),
        -1,
      );
    } else if (pose === 'happy') {
      // ぽんっと出てきて、そのあと時々跳ねる
      scale.value = withSpring(1, { damping: 9, stiffness: 160 });
      translateY.value = withDelay(
        700,
        withRepeat(
          withSequence(
            withTiming(-size * 0.12, { duration: 180, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }),
            withTiming(0, { duration: 1200 }),
          ),
          -1,
        ),
      );
    } else {
      // ゆっくり首をかしげて「？」が浮かぶ（絵自体も少し傾いているので角度は控えめ）
      rotate.value = withRepeat(
        withSequence(
          withTiming(-7, { duration: 600, easing: ease }),
          withTiming(-7, { duration: 900 }),
          withTiming(0, { duration: 600, easing: ease }),
          withTiming(0, { duration: 500 }),
        ),
        -1,
      );
      questionOpacity.value = withRepeat(
        withSequence(
          withDelay(400, withTiming(1, { duration: 300 })),
          withTiming(1, { duration: 1000 }),
          withTiming(0, { duration: 300 }),
          withTiming(0, { duration: 600 }),
        ),
        -1,
      );
    }
  }, [pose, questionOpacity, reduceMotion, rotate, scale, size, translateY]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));
  const questionStyle = useAnimatedStyle(() => ({
    opacity: questionOpacity.value,
    transform: [{ translateY: (1 - questionOpacity.value) * 6 }],
  }));

  return (
    <View
      style={{ width: size * aspectRatio + (pose === 'puzzled' ? size * 0.3 : 0), height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="はこブー"
    >
      <Animated.View style={[styles.body, { width: size * aspectRatio, height: size }, bodyStyle]}>
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" />
      </Animated.View>
      {pose === 'puzzled' && (
        <Animated.View style={[styles.question, { right: 0, top: 0 }, questionStyle]}>
          <ThemedText type="title1" themeColor="primary" style={styles.questionText}>
            ?
          </ThemedText>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    // 足元を支点に揺らす
    transformOrigin: '50% 90%',
  },
  question: {
    position: 'absolute',
  },
  questionText: {
    fontWeight: '700',
  },
});
