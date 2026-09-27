import {
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coffee,
  Coins,
  Home,
  Info,
  Moon,
  MoonStar,
  Pencil,
  Plus,
  SlidersHorizontal,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Umbrella,
  User,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card } from '@/components/card';
import { Dialog } from '@/components/dialog';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Radius, Spacing, type IconBadgeTone } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_USER_SETTINGS, type BreakRule, type PremiumRule } from '@/models';
import { useAppStore } from '@/store/useAppStore';
import { computeShiftBreakdown, hoursBetween } from '@/utils/computePayroll';
import { formatShiftTimeRange } from '@/utils/formatShift';

const CALENDAR_PROVIDER_LABEL = {
  apple: 'Apple カレンダー',
  google: 'Google カレンダー',
} as const;

const WAGE_TYPE_LABEL = {
  hourly: '時給',
  daily: '日給',
} as const;

interface ShiftTypeFields {
  name: string;
  startTime: string;
  endTime: string;
}

/** 名前変更・削除ができない基本3種別(早番/遅番/夜勤、時間だけ編集可)。 */
const BASE_SHIFT_TYPE_IDS = new Set(['early', 'late', 'night']);

/** シフト種別カードのアイコン選択肢。`key`をShiftType.iconに保存し、未設定分はindexで循環表示する。 */
const SHIFT_TYPE_ICON_PRESETS: { key: string; Icon: LucideIcon; tone: IconBadgeTone }[] = [
  { key: 'sun', Icon: Sun, tone: 'orange' },
  { key: 'sunset', Icon: Sunset, tone: 'purple' },
  { key: 'moon-star', Icon: MoonStar, tone: 'blue' },
  { key: 'coffee', Icon: Coffee, tone: 'green' },
  { key: 'briefcase', Icon: Briefcase, tone: 'red' },
  { key: 'star', Icon: Star, tone: 'neutral' },
  { key: 'umbrella', Icon: Umbrella, tone: 'orange' },
  { key: 'zap', Icon: Zap, tone: 'purple' },
  { key: 'home', Icon: Home, tone: 'blue' },
  { key: 'clock', Icon: Clock, tone: 'green' },
];

const ROW_ICON_SIZE = 20;

const formatYen = (amount: number) => `${Math.round(amount).toLocaleString('ja-JP')}円`;

