import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getAiProvider } from '@/services/ai';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';

/** AI解析中画面、失敗時は理由と次の操作を提示する (requirements section 18). */
export default function AnalyzingScreen() {
  const images = useShiftSessionStore((state) => state.images);
  const setAnalysisResult = useShiftSessionStore((state) => state.setAnalysisResult);
  const setAnalysisError = useShiftSessionStore((state) => state.setAnalysisError);
  const analysisError = useShiftSessionStore((state) => state.analysisError);
  const shiftName = useAppStore((state) => state.user?.shiftName ?? '');
  const knownShiftTypes = useAppStore((state) => state.shiftTypes);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setRunning(true);
      try {
        const result = await getAiProvider().analyzeShiftImages({
          images,
          shiftName,
          knownShiftTypes,
        });
        if (cancelled) return;
        setAnalysisResult(result);
        router.replace('/shift-results');
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
      <ActivityIndicator size="large" />
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
