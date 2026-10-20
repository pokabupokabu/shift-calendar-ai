import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

/** 小窓の外側の余白（`Dialog` の背景の内側24pt＋小窓の内側24pt、上下それぞれ）。 */
const DIALOG_VERTICAL_CHROME = (Spacing.four + Spacing.four) * 2;

/**
 * マイカスタムの小窓の中身。小窓が画面に収まらないとき（時刻を回す部分を開いたiPhone SEなど）は、
 * 小窓の中だけをスクロールできるようにして、下の「削除」「閉じる」が画面の外に隠れないようにする。
 */
export function DialogBody({ children }: { children: React.ReactNode }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const maxHeight = height - DIALOG_VERTICAL_CHROME - insets.top - insets.bottom;

  return (
    <ScrollView
      style={{ maxHeight }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
  },
});
