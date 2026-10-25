import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { TourOverlay } from '@/components/tour/tour-overlay';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { initPurchases } from '@/utils/purchases';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 上のバーの色は、端末の設定ではなくアプリの「外観」の設定に合わせる（docs/ui-review/group-d.md の決定2）。
  // 端末の設定を見ていると、アプリだけダークにしたときに上のバーが白く浮くため。
  const colorScheme = useResolvedColorScheme();

  // The ad SDK is deliberately not started here: prepareAds() runs from the first ad slot that
  // becomes visible so the ATT prompt lands in context, and PRO users never start it at all.
  useEffect(() => {
    initPurchases();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="tutorial" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="name-input" options={{ title: '名前の登録' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="photo-select" options={{ title: 'シフト表を選択' }} />
        <Stack.Screen
          name="analyzing"
          options={{
            title: 'スキャン中',
            headerShown: false,
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="user-match-select" options={{ title: '本人確認' }} />
        <Stack.Screen name="shift-review" options={{ title: 'シフトの編集' }} />
        <Stack.Screen name="calendar-confirm" options={{ title: 'カレンダー登録の確認' }} />
        <Stack.Screen
          name="complete"
          options={{ title: '登録完了', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen name="settings/calendar-providers" options={{ title: 'カレンダー連携' }} />
        <Stack.Screen name="settings/dependency-wall" options={{ title: '扶養の壁' }} />
        <Stack.Screen name="settings/promotion" options={{ title: 'プロモーション特典' }} />
        <Stack.Screen name="tour-exit" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen
          name="paywall"
          options={{ title: 'PROにアップグレード', presentation: 'modal' }}
        />
      </Stack>
      {/* 案内付き操作の重ね絵。どの画面よりも手前に出すため、Stack の後ろに置く */}
      <TourOverlay />
    </ThemeProvider>
  );
}
