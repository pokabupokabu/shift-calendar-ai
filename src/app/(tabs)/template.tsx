import {
  CheckCircle2,
  ChevronRight,
  Coffee,
  Coins,
  Info,
  Lock,
  Moon,
  Plus,
  Sunrise,
  User,
  Wallet,
} from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card } from '@/components/card';
import { Dialog } from '@/components/dialog';
import { HakobuMascot } from '@/components/hakobu-mascot';
import { IconBadge } from '@/components/icon-badge';
import { SecondaryButton } from '@/components/secondary-button';
import { Screen } from '@/components/screen';
import {
  CalendarProviderIcon,
  OtherCalendarsIcon,
} from '@/components/template/calendar-provider-icon';
import { DialogBody } from '@/components/template/dialog-body';
import {
  DialogButtonRow,
  DialogTextInput,
  DialogTitle,
  FilledPillButton,
} from '@/components/template/dialog-parts';
import { EditAffordance } from '@/components/template/edit-affordance';
import { PremiumForm } from '@/components/template/premium-form';
import { formatShiftTypeTime, ShiftTypeForm } from '@/components/template/shift-type-form';
import { WorkplaceTabs } from '@/components/template/workplace-tabs';
import { ThemedText } from '@/components/themed-text';
import { TourTarget } from '@/components/tour/tour-target';
import { resolveShiftTypePreset, SHIFT_TYPE_ICON_PRESETS } from '@/constants/shiftTypeIcons';
import { BottomTabInset, IconBadgeTones, IconSize, Radius, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useTourStepOnFocus } from '@/hooks/use-tour-step';
import {
  DEFAULT_WORKPLACE_SETTINGS,
  isShiftTypeRegistered,
  type BreakRule,
  type CalendarProviderId,
  type PremiumRule,
  type ShiftType,
  type Workplace,
  type WorkplaceSettings,
} from '@/models';
import { getConnectedProviders } from '@/services/calendar/getConnectedProviders';
import { useAppStore } from '@/store/useAppStore';
import { useTourStore } from '@/store/useTourStore';
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

/** 名前変更・削除ができない基本3種別(早番/遅番/夜勤、時間だけ編集可)。 */
const BASE_SHIFT_TYPE_IDS = new Set(['early', 'late', 'night']);

/** PROで追加できるシフト種別の数。基本3種と合わせて合計8つまで。 */
const MAX_ADDED_SHIFT_TYPES = 5;
const MAX_SHIFT_TYPES = BASE_SHIFT_TYPE_IDS.size + MAX_ADDED_SHIFT_TYPES;

/** PROで登録できる勤務先（掛け持ち）の数。 */
const MAX_WORKPLACES = 3;

const ROW_ICON_SIZE = 20;
/** 指で押しやすい最小の高さ。 */
const MIN_TAP_HEIGHT = 44;
/** 時給／日給の切り替えの、押せる範囲を上下に広げる分（見た目は①の「月／リスト」と同じ32pt、押せる範囲は44pt）。 */
const WAGE_TOGGLE_HIT_SLOP = { top: 6, bottom: 6, left: 0, right: 0 };

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

/** 必須基本情報に最初から並べるカレンダー（対応しているのはこの2つだけ）。 */
const CALENDAR_PROVIDER_IDS: CalendarProviderId[] = ['apple', 'google'];

