import {
  Briefcase,
  CalendarClock,
  Check,
  Layers,
  Scan,
  ShieldAlert,
  Sparkles,
  SquareX,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import {
  BASE_SHIFT_TYPE_COUNT,
  FREE_MAX_WORKPLACES,
  PRO_MAX_SHIFT_TYPES,
  PRO_MAX_WORKPLACES,
} from '@/constants/pro-plan';
import { Radius } from '@/constants/theme';
import { usePaywallColors } from '@/hooks/use-paywall-colors';
import { useTheme } from '@/hooks/use-theme';
import { FREE_SCAN_LIMIT, MAX_ADVANCED_SCANS, PRO_SCAN_LIMIT } from '@/utils/scanQuota';

interface Row {
  icon: LucideIcon;
  label: string;
  /** null は「—」（無料では使えない） */
  free: string | null;
  /** true は「✓」 */
  pro: string | true;
}

/** 比較表の7行（docs/ui-review/group-e.md「B（濃い金）で確定」）。数字は上限の定数から出す。 */
const ROWS: Row[] = [
  { icon: Scan, label: 'スキャン', free: `${FREE_SCAN_LIMIT}回`, pro: `${PRO_SCAN_LIMIT}回` },
  // 写真選択の「高度なスキャンする」ボタンと同じキラキラにそろえる（2026-10-26 ユーザー決定）
  { icon: Sparkles, label: '高度なスキャン', free: null, pro: `${MAX_ADVANCED_SCANS}回` },
  { icon: ShieldAlert, label: '扶養の壁アラート', free: null, pro: true },
  { icon: CalendarClock, label: '過去の月の給与', free: '今月だけ', pro: true },
  {
    icon: Briefcase,
    label: '勤務先（掛け持ち）',
    free: `${FREE_MAX_WORKPLACES}つ`,
    pro: `${PRO_MAX_WORKPLACES}つ`,
  },
  {
    icon: Layers,
    label: 'シフト種別',
    free: `${BASE_SHIFT_TYPE_COUNT}つ`,
    pro: `${PRO_MAX_SHIFT_TYPES}つ`,
  },
  { icon: SquareX, label: '広告', free: 'あり', pro: 'なし' },
];

/**
 * 行と見出しの高さ。iPhone SE（高さ667）で、上部・見出し・7行の表・購入の帯が下へ送らずに
 * 見えるよう、Stitch の B（36pt）より少し詰めている。
 */
const ROW_HEIGHT = 34;
const HEADER_HEIGHT = 32;
/** 無料と PRO の列は細く、行の名前の列を広く（行の名前が「…」で切れないように。ユーザー案） */
const FREE_COLUMN_WIDTH = 64;
const PRO_COLUMN_WIDTH = 76;

/** 課金画面の比較表。PRO の列は金一色の地に濃い茶色の太字（ダークは暗い金の地に金の文字）。 */
export function ComparisonTable() {
  const theme = useTheme();
  const colors = usePaywallColors();

  return (
    <View
      style={[
        styles.table,
        { backgroundColor: colors.tableBackground, borderColor: colors.tableBorder },
      ]}
    >
      <View
        style={[
          styles.row,
          styles.header,
          {
            backgroundColor: colors.tableHeaderBackground,
            borderBottomColor: colors.tableBorder,
          },
        ]}
      >
        <Text style={[styles.headerLabel, styles.nameHeader, { color: colors.tableHeaderText }]}>
          機能
        </Text>
        <Text style={[styles.headerLabel, styles.freeCell, { color: colors.tableHeaderText }]}>
          無料
        </Text>
        <View
          style={[
            styles.proCell,
            {
              backgroundColor: colors.proColumnHeaderBackground,
              borderLeftColor: colors.proColumnBorder,
            },
          ]}
        >
          <View style={[styles.proBadge, { backgroundColor: colors.proBadgeBackground }]}>
            <Text style={[styles.proBadgeLabel, { color: colors.proBadgeText }]}>PRO</Text>
          </View>
        </View>
      </View>

      {ROWS.map((row, index) => {
        const Icon = row.icon;
        const isLast = index === ROWS.length - 1;
        return (
          <View
            key={row.label}
            accessible
            accessibilityLabel={`${row.label}、無料は${row.free ?? 'なし'}、PROは${
              row.pro === true ? 'あり' : row.pro
            }`}
            style={[
              styles.row,
              styles.bodyRow,
              !isLast && { borderBottomWidth: 1, borderBottomColor: colors.tableDivider },
            ]}
          >
            <View style={styles.nameCell}>
              <View style={[styles.rowIcon, { backgroundColor: colors.rowIconBackground }]}>
                <Icon size={14} color={colors.rowIcon} strokeWidth={2} />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[styles.nameLabel, { color: theme.text }]}
              >
                {row.label}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.freeCell,
                styles.valueLabel,
                { color: row.free === null ? theme.textSecondary : colors.freeText },
              ]}
            >
              {row.free ?? '—'}
            </Text>
            <View
              style={[
                styles.proCell,
                {
                  backgroundColor: colors.proColumnBackground,
                  borderLeftColor: colors.proColumnBorder,
                },
              ]}
            >
              {row.pro === true ? (
                <Check size={16} color={colors.proColumnText} strokeWidth={3} />
              ) : (
                <Text
                  numberOfLines={1}
                  style={[styles.valueLabel, styles.proValue, { color: colors.proColumnText }]}
                >
                  {row.pro}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    height: HEADER_HEIGHT,
    borderBottomWidth: 1,
  },
  bodyRow: {
    height: ROW_HEIGHT,
  },
  headerLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  nameHeader: {
    flex: 1,
    paddingLeft: 14,
  },
  nameCell: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 4,
  },
  rowIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameLabel: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  freeCell: {
    width: FREE_COLUMN_WIDTH,
    textAlign: 'center',
  },
  valueLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  proCell: {
    width: PRO_COLUMN_WIDTH,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
  },
  proValue: {
    fontWeight: '700',
  },
  proBadge: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  proBadgeLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
});
