import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from '../themed-text';

interface TutorialSlideProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function TutorialSlide({ icon: Icon, title, description }: TutorialSlideProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Icon size={80} color={theme.primary} />
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.description}>
        {description}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
});
