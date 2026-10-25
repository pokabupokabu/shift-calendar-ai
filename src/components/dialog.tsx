import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * ダークモードの小窓の細い枠線。小窓の地が背景の黒に溶けて見えないため、ダークのときだけ付ける
 * （D2の追加の決定）。小窓全体をはっきり白い枠で囲む（2026-10-21 ユーザー決定。最初の白の22%では薄すぎた）。ライトモードは枠なしのまま。
 */
const DARK_BORDER_COLOR = '#FFFFFF';

interface DialogProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * 中身が画面の高さを超えるとき、小窓の中をスクロールできるようにする（既定は false＝今までどおり）。
   * 小窓の高さは画面（上下の安全な範囲の内側）までに抑えるので、角と枠は常に画面の中に収まる。
   * 画面に収まるときの見た目は既定と同じ。
   */
  scrollable?: boolean;
}

/** Centered modal card ("ダイアログ") for compound edits, as opposed to BottomSheet-style single-field edits. */
export function Dialog({ visible, onClose, children, scrollable = false }: DialogProps) {
  const theme = useTheme();
  const isDark = useResolvedColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.background },
    isDark && { borderWidth: 1, borderColor: DARK_BORDER_COLOR },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.overlay,
          scrollable && {
            paddingTop: Math.max(Spacing.four, insets.top + Spacing.two),
            paddingBottom: Math.max(Spacing.four, insets.bottom + Spacing.two),
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {scrollable ? (
          <View style={[cardStyle, styles.scrollableCard]}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        ) : (
          <View style={cardStyle}>{children}</View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  // スクロールするときは余白をスクロールの中身の側に移し、小窓の高さを画面までに抑える
  scrollableCard: {
    padding: 0,
    maxHeight: '100%',
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
