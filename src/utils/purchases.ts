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

/** Web にはオファーコードの入力画面が無い（App Store の機能のため）。 */
export async function presentCodeRedemptionSheet(): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error: 'この端末ではコードを入力できません。iPhoneのアプリでお試しください。',
  };
}

/** Web では RevenueCat を使わないため、お客様IDは無い。 */
export async function getCustomerId(): Promise<string | null> {
  return null;
}
