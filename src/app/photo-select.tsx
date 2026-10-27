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
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { AiConsentSheet } from '@/components/ai-consent-sheet';
import { IconBadge } from '@/components/icon-badge';
import { hasShiftKeyword, KeywordDialog } from '@/components/keyword-dialog';
import { PhotoViewer } from '@/components/photo-viewer';
import { QuotaExceededDialog } from '@/components/quota-exceeded-dialog';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { TourTarget } from '@/components/tour/tour-target';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import type { AiTier, ShiftImage } from '@/services/ai';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { useTourStore } from '@/store/useTourStore';
import { deferNavigation } from '@/utils/deferNavigation';
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
 * 1回の解析で送れる画像の枚数。AIへのリクエストが際限なく大きくならないようにするための
 * 上限で、プロキシ側（server/ai-proxy）でも同じ枚数で弾いている。値を変えるときは両方直すこと。
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

  // 色はアプリ共通のトークンだけを使う（ダークでも読めるように。group-b.md の決定2）
  const palette = {
    outline: {
      bg: theme.backgroundElement,
      pressedBg: theme.backgroundSelected,
      fg: theme.primary,
    },
    primary: { bg: theme.primary, pressedBg: theme.primary, fg: theme.onPrimary },
    disabled: {
      bg: theme.backgroundSelected,
      pressedBg: theme.backgroundSelected,
      fg: theme.textSecondary,
    },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        variant === 'outline' && { borderWidth: 1, borderColor: theme.border },
        { backgroundColor: pressed ? palette.pressedBg : palette.bg },
        variant === 'disabled' && styles.actionButtonDisabled,
        variant === 'primary' && { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Icon size={20} color={palette.fg} strokeWidth={2} />
      <ThemedText type="headline" style={{ color: palette.fg }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function CornerMarks() {
  const theme = useTheme();
  const color = { borderColor: theme.disabled };
  return (
    <>
      <View style={[styles.cornerMark, color, styles.cornerTopLeft]} />
      <View style={[styles.cornerMark, color, styles.cornerTopRight]} />
      <View style={[styles.cornerMark, color, styles.cornerBottomLeft]} />
      <View style={[styles.cornerMark, color, styles.cornerBottomRight]} />
    </>
  );
}

function PhotoPreview({
  images,
  onOpenImage,
}: {
  images: ShiftImage[];
  onOpenImage: (uri: string) => void;
}) {
  const theme = useTheme();
  if (images.length === 0) {
    return (
      <View
        style={[
          styles.previewBox,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      >
        <CornerMarks />
        <IconBadge tone="blue" size={64}>
          <Camera size={IconSize.large} color={theme.primary} />
        </IconBadge>
        <ThemedText type="headline" style={styles.previewTitle}>
          写真が未選択です
        </ThemedText>
        <ThemedText type="footnote" themeColor="textSecondary" style={styles.previewHint}>
          フォーカスが合っている鮮明な写真をお使いいただくと認識精度が向上します
        </ThemedText>
      </View>
    );
  }

  return <SelectedPhotos images={images} onOpenImage={onOpenImage} />;
}

/** 選んだ写真の表示領域で、1列に並べる基本の枚数。この枚数のときの写真の大きさで領域の高さが決まる。 */
const THUMBNAILS_PER_ROW = 3;
const THUMBNAIL_GAP = 8;

/**
 * 選んだ写真を1列に並べる。領域の高さは「3枚が1列に収まる大きさ」で固定し、
 * 4枚選んだときは領域の大きさを変えずに写真を小さくして1列に収める。
 */
function SelectedPhotos({
  images,
  onOpenImage,
}: {
  images: ShiftImage[];
  onOpenImage: (uri: string) => void;
}) {
  const theme = useTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const slotSize =
    rowWidth > 0 ? (rowWidth - THUMBNAIL_GAP * (THUMBNAILS_PER_ROW - 1)) / THUMBNAILS_PER_ROW : 0;
  const perRow = Math.max(THUMBNAILS_PER_ROW, images.length);
  const thumbnailSize = rowWidth > 0 ? (rowWidth - THUMBNAIL_GAP * (perRow - 1)) / perRow : 0;

  return (
    <View
      style={[
        styles.selectedBox,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
    >
      <ThemedText type="subheadline" style={styles.previewCount}>
        {images.length}枚選択中
      </ThemedText>
      <View
        style={[styles.thumbnailRow, { height: slotSize }]}
        onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      >
        {thumbnailSize > 0 &&
          images.map((image, index) => (
            // 枠の中は正方形の切り抜きのまま。押すと全画面で写真全体を見られる（決定3）
            <Pressable
              key={image.uri}
              accessibilityRole="imagebutton"
              accessibilityLabel={`${index + 1}枚目の写真を拡大して見る`}
              onPress={() => onOpenImage(image.uri)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Image
                source={{ uri: image.uri }}
                style={[
                  styles.thumbnail,
                  {
                    width: thumbnailSize,
                    height: thumbnailSize,
                    backgroundColor: theme.backgroundSelected,
                  },
                ]}
              />
            </Pressable>
          ))}
      </View>
    </View>
  );
}

function TipsSection() {
  const theme = useTheme();
  const tipsBadge = useIconBadgeColors('orange');
  const [expanded, setExpanded] = useState(false);
  const ChevronIcon = expanded ? ChevronUp : ChevronDown;

  return (
    <View
      style={[
        styles.tipsCard,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
    >
      <Pressable style={styles.tipsHeader} onPress={() => setExpanded((value) => !value)}>
        <View style={[styles.tipsIconBadge, { backgroundColor: tipsBadge.background }]}>
          <Lightbulb size={IconSize.small} color={tipsBadge.icon} strokeWidth={2.2} />
        </View>
        <ThemedText type="subheadline" style={styles.tipsHeaderLabel}>
          きれいに読み取るコツ
        </ThemedText>
        <ChevronIcon size={20} color={theme.textSecondary} strokeWidth={2.2} />
      </Pressable>
      {expanded && (
        <View style={[styles.tipsList, { borderTopColor: theme.border }]}>
          {TIPS.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <ThemedText type="footnote" themeColor="primary" style={styles.tipBullet}>
                •
              </ThemedText>
              <ThemedText type="footnote" themeColor="textSecondary" style={styles.tipText}>
                {tip}
              </ThemedText>
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
      <ThemedText type="headline" numberOfLines={1} style={{ color: theme.onGold }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** 写真選択画面 (requirements section 5): camera, library, or multiple screenshots at once. */
export default function PhotoSelectScreen() {
  const theme = useTheme();
  const [images, setImages] = useState<ShiftImage[]>([]);
  const [watchingAd, setWatchingAd] = useState(false);
  // 全画面で拡大表示している写真（決定3）。null なら閉じている
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  // 同意の小窓を開いているときの、押されたほうのスキャン（決定5）。null なら閉じている
  const [pendingConsentTier, setPendingConsentTier] = useState<AiTier | null>(null);
  // 名前が空のままスキャンを押したときに出す登録者キーワードの小窓（C2の6）。押されたほうのスキャンを覚えておく
  const [pendingKeywordTier, setPendingKeywordTier] = useState<AiTier | null>(null);
  // 小窓を閉じたときに名前が入っていれば、閉じきったあとにこのスキャンを続ける
  const resumeTierRef = useRef<AiTier | null>(null);
  // スキャンの回数を使い切ったときの小窓（docs/ui-review/group-e.md）
  const [quotaDialogVisible, setQuotaDialogVisible] = useState(false);
  // 回数切れの小窓で押されたほう。小窓が閉じきってから広告・課金画面を始める（小窓と重ならないように）
  const quotaNextActionRef = useRef<'ad' | 'paywall' | null>(null);
  const recordAiConsent = useAppStore((state) => state.recordAiConsent);
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
  // 回数切れの小窓の札。満タンに戻ると残りが基本の回数まで戻るので、戻る回数は「基本の回数 − 今の残り」
  const scanRecoveryAmount = Math.max(0, scanLimit - remainingScans);
  const quotaRecoveryText =
    recoveryLabel && scanRecoveryAmount > 0
      ? `${recoveryLabel}に${scanRecoveryAmount}回分戻ります`
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

  /**
   * 読み取りを始める。名前（登録者キーワード）が空で「シフト表に名前が載っていない」もオフなら、
   * 先に登録者キーワードの小窓を出す（C2の6）。まだ同意していなければ、続けて同意の小窓を出す
   * （初めての1回だけ。決定5）。どちらの小窓も案内付き操作の途中でも出し、小窓のあいだは
   * 案内の重ね絵を隠す（小窓が押せなくならないように）。
   */
  const startScan = (tier: AiTier) => {
    if (!hasShiftKeyword()) {
      openKeywordDialog(tier);
      return;
    }
    if (!useAppStore.getState().aiConsentAt) {
      setPendingConsentTier(tier);
      goToTourStep('consent');
      return;
    }
    handleNext(tier);
  };

  const openKeywordDialog = (tier: AiTier) => {
    setPendingKeywordTier(tier);
    // 案内中は、マイカスタムの小窓と同じ手順にして、重ね絵を隠しはこブーの一言を小窓の中に出す
    goToTourStep('keywordDialog');
  };

  const closeKeywordDialog = () => {
    // 名前が入った（または「名前が載っていない」をオンにした）ときだけ、押したほうのスキャンを続ける。
    // 空のままなら何も始めず、写真選択の画面に戻るだけ
    resumeTierRef.current = hasShiftKeyword() ? pendingKeywordTier : null;
    setPendingKeywordTier(null);
    // 案内中なら「スキャンする」を指す手順へ戻す（続けるときは、このあと同意の小窓か解析へ進む）
    goToTourStep('analyze');
  };

  /** 登録者キーワードの小窓が閉じきったあと。続けるスキャンがあれば始める（同意の小窓と重ならないように）。 */
  const handleKeywordDialogDismissed = () => {
    const tier = resumeTierRef.current;
    resumeTierRef.current = null;
    // ふつうのスキャンは、回数の確認（使い切ったときの広告・課金の案内）からやり直す
    if (tier === 'standard') handlePressScan();
    else if (tier) startScan(tier);
  };

  const handleAgreeConsent = () => {
    const tier = pendingConsentTier ?? 'standard';
    recordAiConsent();
    setPendingConsentTier(null);
    // 案内中は、解析画面が開いた時点で次の手順（analyzing）へ進む
    handleNext(tier);
  };

  const closeConsent = () => {
    setPendingConsentTier(null);
    // 案内中なら「スキャンする」を指す手順へ戻す
    goToTourStep('analyze');
  };

  const handleOpenPrivacyPolicy = () => {
    closeConsent();
    deferNavigation(() => router.push('/settings/legal/privacy'));
  };

  const canAnalyze = images.length > 0;

  const handleWatchAdForBonusScan = async () => {
    setWatchingAd(true);
    const result = await showRewardedAd();
    setWatchingAd(false);
    if (result.success) {
      recordBonusScan();
      // 広告で足した1回で、そのままスキャンを始める（まだ同意していなければ同意の小窓を挟む）
      startScan('standard');
    } else if (result.error) {
      Alert.alert('広告を表示できませんでした', result.error);
    }
  };

  // PROはふつうの回数を使い切ったら次の回復を待つしかない（広告の追加も課金も無い）。
  // 課金画面へ送らず、ボタンを押せない状態にする（残り回数の文で戻る日が分かる）。
  const proQuotaExceeded = isPro && quotaExceeded;

  const handlePressScan = () => {
    // 名前が空なら、回数を使い切ったときの案内より先に名前の小窓を出す（広告を見たあとに名前を聞かないため）
    if (!hasShiftKeyword()) {
      openKeywordDialog('standard');
      return;
    }
    if (quotaExceeded) {
      // 広告を見られるときも見られないときも、はこブーの小窓で次の一手を選んでもらう
      // （見られないときに黙って課金画面へ移らない。docs/ui-review/group-e.md）
      quotaNextActionRef.current = null;
      setQuotaDialogVisible(true);
      return;
    }
    // 確認の小窓は挟まず、押したらすぐ読み取りを始める（初めての1回だけ同意の小窓を出す）
    startScan('standard');
  };

  const chooseQuotaAction = (action: 'ad' | 'paywall' | null) => {
    quotaNextActionRef.current = action;
    setQuotaDialogVisible(false);
  };

  /** 回数切れの小窓が閉じきったあと。押されたほう（広告・課金画面）を始める。 */
  const handleQuotaDialogDismissed = () => {
    const action = quotaNextActionRef.current;
    quotaNextActionRef.current = null;
    if (action === 'ad') handleWatchAdForBonusScan();
    else if (action === 'paywall') router.push('/paywall');
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 横長のバナー（320×50）。PROでは自動で消える。ほかの画面と同じく一番上に置き、画面と一緒に流れる
            （2026-10-27 ユーザー決定。写真を選んだあとも出したまま・取り直さない）。上のバーとは画面の上の余白24、
            下の説明文とは押し間違えないよう24空ける */}
        <AdPlaceholder slot="photo-select" style={styles.ad} />

        {/* 題名は上のバーの「シフト表を選択」だけにする（大見出しは二重になるので置かない。決定1） */}
        <ThemedText type="subheadline" themeColor="textSecondary" style={styles.header}>
          複数のスクショや写真をまとめて選択・読み取りできます。手書きや印刷された表にも対応しています。
        </ThemedText>

        <PhotoPreview images={images} onOpenImage={setViewerUri} />

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
            <View
              style={[
                styles.workplacePicker,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
            >
              <ThemedText
                type="caption1"
                themeColor="textSecondary"
                style={styles.workplacePickerLabel}
              >
                読み取る勤務先
              </ThemedText>
              {workplaces.map((workplace) => (
                <Pressable
                  key={workplace.id}
                  onPress={() => setSelectedWorkplaceId(workplace.id)}
                  style={[styles.workplaceRow, { borderTopColor: theme.border }]}
                >
                  <ThemedText type="callout">{workplace.name}</ThemedText>
                  {workplace.id === effectiveWorkplaceId && (
                    <Check size={IconSize.small} color={theme.primary} />
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
                onPress={() => startScan('advanced')}
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
          type="caption1"
          style={[styles.quotaNote, { color: quotaExceeded ? theme.orange : theme.textSecondary }]}
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
          <Lock size={IconSize.small} color={theme.textSecondary} strokeWidth={2} />
          <ThemedText type="caption1" themeColor="textSecondary" style={styles.footerNoteText}>
            取り込んだシフト表画像は安全な通信でAIに送信され、シフトの読み取りにのみ使用されます。
          </ThemedText>
        </View>
      </ScrollView>

      <PhotoViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
      <KeywordDialog
        visible={pendingKeywordTier !== null}
        onClose={closeKeywordDialog}
        onDismiss={handleKeywordDialogDismissed}
        hint={tourStep === 'keywordDialog' ? 'tour' : 'scan'}
      />
      <QuotaExceededDialog
        visible={quotaDialogVisible}
        canWatchAd={canWatchAdForBonus}
        recoveryText={quotaRecoveryText}
        onWatchAd={() => chooseQuotaAction('ad')}
        onGoPro={() => chooseQuotaAction('paywall')}
        onClose={() => chooseQuotaAction(null)}
        onDismiss={handleQuotaDialogDismissed}
      />
      <AiConsentSheet
        visible={pendingConsentTier !== null}
        onAgree={handleAgreeConsent}
        onCancel={closeConsent}
        onOpenPrivacyPolicy={handleOpenPrivacyPolicy}
      />
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
  ad: {
    marginBottom: Spacing.four,
  },
  header: {
    marginBottom: Spacing.three,
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
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  previewHint: {
    textAlign: 'center',
    maxWidth: 280,
  },
  previewCount: {
    fontWeight: '700',
    marginBottom: 8,
  },
  thumbnailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THUMBNAIL_GAP,
  },
  thumbnail: {
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.7,
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
  tipsCard: {
    borderWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsHeaderLabel: {
    flex: 1,
    fontWeight: '700',
  },
  tipsList: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipBullet: {
    fontWeight: '700',
  },
  tipText: {
    flex: 1,
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
    borderRadius: Radius.small,
    borderWidth: 1,
    overflow: 'hidden',
  },
  workplacePickerLabel: {
    fontWeight: '600',
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
  },
});
