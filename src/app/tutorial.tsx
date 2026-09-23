import { useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Camera, CalendarCheck, Sparkles } from 'lucide-react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TutorialSlide } from '@/components/tutorial/tutorial-slide';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';

const SLIDES = [
  {
    icon: Camera,
    title: '撮る',
    description: 'シフト表の写真を撮るだけ。難しい設定は不要です。',
  },
  {
    icon: Sparkles,
    title: '解析',
    description: 'AIがシフト表を読み取り、あなたのシフトだけを見つけます。',
  },
  {
    icon: CalendarCheck,
    title: 'カレンダー登録',
    description: '内容を確認したら、ワンタップでカレンダーに登録できます。',
  },
];

/** 初回起動時のみ表示するチュートリアル */
export default function TutorialScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const shiftName = useAppStore((state) => state.user?.shiftName);
  const setHasSeenTutorial = useAppStore((state) => state.setHasSeenTutorial);

  const handleDone = () => {
    setHasSeenTutorial();
    router.replace(shiftName ? '/(tabs)/calendar-view' : '/name-input');
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <Pressable style={styles.skip} onPress={handleDone}>
          <ThemedText type="link">スキップ</ThemedText>
        </Pressable>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
        >
          {SLIDES.map((slide) => (
            <View key={slide.title} style={{ width }}>
              <TutorialSlide {...slide} />
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((slide, index) => (
            <View
              key={slide.title}
              style={[
                styles.dot,
                { backgroundColor: index === page ? theme.primary : theme.disabled },
              ]}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <PrimaryButton label="はじめる" onPress={handleDone} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  skip: {
    alignSelf: 'flex-end',
    padding: Spacing.three,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  dot: {
    width: Spacing.two,
    height: Spacing.two,
    borderRadius: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
});
