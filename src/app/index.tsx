import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

/** 初回画面 (requirements section 3, step 1-2 / section 4). */
export default function WelcomeScreen() {
  const shiftName = useAppStore((state) => state.user?.shiftName);

  return (
    <Screen style={styles.center}>
      <ThemedText type="title" style={styles.title}>
        撮る、放置する、{'\n'}カレンダーに入る。
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        シフト表の写真をアップロードするだけで、AIがあなたのシフトだけを見つけてカレンダーに登録します。
      </ThemedText>
      <PrimaryButton
        label={shiftName ? '続ける' : 'はじめる'}
        onPress={() => router.push(shiftName ? '/photo-select' : '/name-input')}
      />
      {shiftName && (
        <Pressable onPress={() => router.push('/settings')}>
          <ThemedText type="link">設定</ThemedText>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
  },
});
