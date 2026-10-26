import { PaywallColors } from '@/constants/theme';
import { useResolvedColorScheme } from './use-resolved-color-scheme';

/** 課金画面・お礼・回数切れの小窓の色（`PaywallColors`）を、アプリの外観の設定に合わせて返す。 */
export function usePaywallColors() {
  return PaywallColors[useResolvedColorScheme()];
}
