import {
  Bell,
  Building2,
  CalendarCog,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Crown,
  FileText,
  Palette,
  ShieldCheck,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SettingsRow {
  icon: LucideIcon;
  label: string;
}

const PRIMARY_ROWS: SettingsRow[] = [
  { icon: User, label: 'アカウント設定' },
  { icon: Building2, label: '会社・シフト管理' },
  { icon: Bell, label: '通知設定' },
  { icon: CalendarCog, label: 'カレンダー出力設定' },
  { icon: Palette, label: '外観' },
  { icon: CircleHelp, label: 'お問い合わせ' },
];

const LEGAL_ROWS: SettingsRow[] = [
  { icon: FileText, label: '利用規約' },
  { icon: ShieldCheck, label: 'プライバシーポリシー' },
  { icon: ClipboardList, label: '特定商取引法に基づく表記' },
];

function showComingSoon() {
  Alert.alert('準備中', 'この機能は近日公開予定です。');
}

function SettingsRowGroup({ rows }: { rows: SettingsRow[] }) {
  const theme = useTheme();

  return (
    <Card style={styles.rowGroup}>
      {rows.map((row, index) => (
        <Pressable
          key={row.label}
          onPress={showComingSoon}
          style={[styles.row, index > 0 && { borderTopColor: theme.border, borderTopWidth: 1 }]}
        >
          <row.icon size={IconSize.medium} color={theme.text} />
          <ThemedText style={styles.rowLabel}>{row.label}</ThemedText>
          <ChevronRight size={IconSize.medium} color={theme.textSecondary} />
        </Pressable>
      ))}
    </Card>
  );
}

/** 設定タブ: 一般的なアプリ設定（アカウント・通知・外観・規約など）。シフト登録の挙動自体は「テンプレ」タブが担う。 */
export default function SettingsTab() {
  const theme = useTheme();

  return (
    <Screen>
      <ThemedText type="subtitle">設定</ThemedText>

      <View style={styles.profileRow}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
          <User size={IconSize.large} color={theme.textSecondary} />
        </View>
        <ThemedText type="default">匿名ユーザー</ThemedText>
      </View>

      <Card style={[styles.proCard, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.proHeading}>
          <Crown size={IconSize.medium} color={theme.primary} />
          <ThemedText type="smallBold" themeColor="primary">
            シフトカレンダーAI PRO
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          月別集計・給与見込みに加え、広告の非表示やシフト読み取り枠の拡大が利用できます
        </ThemedText>
        <PrimaryButton label="PROにアップグレード" onPress={showComingSoon} />
      </Card>

      <SettingsRowGroup rows={PRIMARY_ROWS} />
      <SettingsRowGroup rows={LEGAL_ROWS} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proCard: {
    gap: Spacing.two,
  },
  proHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  rowGroup: {
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  rowLabel: {
    flex: 1,
  },
});
