import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { LEGAL_PAGES, type LegalSlug } from '@/constants/legalContent';

export default function LegalPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = LEGAL_PAGES[slug as LegalSlug];

  return (
    <Screen>
      <Stack.Screen options={{ title: page?.title ?? '' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText themeColor="textSecondary">
          {page?.body ?? 'ページが見つかりません。'}
        </ThemedText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
});
