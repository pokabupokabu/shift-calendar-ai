import { router } from 'expo-router';
import { Check, ChevronLeft, ChevronRight, Info } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import { getAiProvider } from '@/services/ai';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { deferNavigation } from '@/utils/deferNavigation';

/**
 * 本人シフト抽出の候補選択画面: userMatchが"ambiguous"/"not_found"のとき、
 * AIに勝手な確定をさせず候補提示・手入力での確認を求める (requirements section 7)。
 * confidenceは内部値のため、数値は一切出さず「推奨」の定性バッジのみで表現する。
 */
export default function UserMatchSelectScreen() {
  const theme = useTheme();
  const infoBadgeColors = useIconBadgeColors('blue');
  const images = useShiftSessionStore((state) => state.images);
  const analysisResult = useShiftSessionStore((state) => state.analysisResult);
  const setAnalysisResult = useShiftSessionStore((state) => state.setAnalysisResult);
  const shiftName = useAppStore((state) => state.user?.shiftName ?? '');
  const user = useAppStore((state) => state.user);
  const activeWorkplace =
    user?.workplaces.find((w) => w.id === user.activeWorkplaceId) ?? user?.workplaces[0];
  const knownShiftTypes = activeWorkplace?.shiftTypes ?? [];

  const status = analysisResult?.userMatch.status;
  const candidates = analysisResult?.userMatch.candidates ?? [];
  const hasCandidates = candidates.length > 0;

  const [selectedLabel, setSelectedLabel] = useState<string | null>(
    () => candidates[0]?.rowLabel ?? null,
  );
  const [manualOpen, setManualOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 再照合(resolve)後にcandidatesの中身が変わることがあるため、その都度先頭候補へ選択をリセットする。
  // (レンダー中にstateを調整するReact推奨パターン。useEffect内でのsetStateは避ける)
  const [syncedResult, setSyncedResult] = useState(analysisResult);
  if (analysisResult !== syncedResult) {
    setSyncedResult(analysisResult);
    setSelectedLabel(candidates[0]?.rowLabel ?? null);
  }

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
      setAnalysisResult(result, activeWorkplace?.id ?? '');
      if (result.userMatch.status === 'matched') {
        deferNavigation(() => router.replace('/calendar-confirm'));
      } else {
        setError('この名前でもシフトを特定できませんでした。別の表記で試してみてください。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'シフト表をうまく読み取れませんでした');
    } finally {
      setResolving(false);
    }
  };

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.background }];

  const introTitle =
    status === 'not_found'
      ? 'あなたの行を見つけられませんでした'
      : 'あなたの名前の行を選択してください';
  const introSubtitle =
    status === 'not_found'
      ? 'シフト表に書かれている名前をそのまま入力してください。'
      : `設定された名前「${shiftName}」に最も近い行を自動検出しました。正しい行が選択されているか確認してください。`;

  const showManualSection = manualOpen || !hasCandidates;

  return (
    <Screen style={styles.screen}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.backgroundElement, borderBottomColor: theme.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={Spacing.two}>
          <ChevronLeft size={IconSize.medium} color={theme.primary} />
          <ThemedText type="body" themeColor="primary">
            戻る
          </ThemedText>
        </Pressable>
        <ThemedText type="headline" numberOfLines={1} style={styles.headerTitle}>
          本人確認
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introBlock}>
          <ThemedText type="title2">{introTitle}</ThemedText>
          <ThemedText type="subheadline" themeColor="textSecondary" style={styles.introSubtitle}>
            {introSubtitle}
          </ThemedText>
        </View>

        {hasCandidates && (
          <View style={styles.section}>
            <ThemedText type="caption1" themeColor="textSecondary" style={styles.sectionLabel}>
              検出された候補行
            </ThemedText>
            <Card style={styles.candidateCard}>
              {candidates.map((candidate, index) => {
                const selected = candidate.rowLabel === selectedLabel;
                return (
                  <View key={candidate.rowLabel}>
                    {index > 0 && (
                      <View
                        style={[
                          styles.candidateSeparator,
                          { backgroundColor: `${theme.border}80` },
                        ]}
                      />
                    )}
                    <Pressable
                      onPress={() => setSelectedLabel(candidate.rowLabel)}
                      disabled={resolving}
                      style={({ pressed }) => [
                        styles.candidateRow,
                        pressed && { backgroundColor: theme.backgroundSelected },
                      ]}
                    >
                      <View
                        style={[
                          styles.radio,
                          selected
                            ? { backgroundColor: theme.primary }
                            : { borderWidth: 2, borderColor: theme.border },
                        ]}
                      >
                        {selected && (
                          <Check size={IconSize.small} color={theme.onPrimary} strokeWidth={3} />
                        )}
                      </View>
                      <View style={styles.candidateContent}>
                        {index === 0 && (
                          <View
                            style={[
                              styles.recommendedBadge,
                              { backgroundColor: theme.backgroundSelected },
                            ]}
                          >
                            <ThemedText type="caption2" themeColor="textSecondary">
                              推奨
                            </ThemedText>
                          </View>
                        )}
                        <ThemedText
                          type={selected ? 'headline' : 'subheadline'}
                          style={selected ? styles.candidateTitleSelected : styles.candidateTitle}
                        >
                          「{candidate.rowLabel}」の行
                        </ThemedText>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </Card>

            <Pressable
              onPress={() => setManualOpen((value) => !value)}
              style={styles.manualToggle}
              hitSlop={Spacing.two}
            >
              <ThemedText type="subheadline" themeColor="primary">
                該当する行が見つからない場合は手動で選択
              </ThemedText>
              <ChevronRight size={18} color={theme.primary} />
            </Pressable>
          </View>
        )}

        {showManualSection && (
          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              この中にない場合は、表に書かれている名前を直接入力してください
            </ThemedText>
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
        )}

        {hasCandidates && (
          <Card style={styles.infoCard}>
            <IconBadge tone="blue" size={32}>
              <Info size={18} color={infoBadgeColors.icon} />
            </IconBadge>
            <ThemedText type="footnote" themeColor="textSecondary" style={styles.infoText}>
              確定後の画面でも個別のシフト修正や日別の微調整がいつでも行えます。
            </ThemedText>
          </Card>
        )}

        {resolving && <ActivityIndicator color={theme.primary} style={styles.spinner} />}
        {error && (
          <ThemedText themeColor="danger" style={styles.errorText}>
            {error}
          </ThemedText>
        )}
      </ScrollView>

      {hasCandidates && (
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.backgroundElement, borderTopColor: theme.border },
          ]}
        >
          <View style={styles.footerSummaryRow}>
            <ThemedText type="caption1" themeColor="textSecondary">
              選択中の行
            </ThemedText>
            <ThemedText type="caption1" style={styles.footerSummaryValue} numberOfLines={1}>
              {selectedLabel ? `「${selectedLabel}」の行` : '未選択'}
            </ThemedText>
          </View>
          <PrimaryButton
            label="この行で確定して次へ"
            onPress={() => selectedLabel && void resolve(selectedLabel)}
            disabled={resolving || !selectedLabel}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    minWidth: 60,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset,
    gap: Spacing.five,
  },
  introBlock: {
    gap: Spacing.one,
  },
  introSubtitle: {
    lineHeight: 20,
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.one,
  },
  candidateCard: {
    padding: 0,
    overflow: 'hidden',
  },
  candidateSeparator: {
    height: 1,
    marginLeft: 56,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  candidateContent: {
    flex: 1,
    gap: Spacing.half,
  },
  candidateTitle: {
    fontWeight: '500',
  },
  candidateTitleSelected: {
    fontWeight: '700',
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  infoText: {
    flex: 1,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  spinner: {
    alignSelf: 'center',
  },
  errorText: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  footerSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  footerSummaryValue: {
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: Spacing.two,
  },
});