const formatWorkedHours = (hours: number) => {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

/**
 * shiftType の時間帯が深夜手当バンドと重なるかどうかの簡易判定(分単位の厳密な重なり計算はせず、
 * 日をまたぐケースを含めておおまかに前後1日分をチェックする)。
 */
function overlapsBand(
  startTime: string,
  endTime: string,
  band: Pick<PremiumRule, 'startTime' | 'endTime'>,
): boolean {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const shiftStart = toMinutes(startTime);
  let shiftEnd = toMinutes(endTime);
  if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;

  const bandStart = toMinutes(band.startTime);
  let bandEnd = toMinutes(band.endTime);
  if (bandEnd <= bandStart) bandEnd += 24 * 60;

  return [-24 * 60, 0, 24 * 60].some((offset) => {
    const occStart = bandStart + offset;
    const occEnd = bandEnd + offset;
    return shiftStart < occEnd && shiftEnd > occStart;
  });
}

/** テンプレタブ: シフト登録の挙動そのものを決める設定 (requirements section 4, 13). */
export default function TemplateTab() {
  const theme = useTheme();
  const blueBadge = useIconBadgeColors('blue');
  const greenBadge = useIconBadgeColors('green');
  const orangeBadge = useIconBadgeColors('orange');
  const purpleBadge = useIconBadgeColors('purple');
  const redBadge = useIconBadgeColors('red');
  const neutralBadge = useIconBadgeColors('neutral');
  const badgeColorsByTone: Record<IconBadgeTone, { background: string; icon: string }> = {
    blue: blueBadge,
    green: greenBadge,
    orange: orangeBadge,
    purple: purpleBadge,
    red: redBadge,
    neutral: neutralBadge,
  };
  const user = useAppStore((state) => state.user);
  const shiftTypes = useAppStore((state) => state.shiftTypes);
  const setShiftName = useAppStore((state) => state.setShiftName);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const upsertShiftType = useAppStore((state) => state.upsertShiftType);
  const removeShiftType = useAppStore((state) => state.removeShiftType);
  const settings = user?.settings ?? DEFAULT_USER_SETTINGS;

  const [isNameDialogOpen, setNameDialogOpen] = useState(false);
  const [editingShiftTypeId, setEditingShiftTypeId] = useState<string | null>(null);
  const [addDraft, setAddDraft] = useState<
    (ShiftTypeFields & { id: string; icon?: string }) | null
  >(null);
  const [isWageDialogOpen, setWageDialogOpen] = useState(false);
  const [isBreakDialogOpen, setBreakDialogOpen] = useState(false);
  const [isLateNightDialogOpen, setLateNightDialogOpen] = useState(false);
  const [isEarlyMorningDialogOpen, setEarlyMorningDialogOpen] = useState(false);

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  const editingShiftType = shiftTypes.find((item) => item.id === editingShiftTypeId);

  const updateBreakRule = (index: number, patch: Partial<BreakRule>) => {
    const breakRules = settings.breakRules.map((rule, i) =>
      i === index ? { ...rule, ...patch } : rule,
    );
    updateSettings({ breakRules });
  };

  const updatePremium = (
    key: 'lateNightPremium' | 'earlyMorningPremium',
    patch: Partial<PremiumRule>,
  ) => {
    updateSettings({ [key]: { ...settings[key], ...patch } });
  };

  // Pro課金導入後、「新しいシフト種別を追加」ボタンの遷移先をこの関数に戻す想定で残している。
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleStartAdd = () => {
    setAddDraft({
      id: `custom-${Date.now()}`,
      name: '新しい種別',
      startTime: '09:00',
      endTime: '18:00',
      icon: SHIFT_TYPE_ICON_PRESETS[0].key,
    });
  };

  const handleConfirmAdd = () => {
    if (addDraft) upsertShiftType(addDraft);
    setAddDraft(null);
  };

  const renderShiftTypeFields = (
    values: ShiftTypeFields,
    onChange: (patch: Partial<ShiftTypeFields>) => void,
    nameEditable = true,
  ) => (
    <>
      {nameEditable ? (
        <TextInput
          value={values.name}
          onChangeText={(name) => onChange({ name })}
          style={inputStyle}
        />
      ) : (
        <ThemedText type="headline">{values.name}</ThemedText>
      )}
      <View style={styles.timeRow}>
        <TextInput
          value={values.startTime}
          onChangeText={(startTime) => onChange({ startTime })}
          style={[inputStyle, styles.timeInput]}
        />
        <ThemedText>〜</ThemedText>
        <TextInput
          value={values.endTime}
          onChangeText={(endTime) => onChange({ endTime })}
          style={[inputStyle, styles.timeInput]}
        />
      </View>
    </>
  );

  return (
    <Screen>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle">テンプレ</ThemedText>
        <AdPlaceholder slot="template" size="inline" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.block}>
          <ThemedText type="caption1" themeColor="textSecondary" style={styles.sectionHeaderLabel}>
            基本情報 & 連携
          </ThemedText>

          <Card style={styles.group}>
            <Pressable onPress={() => setNameDialogOpen(true)} style={styles.infoRow}>
              <IconBadge tone="blue">
                <User size={ROW_ICON_SIZE} color={blueBadge.icon} />
              </IconBadge>
              <View style={styles.infoRowLabel}>
                <ThemedText type="footnote" themeColor="textSecondary">
                  登録者キーワード
                </ThemedText>
                <ThemedText type="headline">{user?.shiftName || '未設定'}</ThemedText>
              </View>
              <View style={styles.changeAffordance}>
                <ThemedText type="subheadline" themeColor="primary">
                  変更
                </ThemedText>
                <ChevronRight size={IconSize.small} color={theme.primary} />
              </View>
            </Pressable>

            <View style={[styles.infoRow, styles.blockBorder, { borderTopColor: theme.border }]}>
              <IconBadge tone="green">
                <CheckCircle2 size={ROW_ICON_SIZE} color={greenBadge.icon} />
              </IconBadge>
              <View style={styles.infoRowLabel}>
                <ThemedText type="footnote" themeColor="textSecondary">
                  連携カレンダー
                </ThemedText>
                <ThemedText type="headline" style={styles.regularWeight}>
                  {CALENDAR_PROVIDER_LABEL[settings.defaultCalendarProvider]}
                </ThemedText>
              </View>
              <View style={[styles.connectedTag, { backgroundColor: greenBadge.background }]}>
                <CheckCircle2 size={IconSize.small} color={theme.success} />
                <ThemedText type="caption2" themeColor="success">
                  連携済み
                </ThemedText>
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/settings/calendar-providers')}
              style={[styles.otherRow, styles.blockBorder, { borderTopColor: theme.border }]}
            >
              <ThemedText type="body">その他カレンダーとの連携</ThemedText>
              <ChevronRight size={IconSize.medium} color={theme.textSecondary} />
            </Pressable>

            <View style={[styles.infoRow, styles.blockBorder, { borderTopColor: theme.border }]}>
              <IconBadge tone="orange">
                <Wallet size={ROW_ICON_SIZE} color={orangeBadge.icon} />
              </IconBadge>
              <ThemedText type="subheadline" themeColor="textSecondary" style={styles.flexLabel}>
                給与形態
              </ThemedText>
              <View style={[styles.wageTypeToggle, { backgroundColor: theme.background }]}>
                {(['hourly', 'daily'] as const).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => updateSettings({ wageType: option })}
                    style={[
                      styles.wageTypeChoice,
                      settings.wageType === option && [
                        styles.wageTypeChoiceSelected,
                        { backgroundColor: theme.backgroundElement },
                      ],
                    ]}
                  >
                    <ThemedText
                      type="caption1"
                      style={settings.wageType === option && { fontWeight: '600' }}
                    >
                      {WAGE_TYPE_LABEL[option]}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={() => setWageDialogOpen(true)}
              style={[styles.infoRow, styles.blockBorder, { borderTopColor: theme.border }]}
            >
              <IconBadge tone="blue">
                <Coins size={ROW_ICON_SIZE} color={blueBadge.icon} />
              </IconBadge>
              <ThemedText type="body" style={styles.flexLabel}>
                {settings.wageType === 'hourly' ? '基本時給' : '基本日給'}
              </ThemedText>
              <View style={styles.wageAmountRow}>
                <ThemedText type="title3" themeColor="primary">
                  {formatYen(
                    settings.wageType === 'hourly' ? settings.hourlyWage : settings.dailyWage,
                  )}
                </ThemedText>
                <Pencil size={IconSize.small} color={theme.textSecondary} />
              </View>
            </Pressable>
          </Card>
        </View>

        <View style={styles.block}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText
              type="caption1"
              themeColor="textSecondary"
              style={styles.sectionHeaderLabel}
            >
              手当 & 休憩自動控除
            </ThemedText>
          </View>
          <Card style={styles.group}>
            <View style={styles.premiumBlock}>
              <View style={styles.infoRow}>
                <IconBadge tone="green">
                  <Coffee size={ROW_ICON_SIZE} color={greenBadge.icon} />
                </IconBadge>
                <ThemedText type="headline" style={styles.flexLabel}>
                  休憩時間（自動控除）
                </ThemedText>
                <Switch
                  value={settings.breakDeductionEnabled}
                  onValueChange={(value) => updateSettings({ breakDeductionEnabled: value })}
                  trackColor={{ false: theme.border, true: theme.success }}
                />
              </View>
              {settings.breakDeductionEnabled && (
                <View style={[styles.nestedGroup, { backgroundColor: theme.background }]}>
                  {settings.breakRules.map((rule, index) => (
                    <View
                      key={index}
                      style={[
                        styles.nestedRow,
                        index > 0 && styles.nestedDivider,
                        { borderTopColor: theme.border },
                      ]}
                    >
                      <ThemedText type="subheadline" style={styles.boldSubheadline}>
                        {rule.minHours}時間以上で {rule.minutes}分
                      </ThemedText>
                      <Pressable
                        onPress={() => setBreakDialogOpen(true)}
                        style={styles.nestedEditAffordance}
                        hitSlop={Spacing.two}
                      >
                        <SlidersHorizontal size={IconSize.small} color={theme.primary} />
                        <ThemedText type="caption1" themeColor="primary" style={styles.boldWeight}>
                          編集
                        </ThemedText>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {settings.wageType === 'hourly' && (
              <>
                <View
                  style={[
                    styles.premiumBlock,
                    styles.blockBorder,
                    { borderTopColor: theme.border },
                  ]}
                >
                  <View style={styles.infoRow}>
                    <IconBadge tone="purple">
                      <Moon size={ROW_ICON_SIZE} color={purpleBadge.icon} />
                    </IconBadge>
                    <View style={styles.infoRowLabel}>
                      <ThemedText type="headline">深夜割増手当</ThemedText>
                      <ThemedText type="caption1" themeColor="textSecondary">
                        深夜時間帯の時給を割増計算
                      </ThemedText>
                    </View>
                    <Switch
                      value={settings.lateNightPremium.enabled}
                      onValueChange={(value) =>
                        updatePremium('lateNightPremium', { enabled: value })
                      }
                      trackColor={{ false: theme.border, true: theme.success }}
                    />
                  </View>
                  {settings.lateNightPremium.enabled && (
                    <View style={[styles.premiumRow, { backgroundColor: theme.background }]}>
                      <View style={styles.premiumRowLeft}>
                        <View style={[styles.premiumDot, { backgroundColor: blueBadge.icon }]} />
                        <ThemedText
                          type="subheadline"
                          style={styles.boldSubheadline}
                          numberOfLines={1}
                        >
                          {formatShiftTimeRange(
                            settings.lateNightPremium.startTime,
                            settings.lateNightPremium.endTime,
                            settings.lateNightPremium.endTime <=
                              settings.lateNightPremium.startTime,
                          )}
                        </ThemedText>
                        <View style={[styles.ratePill, { backgroundColor: blueBadge.background }]}>
                          <ThemedText type="caption2" style={{ color: blueBadge.icon }}>
                            +{settings.lateNightPremium.ratePercent}%
                          </ThemedText>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => setLateNightDialogOpen(true)}
                        style={styles.nestedEditAffordance}
                        hitSlop={Spacing.two}
                      >
                        <Pencil size={IconSize.small} color={theme.primary} />
                        <ThemedText type="caption1" themeColor="primary" style={styles.boldWeight}>
                          編集
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.premiumBlock,
                    styles.blockBorder,
                    { borderTopColor: theme.border },
                  ]}
                >
                  <View style={styles.infoRow}>
                    <IconBadge tone="orange">
                      <Sunrise size={ROW_ICON_SIZE} color={orangeBadge.icon} />
                    </IconBadge>
                    <View style={styles.infoRowLabel}>
                      <ThemedText type="headline">早朝割増手当</ThemedText>
                      <ThemedText type="caption1" themeColor="textSecondary">
                        朝の開店準備・清掃シフト向け
                      </ThemedText>
                    </View>
                    <Switch
                      value={settings.earlyMorningPremium.enabled}
                      onValueChange={(value) =>
                        updatePremium('earlyMorningPremium', { enabled: value })
                      }
                      trackColor={{ false: theme.border, true: theme.success }}
                    />
                  </View>
                  {settings.earlyMorningPremium.enabled && (
                    <View style={[styles.premiumRow, { backgroundColor: theme.background }]}>
                      <View style={styles.premiumRowLeft}>
                        <View style={[styles.premiumDot, { backgroundColor: orangeBadge.icon }]} />
                        <ThemedText
                          type="subheadline"
                          style={styles.boldSubheadline}
                          numberOfLines={1}
                        >
                          {formatShiftTimeRange(
                            settings.earlyMorningPremium.startTime,
                            settings.earlyMorningPremium.endTime,
                            settings.earlyMorningPremium.endTime <=
                              settings.earlyMorningPremium.startTime,
                          )}
                        </ThemedText>
                        <View
                          style={[styles.ratePill, { backgroundColor: orangeBadge.background }]}
                        >
                          <ThemedText type="caption2" style={{ color: orangeBadge.icon }}>
                            +{settings.earlyMorningPremium.ratePercent}%
                          </ThemedText>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => setEarlyMorningDialogOpen(true)}
                        style={styles.nestedEditAffordance}
                        hitSlop={Spacing.two}
                      >
                        <Pencil size={IconSize.small} color={theme.primary} />
                        <ThemedText type="caption1" themeColor="primary" style={styles.boldWeight}>
                          編集
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>
              </>
            )}
          </Card>
        </View>

        <View style={styles.block}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.shiftTypeHeaderLeft}>
              <ThemedText
                type="caption1"
                themeColor="textSecondary"
                style={styles.sectionHeaderLabel}
              >
                シフト種別セット
              </ThemedText>
              <ThemedText type="caption1" themeColor="primary" style={styles.boldWeight}>
                （{shiftTypes.length}件登録）
              </ThemedText>
            </View>
          </View>
          <Card style={styles.group}>
            {shiftTypes.length === 0 ? (
              <View style={styles.infoRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  まだシフト種別がありません
                </ThemedText>
              </View>
            ) : (
              shiftTypes.map((shiftType, index) => {
                const fallbackPreset =
                  SHIFT_TYPE_ICON_PRESETS[index % SHIFT_TYPE_ICON_PRESETS.length];
                const { Icon: PresetIcon, tone: presetTone } = shiftType.icon
                  ? (SHIFT_TYPE_ICON_PRESETS.find((preset) => preset.key === shiftType.icon) ??
                    fallbackPreset)
                  : fallbackPreset;
                const presetColors = badgeColorsByTone[presetTone];
                const isOvernight = shiftType.endTime <= shiftType.startTime;
                const workedHours = hoursBetween(shiftType.startTime, shiftType.endTime);
                const hasLateNightPremium =
                  settings.wageType === 'hourly' &&
                  settings.lateNightPremium.enabled &&
                  overlapsBand(shiftType.startTime, shiftType.endTime, settings.lateNightPremium);
                const breakdown = computeShiftBreakdown(
                  shiftType.startTime,
                  shiftType.endTime,
                  settings.wageType,
                  settings.hourlyWage,
                  settings.dailyWage,
                  settings.breakDeductionEnabled,
                  settings.breakRules,
                  settings.lateNightPremium,
                  settings.earlyMorningPremium,
                );

                return (
                  <Pressable
                    key={shiftType.id}
                    onPress={() => setEditingShiftTypeId(shiftType.id)}
                    style={[
                      styles.shiftTypeRow,
                      index > 0 && styles.blockBorder,
                      { borderTopColor: theme.border },
                    ]}
                  >
                    <IconBadge tone={presetTone} size={44}>
                      <PresetIcon size={IconSize.medium} color={presetColors.icon} />
                    </IconBadge>
                    <View style={styles.rowLabel}>
                      <View style={styles.shiftTypeMetaRow}>
                        <ThemedText type="headline">{shiftType.name}</ThemedText>
                        <View style={[styles.metaPill, { backgroundColor: blueBadge.background }]}>
                          <ThemedText type="caption2" style={{ color: blueBadge.icon }}>
                            実働{formatWorkedHours(workedHours)}h
                          </ThemedText>
                        </View>
                        {hasLateNightPremium && (
                          <View
                            style={[styles.metaPill, { backgroundColor: purpleBadge.background }]}
                          >
                            <ThemedText type="caption2" style={{ color: purpleBadge.icon }}>
                              深夜割増
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText type="footnote" themeColor="textSecondary">
                        {formatShiftTimeRange(shiftType.startTime, shiftType.endTime, isOvernight)}
                      </ThemedText>
                    </View>
                    <View style={styles.shiftTypeAmountColumn}>
                      <ThemedText type="headline">{formatYen(breakdown.earnings)}</ThemedText>
                      <View style={styles.editAffordance}>
                        <ThemedText type="caption1" themeColor="primary">
                          編集
                        </ThemedText>
                        <ChevronRight size={IconSize.small} color={theme.primary} />
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Card>

          <View style={styles.shiftTypeHint}>
            <Info size={IconSize.small} color={theme.textSecondary} style={styles.hintIcon} />
            <ThemedText type="caption2" themeColor="textSecondary" style={styles.hintText}>
              カメラでシフト表を撮影すると、ここに登録した名前と時間帯がAIによる読み取りの手がかりとして使われます。
            </ThemedText>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/paywall')}
          style={[styles.addBigButton, { backgroundColor: blueBadge.background }]}
        >
          <Plus size={IconSize.medium} color={blueBadge.icon} />
          <ThemedText type="headline" style={{ color: blueBadge.icon }}>
            新しいシフト種別を追加
          </ThemedText>
        </Pressable>
      </ScrollView>

      <Dialog visible={isNameDialogOpen} onClose={() => setNameDialogOpen(false)}>
        <ThemedText type="smallBold">登録者キーワードを編集</ThemedText>
        <TextInput
          value={user?.shiftName ?? ''}
          onChangeText={setShiftName}
          placeholder="シフト表に書かれている自分の名前"
          style={inputStyle}
          autoFocus
        />
        <ThemedText type="footnote" themeColor="textSecondary">
          このキーワードをもとに、AIがシフト表からあなたの行を抽出します。
        </ThemedText>
        <PrimaryButton label="閉じる" onPress={() => setNameDialogOpen(false)} />
      </Dialog>

      <Dialog visible={!!editingShiftType} onClose={() => setEditingShiftTypeId(null)}>
        {editingShiftType &&
          (() => {
            const isBaseShiftType = BASE_SHIFT_TYPE_IDS.has(editingShiftType.id);
            return (
              <>
                <ThemedText type="smallBold">シフト種別を編集</ThemedText>
                {renderShiftTypeFields(
                  editingShiftType,
                  (patch) => upsertShiftType({ ...editingShiftType, ...patch }),
                  !isBaseShiftType,
                )}
                <View style={[styles.dialogActions, isBaseShiftType && styles.dialogActionsSingle]}>
                  {!isBaseShiftType && (
                    <Pressable
                      onPress={() => {
                        removeShiftType(editingShiftType.id);
                        setEditingShiftTypeId(null);
                      }}
                      style={styles.editAffordance}
                      hitSlop={Spacing.two}
                    >
                      <ThemedText themeColor="danger">削除</ThemedText>
                    </Pressable>
                  )}
                  <PrimaryButton label="閉じる" onPress={() => setEditingShiftTypeId(null)} />
                </View>
              </>
            );
          })()}
      </Dialog>

      <Dialog visible={!!addDraft} onClose={() => setAddDraft(null)}>
        {addDraft && (
          <>
            <ThemedText type="smallBold">シフト種別を追加</ThemedText>
            {renderShiftTypeFields(addDraft, (patch) =>
              setAddDraft((current) => (current ? { ...current, ...patch } : current)),
            )}
            <ThemedText type="footnote" themeColor="textSecondary">
              アイコン
            </ThemedText>
            <View style={styles.iconGrid}>
              {SHIFT_TYPE_ICON_PRESETS.map(({ key, Icon, tone }) => {
                const isSelected = addDraft.icon === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() =>
                      setAddDraft((current) => (current ? { ...current, icon: key } : current))
                    }
                    style={[
                      styles.iconGridItem,
                      {
                        borderColor: isSelected ? theme.primary : 'transparent',
                        backgroundColor: isSelected ? theme.backgroundElement : 'transparent',
                      },
                    ]}
                  >
                    <IconBadge tone={tone}>
                      <Icon size={ROW_ICON_SIZE} color={badgeColorsByTone[tone].icon} />
                    </IconBadge>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setAddDraft(null)}
                style={styles.editAffordance}
                hitSlop={Spacing.two}
              >
                <ThemedText themeColor="textSecondary">戻る</ThemedText>
              </Pressable>
              <PrimaryButton label="追加" onPress={handleConfirmAdd} />
            </View>
          </>
        )}
      </Dialog>

      <Dialog visible={isWageDialogOpen} onClose={() => setWageDialogOpen(false)}>
        <ThemedText type="smallBold">
          {settings.wageType === 'hourly' ? '時給' : '日給'}を編集
        </ThemedText>
        <View style={styles.row}>
          <TextInput
            value={String(
              settings.wageType === 'hourly' ? settings.hourlyWage : settings.dailyWage,
            )}
            onChangeText={(value) =>
              updateSettings(
                settings.wageType === 'hourly'
                  ? { hourlyWage: Number(value) || 0 }
                  : { dailyWage: Number(value) || 0 },
              )
            }
            keyboardType="number-pad"
            style={[inputStyle, styles.wageAmountInput]}
            autoFocus
          />
          <ThemedText themeColor="textSecondary">円</ThemedText>
        </View>
        <PrimaryButton label="閉じる" onPress={() => setWageDialogOpen(false)} />
      </Dialog>

      <Dialog visible={isBreakDialogOpen} onClose={() => setBreakDialogOpen(false)}>
        <ThemedText type="smallBold">休憩時間を編集</ThemedText>
        {settings.breakRules.map((rule, index) => (
          <View key={index} style={styles.timeRow}>
            <TextInput
              value={String(rule.minHours)}
              onChangeText={(value) => updateBreakRule(index, { minHours: Number(value) || 0 })}
              keyboardType="number-pad"
              style={[inputStyle, styles.smallAmountInput]}
            />
            <ThemedText themeColor="textSecondary">時間以上で</ThemedText>
            <TextInput
              value={String(rule.minutes)}
              onChangeText={(value) => updateBreakRule(index, { minutes: Number(value) || 0 })}
              keyboardType="number-pad"
              style={[inputStyle, styles.smallAmountInput]}
            />
            <ThemedText themeColor="textSecondary">分</ThemedText>
          </View>
        ))}
        <PrimaryButton label="閉じる" onPress={() => setBreakDialogOpen(false)} />
      </Dialog>

      <Dialog visible={isLateNightDialogOpen} onClose={() => setLateNightDialogOpen(false)}>
        <ThemedText type="smallBold">深夜手当を編集</ThemedText>
        <View style={styles.timeRow}>
          <TextInput
            value={settings.lateNightPremium.startTime}
            onChangeText={(startTime) => updatePremium('lateNightPremium', { startTime })}
            style={[inputStyle, styles.timeAmountInput]}
          />
          <ThemedText themeColor="textSecondary">〜</ThemedText>
          <TextInput
            value={settings.lateNightPremium.endTime}
            onChangeText={(endTime) => updatePremium('lateNightPremium', { endTime })}
            style={[inputStyle, styles.timeAmountInput]}
          />
        </View>
        <View style={styles.timeRow}>
          <ThemedText themeColor="textSecondary">時給に+</ThemedText>
          <TextInput
            value={String(settings.lateNightPremium.ratePercent)}
            onChangeText={(value) =>
              updatePremium('lateNightPremium', { ratePercent: Number(value) || 0 })
            }
            keyboardType="number-pad"
            style={[inputStyle, styles.smallAmountInput]}
          />
          <ThemedText themeColor="textSecondary">%</ThemedText>
        </View>
        <PrimaryButton label="閉じる" onPress={() => setLateNightDialogOpen(false)} />
      </Dialog>

      <Dialog visible={isEarlyMorningDialogOpen} onClose={() => setEarlyMorningDialogOpen(false)}>
        <ThemedText type="smallBold">早朝手当を編集</ThemedText>
        <View style={styles.timeRow}>
          <TextInput
            value={settings.earlyMorningPremium.startTime}
            onChangeText={(startTime) => updatePremium('earlyMorningPremium', { startTime })}
            style={[inputStyle, styles.timeAmountInput]}
          />
          <ThemedText themeColor="textSecondary">〜</ThemedText>
          <TextInput
            value={settings.earlyMorningPremium.endTime}
            onChangeText={(endTime) => updatePremium('earlyMorningPremium', { endTime })}
            style={[inputStyle, styles.timeAmountInput]}
          />
        </View>
        <View style={styles.timeRow}>
          <ThemedText themeColor="textSecondary">時給に+</ThemedText>
          <TextInput
            value={String(settings.earlyMorningPremium.ratePercent)}
            onChangeText={(value) =>
              updatePremium('earlyMorningPremium', { ratePercent: Number(value) || 0 })
            }
            keyboardType="number-pad"
            style={[inputStyle, styles.smallAmountInput]}
          />
          <ThemedText themeColor="textSecondary">%</ThemedText>
        </View>
        <PrimaryButton label="閉じる" onPress={() => setEarlyMorningDialogOpen(false)} />
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scrollContent: {
    gap: Spacing.four,
    paddingBottom: BottomTabInset,
  },
  group: {
    padding: 0,
  },
  block: {
    gap: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  sectionHeaderLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  shiftTypeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  blockBorder: {
    borderTopWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  infoRowLabel: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  flexLabel: {
    flex: 1,
  },
  regularWeight: {
    fontWeight: '400',
  },
  changeAffordance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  connectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    paddingLeft: 52,
  },
  premiumBlock: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  nestedGroup: {
    marginLeft: 48,
    borderRadius: Radius.smallLarge,
    overflow: 'hidden',
  },
  nestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  nestedDivider: {
    borderTopWidth: 1,
  },
  nestedEditAffordance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    padding: Spacing.one,
    flexShrink: 0,
  },
  boldSubheadline: {
    fontWeight: '700',
  },
  boldWeight: {
    fontWeight: '600',
  },
  premiumRow: {
    marginLeft: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.smallLarge,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  premiumRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
    minWidth: 0,
  },
  premiumDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ratePill: {
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  shiftTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  rowLabel: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  editAffordance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    padding: Spacing.one,
  },
  shiftTypeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  metaPill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  shiftTypeAmountColumn: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  shiftTypeHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  hintIcon: {
    marginTop: 2,
  },
  hintText: {
    flex: 1,
    lineHeight: 15,
  },
  addBigButton: {
    height: 48,
    borderRadius: Radius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timeInput: {
    flex: 1,
    minWidth: 0,
  },
  wageTypeToggle: {
    flexDirection: 'row',
    borderRadius: Radius.small,
    padding: 2,
  },
  wageTypeChoice: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small - 2,
  },
  wageTypeChoiceSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  wageAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  wageAmountInput: {
    width: 96,
    textAlign: 'right',
  },
  smallAmountInput: {
    width: 56,
    textAlign: 'right',
    paddingHorizontal: Spacing.two,
  },
  timeAmountInput: {
    width: 64,
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
  dialogActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dialogActionsSingle: {
    justifyContent: 'flex-end',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  iconGridItem: {
    borderRadius: Radius.medium,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: Spacing.half,
  },
});
