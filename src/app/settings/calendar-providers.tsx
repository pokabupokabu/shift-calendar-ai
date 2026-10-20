import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Check, ChevronRight, LayoutGrid } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { CalendarProviderIcon } from '@/components/template/calendar-provider-icon';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Spacing, type IconBadgeTone } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import type { CalendarProviderId } from '@/models';
import { getCalendarProvider } from '@/services/calendar';
import { ensureCalendarAccess } from '@/services/calendar/ensureCalendarAccess';
import { getConnectedProviders } from '@/services/calendar/getConnectedProviders';

const PROVIDERS: { id: CalendarProviderId; label: string }[] = [
  { id: 'apple', label: 'Apple カレンダー' },
  { id: 'google', label: 'Google カレンダー' },
];

/** 「ほかのアプリで見るには」の図の3つの絵。右端の絵はアプリを表す LayoutGrid に決めた（D2の確定）。 */
const FLOW_NODES: { label: string; tone: IconBadgeTone; Icon: typeof CalendarDays }[] = [
  { label: 'シフToカレ', tone: 'blue', Icon: CalendarDays },
  { label: 'Google カレンダー', tone: 'blue', Icon: CalendarDays },
  { label: 'Jorte など', tone: 'neutral', Icon: LayoutGrid },
];

const STEPS = ['上で Google カレンダーと連携', 'アプリ側で Google と同期をオン'] as const;

/** 図の丸の大きさ（Stitchの確定案の w-11）。 */
const FLOW_BADGE_SIZE = 44;
const FLOW_ICON_SIZE = 22;
/** 手順の番号の丸の大きさ。 */
const STEP_NUMBER_SIZE = 24;

/** ルートの引数。マイカスタムの「その他カレンダーとの連携」からは section=other で開く。 */
type Params = { section?: string };

/**
 * カレンダー連携の画面（docs/ui-review/group-d.md D2の確定）。
 * 旧「対応カレンダー」「連携の中間の画面（calendar-connect）」「その他のカレンダー」を1画面にまとめた。
 * 題名は上のバーだけに出し、画面の中に大見出しは置かない。
 *
 * 「連携する」はその場で Google のサインイン／iPhoneのカレンダーの許可を出す。
 * この画面では登録先（defaultCalendarProvider）は変えない（登録先はマイカスタムで勤務先ごとに選ぶ）。
 */
