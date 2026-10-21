import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { LegalArticle } from '@/components/legal/legal-article';
import { LegalContact } from '@/components/legal/legal-contact';
import { LegalFaq } from '@/components/legal/legal-faq';
import { LegalFields } from '@/components/legal/legal-fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { LEGAL_PAGES, type LegalSlug } from '@/constants/legalContent';
import { Spacing } from '@/constants/theme';

function isLegalSlug(slug: string | undefined): slug is LegalSlug {
  return slug !== undefined && Object.prototype.hasOwnProperty.call(LEGAL_PAGES, slug);
}

/**
 * 文書の画面（docs/ui-review/group-d.md「D3 文書」）。題名は上のバーだけに出す（グループDの決定1）。
 * 文言は src/constants/legalContent.ts の文字列のまま使い、見出し・項目・Q&A などは
 * 画面の側で文字列から見つけて形を変える（src/utils/legalBlocks.ts）。
 */
export default function LegalPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = isLegalSlug(slug) ? LEGAL_PAGES[slug] : undefined;

  return (
    <Screen>
      <Stack.Screen options={{ title: page?.title ?? '' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {isLegalSlug(slug) && page ? (
          <LegalBody slug={slug} body={page.body} />
        ) : (
          <ThemedText type="subheadline" themeColor="textSecondary">
            ページが見つかりません。
          </ThemedText>
        )}
      </ScrollView>
    </Screen>
  );
}

function LegalBody({ slug, body }: { slug: LegalSlug; body: string }) {
  switch (slug) {
    case 'faq':
      return <LegalFaq body={body} />;
    case 'contact':
      return <LegalContact body={body} />;
    case 'tokushoho':
      return <LegalFields body={body} />;
    case 'terms':
    case 'privacy':
      return <LegalArticle body={body} />;
  }
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.four,
  },
});
