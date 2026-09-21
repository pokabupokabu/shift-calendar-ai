import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAiProvider } from '@/services/ai';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';

/**
 * 本人シフト抽出の候補選択画面: userMatchが"ambiguous"/"not_found"のとき、
 * AIに勝手な確定をさせず候補提示・手入力での確認を求める (requirements section 7)。
 */
export default function UserMatchSelectScreen() {
  const theme = useTheme();
  const images = useShiftSessionStore((state) => state.images);
  const analysisResult = useShiftSessionStore((state) => state.analysisResult);
  const setAnalysisResult = useShiftSessionStore((state) => state.setAnalysisResult);
  const shiftName = useAppStore((state) => state.user?.shiftName ?? '');
  const knownShiftTypes = useAppStore((state) => state.shiftTypes);

  const [customLabel, setCustomLabel] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = analysisResult?.userMatch.status;
  const candidates = analysisResult?.userMatch.candidates ?? [];

  const resolve = async (rowLabel: string) => {
    if (resolving || rowLabel.trim().length === 0) return;
    setResolving(true);
    setError(null);
    try {
      const result = await getAiProvider().analyzeShiftImages({
        images,
        shiftName,
        knownShiftTypes,
        confirmedRowLabel: rowLabel.trim(),
      });
      setAnalysisResult(result);
      if (result.userMatch.status === 'matched') {
        router.replace('/shift-results');
      } else {
        setError('この名前でもシフトを特定できませんでした。別の表記で試してみてください。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'シフト表をうまく読み取れませんでした');
    } finally {
      setResolving(false);
    }
  };

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  return (
    <Screen>
      <ThemedText type="subtitle">
        {status === 'not_found' ? 'あなたの行を見つけられませんでした' : 'あなたの行はどれですか？'}
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        {status === 'not_found'
          ? 'シフト表に書かれている名前をそのまま入力してください。'
          : 'AIが複数の候補を見つけました。表に書かれている本人の行を選んでください。'}
      </ThemedText>

      {candidates.map((candidate) => (
        <Pressable
          key={candidate.rowLabel}
          onPress={() => void resolve(candidate.rowLabel)}
          disabled={resolving}
          style={[
            styles.candidate,
            { backgroundColor: theme.backgroundElement, opacity: resolving ? 0.5 : 1 },
          ]}
        >
          <ThemedText type="smallBold">「{candidate.rowLabel}」の行</ThemedText>
        </Pressable>
      ))}

      <View style={styles.customRow}>
        <ThemedText type="small">この中にない場合は、表に書かれている名前を直接入力</ThemedText>
        <TextInput
          value={customLabel}
          onChangeText={setCustomLabel}
          placeholder="例：永尾 太郎"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
          editable={!resolving}
        />
        <PrimaryButton
          label="この名前で確認する"
          onPress={() => void resolve(customLabel)}
          disabled={resolving || customLabel.trim().length === 0}
        />
      </View>

      {resolving && <ActivityIndicator />}
      {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

      <PrimaryButton label="別の画像を選び直す" onPress={() => router.replace('/photo-select')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  candidate: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  customRow: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
});
