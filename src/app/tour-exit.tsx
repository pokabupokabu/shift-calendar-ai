import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HakobuMascot } from '@/components/hakobu-mascot';
import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTourStore } from '@/store/useTourStore';

type ExitReason = 'noTable' | 'permission';

const CONTENT: Record<ExitReason, { title: string; description: string }> = {
  noTable: {
    title: 'また今度にしよう',
    // 言葉の途中で折り返さないよう、切れ目で改行する（幅375・393で確認）
    description: 'シフト表が配られたら、\n画面の真ん中にある「スキャン」から\n読み取れるよ。',
  },
  permission: {
    title: 'カレンダーに入れないみたい',
    description:
      '「設定」アプリで\nカレンダーへのアクセスを許可すると、\n読み取ったシフトを登録できるよ。',
  },
};

/**
 * 案内付き操作で先に進めなくなったときだけ出す出口（案内は途中でやめられない作りのため）。
 * - noTable: 写真を選ぶ手順で「シフト表が手元にない」を押した
 * - permission: 登録のときにカレンダーの許可を断った
 */
export default function TourExitScreen() {
  const { reason } = useLocalSearchParams<{ reason?: ExitReason }>();
  const content = CONTENT[reason === 'permission' ? 'permission' : 'noTable'];
  const endTour = useTourStore((state) => state.end);
  // この画面に来た時点で案内は終わり（許可を出しに「設定」へ行っても、戻ってから続きはできないため）
  useEffect(() => {
    endTour();
  }, [endTour]);

  const goHome = () => {
    endTour();
    router.replace('/(tabs)/calendar-view');
  };

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={[styles.fill, styles.screen]}>
        <View style={styles.body}>
          <HakobuMascot pose="puzzled" size={110} />
          <ThemedText type="title2" style={styles.centerText}>
            {content.title}
          </ThemedText>
          <ThemedText type="subheadline" themeColor="textSecondary" style={styles.centerText}>
            {content.description}
          </ThemedText>
        </View>
        <View style={styles.footer}>
          {reason === 'permission' ? (
            <>
              <PrimaryButton label="設定で許可する" onPress={() => void Linking.openSettings()} />
              <SecondaryButton label="また今度" onPress={goHome} />
            </>
          ) : (
            <PrimaryButton label="ホームへ" onPress={goHome} />
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  screen: {
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
});
