import { router } from 'expo-router';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Dialog } from '@/components/dialog';
import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { useTourStore } from '@/store/useTourStore';
import { advancedRecoveryAmount, nextRecoveryAt, remainingAdvancedScans } from '@/utils/scanQuota';

interface AdvancedRescanRowProps {
  /**
   * 押したあと解析画面へ移るか。結果の画面（内容の確認・本人確認）では true。
   * 解析画面の失敗表示から使うときは、その画面がそのまま読み直すので false。
   */
  navigateToAnalyzing?: boolean;
  /** 確認の小窓に添える「何が消えるか」の一文。無ければ何も添えない。 */
  discardNote?: string;
}

/**
 * 結果の画面に置く「高度なスキャンで読み直す」の細い1行（PROだけ）。題名と残り回数だけを出す。
 * 同じ画像を精度の高いモデルでもう一度読む。高度なスキャンの回数だけを1回使い、ふつうの回数は減らさない
 * （数えるのは解析画面。AIが解析しなかった失敗は数えない）。
 *
 * 無料プランの人・チュートリアルの案内中・お試しの解析中には何も出さない
 * （結果の画面で売り込みを挟まないため。PROの特典としては課金画面に載せている）。
 * 見た目は最小限。仕上げはグループB（スキャンの流れ）の見直しで行う。
 */
export function AdvancedRescanRow({
  navigateToAnalyzing = true,
  discardNote,
}: AdvancedRescanRowProps) {
  const theme = useTheme();
  const goldColors = useIconBadgeColors('gold');
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);
  const scanUsage = useAppStore((state) => state.scanUsage);
  const isTutorialFreeScan = useAppStore((state) => state.tutorialFreeScan === 'available');
  const isTouring = useTourStore((state) => state.step !== null);
  const startRescan = useShiftSessionStore((state) => state.startRescan);
  const hasImages = useShiftSessionStore((state) => state.images.length > 0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!isPro || isTouring || isTutorialFreeScan || !hasImages) return null;

  const remaining = remainingAdvancedScans(scanUsage, isPro);
  const canUse = remaining > 0;
  const recoveryAt = nextRecoveryAt(scanUsage);
  const unavailableNote = recoveryAt
    ? `使い切りました。${recoveryAt.getMonth() + 1}月${recoveryAt.getDate()}日に${advancedRecoveryAmount(remaining)}回戻ります`
    : '使い切りました';

  const handleConfirm = () => {
    setConfirmOpen(false);
    startRescan('advanced');
    if (navigateToAnalyzing) router.replace('/analyzing');
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canUse }}
        onPress={() => setConfirmOpen(true)}
        disabled={!canUse}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
            borderColor: theme.border,
          },
          !canUse && styles.disabled,
        ]}
      >
        <Sparkles size={IconSize.small} color={goldColors.icon} />
        <View style={styles.text}>
          <ThemedText
            type="subheadline"
            themeColor={canUse ? 'primary' : 'textSecondary'}
            style={styles.title}
          >
            高度なスキャンで読み直す
          </ThemedText>
          {!canUse && (
            <ThemedText type="footnote" themeColor="textSecondary">
              {unavailableNote}
            </ThemedText>
          )}
        </View>
        {canUse && (
          <ThemedText type="footnote" themeColor="textSecondary">
            残り{remaining}回
          </ThemedText>
        )}
        {canUse && <ChevronRight size={IconSize.small} color={theme.textSecondary} />}
      </Pressable>

      <Dialog visible={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <ThemedText type="headline" style={styles.dialogTitle}>
          高度なスキャンで読み直しますか？
        </ThemedText>
        <ThemedText type="subheadline" themeColor="textSecondary" style={styles.dialogText}>
          {`同じ写真を精度の高いAIでもう一度読みます。高度なスキャンを1回使います（残り${remaining}回）。${discardNote ?? ''}`}
        </ThemedText>
        <PrimaryButton variant="bluePill" label="読み直す" onPress={handleConfirm} />
        <SecondaryButton label="キャンセル" onPress={() => setConfirmOpen(false)} />
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  // 細い1行（指で押せる最小の44ptは保つ）
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.smallLarge,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  dialogTitle: {
    textAlign: 'center',
  },
  dialogText: {
    textAlign: 'center',
  },
});
