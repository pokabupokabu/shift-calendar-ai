import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

import { prepareAds } from './prepareAds';

/**
 * Loads and shows a rewarded ad, resolving once the user closes it. `success` is true only
 * if the reward was actually earned (ad watched to completion), not just closed early.
 * Unit ID is Google's public test ID — swap for the real AdMob rewarded ad unit ID before
 * submitting to the App Store (see README "7. MVPの最小実装順序" Phase 9).
 */
export async function showRewardedAd(): Promise<{ success: boolean; error?: string }> {
  // Resolves immediately once any banner has already settled ATT for this process.
  const requestOptions = await prepareAds();

  return new Promise((resolve) => {
    const rewarded = RewardedAd.createForAdRequest(TestIds.REWARDED, requestOptions);

    let earnedReward = false;
    let settled = false;

    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewarded.show();
    });
    const unsubscribeEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earnedReward = true;
    });
    const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      settle(earnedReward ? { success: true } : { success: false });
    });
    const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, () => {
      settle({
        success: false,
        error: '広告を読み込めませんでした。しばらくしてからもう一度お試しください。',
      });
    });

    function settle(result: { success: boolean; error?: string }) {
      if (settled) return;
      settled = true;
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
      resolve(result);
    }

    rewarded.load();
  });
}
