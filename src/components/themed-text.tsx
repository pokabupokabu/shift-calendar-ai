import { Text, type TextProps } from 'react-native';

import { ThemeColor, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: keyof typeof Typography;
  themeColor?: ThemeColor;
};

/** 文字。`type` は iPhone標準の段階（theme.ts の Typography）。書かないと `callout`（16pt）になる。 */
export function ThemedText({ style, type = 'callout', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text style={[{ color: theme[themeColor ?? 'text'] }, Typography[type], style]} {...rest} />
  );
}
