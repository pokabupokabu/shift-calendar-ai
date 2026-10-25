import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { parseArticle, type LegalChunk, type LegalLine } from '@/utils/legalBlocks';

import { legalTextStyles } from './legal-text';

/**
 * 利用規約・プライバシーポリシー（docs/ui-review/group-d.md「D3」決定1・2、1回目を見ての決定1・2）。
 * 本文を白いカード1枚に入れ、「第1条（適用）」「1. 取得する情報」などの見出しの行を太字の17ptにする。
 * 飾りは太字だけ（色の棒・条の間の線・青い番号は使わない）。灰色は「※」の注記だけ。
 * 文言は src/constants/legalContent.ts のまま（見た目だけ変える）。
 */
export function LegalArticle({ body }: { body: string }) {
  const chunks = useMemo(() => parseArticle(body), [body]);

  return (
    <Card style={legalTextStyles.cardPadding}>
      {chunks.map((chunk, chunkIndex) => (
        <View
          key={chunkIndex}
          style={[styles.chunk, chunkIndex > 0 && { marginTop: spaceAbove(chunk) }]}
        >
          {chunk.map((line, lineIndex) => (
            <ArticleLine key={lineIndex} line={line} />
          ))}
        </View>
      ))}
    </Card>
  );
}

/** 条・章の見出しの上は24pt、小見出しとふつうの段落の上は16pt。 */
function spaceAbove(chunk: LegalChunk): number {
  const first = chunk[0];
  if (first?.type === 'heading' && first.level === 1) return Spacing.four;
  return Spacing.three;
}

function ArticleLine({ line }: { line: LegalLine }) {
  if (line.type === 'heading') {
    return line.level === 1 ? (
      <ThemedText type="headline" accessibilityRole="header">
        {line.text}
      </ThemedText>
    ) : (
      <ThemedText type="subheadline" accessibilityRole="header" style={legalTextStyles.subHeading}>
        {line.text}
      </ThemedText>
    );
  }

  if (line.type === 'item') {
    const isNote = line.marker === 'note';
    const textType = isNote ? 'footnote' : 'subheadline';
    const themeColor = isNote ? 'textSecondary' : 'text';
    // 2行目以降が印の右にそろうよう、印と文を横に並べる（ぶら下げ）
    return (
      <View style={[styles.itemRow, line.marker === 'paren' && styles.parenRow]}>
        <ThemedText
          type={textType}
          themeColor={themeColor}
          style={[
            !isNote && legalTextStyles.body,
            line.marker === 'number' && styles.numberMarker,
            line.marker === 'paren' && styles.parenMarker,
            isNote && styles.noteMarker,
          ]}
        >
          {line.prefix.trim()}
        </ThemedText>
        <ThemedText
          type={textType}
          themeColor={themeColor}
          style={[!isNote && legalTextStyles.body, styles.itemText]}
        >
          {line.text}
        </ThemedText>
      </View>
    );
  }

  return (
    <ThemedText type="subheadline" style={legalTextStyles.body}>
      {line.text}
    </ThemedText>
  );
}

/** 「1.」「2.」の印の幅。下の「(1)」の字下げもこの幅にそろえる。 */
const NUMBER_MARKER_WIDTH = 18;

const styles = StyleSheet.create({
  chunk: {
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
  },
  // 「1.」「2.」の幅をそろえ、少し間を空ける
  numberMarker: {
    minWidth: NUMBER_MARKER_WIDTH,
    marginRight: Spacing.one,
  },
  // 「1.」の項目の中の「(1)」。行の頭を「1.」の項目の文にそろえ、折り返した行は「(1)」の後ろにそろえる
  parenRow: {
    marginLeft: NUMBER_MARKER_WIDTH + Spacing.one,
  },
  parenMarker: {
    marginRight: Spacing.one,
  },
  noteMarker: {
    marginRight: Spacing.one,
  },
  itemText: {
    flex: 1,
  },
});
