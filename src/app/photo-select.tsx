import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Lightbulb,
  Lock,
  ScanLine,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { TourTarget } from '@/components/tour/tour-target';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AiTier, ShiftImage } from '@/services/ai';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { useTourStore } from '@/store/useTourStore';
import { resizeShiftImage } from '@/utils/resizeShiftImage';
import { showRewardedAd } from '@/utils/rewardedAd';
import {
  advancedRecoveryAmount,
  canEarnBonusScan,
  daysUntilNextRecovery,
  MAX_ADVANCED_SCANS,
  nextRecoveryAt,
  remainingAdvancedScans,
  remainingScans as computeRemainingScans,
  scanLimitFor,
} from '@/utils/scanQuota';

const TIPS = [
  '真上から影が入らないように明るい場所で撮影してください。',
  '表の枠線が平行になるように画面いっぱいに収めると認識率が上がります。',
  '複数月にまたがる場合や縦長の表は、分割して撮影した写真を複数選択できます。',
];

/**
 * モックアップ (Tailwind HTML) 由来の、テーマトークンに無い専用色。
 * ほぼ同系色のトークン (textSecondary, orange 等) はあるが、正確性優先でハードコードする。
 */
const MOCK_COLORS = {
  heading: '#111827',
  body: '#4B5563',
  muted: '#6B7280',
  blue: '#0066FF',
  borderInput: '#D1D5DB',
  borderCard: '#E5E7EB',
  outlinePressed: '#F9FAFB',
  disabledBg: '#E5E7EB',
  tipsBadgeBg: '#FEF3C7',
  tipsBadgeIcon: '#D97706',
  cornerMark: '#D1D5DB',
};

/**
 * 1回の解析で送れる画像の枚数。AIへのリクエストが際限なく大きくならないようにするための
 * 上限で、プロキシ側（server/gemini-proxy）でも同じ枚数で弾いている。値を変えるときは両方直すこと。
 */
const MAX_IMAGES = 4;

async function toShiftImages(result: ImagePicker.ImagePickerResult): Promise<ShiftImage[]> {
  if (result.canceled) return [];
  // selectionLimit はiOS 14+/Androidのみ効くため、ここでも必ず切り詰める。
  const assets = result.assets.slice(0, MAX_IMAGES);
  if (result.assets.length > MAX_IMAGES) {
    Alert.alert(
      `一度に読み取れるのは${MAX_IMAGES}枚までです`,
      `選んだ${result.assets.length}枚のうち、最初の${MAX_IMAGES}枚だけを使います。`,
    );
  }
  return Promise.all(assets.map(resizeShiftImage));
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  base64: true,
  quality: 0.8,
};

type ButtonVariant = 'outline' | 'primary' | 'disabled';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  variant: ButtonVariant;
  disabled?: boolean;
}

