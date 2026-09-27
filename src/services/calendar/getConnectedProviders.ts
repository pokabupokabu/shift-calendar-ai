import { getCalendarProvider } from './index';
import type { CalendarProviderId } from '@/models';

const ALL_PROVIDERS: CalendarProviderId[] = ['apple', 'google'];

export async function getConnectedProviders(): Promise<CalendarProviderId[]> {
  const results = await Promise.all(
    ALL_PROVIDERS.map(async (id) => {
      const provider = getCalendarProvider(id);
      const connected = provider.requiresAuthentication ? await provider.isAuthenticated() : true;
      return connected ? id : null;
    }),
  );
  return results.filter((id): id is CalendarProviderId => id !== null);
}
