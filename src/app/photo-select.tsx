import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Lightbulb,
  Lock,
  ScanLine,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Dialog } from '@/components/dialog';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ShiftImage } from '@/services/ai';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';

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
  darkButton: '#1F2937',
  darkButtonPressed: '#000000',
  blue: '#0066FF',
  borderInput: '#D1D5DB',
  borderCard: '#E5E7EB',
  outlinePressed: '#F9FAFB',
  disabledBg: '#E5E7EB',
  tipsBadgeBg: '#FEF3C7',
  tipsBadgeIcon: '#D97706',
  cornerMark: '#D1D5DB',
};

async function toShiftImages(result: ImagePicker.ImagePickerResult): Promise<ShiftImage[]> {
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    uri: asset.uri,
    base64: asset.base64 ?? '',
    mimeType: asset.mimeType ?? 'image/jpeg',
  }));
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  base64: true,
  quality: 0.8,
};

type ButtonVariant = 'dark' | 'outline' | 'primary' | 'disabled';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  variant: ButtonVariant;
  disabled?: boolean;
}

/** シフト表選択画面専用の主要アクションボタン。モックアップの3種の見た目 (dark/outline/disabled) を再現。 */
function ActionButton({ icon: Icon, label, onPress, variant, disabled }: ActionButtonProps) {
  const theme = useTheme();

  const palette = {
    dark: { bg: MOCK_COLORS.darkButton, pressedBg: MOCK_COLORS.darkButtonPressed, fg: '#FFFFFF' },
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

  return (
    <View style={[styles.previewBox, styles.previewBoxFilled]}>
      <ThemedText style={styles.previewCount}>{images.length}枚選択中</ThemedText>
      <View style={styles.thumbnailRow}>
        {images.map((image) => (
          <Image key={image.uri} source={{ uri: image.uri }} style={styles.thumbnail} />
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

/** 写真選択画面 (requirements section 5): camera, library, or multiple screenshots at once. */
export default function PhotoSelectScreen() {
  const [images, setImages] = useState<ShiftImage[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const setSessionImages = useShiftSessionStore((state) => state.setImages);
  const displayName = useAppStore(
    (state) => state.user?.displayName || state.user?.shiftName || '',
  );

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      ...PICKER_OPTIONS,
      allowsMultipleSelection: true,
    });
    setImages(await toShiftImages(result));
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    setImages(await toShiftImages(result));
  };

  const handleNext = () => {
    setSessionImages(images);
    router.push('/analyzing');
  };

  const canAnalyze = images.length > 0;

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
          <ActionButton icon={Camera} label="写真を撮る" onPress={pickFromCamera} variant="dark" />
          <ActionButton
            icon={ImageIcon}
            label="ライブラリから選ぶ"
            onPress={pickFromLibrary}
            variant="outline"
          />
          <ActionButton
            icon={ScanLine}
            label="解析する"
            onPress={() => setConfirmDialogOpen(true)}
            disabled={!canAnalyze}
            variant={canAnalyze ? 'primary' : 'disabled'}
          />
        </View>

        <TipsSection />

        <View style={styles.footerNote}>
          <Lock size={IconSize.small} color={MOCK_COLORS.muted} strokeWidth={2} />
          <ThemedText style={styles.footerNoteText}>
            取り込んだシフト表画像は安全な通信でAIに送信され、解析にのみ使用されます。
          </ThemedText>
        </View>
      </ScrollView>

      <Dialog visible={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <ThemedText type="headline" style={styles.dialogTitle}>
          このシフト表を解析しますか？
        </ThemedText>
        <ThemedText type="body" style={styles.dialogText}>
          {displayName
            ? `${displayName}さんのシフト表として読み取ります。`
            : 'ご自身のシフト表として読み取ります。'}
        </ThemedText>
        <View style={styles.dialogActions}>
          <Pressable onPress={() => setConfirmDialogOpen(false)} style={styles.dialogCancel}>
            <ThemedText style={{ color: MOCK_COLORS.body }}>キャンセル</ThemedText>
          </Pressable>
          <PrimaryButton
            label="解析する"
            onPress={() => {
              setConfirmDialogOpen(false);
              handleNext();
            }}
          />
        </View>
      </Dialog>
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
  previewBoxFilled: {
    alignItems: 'stretch',
    justifyContent: 'flex-start',
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
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  buttonRow: {
    gap: 12,
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
  dialogTitle: {
    color: MOCK_COLORS.heading,
    textAlign: 'center',
  },
  dialogText: {
    color: MOCK_COLORS.body,
    textAlign: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dialogCancel: {
    padding: Spacing.two,
  },
});
