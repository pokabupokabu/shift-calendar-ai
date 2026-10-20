import { getCalendarProvider } from './index';
import type { CalendarProviderId } from '@/models';

const ALL_PROVIDERS: CalendarProviderId[] = ['apple', 'google'];

/**
 * 今すぐ登録できるカレンダー（サインインが要るものはサインイン済み、かつ許可がある）を返す。
 * 許可は聞かずに読むだけ（確認の表示は出さない）。Apple も実際の許可を確かめる
 * （docs/ui-review/group-d.md D2の決定3。以前は Apple を無条件に連携済みにしていた）。
 * 読めなかったものは未連携として扱う。
 */
export async function getConnectedProviders(): Promise<CalendarProviderId[]> {
  const results = await Promise.all(
    ALL_PROVIDERS.map(async (id) => {
      const provider = getCalendarProvider(id);
      try {
        if (provider.requiresAuthentication && !(await provider.isAuthenticated())) return null;
        return (await provider.hasCalendarPermission()) ? id : null;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((id): id is CalendarProviderId => id !== null);
}
