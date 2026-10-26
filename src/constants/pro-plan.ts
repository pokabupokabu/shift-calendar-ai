/**
 * PRO プランの上限と価格の表示（課金画面の比較表・回数切れの小窓・マイカスタムの上限で共通に使う）。
 * スキャンの回数は `src/utils/scanQuota.ts` の定数を使う。
 */

/** 基本のシフト種別（早番・遅番・夜勤）の数。無料はこの3つだけ。 */
export const BASE_SHIFT_TYPE_COUNT = 3;

/** PROで追加できるシフト種別の数。基本3種と合わせて合計8つまで。 */
export const MAX_ADDED_SHIFT_TYPES = 5;

/** PROで使えるシフト種別の合計。 */
export const PRO_MAX_SHIFT_TYPES = BASE_SHIFT_TYPE_COUNT + MAX_ADDED_SHIFT_TYPES;

/** 無料で登録できる勤務先の数。 */
export const FREE_MAX_WORKPLACES = 1;

/** PROで登録できる勤務先（掛け持ち）の数。 */
export const PRO_MAX_WORKPLACES = 3;

/** App Store から価格を取れないとき（RevenueCat 未設定・Web）に出す仮の価格。 */
export const FALLBACK_PRO_PRICE = '¥330';

/**
 * 1年続けた場合の目安（例「3,960円」）。価格の文字が「¥330」「￥1,200」のような円の形のときだけ計算し、
 * それ以外（外貨・読めない形）は null を返す（呼び出し側は目安の文を出さない）。
 */
export function yearlyEstimateLabel(price: string): string | null {
  const match = /^[¥￥]\s?([\d,]+)$/.exec(price.trim());
  if (!match) return null;
  const monthly = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(monthly) || monthly <= 0) return null;
  return `${(monthly * 12).toLocaleString('ja-JP')}円`;
}
