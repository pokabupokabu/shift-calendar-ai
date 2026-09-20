import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_USER_SETTINGS } from '@/models';
import { useAppStore } from '@/store/useAppStore';

/** 設定画面 (requirements section 4, 13). */
export default function SettingsScreen() {
  const theme = useTheme();
  const user = useAppStore((state) => state.user);
  const setShiftName = useAppStore((state) => state.setShiftName);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const settings = user?.settings ?? DEFAULT_USER_SETTINGS;

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  return (
    <Screen>
      <ThemedText type="small">シフト表上の名前</ThemedText>
      <TextInput value={user?.shiftName ?? ''} onChangeText={setShiftName} style={inputStyle} />

      <ThemedText type="small">登録先カレンダー</ThemedText>
      <View style={styles.buttonRow}>
        {(['apple', 'google'] as const).map((providerId) => (
          <Pressable
            key={providerId}
            onPress={() => updateSettings({ defaultCalendarProvider: providerId })}
            style={[
              styles.choice,
              {
                backgroundColor:
                  settings.defaultCalendarProvider === providerId
                    ? theme.backgroundSelected
                    : theme.backgroundElement,
              },
            ]}
          >
            <ThemedText>{providerId === 'apple' ? 'Apple Calendar' : 'Google Calendar'}</ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText type="small">
        イベントタイトル（{'{shiftType}'}が種別に置き換わります）
      </ThemedText>
      <TextInput
        value={settings.eventTitleTemplate}
        onChangeText={(value) => updateSettings({ eventTitleTemplate: value })}
        style={inputStyle}
      />

      <View style={styles.switchRow}>
        <ThemedText>休みの日を終日イベントとして登録する（Pro）</ThemedText>
        <Switch
          value={settings.createDayOffEvents}
          onValueChange={(value) => updateSettings({ createDayOffEvents: value })}
        />
      </View>

      <PrimaryButton
        label="シフト種別・時間マスターを編集"
        onPress={() => router.push('/settings/shift-types')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  choice: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
