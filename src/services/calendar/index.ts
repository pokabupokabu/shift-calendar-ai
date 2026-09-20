import type { CalendarProviderId } from '@/models';

import { AppleCalendarProvider } from './appleCalendarProvider';
import { GoogleCalendarProvider } from './googleCalendarProvider';
import type { CalendarProvider } from './types';

export * from './types';

const providers: Record<CalendarProviderId, () => CalendarProvider> = {
  apple: () => new AppleCalendarProvider(),
  google: () => new GoogleCalendarProvider(),
};

const cache = new Map<CalendarProviderId, CalendarProvider>();

export function getCalendarProvider(id: CalendarProviderId): CalendarProvider {
  let provider = cache.get(id);
  if (!provider) {
    provider = providers[id]();
    cache.set(id, provider);
  }
  return provider;
}
