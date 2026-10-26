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

/**
 * Flat, background+radius card (no left-border accent) shared by every list/tile UI.
 * 地がクリームになって白いカードの輪郭が見えにくくなったため、カレンダーと同じ1ptの枠を付ける
 * （docs/design-system.md 2章。2026-10-27 ユーザー決定）。
 */
export function Card({ children, onPress, selected, disabled, style }: CardProps) {
  const theme = useTheme();
  const cardStyle = [
    styles.card,
    {
      backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
      borderColor: theme.border,
    },
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
    borderWidth: 1,
    padding: Spacing.three,
  },
  disabled: {
    opacity: 0.5,
  },
});
