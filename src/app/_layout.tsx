import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="name-input" options={{ title: '名前の登録' }} />
        <Stack.Screen name="photo-select" options={{ title: 'シフト表を選択' }} />
        <Stack.Screen
          name="analyzing"
          options={{ title: '解析中', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen name="user-match-select" options={{ title: '本人確認' }} />
        <Stack.Screen name="shift-results" options={{ title: 'シフト結果' }} />
        <Stack.Screen name="shift-review" options={{ title: '要確認・編集' }} />
        <Stack.Screen name="calendar-confirm" options={{ title: 'カレンダー登録の確認' }} />
        <Stack.Screen
          name="complete"
          options={{ title: '登録完了', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen name="settings/index" options={{ title: '設定' }} />
        <Stack.Screen name="settings/shift-types" options={{ title: 'シフト種別・時間マスター' }} />
      </Stack>
    </ThemeProvider>
  );
}
