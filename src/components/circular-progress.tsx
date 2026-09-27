import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import type { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface CircularProgressProps {
  /** 0-100 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** ThemedText `type` for the centered percentage label. Defaults to "subtitle". */
  textType?: keyof typeof Typography;
}

export function CircularProgress({
  progress,
  size = 180,
  strokeWidth = 12,
  color,
  trackColor,
  textType = 'subtitle',
}: CircularProgressProps) {
  const theme = useTheme();
  const resolvedColor = color ?? theme.primary;
  const resolvedTrackColor = trackColor ?? theme.backgroundElement;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [animatedProgress] = useState(() => new Animated.Value(progress));
  const [displayPercent, setDisplayPercent] = useState(Math.round(progress));

  useEffect(() => {
    // strokeDashoffset is not a natively-animatable property, so the JS driver is required.
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, progress]);

  useEffect(() => {
    const listenerId = animatedProgress.addListener(({ value }) => {
      setDisplayPercent(Math.round(value));
    });
    return () => animatedProgress.removeListener(listenerId);
  }, [animatedProgress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: size, height: size }}>
      {/* Rotated so the ring starts filling from 12 o'clock instead of SVG's default 3 o'clock. */}
      <View style={{ transform: [{ rotate: '-90deg' }] }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={resolvedTrackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={resolvedColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <ThemedText type={textType}>{`${displayPercent}%`}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
