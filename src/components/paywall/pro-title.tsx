import { Image } from 'expo-image';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/theme';
import { usePaywallColors } from '@/hooks/use-paywall-colors';

const TITLE = Typography.title1;

/**
 * 「シフToカレ」のロゴの画像（起動画面の名前と同じ見た目。Zen Maru Gothic 900・顔のピンク・紺の縁取り・
 * 「To」だけ帽子の青）。アプリに字体を入れずに済むよう画像にしている。作り直すときは
 * `node scripts/make-logo-name.mjs`（画面での高さ28pt の3倍の解像度・背景は透明）。
 */
const LOGO_SOURCE = require('@/assets/images/logo-name.png');
/** 画面での高さ。scripts/make-logo-name.mjs の LOGO_HEIGHT_PT と同じ値にする。 */
const LOGO_HEIGHT = 28;
/** 画像の幅÷高さ（427×85px） */
const LOGO_ASPECT = 427 / 85;
/**
 * 28pt・行の高さ34pt のときの文字の基準線の位置（iPhone の標準の字体の上の高さ 0.95em と、
 * 行の高さの余り（34 − 28 × 1.18）の半分から）。
 */
const BASELINE_Y = 27;
/**
 * SVG の文字と測った文字で字体の幅が少し違っても切れないよう、左右にとる余白。
 * 文字は測った幅の真ん中にそろえるので、差は左右に半分ずつ逃げる。
 */
const OVERFLOW = 12;
/** Web の SVG の文字は既定で明朝になるので、画面の文字と同じ字体を指定する（iPhone は既定のまま）。 */
const SVG_FONT_FAMILY = Platform.select({ web: 'system-ui, -apple-system, sans-serif' });

/**
 * 見出し「シフToカレ PRO」。「シフToカレ」は起動画面と同じロゴの画像、PRO は金のグラデーションの文字
 * （Stitch の B・D。docs/ui-review/group-e.md「コミット前の直し」）。ライト・ダークとも同じ画像。
 * 見えない「PRO」の文字で幅を測り、その上に同じ大きさの SVG の文字を重ねる
 * （文字の幅を決め打ちすると、字体の違いで切れたり隙間が空いたりするため）。
 */
export function ProTitle() {
  const colors = usePaywallColors();
  const [width, setWidth] = useState(0);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="header"
      accessibilityLabel="シフToカレ PRO"
    >
      <Image
        source={LOGO_SOURCE}
        style={styles.logo}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
      <View>
        <ThemedText
          type="title1"
          style={styles.measure}
          onLayout={(event) => setWidth(Math.ceil(event.nativeEvent.layout.width))}
        >
          PRO
        </ThemedText>
        {width > 0 && (
          <Svg
            width={width + OVERFLOW * 2}
            height={TITLE.lineHeight}
            style={styles.overlay}
            pointerEvents="none"
          >
            <Defs>
              <LinearGradient id="proTitle" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.proTextStart} />
                <Stop offset="1" stopColor={colors.proTextEnd} />
              </LinearGradient>
            </Defs>
            <SvgText
              x={OVERFLOW + width / 2}
              y={BASELINE_Y}
              textAnchor="middle"
              fontFamily={SVG_FONT_FAMILY}
              fontSize={TITLE.fontSize}
              fontWeight="800"
              letterSpacing={TITLE.letterSpacing}
              fill="url(#proTitle)"
            >
              PRO
            </SvgText>
          </Svg>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ロゴは縁取りを含めた高さ。PRO（28pt）の大文字より少し高いぶん、字の中心でそろえる
  logo: {
    height: LOGO_HEIGHT,
    width: LOGO_HEIGHT * LOGO_ASPECT,
    marginRight: 8,
    marginBottom: 2,
  },
  measure: {
    fontWeight: '800',
    opacity: 0,
  },
  overlay: {
    position: 'absolute',
    left: -OVERFLOW,
    top: 0,
  },
});
