import { Alert } from 'react-native';

import type { CalendarProvider } from './types';

export async function ensureCalendarAccess(provider: CalendarProvider): Promise<boolean> {
  if (provider.requiresAuthentication && !(await provider.isAuthenticated())) {
    try {
      await provider.authenticate();
    } catch (error) {
      Alert.alert('Google認証に失敗しました', error instanceof Error ? error.message : undefined);
      return false;
    }
  }

  const permitted = await provider.requestCalendarPermission();
  if (!permitted) {
    Alert.alert('カレンダーへのアクセスが許可されていません', '設定アプリから許可してください。');
    return false;
  }
  return true;
}
