/** No-op on web: react-native-purchases has no web implementation (see .native.ts). */
export function initPurchases(): void {}

export async function purchasePro(): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'この環境では購入できません。' };
}

export async function restorePurchases(): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'この環境では復元できません。' };
}

/** Real App Store price string once a package is configured, otherwise null (caller shows a fallback). */
export async function getProPriceString(): Promise<string | null> {
  return null;
}
