import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** 下から出てくるときに動かす距離。小窓の高さより大きければよい。 */
const SLIDE_DISTANCE = 480;

/**
 * ダークのときの小窓の枠（dialog.tsx と同じ決まり。地が背景の黒に溶けて見えないため、
 * ダークのときだけ真っ白の1ptの枠を付ける）。
 */
const DARK_BORDER_COLOR = '#FFFFFF';

interface AiConsentSheetProps {
  visible: boolean;
  /** 「同意してスキャン」。呼び出し側で同意を記録し、押したほうのスキャンを始める。 */
  onAgree: () => void;
  /** 「やめる」・暗いところを押した・戻る操作。小窓を閉じるだけ。 */
  onCancel: () => void;
  /** 「詳しく（プライバシーポリシー）」。 */
  onOpenPrivacyPolicy: () => void;
}

/**
 * 初めてスキャンする前の同意の小窓（docs/ui-review/group-b.md の決定5・6）。
 * 送り先（Anthropic・米国）と送るもの（写真・登録者キーワード）をはっきり示して許可を取る
 * （App Review 5.1.2(i)。Anthropic の「AIだと示す」もここで満たす）。詳しい内容はプライバシーポリシーに任せる。
 * チェック欄は付けない。文言はユーザーの確定どおりで、変えるときはユーザーに確認すること。
 */
export function AiConsentSheet({
  visible,
  onAgree,
  onCancel,
  onOpenPrivacyPolicy,
}: AiConsentSheetProps) {
  const theme = useTheme();
  const isDark = useResolvedColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const [slide] = useState(() => new Animated.Value(SLIDE_DISTANCE));

  useEffect(() => {
    if (!visible) {
      slide.setValue(SLIDE_DISTANCE);
      return;
    }
    Animated.timing(slide, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              // ライトは小窓と同じ画面の地（クリーム）。ダークは今までどおりカードの地（2026-10-27 ユーザー決定）
              backgroundColor: isDark ? theme.backgroundElement : theme.background,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
              transform: [{ translateY: slide }],
            },
            isDark && styles.darkBorder,
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.disabled }]} />
          {/* 「の前に」だけが次の行に落ちないよう、＜初回のみ＞の後で改行する（文言は確定どおり） */}
          <ThemedText type="title3" style={styles.title} accessibilityRole="header">
            {'＜初回のみ＞\nはじめてのスキャンの前に'}
          </ThemedText>
          <ThemedText type="subheadline" style={styles.body}>
            シフト表の写真と、あなたの名前（登録者キーワード）を、Anthropic（米国）のAIに送って読み取ります。送った内容はAIの学習に使われません。
          </ThemedText>
          <ThemedText type="footnote" themeColor="textSecondary" style={styles.note}>
            次回以降は省略します
          </ThemedText>
          <PrimaryButton variant="bluePill" label="同意してスキャン" onPress={onAgree} />
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
          >
            <ThemedText type="subheadline" themeColor="textSecondary">
              やめる
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={onOpenPrivacyPolicy}
            hitSlop={Spacing.two}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <ThemedText type="footnote" themeColor="primary" style={styles.linkText}>
              詳しく（プライバシーポリシー）
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.medium,
    borderTopRightRadius: Radius.medium,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  darkBorder: {
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: DARK_BORDER_COLOR,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    marginBottom: Spacing.three,
  },
  title: {
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  body: {
    marginBottom: Spacing.two,
  },
  note: {
    marginBottom: Spacing.four,
  },
  textButton: {
    minHeight: 44,
    marginTop: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    alignSelf: 'center',
    marginBottom: Spacing.two,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.6,
  },
});
