import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import MobileAds from 'react-native-google-mobile-ads';

/** Keep in sync with prepareAds.ts — the two signatures must match exactly. */
export interface AdRequestState {
  /** Named to match BannerAd/createForAdRequest's requestOptions field so callers can spread it as-is. */
  requestNonPersonalizedAdsOnly: boolean;
}

/** GADMobileAds.start can stall (no network / mediation); don't block the first banner forever. */
const INIT_TIMEOUT_MS = 5000;

// Module-scope guard so the ATT prompt is raised at most once per process, the same way
// purchases.native.ts guards configure() with `configured`.
let pending: Promise<AdRequestState> | null = null;

async function resolveTrackingGranted(): Promise<boolean> {
  try {
    const current = await getTrackingPermissionsAsync();
    // iOS only ever shows the dialog while the status is undetermined; asking again after a
    // decision just echoes it back, so read the stored answer instead of re-prompting.
    if (current.status !== 'undetermined') return current.granted;
    if (!current.canAskAgain) return false;
    return (await requestTrackingPermissionsAsync()).granted;
  } catch {
    // Fail closed: a broken ATT lookup must never silently turn into personalized ads.
    return false;
  }
}

/**
 * Resolves the request options every ad in this app must load with: asks for ATT first, then
 * starts the SDK (Google's documented order — the SDK picks up the IDFA at start()).
 * Never rejects; on failure callers get non-personalized ads rather than no ads.
 *
 * Deliberately has no timeout around the ATT step: resolving early while the user still has
 * the dialog open would load NPA ads and strand a permission they went on to grant.
 */
export function prepareAds(): Promise<AdRequestState> {
  pending ??= (async () => {
    const granted = await resolveTrackingGranted();
    try {
      await Promise.race([
        MobileAds().initialize(),
        new Promise((_, reject) => setTimeout(reject, INIT_TIMEOUT_MS)),
      ]);
    } catch {
      // Ad SDK init failures/timeouts shouldn't break the rest of the app.
    }
    return { requestNonPersonalizedAdsOnly: !granted };
  })();
  return pending;
}
