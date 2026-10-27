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
import { TourTarget } from '@/components/tour/tour-target';
import { IconSize, Radius, Spacing, Typography } from '@/constants/theme';
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
        <TourTarget id="tab-scan" followsScreenFocus={false}>
          <Pressable
            onPress={() => router.push('/photo-select')}
            style={[styles.scanButton, { backgroundColor: theme.accent, shadowColor: theme.text }]}
          >
            <ScanText size={IconSize.large} color={theme.onPrimary} />
          </Pressable>
        </TourTarget>
      </View>
      <ThemedText type="caption2" themeColor="textSecondary" style={styles.scanTabLabel}>
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
          title: 'マイカスタム',
          tabBarIcon: ({ color }) => <LayoutTemplate size={IconSize.medium} color={color} />,
          // 案内付き操作で光らせるため、標準のタブボタンを位置を測れる部品で包む
          // （href を渡すと Web ではリンクとして描かれ、押すとページごと読み込み直して案内が消えるので外す）
          tabBarButton: ({ ref: _ref, href: _href, ...props }) => (
            <TourTarget id="tab-mycustom" followsScreenFocus={false} style={styles.tabButtonTarget}>
              <Pressable
                {...props}
                style={[props.style, styles.tabButtonTarget, styles.wideLabelTab]}
              />
            </TourTarget>
          ),
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
  tabButtonTarget: {
    flex: 1,
  },
  // 「マイカスタム」（11pt×6文字＝約66pt）は、iPhone SE（幅375pt）だとタブ1つの幅が75ptしかなく、
  // 標準のタブの左右の余白（各5pt）を引いた65ptに収まらず「…」で切れる。このタブだけ左右の余白を無くして
  // 75ptを使えるようにする（文字の大きさ・ほかのタブの見た目は変えない）。
  wideLabelTab: {
    paddingHorizontal: 0,
  },
  // ほかのタブの文字（react-navigation が描く）。大きさは caption2 の11pt
  tabBarLabel: {
    fontSize: Typography.caption2.fontSize,
  },
  // 「スキャン」の文字。caption2 の11ptのまま、行間20・太さ500は今までの値を残す
  // （下の scanButtonLift の -35 は、この行間でほかのタブの文字と高さがそろうように実測した値のため）
  scanTabLabel: {
    lineHeight: 20,
    fontWeight: '500',
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
