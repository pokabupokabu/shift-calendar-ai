import { Alert, Linking } from 'react-native';

import type { CalendarProvider } from './types';

/** 許可を断られたときの案内（iPhoneの設定で後から変えられることを伝える）。 */
function showPermissionDeniedAlert() {
  Alert.alert(
    'カレンダーへのアクセスが許可されていません',
    'iPhoneの「設定」アプリ →「シフToカレ」→「カレンダー」から、あとで許可できます。',
    [
      { text: '閉じる', style: 'cancel' },
      {
        text: '設定を開く',
        onPress: () => {
          void Linking.openSettings().catch(() => undefined);
        },
      },
    ],
  );
}

export async function ensureCalendarAccess(provider: CalendarProvider): Promise<boolean> {
  if (provider.requiresAuthentication && !(await provider.isAuthenticated())) {
    try {
      await provider.authenticate();
    } catch (error) {
      Alert.alert('Google認証に失敗しました', error instanceof Error ? error.message : undefined);
      return false;
    }
  }

  let permitted = false;
  try {
    permitted = await provider.requestCalendarPermission();
  } catch {
    // 許可を確かめられない環境（Expo Web など）でも落とさず、断られたときと同じ案内にする
    permitted = false;
  }
  if (!permitted) {
    showPermissionDeniedAlert();
    return false;
  }
  return true;
}
