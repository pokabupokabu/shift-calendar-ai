import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { env } from '@/config/env';
import { PRO_ENTITLEMENT_ID } from '@/constants/purchases';
import { useAppStore } from '@/store/useAppStore';

let configured = false;

/**
 * Configures the RevenueCat SDK and keeps `user.settings.isPro` in sync with the real
 * entitlement status going forward (e.g. after a renewal, refund, or restore triggered
 * elsewhere). A no-op if EXPO_PUBLIC_REVENUECAT_IOS_API_KEY isn't set yet.
 */
export function initPurchases(): void {
  if (configured || !env.revenueCat.iosApiKey) return;
  configured = true;

  // No `store` option: this app is iOS-only, and App Store is the implicit default
  // (the `store` config knob only exists to pick among Android alternatives).
  Purchases.configure({ apiKey: env.revenueCat.iosApiKey });
  Purchases.addCustomerInfoUpdateListener((info) => {
    useAppStore
      .getState()
      .updateSettings({ isPro: Boolean(info.entitlements.active[PRO_ENTITLEMENT_ID]) });
  });
}

async function getProPackage(): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages[0] ?? null;
}

function isCancelledError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

export async function purchasePro(): Promise<{ success: boolean; error?: string }> {
  try {
    const pkg = await getProPackage();
    if (!pkg) return { success: false, error: 'プランが見つかりませんでした。' };

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPro = Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
    useAppStore.getState().updateSettings({ isPro });
    return { success: isPro };
  } catch (error) {
    if (isCancelledError(error)) return { success: false };
    return { success: false, error: '購入処理に失敗しました。時間をおいて再度お試しください。' };
  }
}

export async function restorePurchases(): Promise<{ success: boolean; error?: string }> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
    useAppStore.getState().updateSettings({ isPro });
    return {
      success: isPro,
      error: isPro ? undefined : '復元できる購入履歴が見つかりませんでした。',
    };
  } catch {
    return { success: false, error: '購入の復元に失敗しました。' };
  }
}

export async function getProPriceString(): Promise<string | null> {
  try {
    const pkg = await getProPackage();
    return pkg?.product.priceString ?? null;
  } catch {
    return null;
  }
}

/**
 * Appleのオファーコードの入力画面（App Storeの標準の画面）を開く。設定 →「プロモーション特典」から呼ぶ。
 * 引き換えが済むと、initPurchases で登録した CustomerInfo の更新で isPro が自動で切り替わる。
 * RevenueCat が未設定（APIキー無し）のときは SDK を呼ばずに案内を返す（未設定のまま呼ぶと落ちるため）。
 */
export async function presentCodeRedemptionSheet(): Promise<{ success: boolean; error?: string }> {
  if (!configured) {
    return {
      success: false,
      error: 'いまはコードを入力できません。時間をおいてもう一度お試しください。',
    };
  }
  try {
    await Purchases.presentCodeRedemptionSheet();
    return { success: true };
  } catch {
    return {
      success: false,
      error: 'コードの入力画面を開けませんでした。時間をおいてもう一度お試しください。',
    };
  }
}

/**
 * 「お客様ID」として見せる RevenueCat の App User ID。特典のお問い合わせのとき、RevenueCat の
 * 管理画面から特定の人にPROを付ける目印になる。RevenueCat が未設定・取得に失敗したときは null。
 */
export async function getCustomerId(): Promise<string | null> {
  if (!configured) return null;
  try {
    return await Purchases.getAppUserID();
  } catch {
    return null;
  }
}