/** マイカスタムタブ（ルート名は template）: シフト登録の挙動そのものを決める設定 (requirements section 4, 13). */
export default function TemplateTab() {
  const theme = useTheme();
  const blueBadge = useIconBadgeColors('blue');
  const greenBadge = useIconBadgeColors('green');
  const orangeBadge = useIconBadgeColors('orange');
  const goldBadge = useIconBadgeColors('gold');
  const user = useAppStore((state) => state.user);
  const setShiftName = useAppStore((state) => state.setShiftName);
  const setShiftTableHasNoNames = useAppStore((state) => state.setShiftTableHasNoNames);
  const shiftTableHasNoNames = user?.shiftTableHasNoNames ?? false;
  const addWorkplace = useAppStore((state) => state.addWorkplace);
  const removeWorkplace = useAppStore((state) => state.removeWorkplace);
  const renameWorkplace = useAppStore((state) => state.renameWorkplace);
  const setActiveWorkplace = useAppStore((state) => state.setActiveWorkplace);
  const updateWorkplaceSettings = useAppStore((state) => state.updateWorkplaceSettings);
  const upsertShiftType = useAppStore((state) => state.upsertShiftType);
  const removeShiftType = useAppStore((state) => state.removeShiftType);
  const isPro = user?.settings.isPro ?? false;
  const workplaces = user?.workplaces ?? [];

  const activeWorkplace =
    workplaces.find((workplace) => workplace.id === user?.activeWorkplaceId) ?? workplaces[0];
  const settings = activeWorkplace?.settings ?? DEFAULT_WORKPLACE_SETTINGS;
  // 連携の画面から戻ってきたときに状態を取り直すため、タブが表示されるたびに確認する
  const [connectedProviderIds, setConnectedProviderIds] = useState<CalendarProviderId[]>(['apple']);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getConnectedProviders().then((ids) => {
        if (active) setConnectedProviderIds(ids);
      });
      return () => {
        active = false;
      };
    }, []),
  );
  const shiftTypes = activeWorkplace?.shiftTypes ?? [];

  const [isNameDialogOpen, setNameDialogOpen] = useState(false);
  const tourStep = useTourStore((state) => state.step);
  const goToTourStep = useTourStore((state) => state.goTo);
  useTourStepOnFocus(
    useCallback(() => (useTourStore.getState().step === 'tabMyCustom' ? 'keywordRow' : null), []),
  );

  const openNameDialog = () => {
    setNameDialogOpen(true);
    if (tourStep === 'keywordRow') goToTourStep('keywordDialog');
  };
  const closeNameDialog = () => {
    setNameDialogOpen(false);
    if (tourStep !== 'keywordDialog') return;
    // 名前を入れた（または「名前が載っていない」を選んだ）ときだけ次へ。空のままなら入力からやり直す
    const state = useAppStore.getState();
    const named =
      Boolean(state.user?.shiftName?.trim()) || Boolean(state.user?.shiftTableHasNoNames);
    goToTourStep(named ? 'tabScan' : 'keywordRow');
  };
  const [editingShiftTypeId, setEditingShiftTypeId] = useState<string | null>(null);
  const [addDraft, setAddDraft] = useState<ShiftType | null>(null);
  const [isWageDialogOpen, setWageDialogOpen] = useState(false);
  const [isBreakDialogOpen, setBreakDialogOpen] = useState(false);
  const [isLateNightDialogOpen, setLateNightDialogOpen] = useState(false);
  const [isEarlyMorningDialogOpen, setEarlyMorningDialogOpen] = useState(false);
  const [isAddWorkplaceDialogOpen, setAddWorkplaceDialogOpen] = useState(false);
  const [newWorkplaceName, setNewWorkplaceName] = useState('');
  const [renameTarget, setRenameTarget] = useState<Workplace | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const editingShiftTypeIndex = shiftTypes.findIndex((item) => item.id === editingShiftTypeId);
  const editingShiftType =
    editingShiftTypeIndex >= 0 ? shiftTypes[editingShiftTypeIndex] : undefined;

  const updateBreakRule = (index: number, patch: Partial<BreakRule>) => {
    if (!activeWorkplace) return;
    const breakRules = settings.breakRules.map((rule, i) =>
      i === index ? { ...rule, ...patch } : rule,
    );
    updateWorkplaceSettings(activeWorkplace.id, { breakRules });
  };

  const updatePremium = (
    key: 'lateNightPremium' | 'earlyMorningPremium',
    patch: Partial<PremiumRule>,
  ) => {
    if (!activeWorkplace) return;
    updateWorkplaceSettings(activeWorkplace.id, { [key]: { ...settings[key], ...patch } });
  };

  const handlePressAddShiftType = () => {
    if (!isPro) {
      router.push('/paywall');
      return;
    }
    if (shiftTypes.length >= MAX_SHIFT_TYPES) {
      Alert.alert('シフト種別は8つまでです', '使っていない種別を削除すると、新しく追加できます。');
      return;
    }
    setAddDraft({
      id: `custom-${Date.now()}`,
      name: '新しい種別',
      startTime: '09:00',
      endTime: '18:00',
      icon: SHIFT_TYPE_ICON_PRESETS[0].key,
    });
  };

  const handleConfirmAdd = () => {
    if (addDraft && activeWorkplace) {
      upsertShiftType(activeWorkplace.id, { ...addDraft, name: addDraft.name.trim() });
    }
    setAddDraft(null);
  };

  const handlePressAddWorkplace = () => {
    if (!isPro) {
      router.push('/paywall');
      return;
    }
    setNewWorkplaceName('');
    setAddWorkplaceDialogOpen(true);
  };

  const handleConfirmAddWorkplace = () => {
    const name = newWorkplaceName.trim();
    if (name) addWorkplace(name);
    setAddWorkplaceDialogOpen(false);
    setNewWorkplaceName('');
  };

  const handleConfirmRemoveWorkplace = (workplace: Workplace) => {
    if (workplaces.length <= 1) {
      Alert.alert('削除できません', '最後の勤務先は削除できません。');
      return;
    }
    Alert.alert('この勤務先を削除しますか？', `「${workplace.name}」を削除します。`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => removeWorkplace(workplace.id) },
    ]);
  };

  const handleLongPressWorkplace = (workplace: Workplace) => {
    Alert.alert(workplace.name, undefined, [
      {
        text: '名前を変更',
        onPress: () => {
          setRenameTarget(workplace);
          setRenameDraft(workplace.name);
        },
      },
      {
        text: 'この勤務先を削除',
        style: 'destructive',
        onPress: () => handleConfirmRemoveWorkplace(workplace),
      },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  const handleConfirmRenameWorkplace = () => {
    const name = renameDraft.trim();
    if (renameTarget && name) renameWorkplace(renameTarget.id, name);
    setRenameTarget(null);
    setRenameDraft('');
  };

  return (
    <Screen>
      <ThemedText type="title1">マイカスタム</ThemedText>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 横長のバナー（320×50）。PROでは自動で消える。勤務先のタブとは押し間違えないよう24pt空ける */}
        <AdPlaceholder slot="template" />

        <WorkplaceTabs
          workplaces={workplaces}
          activeWorkplaceId={activeWorkplace?.id}
          onSelect={setActiveWorkplace}
          onLongPress={handleLongPressWorkplace}
          showAddButton={workplaces.length < MAX_WORKPLACES}
          showProTag={!isPro}
          onPressAdd={handlePressAddWorkplace}
        />

        <View style={styles.block}>
          <SectionLabel>必須基本情報</SectionLabel>

          <Card style={styles.group}>
            <TourTarget id="keyword-row">
              <Pressable onPress={openNameDialog} style={styles.infoRow}>
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
            </TourTarget>

            <View
              style={[
                styles.calendarSubHeader,
                styles.blockBorder,
                { borderTopColor: theme.border },
              ]}
            >
              <ThemedText type="footnote" themeColor="textSecondary">
                連携カレンダー
              </ThemedText>
            </View>
            {CALENDAR_PROVIDER_IDS.map((id) => {
              const isConnected = connectedProviderIds.includes(id);
              const isDefault = settings.defaultCalendarProvider === id;
              return (
                <Pressable
                  key={id}
                  disabled={isDefault}
                  onPress={() => {
                    if (!isConnected) {
                      router.push({
                        pathname: '/settings/calendar-connect',
                        params: { provider: id },
                      });
                      return;
                    }
                    if (activeWorkplace) {
                      updateWorkplaceSettings(activeWorkplace.id, { defaultCalendarProvider: id });
                    }
                  }}
                  style={[styles.infoRow, styles.blockBorder, { borderTopColor: theme.border }]}
                >
                  <CalendarProviderIcon provider={id} />
                  <View style={styles.infoRowLabel}>
                    <ThemedText type="body">{CALENDAR_PROVIDER_LABEL[id]}</ThemedText>
                    <ThemedText type="caption1" themeColor="textSecondary">
                      {isConnected ? '連携済み' : '未連携'}
                    </ThemedText>
                  </View>
                  {isDefault ? (
                    <View style={[styles.connectedTag, { backgroundColor: greenBadge.background }]}>
                      <CheckCircle2 size={IconSize.small} color={theme.success} />
                      <ThemedText type="caption2" themeColor="success">
                        登録先
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.changeAffordance}>
                      <ThemedText type="subheadline" themeColor="primary">
                        {isConnected ? '登録先にする' : '連携する'}
                      </ThemedText>
                      {!isConnected && <ChevronRight size={IconSize.small} color={theme.primary} />}
                    </View>
                  )}
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => router.push('/settings/other-calendars')}
              style={[styles.infoRow, styles.blockBorder, { borderTopColor: theme.border }]}
            >
              <OtherCalendarsIcon />
              <ThemedText type="body" style={styles.flexLabel}>
                その他カレンダーとの連携
              </ThemedText>
              <ChevronRight size={IconSize.medium} color={theme.textSecondary} />
            </Pressable>
          </Card>
        </View>

        <View style={styles.block}>
          <View style={styles.sectionLabelRow}>
            <SectionLabel>シフト種別セット</SectionLabel>
            <ThemedText type="caption1" themeColor="textSecondary">
              {shiftTypes.length}件
            </ThemedText>
          </View>
          <Card style={styles.group}>
            {shiftTypes.length === 0 ? (
              <View style={styles.infoRow}>
                <ThemedText type="subheadline" themeColor="textSecondary">
                  まだシフト種別がありません
                </ThemedText>
              </View>
            ) : (
              shiftTypes.map((shiftType, index) => (
                <ShiftTypeRow
                  key={shiftType.id}
                  shiftType={shiftType}
                  index={index}
                  settings={settings}
                  onPress={() => setEditingShiftTypeId(shiftType.id)}
                />
              ))
            )}
          </Card>

          <View style={styles.shiftTypeHint}>
            <Info size={IconSize.small} color={theme.textSecondary} style={styles.hintIcon} />
            <ThemedText type="caption2" themeColor="textSecondary" style={styles.hintText}>
              カメラでシフト表を撮影すると、ここに登録した名前と時間帯がAIによる読み取りの手がかりとして使われます。
            </ThemedText>
          </View>

          <Pressable
            onPress={handlePressAddShiftType}
            accessibilityRole="button"
            accessibilityLabel={isPro ? '新しいシフト種別を追加' : '新しいシフト種別を追加（PRO）'}
            style={({ pressed }) => [
              styles.addShiftTypeButton,
              {
                backgroundColor: blueBadge.background,
                borderColor: theme.primary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            {!isPro && <Lock size={IconSize.small} color={goldBadge.icon} />}
            <Plus size={IconSize.small} color={theme.primary} />
            <ThemedText type="headline" themeColor="primary">
              新しいシフト種別を追加
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.block}>
          <SectionLabel>給与関連情報</SectionLabel>
          <Card style={styles.group}>
            <View style={styles.infoRow}>
              <IconBadge tone="orange">
                <Wallet size={ROW_ICON_SIZE} color={orangeBadge.icon} />
              </IconBadge>
              <ThemedText type="body" style={styles.flexLabel}>
                給与形態
              </ThemedText>
              <View
                style={[
                  styles.wageTypeToggle,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                {(['hourly', 'daily'] as const).map((option) => {
                  const active = settings.wageType === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() =>
                        activeWorkplace &&
                        updateWorkplaceSettings(activeWorkplace.id, { wageType: option })
                      }
                      hitSlop={WAGE_TOGGLE_HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.wageTypeChoice,
                        active && [
                          styles.wageTypeChoiceSelected,
                          { backgroundColor: theme.backgroundElement },
                        ],
                      ]}
                    >
                      <ThemedText
                        type="footnote"
                        style={{ color: theme.text, fontWeight: active ? '700' : '500' }}
                      >
                        {WAGE_TYPE_LABEL[option]}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              onPress={() => setWageDialogOpen(true)}
              style={[styles.infoRow, styles.blockBorder, { borderTopColor: theme.border }]}
            >
              <IconBadge tone="blue">
                <Coins size={ROW_ICON_SIZE} color={blueBadge.icon} />
              </IconBadge>
              <ThemedText type="body" numberOfLines={1} style={styles.flexLabel}>
                {settings.wageType === 'hourly' ? '基本時給' : '基本日給'}
              </ThemedText>
              <ThemedText
                type="title3"
                themeColor="primary"
                numberOfLines={1}
                style={styles.noShrink}
              >
                {formatYen(
                  settings.wageType === 'hourly' ? settings.hourlyWage : settings.dailyWage,
                )}
              </ThemedText>
              <EditAffordance />
            </Pressable>

            <View
              style={[styles.premiumBlock, styles.blockBorder, { borderTopColor: theme.border }]}
            >
              <View style={styles.infoRow}>
                <IconBadge tone="green">
                  <Coffee size={ROW_ICON_SIZE} color={greenBadge.icon} />
                </IconBadge>
                <ThemedText type="headline" style={styles.flexLabel}>
                  休憩時間（自動控除）
                </ThemedText>
                <Switch
                  value={settings.breakDeductionEnabled}
                  onValueChange={(value) =>
                    activeWorkplace &&
                    updateWorkplaceSettings(activeWorkplace.id, { breakDeductionEnabled: value })
                  }
                  trackColor={{ false: theme.border, true: theme.success }}
                />
              </View>
              {settings.breakDeductionEnabled && (
                <View style={[styles.nestedGroup, { backgroundColor: theme.background }]}>
                  {settings.breakRules.map((rule, index) => (
                    <Pressable
                      key={index}
                      onPress={() => setBreakDialogOpen(true)}
                      accessibilityRole="button"
                      accessibilityLabel={`${rule.minHours}時間以上で${rule.minutes}分 編集`}
                      style={[
                        styles.nestedRow,
                        index > 0 && styles.nestedDivider,
                        { borderTopColor: theme.border },
                      ]}
                    >
                      <ThemedText type="subheadline" style={[styles.boldText, styles.flexLabel]}>
                        {rule.minHours}時間以上で {rule.minutes}分
                      </ThemedText>
                      <EditAffordance />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {settings.wageType === 'hourly' && (
              <>
                <PremiumBlock
                  Icon={Moon}
                  tone="purple"
                  title="深夜割増手当"
                  description="深夜時間帯の時給を割増計算"
                  rule={settings.lateNightPremium}
                  dotColor={blueBadge.icon}
                  pillColors={blueBadge}
                  onToggle={(value) => updatePremium('lateNightPremium', { enabled: value })}
                  onPressEdit={() => setLateNightDialogOpen(true)}
                />
                <PremiumBlock
                  Icon={Sunrise}
                  tone="orange"
                  title="早朝割増手当"
                  description="朝の開店準備・清掃シフト向け"
                  rule={settings.earlyMorningPremium}
                  dotColor={orangeBadge.icon}
                  pillColors={orangeBadge}
                  onToggle={(value) => updatePremium('earlyMorningPremium', { enabled: value })}
                  onPressEdit={() => setEarlyMorningDialogOpen(true)}
                />
              </>
            )}
          </Card>
        </View>
      </ScrollView>

      <Dialog visible={isNameDialogOpen} onClose={closeNameDialog}>
        <DialogBody>
          <DialogTitle>登録者キーワードを編集</DialogTitle>
          {tourStep === 'keywordDialog' && (
            <View style={styles.tourHint}>
              <HakobuMascot pose="happy" size={48} />
              <ThemedText type="footnote" style={styles.flexLabel}>
                シフト表に書いてあるとおりに名前を入れたら「閉じる」を押してね
              </ThemedText>
            </View>
          )}
          <DialogTextInput
            value={user?.shiftName ?? ''}
            onChangeText={setShiftName}
            placeholder="シフト表に書かれている自分の名前"
            editable={!shiftTableHasNoNames}
            autoFocus={!shiftTableHasNoNames}
          />
          <View style={styles.noNameRow}>
            <View style={styles.noNameLabel}>
              <ThemedText type="body">シフト表に名前が載っていない</ThemedText>
              <ThemedText type="footnote" themeColor="textSecondary">
                自分専用の勤務表やカレンダー形式など、人の名前が書かれていない表はこちら。表に載っている勤務をすべてあなたのものとして読み取ります。
              </ThemedText>
            </View>
            <Switch value={shiftTableHasNoNames} onValueChange={setShiftTableHasNoNames} />
          </View>
          {!shiftTableHasNoNames && (
            <ThemedText type="footnote" themeColor="textSecondary">
              このキーワードをもとに、AIがシフト表からあなたの行を抽出します。
            </ThemedText>
          )}
          <SecondaryButton label="閉じる" onPress={closeNameDialog} />
        </DialogBody>
      </Dialog>

      <Dialog visible={isAddWorkplaceDialogOpen} onClose={() => setAddWorkplaceDialogOpen(false)}>
        <DialogBody>
          <DialogTitle>勤務先を追加</DialogTitle>
          <DialogTextInput
            value={newWorkplaceName}
            onChangeText={setNewWorkplaceName}
            placeholder="勤務先の名前"
            autoFocus
          />
          <DialogButtonRow>
            <SecondaryButton
              label="キャンセル"
              onPress={() => setAddWorkplaceDialogOpen(false)}
              style={styles.flexLabel}
            />
            <FilledPillButton
              label="追加"
              tone="primary"
              disabled={!newWorkplaceName.trim()}
              onPress={handleConfirmAddWorkplace}
            />
          </DialogButtonRow>
        </DialogBody>
      </Dialog>

      <Dialog visible={!!renameTarget} onClose={() => setRenameTarget(null)}>
        <DialogBody>
          <DialogTitle>勤務先の名前を変更</DialogTitle>
          <DialogTextInput
            value={renameDraft}
            onChangeText={setRenameDraft}
            placeholder="勤務先の名前"
            autoFocus
          />
          <DialogButtonRow>
            <SecondaryButton
              label="キャンセル"
              onPress={() => setRenameTarget(null)}
              style={styles.flexLabel}
            />
            <FilledPillButton
              label="保存"
              tone="primary"
              disabled={!renameDraft.trim()}
              onPress={handleConfirmRenameWorkplace}
            />
          </DialogButtonRow>
        </DialogBody>
      </Dialog>

      <Dialog visible={!!editingShiftType} onClose={() => setEditingShiftTypeId(null)}>
        {editingShiftType && activeWorkplace && (
          <ShiftTypeForm
            key={editingShiftType.id}
            mode="edit"
            shiftType={editingShiftType}
            index={editingShiftTypeIndex}
            isBase={BASE_SHIFT_TYPE_IDS.has(editingShiftType.id)}
            onChange={(patch) =>
              upsertShiftType(activeWorkplace.id, { ...editingShiftType, ...patch })
            }
            onClose={() => setEditingShiftTypeId(null)}
            onDelete={() => {
              removeShiftType(activeWorkplace.id, editingShiftType.id);
              setEditingShiftTypeId(null);
            }}
            onUnregister={() =>
              upsertShiftType(activeWorkplace.id, {
                ...editingShiftType,
                startTime: undefined,
                endTime: undefined,
              })
            }
          />
        )}
      </Dialog>

      <Dialog visible={!!addDraft} onClose={() => setAddDraft(null)}>
        {addDraft && (
          <ShiftTypeForm
            key={addDraft.id}
            mode="add"
            shiftType={addDraft}
            index={shiftTypes.length}
            isBase={false}
            onChange={(patch) =>
              setAddDraft((current) => (current ? { ...current, ...patch } : current))
            }
            onClose={() => setAddDraft(null)}
            onConfirmAdd={handleConfirmAdd}
          />
        )}
      </Dialog>

      <Dialog visible={isWageDialogOpen} onClose={() => setWageDialogOpen(false)}>
        <DialogBody>
          <DialogTitle>{settings.wageType === 'hourly' ? '時給' : '日給'}を編集</DialogTitle>
          <View style={styles.inlineInputRow}>
            <DialogTextInput
              value={String(
                settings.wageType === 'hourly' ? settings.hourlyWage : settings.dailyWage,
              )}
              onChangeText={(value) =>
                activeWorkplace &&
                updateWorkplaceSettings(
                  activeWorkplace.id,
                  settings.wageType === 'hourly'
                    ? { hourlyWage: Number(value) || 0 }
                    : { dailyWage: Number(value) || 0 },
                )
              }
              keyboardType="number-pad"
              accessibilityLabel={settings.wageType === 'hourly' ? '時給' : '日給'}
              style={styles.wageAmountInput}
              autoFocus
            />
            <ThemedText type="body" themeColor="textSecondary">
              円
            </ThemedText>
          </View>
          <SecondaryButton label="閉じる" onPress={() => setWageDialogOpen(false)} />
        </DialogBody>
      </Dialog>

      <Dialog visible={isBreakDialogOpen} onClose={() => setBreakDialogOpen(false)}>
        <DialogBody>
          <DialogTitle>休憩時間を編集</DialogTitle>
          {settings.breakRules.map((rule, index) => (
            <View key={index} style={styles.inlineInputRow}>
              <DialogTextInput
                value={String(rule.minHours)}
                onChangeText={(value) => updateBreakRule(index, { minHours: Number(value) || 0 })}
                keyboardType="number-pad"
                accessibilityLabel="何時間以上"
                style={styles.smallAmountInput}
              />
              <ThemedText type="body" themeColor="textSecondary">
                時間以上で
              </ThemedText>
              <DialogTextInput
                value={String(rule.minutes)}
                onChangeText={(value) => updateBreakRule(index, { minutes: Number(value) || 0 })}
                keyboardType="number-pad"
                accessibilityLabel="休憩の分数"
                style={styles.smallAmountInput}
              />
              <ThemedText type="body" themeColor="textSecondary">
                分
              </ThemedText>
            </View>
          ))}
          <SecondaryButton label="閉じる" onPress={() => setBreakDialogOpen(false)} />
        </DialogBody>
      </Dialog>

      <Dialog visible={isLateNightDialogOpen} onClose={() => setLateNightDialogOpen(false)}>
        <PremiumForm
          title="深夜手当を編集"
          rule={settings.lateNightPremium}
          onChange={(patch) => updatePremium('lateNightPremium', patch)}
          onClose={() => setLateNightDialogOpen(false)}
        />
      </Dialog>

      <Dialog visible={isEarlyMorningDialogOpen} onClose={() => setEarlyMorningDialogOpen(false)}>
        <PremiumForm
          title="早朝手当を編集"
          rule={settings.earlyMorningPremium}
          onChange={(patch) => updatePremium('earlyMorningPremium', patch)}
          onClose={() => setEarlyMorningDialogOpen(false)}
        />
      </Dialog>
    </Screen>
  );
}

/** カードの外の小見出し（「必須基本情報」など。灰色の12pt）。 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText type="caption1" themeColor="textSecondary" style={styles.sectionLabel}>
      {children}
    </ThemedText>
  );
}

/** シフト種別の1行。行全体を押すと編集の小窓が開く（右の「編集 ›」は見た目の合図）。 */
function ShiftTypeRow({
  shiftType,
  index,
  settings,
  onPress,
}: {
  shiftType: ShiftType;
  index: number;
  settings: WorkplaceSettings;
  onPress: () => void;
}) {
  const theme = useTheme();
  const colorScheme = useResolvedColorScheme();
  const blueBadge = useIconBadgeColors('blue');
  const purpleBadge = useIconBadgeColors('purple');
  const { Icon: PresetIcon, tone: presetTone } = resolveShiftTypePreset(shiftType.icon, index);
  const presetColors = IconBadgeTones[colorScheme][presetTone];

  // 時刻が未登録の基本種別は、時間帯の代わりに「未登録」。実働・深夜割増の札と金額は出さない。
  const registered = isShiftTypeRegistered(shiftType) ? shiftType : null;
  const workedHours = registered ? hoursBetween(registered.startTime, registered.endTime) : 0;
  const hasLateNightPremium =
    !!registered &&
    settings.wageType === 'hourly' &&
    settings.lateNightPremium.enabled &&
    overlapsBand(registered.startTime, registered.endTime, settings.lateNightPremium);
  const breakdown = registered
    ? computeShiftBreakdown(
        registered.startTime,
        registered.endTime,
        settings.wageType,
        settings.hourlyWage,
        settings.dailyWage,
        settings.breakDeductionEnabled,
        settings.breakRules,
        settings.lateNightPremium,
        settings.earlyMorningPremium,
      )
    : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${shiftType.name} ${formatShiftTypeTime(shiftType) ?? '未登録'} 編集`}
      style={({ pressed }) => [
        styles.shiftTypeRow,
        index > 0 && styles.blockBorder,
        {
          borderTopColor: theme.border,
          backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
        },
      ]}
    >
      <IconBadge tone={presetTone} size={44}>
        <PresetIcon size={IconSize.medium} color={presetColors.icon} />
      </IconBadge>
      <View style={styles.infoRowLabel}>
        <View style={styles.shiftTypeMetaRow}>
          <ThemedText type="headline">{shiftType.name}</ThemedText>
          {registered && (
            <View style={[styles.metaPill, { backgroundColor: blueBadge.background }]}>
              <ThemedText type="caption2" style={{ color: blueBadge.icon }}>
                実働{formatWorkedHours(workedHours)}時間
              </ThemedText>
            </View>
          )}
          {hasLateNightPremium && (
            <View style={[styles.metaPill, { backgroundColor: purpleBadge.background }]}>
              <ThemedText type="caption2" style={{ color: purpleBadge.icon }}>
                深夜割増
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="footnote" themeColor="textSecondary">
          {formatShiftTypeTime(shiftType) ?? '未登録'}
        </ThemedText>
      </View>
      <View style={styles.shiftTypeAmountColumn}>
        {breakdown && <ThemedText type="headline">{formatYen(breakdown.earnings)}</ThemedText>}
        <View style={styles.changeAffordance}>
          <ThemedText type="caption1" themeColor="primary">
            編集
          </ThemedText>
          <ChevronRight size={IconSize.small} color={theme.primary} />
        </View>
      </View>
    </Pressable>
  );
}

/** 深夜・早朝の割増の行（オン・オフの切り替え＋時間帯を2段で出す内側の行）。 */
function PremiumBlock({
  Icon,
  tone,
  title,
  description,
  rule,
  dotColor,
  pillColors,
  onToggle,
  onPressEdit,
}: {
  Icon: typeof Moon;
  tone: 'purple' | 'orange';
  title: string;
  description: string;
  rule: PremiumRule;
  dotColor: string;
  pillColors: { background: string; icon: string };
  onToggle: (value: boolean) => void;
  onPressEdit: () => void;
}) {
  const theme = useTheme();
  const iconColors = useIconBadgeColors(tone);
  return (
    <View style={[styles.premiumBlock, styles.blockBorder, { borderTopColor: theme.border }]}>
      <View style={styles.infoRow}>
        <IconBadge tone={tone}>
          <Icon size={ROW_ICON_SIZE} color={iconColors.icon} />
        </IconBadge>
        <View style={styles.infoRowLabel}>
          <ThemedText type="headline">{title}</ThemedText>
          <ThemedText type="caption1" themeColor="textSecondary">
            {description}
          </ThemedText>
        </View>
        <Switch
          value={rule.enabled}
          onValueChange={onToggle}
          trackColor={{ false: theme.border, true: theme.success }}
        />
      </View>
      {rule.enabled && (
        // 時間帯は「…」で切らないよう2段にする（上に時間帯、下に割増率の札。「編集」は右端の縦の真ん中）
        <Pressable
          onPress={onPressEdit}
          accessibilityRole="button"
          accessibilityLabel={`${title}の時間帯 編集`}
          style={[styles.nestedGroup, styles.premiumRow, { backgroundColor: theme.background }]}
        >
          <View style={[styles.premiumDot, { backgroundColor: dotColor }]} />
          <View style={styles.premiumRowText}>
            <ThemedText type="subheadline" style={styles.boldText}>
              {formatShiftTimeRange(rule.startTime, rule.endTime, rule.endTime <= rule.startTime)}
            </ThemedText>
            <View style={[styles.ratePill, { backgroundColor: pillColors.background }]}>
              <ThemedText type="caption2" style={{ color: pillColors.icon }}>
                +{rule.ratePercent}%
              </ThemedText>
            </View>
          </View>
          <EditAffordance />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.one,
  },
  blockBorder: {
    borderTopWidth: 1,
  },
  tourHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  calendarSubHeader: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
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
  noShrink: {
    flexShrink: 0,
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
  // 行そのものの余白は中の infoRow が持つ。給与形態などの行と左端を揃えるため、ここでは横の余白を付けない
  premiumBlock: {
    gap: Spacing.two,
  },
  // 内側の灰色の箱。左端はアイコンの右（16+36+16）の文字の位置にそろえる
  nestedGroup: {
    marginLeft: Spacing.three + 36 + Spacing.three,
    marginRight: Spacing.three,
    marginBottom: Spacing.three,
    borderRadius: Radius.smallLarge,
    overflow: 'hidden',
  },
  nestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: MIN_TAP_HEIGHT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  nestedDivider: {
    borderTopWidth: 1,
  },
  boldText: {
    fontWeight: '700',
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: MIN_TAP_HEIGHT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  premiumRowText: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  premiumDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
    alignSelf: 'flex-start',
    // 1段目（時間帯・15pt/20pt）の文字の高さの真ん中にそろえる
    marginTop: 6,
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
  addShiftTypeButton: {
    marginTop: Spacing.two,
    minHeight: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  // 給与形態の切り替え（①のカレンダーの「月／リスト」と同じ形）
  wageTypeToggle: {
    flexDirection: 'row',
    borderRadius: Radius.small,
    borderWidth: 1,
    padding: Spacing.half,
  },
  wageTypeChoice: {
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small - Spacing.half,
  },
  wageTypeChoiceSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  wageAmountInput: {
    width: 120,
    textAlign: 'right',
  },
  smallAmountInput: {
    width: 56,
    textAlign: 'right',
    paddingHorizontal: Spacing.two,
  },
  noNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  noNameLabel: {
    flex: 1,
    gap: Spacing.one,
  },
});