/** シフト表選択画面専用の主要アクションボタン。副ボタン（outline）・主ボタン（primary）・押せない状態（disabled）の3種。 */
function ActionButton({ icon: Icon, label, onPress, variant, disabled }: ActionButtonProps) {
  const theme = useTheme();

  const palette = {
    outline: {
      bg: theme.backgroundElement,
      pressedBg: MOCK_COLORS.outlinePressed,
      fg: MOCK_COLORS.blue,
    },
    primary: { bg: theme.primary, pressedBg: theme.primary, fg: '#FFFFFF' },
    disabled: {
      bg: MOCK_COLORS.disabledBg,
      pressedBg: MOCK_COLORS.disabledBg,
      fg: MOCK_COLORS.muted,
    },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        variant === 'outline' && { borderWidth: 1, borderColor: MOCK_COLORS.borderInput },
        { backgroundColor: pressed ? palette.pressedBg : palette.bg },
        variant === 'disabled' && styles.actionButtonDisabled,
        variant === 'primary' && { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Icon size={20} color={palette.fg} strokeWidth={2} />
      <ThemedText style={[styles.actionButtonLabel, { color: palette.fg }]}>{label}</ThemedText>
    </Pressable>
  );
}

function CornerMarks() {
  return (
    <>
      <View style={[styles.cornerMark, styles.cornerTopLeft]} />
      <View style={[styles.cornerMark, styles.cornerTopRight]} />
      <View style={[styles.cornerMark, styles.cornerBottomLeft]} />
      <View style={[styles.cornerMark, styles.cornerBottomRight]} />
    </>
  );
}

function PhotoPreview({ images }: { images: ShiftImage[] }) {
  if (images.length === 0) {
    return (
      <View style={styles.previewBox}>
        <CornerMarks />
        <IconBadge tone="blue" size={64}>
          <Camera size={IconSize.large} color={MOCK_COLORS.blue} />
        </IconBadge>
        <ThemedText style={styles.previewTitle}>写真が未選択です</ThemedText>
        <ThemedText style={styles.previewHint}>
          フォーカスが合っている鮮明な写真をお使いいただくと認識精度が向上します
        </ThemedText>
      </View>
    );
  }

  return <SelectedPhotos images={images} />;
}

/** 選んだ写真の表示領域で、1列に並べる基本の枚数。この枚数のときの写真の大きさで領域の高さが決まる。 */
const THUMBNAILS_PER_ROW = 3;
const THUMBNAIL_GAP = 8;

/**
 * 選んだ写真を1列に並べる。領域の高さは「3枚が1列に収まる大きさ」で固定し、
 * 4枚選んだときは領域の大きさを変えずに写真を小さくして1列に収める。
 */
function SelectedPhotos({ images }: { images: ShiftImage[] }) {
  const [rowWidth, setRowWidth] = useState(0);
  const slotSize =
    rowWidth > 0 ? (rowWidth - THUMBNAIL_GAP * (THUMBNAILS_PER_ROW - 1)) / THUMBNAILS_PER_ROW : 0;
  const perRow = Math.max(THUMBNAILS_PER_ROW, images.length);
  const thumbnailSize = rowWidth > 0 ? (rowWidth - THUMBNAIL_GAP * (perRow - 1)) / perRow : 0;

  return (
    <View style={styles.selectedBox}>
      <ThemedText style={styles.previewCount}>{images.length}枚選択中</ThemedText>
      <View
        style={[styles.thumbnailRow, { height: slotSize }]}
        onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      >
        {thumbnailSize > 0 &&
          images.map((image) => (
            <Image
              key={image.uri}
              source={{ uri: image.uri }}
              style={[styles.thumbnail, { width: thumbnailSize, height: thumbnailSize }]}
            />
          ))}
      </View>
    </View>
  );
}

function TipsSection() {
  const [expanded, setExpanded] = useState(false);
  const ChevronIcon = expanded ? ChevronUp : ChevronDown;

  return (
    <View style={styles.tipsCard}>
      <Pressable style={styles.tipsHeader} onPress={() => setExpanded((value) => !value)}>
        <View style={styles.tipsIconBadge}>
          <Lightbulb size={IconSize.small} color={MOCK_COLORS.tipsBadgeIcon} strokeWidth={2.2} />
        </View>
        <ThemedText style={styles.tipsHeaderLabel}>きれいに読み取るコツ</ThemedText>
        <ChevronIcon size={20} color={MOCK_COLORS.muted} strokeWidth={2.2} />
      </Pressable>
      {expanded && (
        <View style={styles.tipsList}>
          {TIPS.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <ThemedText style={styles.tipBullet}>•</ThemedText>
              <ThemedText style={styles.tipText}>{tip}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * PROの操作のボタン（docs/design-system.md 2章: PROは「金の地＋濃い茶色の文字」）。ピル型で、
 * 幅・高さ・アイコンと文字の並びは上の「スキャンする」（ActionButton）にそろえる。
 * 今は「高度なスキャンする」だけで使う。ほかの画面でも使うようになったら共通部品にする。
 */
function GoldPillButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.goldPillButton,
        { backgroundColor: theme.gold, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Sparkles size={20} color={theme.onGold} strokeWidth={2} />
      <ThemedText numberOfLines={1} style={[styles.actionButtonLabel, { color: theme.onGold }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** 写真選択画面 (requirements section 5): camera, library, or multiple screenshots at once. */
export default function PhotoSelectScreen() {
  const [images, setImages] = useState<ShiftImage[]>([]);
  const [watchingAd, setWatchingAd] = useState(false);
  const setSessionImages = useShiftSessionStore((state) => state.setImages);
  const setScanWorkplaceId = useShiftSessionStore((state) => state.setScanWorkplaceId);
  const setScanTier = useShiftSessionStore((state) => state.setScanTier);
  // 表示名はやめたので、「スキャンする」の上の一文には登録者キーワード（シフト表の中での自分の名前）を使う。
  const shiftName = useAppStore((state) => state.user?.shiftName ?? '');
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);
  const scanUsage = useAppStore((state) => state.scanUsage);
  const recordBonusScan = useAppStore((state) => state.recordBonusScan);
  const remainingScans = computeRemainingScans(scanUsage, isPro);
  const scanLimit = scanLimitFor(isPro);
  // チュートリアルのお試し中は、回数が残っていなくても1回スキャンできる（広告も出さない）
  const isTutorialFreeScan = useAppStore((state) => state.tutorialFreeScan === 'available');
  // 高度なスキャン（PROだけ・回数はふつうの解析と別枠）。お試しの解析では使わない。
  const advancedRemaining = remainingAdvancedScans(scanUsage, isPro);
  // ふつうの回数を使い切ったときは、「スキャンする」が広告・PROの案内を出す（高度なスキャンが残っていても同じ）
  const quotaExceeded = remainingScans <= 0 && !isTutorialFreeScan;
  const canWatchAdForBonus = quotaExceeded && canEarnBonusScan(scanUsage, isPro);
  // 「いつ戻るか」が分からないと、使い切ったユーザーが待てばいいのか課金すべきか判断できない。
  const recoveryAt = nextRecoveryAt(scanUsage);
  const recoveryLabel = recoveryAt
    ? `${recoveryAt.getMonth() + 1}月${recoveryAt.getDate()}日`
    : null;
  // 残り回数の文（ユーザー指定の形）。回復の予定が無い（時計が止まっている・戻る回数が0）ときは（）を出さない。
  const recoveryDays = daysUntilNextRecovery(scanUsage);
  const recoveryNote = (amount: number) =>
    recoveryDays !== null && amount > 0 ? `（あと${recoveryDays}日で+${amount}回分回復）` : '';
  const scanQuotaLine = `スキャン：残り${remainingScans} / ${scanLimit}回可能${recoveryNote(
    Math.max(0, scanLimit - remainingScans),
  )}`;
  const advancedQuotaLine = `高度なスキャン：残り${advancedRemaining} / ${MAX_ADVANCED_SCANS}回可能${recoveryNote(
    advancedRecoveryAmount(advancedRemaining),
  )}`;
  const workplaces = useAppStore((state) => state.user?.workplaces) ?? [];
  const activeWorkplaceId = useAppStore((state) => state.user?.activeWorkplaceId ?? '');
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState('');
  const effectiveWorkplaceId = selectedWorkplaceId || activeWorkplaceId || workplaces[0]?.id || '';

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        '写真ライブラリへのアクセスが許可されていません',
        '設定アプリから許可してください。',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      ...PICKER_OPTIONS,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
    });
    setImages(await toShiftImages(result));
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('カメラへのアクセスが許可されていません', '設定アプリから許可してください。');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    setImages(await toShiftImages(result));
  };

  // 案内中: 写真を選ぶ前は「撮る/選ぶ」、選んだあとは「スキャンする」を指す
  const tourStep = useTourStore((state) => state.step);
  const goToTourStep = useTourStore((state) => state.goTo);
  const isTouring = tourStep !== null;
  const hasImages = images.length > 0;
  // 高度なスキャンする（PROだけ）。お試し・案内付き操作の最中は出さない（お試しは高度なスキャンを使わないため）
  const showAdvancedButton = isPro && !isTutorialFreeScan && !isTouring;
  useEffect(() => {
    if (tourStep === 'tabScan' || tourStep === 'pickPhoto' || tourStep === 'analyze') {
      goToTourStep(hasImages ? 'analyze' : 'pickPhoto');
    }
  }, [goToTourStep, hasImages, tourStep]);

  const handleNext = (tier: AiTier) => {
    setSessionImages(images);
    setScanWorkplaceId(effectiveWorkplaceId);
    setScanTier(tier);
    router.push('/analyzing');
  };

  const canAnalyze = images.length > 0;

  const handleWatchAdForBonusScan = async () => {
    setWatchingAd(true);
    const result = await showRewardedAd();
    setWatchingAd(false);
    if (result.success) {
      recordBonusScan();
      // 広告で足した1回で、そのままスキャンを始める
      handleNext('standard');
    } else if (result.error) {
      Alert.alert('広告を表示できませんでした', result.error);
    }
  };

  // PROはふつうの回数を使い切ったら次の回復を待つしかない（広告の追加も課金も無い）。
  // 課金画面へ送らず、ボタンを押せない状態にする（残り回数の文で戻る日が分かる）。
  const proQuotaExceeded = isPro && quotaExceeded;

  const handlePressScan = () => {
    if (quotaExceeded) {
      if (canWatchAdForBonus) {
        Alert.alert(
          'スキャンできる回数を使い切りました',
          recoveryLabel
            ? `広告を見るとあと1回スキャンできます。${recoveryLabel}には回数が戻ります。`
            : '広告を見るとあと1回スキャンできます。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'PROを見る', onPress: () => router.push('/paywall') },
            { text: '広告を見る', onPress: handleWatchAdForBonusScan },
          ],
        );
        return;
      }
      router.push('/paywall');
      return;
    }
    // 確認の小窓は挟まず、押したらすぐ読み取りを始める
    handleNext('standard');
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>シフト表の写真を選んでください</ThemedText>
        <ThemedText style={styles.subtitle}>
          複数のスクショや写真をまとめて選択・読み取りできます。手書きや印刷された表にも対応しています。
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PhotoPreview images={images} />

        <View style={styles.buttonRow}>
          {/* 写真のボタンは副ボタン（白地＋枠＋青文字）で横に並べ、画面の主役は「スキャンする」だけにする */}
          <TourTarget id="photo-buttons" style={styles.tourButtonGroup}>
            <View style={styles.photoButtonCell}>
              <ActionButton
                icon={Camera}
                label="写真を撮る"
                onPress={pickFromCamera}
                variant="outline"
              />
            </View>
            <View style={styles.photoButtonCell}>
              <ActionButton
                icon={ImageIcon}
                label="ライブラリ"
                onPress={pickFromLibrary}
                variant="outline"
              />
            </View>
          </TourTarget>
          {isPro && workplaces.length > 1 && (
            <View style={styles.workplacePicker}>
              <ThemedText style={styles.workplacePickerLabel}>読み取る勤務先</ThemedText>
              {workplaces.map((workplace) => (
                <Pressable
                  key={workplace.id}
                  onPress={() => setSelectedWorkplaceId(workplace.id)}
                  style={styles.workplaceRow}
                >
                  <ThemedText style={{ color: MOCK_COLORS.heading }}>{workplace.name}</ThemedText>
                  {workplace.id === effectiveWorkplaceId && (
                    <Check size={IconSize.small} color={MOCK_COLORS.blue} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
          <ThemedText type="footnote" themeColor="textSecondary" style={styles.centerText}>
            {shiftName
              ? `${shiftName}さんのシフト表として読み取ります。`
              : 'ご自身のシフト表として読み取ります。'}
          </ThemedText>
          <TourTarget id="analyze-button">
            <ActionButton
              icon={ScanLine}
              label={watchingAd ? '広告を読み込み中…' : 'スキャンする'}
              onPress={handlePressScan}
              disabled={!canAnalyze || watchingAd || proQuotaExceeded}
              variant={canAnalyze && !watchingAd && !proQuotaExceeded ? 'primary' : 'disabled'}
            />
          </TourTarget>
          {showAdvancedButton && (
            <View style={styles.advancedBlock}>
              <GoldPillButton
                label="高度なスキャンする"
                disabled={!canAnalyze || watchingAd || advancedRemaining <= 0}
                onPress={() => handleNext('advanced')}
              />
              {advancedRemaining <= 0 && (
                <ThemedText type="footnote" themeColor="textSecondary" style={styles.centerText}>
                  {recoveryLabel
                    ? `使い切りました。${recoveryLabel}に${advancedRecoveryAmount(advancedRemaining)}回戻ります`
                    : '使い切りました'}
                </ThemedText>
              )}
            </View>
          )}
        </View>

        <ThemedText
          style={[
            styles.quotaNote,
            { color: quotaExceeded ? MOCK_COLORS.tipsBadgeIcon : MOCK_COLORS.muted },
          ]}
        >
          {isTutorialFreeScan
            ? 'お試し中: 今回のスキャンは回数に数えません'
            : [
                scanQuotaLine,
                isPro ? advancedQuotaLine : '',
                // 使い切ったときの次の一手（広告の追加・PROの案内）は今までどおり別の行に出す
                quotaExceeded
                  ? [
                      canWatchAdForBonus ? '広告を見ると今すぐ1回追加できます。' : '',
                      isPro ? '' : 'PROなら15回まで使えます。',
                    ].join('')
                  : '',
              ]
                .filter(Boolean)
                .join('\n')}
        </ThemedText>

        <TipsSection />

        <View style={styles.footerNote}>
          <Lock size={IconSize.small} color={MOCK_COLORS.muted} strokeWidth={2} />
          <ThemedText style={styles.footerNoteText}>
            取り込んだシフト表画像は安全な通信でAIに送信され、シフトの読み取りにのみ使用されます。
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    gap: 0,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.26,
    color: MOCK_COLORS.heading,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    color: MOCK_COLORS.body,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  previewBox: {
    position: 'relative',
    minHeight: 220,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: MOCK_COLORS.borderCard,
    backgroundColor: '#FFFFFF',
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedBox: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: MOCK_COLORS.borderCard,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cornerMark: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: MOCK_COLORS.cornerMark,
  },
  cornerTopLeft: {
    top: 16,
    left: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 16,
    right: 16,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 8,
  },
  previewTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: MOCK_COLORS.heading,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  previewHint: {
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '400',
    color: MOCK_COLORS.body,
    textAlign: 'center',
    maxWidth: 280,
  },
  previewCount: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: MOCK_COLORS.heading,
    marginBottom: 8,
  },
  thumbnailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THUMBNAIL_GAP,
  },
  thumbnail: {
    borderRadius: 8,
    backgroundColor: MOCK_COLORS.borderCard,
  },
  buttonRow: {
    gap: 12,
    marginBottom: 16,
  },
  tourButtonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButtonCell: {
    flex: 1,
  },
  quotaNote: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: Radius.smallLarge,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionButtonDisabled: {
    opacity: 0.9,
    shadowOpacity: 0,
  },
  actionButtonLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: MOCK_COLORS.borderCard,
    borderRadius: Radius.medium,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tipsIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MOCK_COLORS.tipsBadgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsHeaderLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.23,
    color: MOCK_COLORS.heading,
  },
  tipsList: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipBullet: {
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '700',
    color: MOCK_COLORS.blue,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '400',
    color: MOCK_COLORS.body,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '400',
    color: MOCK_COLORS.body,
    marginTop: 2,
  },
  centerText: {
    textAlign: 'center',
  },
  advancedBlock: {
    gap: Spacing.one,
  },
  goldPillButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: Radius.smallLarge,
  },
  workplacePicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: MOCK_COLORS.borderCard,
    overflow: 'hidden',
  },
  workplacePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: MOCK_COLORS.muted,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: 4,
  },
  workplaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: MOCK_COLORS.borderCard,
  },
});
