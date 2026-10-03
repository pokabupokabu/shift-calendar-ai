import MobileAds from 'react-native-google-mobile-ads';

/** Must run once before any BannerAd can load (see components/ad-placeholder.native.tsx). */
export function initAds(): void {
  MobileAds()
    .initialize()
    .catch(() => {
      // Ad SDK init failures shouldn't break the rest of the app.
    });
}
