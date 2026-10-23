import { router } from 'expo-router';
import { Check, CircleAlert, Loader2, Lock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdvancedRescanRow } from '@/components/advanced-rescan-row';
import { Card } from '@/components/card';
import { HakobuMascot } from '@/components/hakobu-mascot';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTourStepOnFocus } from '@/hooks/use-tour-step';
import { AnalysisNotPerformedError, getAiProvider } from '@/services/ai';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { useTourStore } from '@/store/useTourStore';
import { deferNavigation } from '@/utils/deferNavigation';
import { remainingAdvancedScans } from '@/utils/scanQuota';

const ESTIMATED_ANALYSIS_DURATION_MS = 7000;
/** 高度なスキャンは精度の高いモデルで読むぶん時間がかかる（測定では13〜15秒ほど）。 */
const ESTIMATED_ADVANCED_ANALYSIS_DURATION_MS = 15000;
const ESTIMATED_PROGRESS_CEILING = 90;

// px-space-lg(24) + icon w-6(24) + mr-space-md(16) rounded down to the mockup's flat "ml-14" (56px) indent.
const CHECKLIST_SEPARATOR_INSET = 56;

/**
 * 見た目上の解析ステップ演出用。実際のAI呼び出しは1回のリクエスト/レスポンスであり、
 * サーバー側でこの4段階が個別に走っているわけではない。既存の`progress`(0-100)の
 * しきい値に応じて、あたかも段階的に進んでいるかのように見せるための表示専用の配列。
 */
const CHECKLIST_STEPS = [
  { label: '画像の歪み・傾き補正', threshold: 20 },
  { label: '氏名行の検出', threshold: 45 },
  { label: '日付・勤務時間の照合', threshold: 90 },
  { label: 'カレンダー予定への変換', threshold: 100 },
] as const;

type StepStatus = 'done' | 'active' | 'pending';

function getStepStatus(progress: number, index: number): StepStatus {
  const threshold = CHECKLIST_STEPS[index].threshold;
  const prevThreshold = index === 0 ? 0 : CHECKLIST_STEPS[index - 1].threshold;
  if (progress >= threshold) return 'done';
  if (progress > prevThreshold) return 'active';
  return 'pending';
}

function ChecklistRow({
  label,
  status,
  showSeparator,
}: {
  label: string;
  status: StepStatus;
  showSeparator: boolean;
}) {
  const theme = useTheme();
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (status !== 'active') return undefined;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, status]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <>
      {showSeparator && (
        <View
          style={[
            styles.checklistSeparator,
            { backgroundColor: `${theme.border}99`, marginLeft: CHECKLIST_SEPARATOR_INSET },
          ]}
        />
      )}
      <View
        style={[
          styles.checklistRow,
          status === 'active' && { backgroundColor: `${theme.backgroundSelected}80` },
        ]}
      >
        {status === 'done' && (
          <IconBadge tone="green" size={24}>
            <Check size={IconSize.small} color={theme.success} />
          </IconBadge>
        )}
        {status === 'active' && (
          <View style={styles.checklistActiveIcon}>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Loader2 size={20} color={theme.primary} />
            </Animated.View>
          </View>
        )}
        {status === 'pending' && (
          <IconBadge tone="neutral" size={24}>
            <View style={[styles.pendingDot, { backgroundColor: theme.disabled }]} />
          </IconBadge>
        )}
        <ThemedText
          type={status === 'active' ? 'headline' : 'body'}
          themeColor={status === 'pending' ? 'textSecondary' : 'text'}
          style={[styles.checklistLabel, status === 'done' && styles.checklistLabelMedium]}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
        <ThemedText
          type="subheadline"
          themeColor={status === 'active' ? 'primary' : 'textSecondary'}
          style={status === 'active' && styles.checklistStatusMedium}
        >
          {status === 'done' ? '完了' : status === 'active' ? '照合中' : '待機中'}
        </ThemedText>
      </View>
    </>
  );
}

