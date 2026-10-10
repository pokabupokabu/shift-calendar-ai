import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Star, Tag, TriangleAlert, Trash2, User } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';

const SECTION_ICON_SIZE = 17;

/** 昼間部かどうかだけを聞く2択。未選択（undefined）も許容し、同じ項目をもう一度押すと解除される。 */
const STUDENT_OPTIONS = [
  { label: '昼間部の学生', value: true },
  { label: '学生ではない / 夜間・通信制', value: false },
] as const;

async function performReset() {
  await AsyncStorage.clear();
  useAppStore.getState().resetAll();
  useShiftSessionStore.getState().reset();
  router.dismissAll();
  router.replace('/tutorial');
}

/** アカウント設定画面: 表示名の編集・プラン確認・プロモーションコード・データ初期化。 */
export default function AccountSettingsScreen() {
  const theme = useTheme();
  const blueBadge = useIconBadgeColors('blue');
  const orangeBadge = useIconBadgeColors('orange');
  const purpleBadge = useIconBadgeColors('purple');
  const neutralBadge = useIconBadgeColors('neutral');
  const redBadge = useIconBadgeColors('red');

  const displayName = useAppStore((s) => s.user?.displayName ?? s.user?.shiftName ?? '');
  const setDisplayName = useAppStore((s) => s.setDisplayName);
  const [name, setName] = useState(displayName);
  const isPro = useAppStore((s) => s.user?.settings.isPro ?? false);
  const dependencyAlertEnabled = useAppStore(
    (s) => s.user?.settings.dependencyAlertEnabled ?? true,
  );
  const updateSettings = useAppStore((s) => s.updateSettings);
  const birthYear = useAppStore((s) => s.user?.settings.birthYear);
  const isDaytimeStudent = useAppStore((s) => s.user?.settings.isDaytimeStudent);
  const [birthYearInput, setBirthYearInput] = useState(birthYear ? String(birthYear) : '');
  const [promoCode, setPromoCode] = useState('');

  const currentYear = new Date().getFullYear();
  // 12/31時点の年齢。年収の壁の基準が19歳以上23歳未満かどうかで変わるため、入力の手応えとして見せる。
  const ageAtYearEnd = birthYear !== undefined ? currentYear - birthYear : undefined;

  // 生まれ年は入力途中の値を毎回保存すると年齢表示がちらつくため、入力確定時にだけ反映する。
  const handleBirthYearCommit = () => {
    const trimmed = birthYearInput.trim();
    if (trimmed.length === 0) {
      updateSettings({ birthYear: undefined });
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1900 || parsed > currentYear) {
      Alert.alert('生まれ年は西暦4桁で入力してください');
      setBirthYearInput(birthYear ? String(birthYear) : '');
      return;
    }
    updateSettings({ birthYear: parsed });
  };

  const handleSave = () => {
    setDisplayName(name.trim());
    Alert.alert('保存しました');
  };

  // 本物の課金機能が実装されるまでの開発用プレースホルダーです。
  const handleApplyPromoCode = () => {
    const normalized = promoCode.trim().toUpperCase();
    if (normalized === 'DEVPRO') {
      updateSettings({ isPro: true });
      Alert.alert('Proプランを適用しました（開発用コード）');
    } else if (normalized === 'DEVFREE') {
      updateSettings({ isPro: false });
      Alert.alert('無料プランに戻しました（開発用コード）');
    } else {
      Alert.alert('無効なコードです');
    }
    setPromoCode('');
  };

  const handleResetPress = () => {
    Alert.alert('データを初期化しますか？', 'この操作は取り消せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '初期化する', style: 'destructive', onPress: performReset },
    ]);
  };

  return (
    <Screen>
      <ThemedText type="subtitle">アカウント設定</ThemedText>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconBadge tone="blue">
              <User size={SECTION_ICON_SIZE} color={blueBadge.icon} />
            </IconBadge>
            <ThemedText type="headline">表示名</ThemedText>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="表示名を入力"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
          />
          <PrimaryButton label="保存" onPress={handleSave} disabled={name.trim().length === 0} />
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconBadge tone="orange">
              <Star size={SECTION_ICON_SIZE} color={orangeBadge.icon} />
            </IconBadge>
            <ThemedText type="headline">プラン</ThemedText>
          </View>
          <ThemedText themeColor="textSecondary">現在のプラン: {isPro ? 'Pro' : '無料'}</ThemedText>
          {!isPro && (
            <PrimaryButton label="PROにアップグレード" onPress={() => router.push('/paywall')} />
          )}
        </Card>

        <Card style={styles.section}>
          <View style={styles.switchRow}>
            <IconBadge tone="purple">
              <TriangleAlert size={SECTION_ICON_SIZE} color={purpleBadge.icon} />
            </IconBadge>
            <View style={styles.switchLabelGroup}>
              <ThemedText type="headline">扶養の壁アラート</ThemedText>
              <ThemedText type="footnote" themeColor="textSecondary">
                給与タブに今年の年収見込みと「年収の壁」までの目安を表示します（PRO機能）
              </ThemedText>
            </View>
            <Switch
              value={dependencyAlertEnabled}
              onValueChange={(value) => updateSettings({ dependencyAlertEnabled: value })}
            />
          </View>

          {dependencyAlertEnabled && (
            <View style={styles.dependencyFields}>
              <ThemedText type="footnote" themeColor="textSecondary">
                壁の金額は年齢と年分で変わります。未入力のままでも一般的な目安は表示されます。
              </ThemedText>

              <View style={styles.fieldGroup}>
                <ThemedText type="subheadline">生まれ年（西暦）</ThemedText>
                <TextInput
                  value={birthYearInput}
                  onChangeText={setBirthYearInput}
                  onBlur={handleBirthYearCommit}
                  onSubmitEditing={handleBirthYearCommit}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="例: 2005"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
                <ThemedText type="caption2" themeColor="textSecondary">
                  {ageAtYearEnd !== undefined
                    ? `${currentYear}年12月31日時点で${ageAtYearEnd}歳${
                        ageAtYearEnd >= 19 && ageAtYearEnd < 23
                          ? '（19〜22歳向けの目安を表示）'
                          : ''
                      }`
                    : '19歳以上23歳未満かどうかで、社会保険の扶養や親の控除の基準が変わります。'}
                </ThemedText>
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText type="subheadline">学生区分</ThemedText>
                <View style={[styles.segmentedTrack, { backgroundColor: theme.border }]}>
                  {STUDENT_OPTIONS.map((option) => {
                    const selected = isDaytimeStudent === option.value;
                    return (
                      <Pressable
                        key={option.label}
                        onPress={() =>
                          updateSettings({
                            isDaytimeStudent: selected ? undefined : option.value,
                          })
                        }
                        style={[
                          styles.segmentedItem,
                          selected && { backgroundColor: theme.backgroundElement },
                        ]}
                      >
                        <ThemedText
                          type="caption1"
                          themeColor={selected ? 'text' : 'textSecondary'}
                        >
                          {option.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                <ThemedText type="caption2" themeColor="textSecondary">
                  勤務時間による社会保険の加入（週20時間以上）の注意書きの出し分けに使います。壁の金額自体は変わりません。もう一度押すと未選択に戻せます。
                </ThemedText>
              </View>
            </View>
          )}
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconBadge tone="neutral">
              <Tag size={SECTION_ICON_SIZE} color={neutralBadge.icon} />
            </IconBadge>
            <ThemedText type="headline">プロモーションコード</ThemedText>
          </View>
          <ThemedText type="footnote" themeColor="textSecondary">
            本物の課金機能が実装されるまでの開発用プレースホルダーです。
          </ThemedText>
          <TextInput
            value={promoCode}
            onChangeText={setPromoCode}
            placeholder="コードを入力"
            autoCapitalize="characters"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
          />
          <PrimaryButton
            label="適用する"
            onPress={handleApplyPromoCode}
            disabled={promoCode.trim().length === 0}
          />
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconBadge tone="red">
              <Trash2 size={SECTION_ICON_SIZE} color={redBadge.icon} />
            </IconBadge>
            <ThemedText type="headline">データの初期化</ThemedText>
          </View>
          <ThemedText themeColor="textSecondary">
            名前・シフト設定・カレンダー連携情報がすべて削除されます。この操作は取り消せません。
          </ThemedText>
          <Pressable
            onPress={handleResetPress}
            style={({ pressed }) => [
              styles.dangerButton,
              { backgroundColor: theme.danger, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText style={[styles.dangerLabel, { color: theme.onPrimary }]}>
              データを初期化する
            </ThemedText>
          </Pressable>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  switchLabelGroup: {
    flex: 1,
    gap: 2,
  },
  dependencyFields: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  fieldGroup: {
    gap: Spacing.two,
  },
  segmentedTrack: {
    flexDirection: 'row',
    borderRadius: Radius.smallLarge,
    padding: 2,
    gap: 2,
  },
  segmentedItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  dangerButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  dangerLabel: {
    fontWeight: '600',
  },
});