export default function CalendarProvidersScreen() {
  const { section } = useLocalSearchParams<Params>();
  const scrollRef = useRef<ScrollView>(null);
  const hasScrolledToSection = useRef(false);

  // 確認が終わるまでは undefined で、右側を出さない（ちらつき防止。設定タブと同じやり方）
  const [connectedIds, setConnectedIds] = useState<CalendarProviderId[]>();
  const [connectingId, setConnectingId] = useState<CalendarProviderId | null>(null);

  const refresh = useCallback(async () => {
    const ids = await getConnectedProviders();
    setConnectedIds(ids);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // iPhoneの「設定」アプリで許可を変えて戻ってきたときにも読み直す
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const handleConnect = async (id: CalendarProviderId) => {
    if (connectingId) return;
    setConnectingId(id);
    try {
      await ensureCalendarAccess(getCalendarProvider(id));
    } finally {
      setConnectingId(null);
      await refresh();
    }
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
        <View style={styles.group}>
          <Card style={[styles.listCard, styles.cardShadow]}>
            {PROVIDERS.map((provider, index) => (
              <ProviderRow
                key={provider.id}
                id={provider.id}
                label={provider.label}
                withTopBorder={index > 0}
                isConnected={connectedIds?.includes(provider.id)}
                isConnecting={connectingId === provider.id}
                onConnect={() => void handleConnect(provider.id)}
              />
            ))}
          </Card>
          <ThemedText type="footnote" themeColor="textSecondary" style={styles.inset}>
            登録先はマイカスタムで勤務先ごとに選べます。
          </ThemedText>
        </View>

        <View
          style={styles.group}
          onLayout={(event) => {
            // マイカスタムの「その他カレンダーとの連携」から来たときは、この位置まで送って開く（D2の決定4）
            if (section !== 'other' || hasScrolledToSection.current) return;
            hasScrolledToSection.current = true;
            const y = Math.max(0, event.nativeEvent.layout.y - Spacing.two);
            scrollRef.current?.scrollTo({ y, animated: false });
          }}
        >
          <ThemedText type="caption1" themeColor="textSecondary" style={styles.inset}>
            ほかのアプリで見るには
          </ThemedText>
          <Card style={[styles.flowCard, styles.cardShadow]}>
            {FLOW_NODES.map((node, index) => (
              <FlowNode key={node.label} {...node} withArrow={index > 0} />
            ))}
          </Card>
          <Card style={[styles.listCard, styles.cardShadow]}>
            {STEPS.map((step, index) => (
              <StepRow key={step} number={index + 1} label={step} withTopBorder={index > 0} />
            ))}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

function ProviderRow({
  id,
  label,
  withTopBorder,
  isConnected,
  isConnecting,
  onConnect,
}: {
  id: CalendarProviderId;
  label: string;
  withTopBorder: boolean;
  /** undefined は確認中（右側を出さない）。 */
  isConnected: boolean | undefined;
  isConnecting: boolean;
  onConnect: () => void;
}) {
  const theme = useTheme();
  const canConnect = isConnected === false;

  return (
    <Pressable
      // 未連携の行だけ押せる。行全体（高さ64pt以上）を押せる範囲にする
      disabled={!canConnect || isConnecting}
      onPress={onConnect}
      accessibilityRole={canConnect ? 'button' : undefined}
      accessibilityLabel={
        isConnected === undefined
          ? label
          : `${label}、${isConnected ? '連携済み' : isConnecting ? '連携中' : '連携する'}`
      }
      style={({ pressed }) => [
        styles.providerRow,
        withTopBorder && styles.rowBorder,
        { borderTopColor: theme.border },
        pressed && canConnect && styles.pressed,
      ]}
    >
      <CalendarProviderIcon provider={id} />
      <ThemedText type="headline" style={styles.flexLabel} numberOfLines={1}>
        {label}
      </ThemedText>
      {isConnected === true && (
        <View style={styles.trailing}>
          <Check size={IconSize.small} color={theme.success} strokeWidth={3} />
          <ThemedText type="subheadline" themeColor="success" style={styles.trailingLabel}>
            連携済み
          </ThemedText>
        </View>
      )}
      {isConnected === false && (
        <View style={styles.trailing}>
          <ThemedText type="subheadline" themeColor="primary" style={styles.trailingLabel}>
            {isConnecting ? '連携中…' : '連携する'}
          </ThemedText>
          <ChevronRight size={IconSize.small} color={theme.primary} />
        </View>
      )}
    </Pressable>
  );
}

function FlowNode({
  label,
  tone,
  Icon,
  withArrow,
}: {
  label: string;
  tone: IconBadgeTone;
  Icon: typeof CalendarDays;
  withArrow: boolean;
}) {
  const theme = useTheme();
  const colors = useIconBadgeColors(tone);
  return (
    <>
      {withArrow && (
        <ChevronRight size={IconSize.small} color={theme.textSecondary} style={styles.flowArrow} />
      )}
      <View style={styles.flowNode}>
        <IconBadge tone={tone} size={FLOW_BADGE_SIZE}>
          <Icon size={FLOW_ICON_SIZE} color={colors.icon} />
        </IconBadge>
        {/* 「Google カレンダー」は幅375ptでも1行に収める（D2の確定）。収まらない文字サイズでは少しだけ縮める */}
        <ThemedText
          type="caption1"
          themeColor="textSecondary"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </ThemedText>
      </View>
    </>
  );
}

function StepRow({
  number,
  label,
  withTopBorder,
}: {
  number: number;
  label: string;
  withTopBorder: boolean;
}) {
  const theme = useTheme();
  const blueBadge = useIconBadgeColors('blue');
  return (
    <View
      style={[styles.stepRow, withTopBorder && styles.rowBorder, { borderTopColor: theme.border }]}
    >
      <View style={[styles.stepNumber, { backgroundColor: blueBadge.background }]}>
        <ThemedText type="footnote" themeColor="primary" style={styles.stepNumberText}>
          {number}
        </ThemedText>
      </View>
      <ThemedText type="subheadline" style={styles.flexLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  scrollContent: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  group: {
    gap: Spacing.two,
  },
  inset: {
    paddingHorizontal: Spacing.one,
  },
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.6,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - Spacing.one,
  },
  flexLabel: {
    flex: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  trailingLabel: {
    fontWeight: '500',
  },
  flowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  flowNode: {
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  flowArrow: {
    // 丸の真ん中の高さにそろえる
    marginTop: (FLOW_BADGE_SIZE - IconSize.small) / 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.three,
  },
  stepNumber: {
    width: STEP_NUMBER_SIZE,
    height: STEP_NUMBER_SIZE,
    borderRadius: STEP_NUMBER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontWeight: '600',
  },
});
