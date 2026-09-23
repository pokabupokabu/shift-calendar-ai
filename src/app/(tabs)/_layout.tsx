import { Tabs, router } from 'expo-router';
import {
  ScanText,
  CalendarDays,
  LayoutTemplate,
  Settings as SettingsIcon,
  Wallet,
} from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TAB_BAR_CONTENT_HEIGHT = 56;
const SCAN_BUTTON_SIZE = 68;

/**
 * Raised, filled circular button for the emphasized center "シフトスキャン" tab -
 * sized and offset to visibly overflow above the tab bar's top edge (a stronger
 * emphasis than a same-height icon could give), while staying within the screen.
 * Only the button itself is lifted - the label stays level with the other tabs'.
 */
function ScanTabButton() {
  const theme = useTheme();

  return (
    <View style={styles.scanButtonWrapper}>
      <View style={styles.scanButtonLift}>
        <Pressable
          onPress={() => router.push('/photo-select')}
          style={[styles.scanButton, { backgroundColor: theme.accent, shadowColor: theme.text }]}
        >
          <ScanText size={IconSize.large} color={theme.onPrimary} />
        </Pressable>
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.tabBarLabel}>
        スキャン
      </ThemedText>
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Providing a custom tabBarStyle opts out of react-navigation's own safe-area
  // padding, so the bottom inset has to be added back by hand here - otherwise
  // labels sit flush against the home indicator and get visually clipped.
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: Spacing.one,
        },
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="calendar-view"
        options={{
          title: 'カレンダー',
          tabBarIcon: ({ color }) => <CalendarDays size={IconSize.medium} color={color} />,
        }}
      />
      <Tabs.Screen
        name="template"
        options={{
          title: 'テンプレ',
          tabBarIcon: ({ color }) => <LayoutTemplate size={IconSize.medium} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: () => <ScanTabButton />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/photo-select');
          },
        }}
      />
      <Tabs.Screen
        name="payroll"
        options={{
          title: '給与',
          tabBarIcon: ({ color }) => <Wallet size={IconSize.medium} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color }) => <SettingsIcon size={IconSize.medium} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 11,
  },
  scanButtonWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  scanButtonLift: {
    // Pulls the button up past the tab bar's top edge while leaving enough
    // room below it that the "スキャン" label lands at the same y as the
    // other four tabs' labels (measured empirically against their layout).
    marginTop: -35,
  },
  scanButton: {
    width: SCAN_BUTTON_SIZE,
    height: SCAN_BUTTON_SIZE,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
});
