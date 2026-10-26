import { StyleSheet, Switch, View } from 'react-native';

import { Dialog } from '@/components/dialog';
import { HakobuMascot } from '@/components/hakobu-mascot';
import { SecondaryButton } from '@/components/secondary-button';
import { DialogBody } from '@/components/template/dialog-body';
import { DialogTextInput, DialogTitle } from '@/components/template/dialog-parts';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';

/**
 * 登録者キーワード（シフト表の中での自分の名前）と「シフト表に名前が載っていない」の小窓。
 * マイカスタムの「登録者キーワード」の行と、名前が空のまま「スキャンする」を押したときの
 * 写真選択の画面で使う（docs/ui-review/group-c.md の C2 の6・8）。
 * 入力はその場で保存する（「閉じる」で確定するのではない）。閉じたあとの動き（案内を進める・
 * スキャンを続ける）は呼び出し側の `onClose` で決める。
 */
/** はこブーの一言。案内付きの操作の途中と、名前が空のままスキャンを押したとき（なぜ出たかを伝える）。 */
const HINTS = {
  tour: 'シフト表に書いてあるキミの名前を\n入れたら「閉じる」を押してね',
  scan: '読み取る前に、\nシフト表に書いてある\nキミの名前を入れてね',
} as const;

export function KeywordDialog({
  visible,
  onClose,
  hint,
  onDismiss,
}: {
  visible: boolean;
  onClose: () => void;
  /** はこブーの一言を出すとき、その種類。マイカスタムからふつうに開いたときは出さない。 */
  hint?: keyof typeof HINTS;
  /** 閉じる動きが終わったあと（`Dialog` の `onDismiss`）。続けて別の小窓を開くときに使う。 */
  onDismiss?: () => void;
}) {
  const theme = useTheme();
  const shiftName = useAppStore((state) => state.user?.shiftName ?? '');
  const setShiftName = useAppStore((state) => state.setShiftName);
  const shiftTableHasNoNames = useAppStore((state) => state.user?.shiftTableHasNoNames ?? false);
  const setShiftTableHasNoNames = useAppStore((state) => state.setShiftTableHasNoNames);

  return (
    <Dialog visible={visible} onClose={onClose} onDismiss={onDismiss}>
      <DialogBody>
        <DialogTitle>登録者キーワードを編集</DialogTitle>
        {hint && (
          <View style={styles.tourHint}>
            <HakobuMascot pose="happy" size={48} />
            <ThemedText type="footnote" style={styles.flexLabel}>
              {HINTS[hint]}
            </ThemedText>
          </View>
        )}
        <DialogTextInput
          value={shiftName}
          onChangeText={setShiftName}
          placeholder="シフト表に書かれている自分の名前"
          editable={!shiftTableHasNoNames}
          autoFocus={!shiftTableHasNoNames}
          // スイッチがオンのあいだは名前を使わないので、灰色にして効いていないと分かるようにする
          style={
            shiftTableHasNoNames && {
              backgroundColor: theme.backgroundSelected,
              color: theme.textSecondary,
            }
          }
        />
        {/* iPhoneの設定アプリの行と同じ形: 見出しとスイッチを横に並べ、見出しの行の高さでそろえる。
            見出しは幅375でも1行に収まるよう 15pt（docs/ui-review/group-c.md の C2 の8） */}
        <View style={styles.noNameRow}>
          <ThemedText type="subheadline" numberOfLines={1} style={styles.flexLabel}>
            シフト表に名前が載っていない
          </ThemedText>
          <Switch value={shiftTableHasNoNames} onValueChange={setShiftTableHasNoNames} />
        </View>
        {shiftTableHasNoNames ? (
          <ThemedText type="footnote" themeColor="textSecondary">
            {'キーワードがない場合は、表に載っている\n勤務を全てキミのものとして読み取るよ'}
          </ThemedText>
        ) : (
          <ThemedText type="footnote" themeColor="textSecondary">
            {'このキーワードをもとに、AIがシフト表から\nあなたの行を抽出します。'}
          </ThemedText>
        )}
        <SecondaryButton label="閉じる" onPress={onClose} />
      </DialogBody>
    </Dialog>
  );
}

/** 名前（空白だけは空とみなす）が入っているか、「シフト表に名前が載っていない」がオンなら true。 */
export function hasShiftKeyword(): boolean {
  const user = useAppStore.getState().user;
  return Boolean(user?.shiftName?.trim()) || Boolean(user?.shiftTableHasNoNames);
}

const styles = StyleSheet.create({
  tourHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flexLabel: {
    flex: 1,
  },
  noNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
