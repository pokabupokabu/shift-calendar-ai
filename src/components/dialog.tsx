import { Modal, Pressable, StyleSheet, View } from 'react-native';

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
}

/** Centered modal card ("ダイアログ") for compound edits, as opposed to BottomSheet-style single-field edits. */
export function Dialog({ visible, onClose, children }: DialogProps) {
  const theme = useTheme();
  const isDark = useResolvedColorScheme() === 'dark';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            { backgroundColor: theme.background },
            isDark && { borderWidth: 1, borderColor: DARK_BORDER_COLOR },
          ]}
        >
          {children}
        </View>
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
});
