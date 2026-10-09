/** Keep in sync with prepareAds.native.ts — the two signatures must match exactly. */
export interface AdRequestState {
  /** Named to match BannerAd/createForAdRequest's requestOptions field so callers can spread it as-is. */
  requestNonPersonalizedAdsOnly: boolean;
}

/** No-op on web: react-native-google-mobile-ads has no web implementation (see .native.ts). */
export function prepareAds(): Promise<AdRequestState> {
  return Promise.resolve({ requestNonPersonalizedAdsOnly: true });
}
