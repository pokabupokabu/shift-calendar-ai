/** No-op on web: react-native-google-mobile-ads has no web implementation (see .native.ts). */
export async function showRewardedAd(): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'この環境では広告を視聴できません。' };
}
