import { StyleSheet, View } from 'react-native';

import type { IconBadgeTone } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';

export interface IconBadgeProps {
  tone: IconBadgeTone;
  size?: number;
  children: React.ReactNode;
}

/** Circular soft-tinted background behind a row icon (e.g. `<IconBadge tone="blue"><Bell .../></IconBadge>`). */
export function IconBadge({ tone, size = 36, children }: IconBadgeProps) {
  const colors = useIconBadgeColors(tone);

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.background },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
