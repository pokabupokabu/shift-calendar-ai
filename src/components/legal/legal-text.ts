import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

/**
 * 文書の画面で共通に使う文字・余白（docs/ui-review/group-d.md「D3 決定事項」1）。
 * 本文は黒（ダークでは白）の15pt（`subheadline`）。長い文を読むので行間だけ少し広げる。
 */
export const legalTextStyles = StyleSheet.create({
  body: {
    lineHeight: 24,
  },
  /** 「(1) Google AdMob」のような小見出し（15pt・やや太字）。 */
  subHeading: {
    fontWeight: '600',
    lineHeight: 24,
  },
  /** カードの内側の余白。Stitchの案（約20pt）に合わせる。 */
  cardPadding: {
    padding: Spacing.three + Spacing.one,
  },
  /** カードの外に置く注記・見出しラベルの左右の余白（ほかの設定の下の画面と同じ）。 */
  outsideCaption: {
    paddingHorizontal: Spacing.one,
  },
});
