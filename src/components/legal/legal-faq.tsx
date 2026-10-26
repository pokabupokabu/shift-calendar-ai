import { Minus, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseFaq, type FaqItem } from '@/utils/legalBlocks';

import { legalTextStyles } from './legal-text';

const BADGE_SIZE = 24;

/**
 * よくある質問（docs/ui-review/group-d.md「D3 決定事項」3）。
 * 質問をカードで並べ、カードを押すと答えが開く（右端の「＋」が「－」になる）。最初は全部閉じておく。
 * 左の丸は Q=青・A=灰色。Q&A の形になっていない段落（今のダミーの但し書き）は、カードの下に灰色の注記で出す。
 */
export function LegalFaq({ body }: { body: string }) {
  const { items, footnotes } = useMemo(() => parseFaq(body), [body]);
  const [openIndexes, setOpenIndexes] = useState<ReadonlySet<number>>(() => new Set());
  const reduceMotion = useReducedMotion();

  const toggle = (index: number) => {
    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    }
    setOpenIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <FaqCard
          key={index}
          item={item}
          open={openIndexes.has(index)}
          onPress={() => toggle(index)}
        />
      ))}
      {footnotes.length > 0 && (
        <View style={[styles.footnotes, legalTextStyles.outsideCaption]}>
          {footnotes.map((note, index) => (
            <ThemedText key={index} type="footnote" themeColor="textSecondary">
              {note}
            </ThemedText>
          ))}
        </View>
      )}
    </View>
  );
}

function FaqCard({ item, open, onPress }: { item: FaqItem; open: boolean; onPress: () => void }) {
  const theme = useTheme();
  const ToggleIcon = open ? Minus : Plus;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`質問。${item.question}`}
      accessibilityHint={open ? '押すと答えを閉じます' : '押すと答えを開きます'}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.questionRow}>
        <LetterBadge letter="Q" color={theme.primary} />
        <ThemedText type="subheadline" style={[legalTextStyles.subHeading, styles.flexText]}>
          {item.question}
        </ThemedText>
        <ToggleIcon size={20} color={theme.textSecondary} />
      </View>

      {open && (
        <>
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <View style={styles.answerRow}>
            <LetterBadge letter="A" color={theme.textSecondary} />
            <ThemedText type="subheadline" style={[legalTextStyles.body, styles.flexText]}>
              {item.answer}
            </ThemedText>
          </View>
        </>
      )}
    </Pressable>
  );
}

function LetterBadge({ letter, color }: { letter: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: color }]} accessible={false}>
      <ThemedText type="footnote" style={[styles.badgeLetter, { color: theme.onPrimary }]}>
        {letter}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two + Spacing.one,
  },
  card: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: 56,
    justifyContent: 'center',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + Spacing.one,
  },
  flexText: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.three,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLetter: {
    fontWeight: '700',
  },
  footnotes: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
});
