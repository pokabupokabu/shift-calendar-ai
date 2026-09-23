import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Flat, background+radius card (no left-border accent) shared by every list/tile UI. */
export function Card({ children, onPress, selected, disabled, style }: CardProps) {
  const theme = useTheme();
  const cardStyle = [
    styles.card,
    { backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement },
    disabled && styles.disabled,
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} disabled={disabled} style={cardStyle}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  disabled: {
    opacity: 0.5,
  },
});