/** AI解析中画面、失敗時は理由と次の操作を提示する (requirements section 18). */
export default function AnalyzingScreen() {
  const theme = useTheme();
  const images = useShiftSessionStore((state) => state.images);
  const scanWorkplaceId = useShiftSessionStore((state) => state.scanWorkplaceId);
  const setAnalysisResult = useShiftSessionStore((state) => state.setAnalysisResult);
  const setAnalysisError = useShiftSessionStore((state) => state.setAnalysisError);
  const analysisError = useShiftSessionStore((state) => state.analysisError);
  const analysisRunId = useShiftSessionStore((state) => state.analysisRunId);
  const scanTier = useShiftSessionStore((state) => state.scanTier);
  const shiftName = useAppStore((state) => state.user?.shiftName ?? '');
  const shiftTableHasNoNames = useAppStore((state) => state.user?.shiftTableHasNoNames ?? false);
  const user = useAppStore((state) => state.user);
  const recordScanUsage = useAppStore((state) => state.recordScanUsage);
  const recordAdvancedScanUsage = useAppStore((state) => state.recordAdvancedScanUsage);
  const markTutorialFreeScanUsed = useAppStore((state) => state.markTutorialFreeScanUsed);
  // 写真選択画面で選んだ勤務先（未指定なら従来通りactiveWorkplaceにフォールバック）。
  const activeWorkplace =
    user?.workplaces.find((w) => w.id === scanWorkplaceId) ??
    user?.workplaces.find((w) => w.id === user.activeWorkplaceId) ??
    user?.workplaces[0];
  const knownShiftTypes = activeWorkplace?.shiftTypes ?? [];
  const [progressAnim] = useState(() => new Animated.Value(0));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => setProgress(value));
    return () => progressAnim.removeListener(listenerId);
  }, [progressAnim]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // 解析を始めた時点のお試し状態・精度で判断する（途中で変わっても数え方がぶれないように）
      const appState = useAppStore.getState();
      const isTutorialFreeScan = appState.tutorialFreeScan === 'available';
      const tier = useShiftSessionStore.getState().scanTier;
      // 高度なスキャンはPROだけ・お試しでは使わない。選ぶ画面で弾いているが、念のためここでも確かめる
      // （ふつうの解析に黙って切り替えると、ふつうの回数を本人の知らないうちに使ってしまうため、止める）。
      if (tier === 'advanced') {
        const isPro = appState.user?.settings.isPro ?? false;
        if (isTutorialFreeScan || remainingAdvancedScans(appState.scanUsage, isPro) <= 0) {
          setAnalysisError('高度なスキャンの残りがありません。');
          return;
        }
      }
      const isAdvanced = tier === 'advanced';
      // 解析した結果の数え方。AIが実際に解析したときだけ数える（通信エラー等では消費しない）。
      // 高度なスキャンは高度なスキャンの回数だけを使い、ふつうの回数は減らさない。
      const recordUsage = isAdvanced ? recordAdvancedScanUsage : recordScanUsage;
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: ESTIMATED_PROGRESS_CEILING,
        duration: isAdvanced
          ? ESTIMATED_ADVANCED_ANALYSIS_DURATION_MS
          : ESTIMATED_ANALYSIS_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
      try {
        const result = await getAiProvider({ tier }).analyzeShiftImages({
          images,
          shiftName,
          shiftTableHasNoNames,
          knownShiftTypes,
        });
        // チュートリアルのお試し中は回数に数えず、成功した時点でお試しを使い終えたことにする。
        if (isTutorialFreeScan) markTutorialFreeScanUsed();
        else recordUsage();
        if (cancelled) return;
        Animated.timing(progressAnim, {
          toValue: 100,
          duration: 300,
          useNativeDriver: false,
        }).start();
        setAnalysisResult(result, activeWorkplace?.id ?? '');
        deferNavigation(() => {
          if (cancelled) return;
          router.replace(
            result.userMatch.status === 'matched' ? '/calendar-confirm' : '/user-match-select',
          );
        });
      } catch (error) {
        // AIが応答したうえで読み取れなかった場合は、解析は行われたので回数に数える
        // お試し中の失敗は数えない（成功するまで何度でも試せる）
        if (!isTutorialFreeScan && !(error instanceof AnalysisNotPerformedError)) recordUsage();
        if (cancelled) return;
        setAnalysisError(
          error instanceof Error ? error.message : 'シフト表をうまく読み取れませんでした',
        );
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // Re-run only when the images change or a re-read is requested (analysisRunId), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, analysisRunId]);

  const handleAbort = () => router.replace('/photo-select');

  useTourStepOnFocus('analyzing');
  const isTouring = useTourStore((state) => state.step !== null);
  const endTour = useTourStore((state) => state.end);
  const forfeitTutorialFreeScan = useAppStore((state) => state.forfeitTutorialFreeScan);
  // 案内中に解析が失敗したときの出口。「今だけ」の無料枠は、ここでやめたら失効する
  useEffect(() => {
    if (analysisError) useTourStore.getState().goTo('analyzeFailed');
  }, [analysisError]);
  const handleGiveUpTour = () => {
    forfeitTutorialFreeScan();
    endTour();
    router.replace('/(tabs)/calendar-view');
  };

  if (analysisError) {
    return (
      <Screen style={styles.center}>
        <IconBadge tone="red" size={56}>
          <CircleAlert size={IconSize.large} color={theme.danger} />
        </IconBadge>
        <ThemedText type="subtitle" style={styles.centerText}>
          シフト表をうまく読み取れませんでした
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          {analysisError}
        </ThemedText>
        <PrimaryButton
          label={isTouring ? 'もう一度試す' : '別の画像を選び直す'}
          onPress={handleAbort}
        />
        <View style={styles.rescanRow}>
          <AdvancedRescanRow navigateToAnalyzing={false} />
        </View>
        {isTouring && (
          <Pressable onPress={handleGiveUpTour} hitSlop={Spacing.two}>
            <ThemedText type="headline" themeColor="textSecondary">
              また今度
            </ThemedText>
          </Pressable>
        )}
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={handleAbort} hitSlop={Spacing.two}>
          <ThemedText type="headline" themeColor="primary">
            閉じる
          </ThemedText>
        </Pressable>
        <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.progressBlock}>
          <View style={styles.mascotBlock}>
            <HakobuMascot pose="running" size={112} />
            <ThemedText type="title1" themeColor="primary">
              {Math.round(progress)}%
            </ThemedText>
          </View>
          <View style={styles.progressTextBlock}>
            <ThemedText type="title2" style={styles.centerText}>
              シフト表を解析中...
            </ThemedText>
            <ThemedText type="subheadline" themeColor="textSecondary" style={styles.centerText}>
              {scanTier === 'advanced'
                ? '高度なスキャンで、文字や日付、時間帯を丁寧に読み取っています。20秒ほどかかることがあります。'
                : '文字や日付、時間帯を自動で読み取っています。通常数秒で完了します。'}
            </ThemedText>
          </View>
        </View>

        <Card style={styles.checklistCard}>
          {CHECKLIST_STEPS.map((step, index) => (
            <ChecklistRow
              key={step.label}
              label={step.label}
              status={getStepStatus(progress, index)}
              showSeparator={index > 0}
            />
          ))}
        </Card>

        <Card style={styles.privacyCard}>
          <View style={styles.privacyRow}>
            <IconBadge tone="neutral" size={28}>
              <Lock size={IconSize.small} color={theme.textSecondary} />
            </IconBadge>
            <View style={styles.privacyTextBlock}>
              <ThemedText type="footnote" style={styles.privacyTitle}>
                プライバシー保護について
              </ThemedText>
              <ThemedText type="caption1" themeColor="textSecondary">
                シフト表の画像はHTTPSで暗号化された通信でAI解析サービスに送信され、シフト内容の読み取りにのみ使用されます。
              </ThemedText>
            </View>
          </View>
        </Card>
      </ScrollView>

      <Pressable
        onPress={handleAbort}
        style={({ pressed }) => [
          styles.cancelButton,
          pressed && { backgroundColor: theme.backgroundSelected },
        ]}
      >
        <ThemedText type="headline" themeColor="textSecondary" style={styles.cancelLabel}>
          キャンセル
        </ThemedText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
    gap: 0,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  rescanRow: {
    alignSelf: 'stretch',
  },
  header: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  dragHandle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 36,
    height: 4,
    marginLeft: -18,
    marginTop: -2,
    borderRadius: 2,
    opacity: 0.7,
  },
  headerSpacer: {
    width: 48,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset,
    gap: Spacing.three,
  },
  progressBlock: {
    alignItems: 'center',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  mascotBlock: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  progressTextBlock: {
    alignItems: 'center',
    gap: Spacing.one,
    maxWidth: 320,
  },
  checklistCard: {
    padding: 0,
    overflow: 'hidden',
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    minHeight: 52,
  },
  checklistSeparator: {
    height: StyleSheet.hairlineWidth,
  },
  checklistActiveIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checklistLabel: {
    flex: 1,
  },
  checklistLabelMedium: {
    fontWeight: '500',
  },
  checklistStatusMedium: {
    fontWeight: '500',
  },
  privacyCard: {
    gap: Spacing.two,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  privacyTextBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  privacyTitle: {
    fontWeight: '600',
  },
  cancelButton: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelLabel: {
    fontWeight: '500',
  },
});
