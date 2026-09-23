import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { CircularProgress } from '@/components/circular-progress';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getAiProvider } from '@/services/ai';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { deferNavigation } from '@/utils/deferNavigation';

const ESTIMATED_ANALYSIS_DURATION_MS = 7000;
const ESTIMATED_PROGRESS_CEILING = 90;

/** AI解析中画面、失敗時は理由と次の操作を提示する (requirements section 18). */
export default function AnalyzingScreen() {
  const images = useShiftSessionStore((state) => state.images);
  const setAnalysisResult = useShiftSessionStore((state) => state.setAnalysisResult);
  const setAnalysisError = useShiftSessionStore((state) => state.setAnalysisError);
  const analysisError = useShiftSessionStore((state) => state.analysisError);
  const shiftName = useAppStore((state) => state.user?.shiftName ?? '');
  const knownShiftTypes = useAppStore((state) => state.shiftTypes);
  const [running, setRunning] = useState(true);
  const [progressAnim] = useState(() => new Animated.Value(0));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => setProgress(value));
    return () => progressAnim.removeListener(listenerId);
  }, [progressAnim]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setRunning(true);
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: ESTIMATED_PROGRESS_CEILING,
        duration: ESTIMATED_ANALYSIS_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
      try {
        const result = await getAiProvider().analyzeShiftImages({
          images,
          shiftName,
          knownShiftTypes,
        });
        if (cancelled) return;
        Animated.timing(progressAnim, {
          toValue: 100,
          duration: 300,
          useNativeDriver: false,
        }).start();
        setAnalysisResult(result);
        deferNavigation(() => {
          if (cancelled) return;
          router.replace(
            result.userMatch.status === 'matched' ? '/calendar-confirm' : '/user-match-select',
          );
        });
      } catch (error) {
        if (cancelled) return;
        setAnalysisError(
          error instanceof Error ? error.message : 'シフト表をうまく読み取れませんでした',
        );
      } finally {
        if (!cancelled) setRunning(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // Re-run only when explicitly retried via key state below, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  if (analysisError) {
    return (
      <Screen style={styles.center}>
        <ThemedText type="subtitle">シフト表をうまく読み取れませんでした</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {analysisError}
        </ThemedText>
        <PrimaryButton label="別の画像を選び直す" onPress={() => router.replace('/photo-select')} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.center}>
      <CircularProgress progress={progress} size={180} />
      <ThemedText themeColor="textSecondary">AIがシフト表を読み取っています…</ThemedText>
      {!running && (
        <PrimaryButton label="別の画像を選び直す" onPress={() => router.replace('/photo-select')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
