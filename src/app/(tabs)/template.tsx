import { router } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_USER_SETTINGS } from '@/models';
import { useAppStore } from '@/store/useAppStore';

/** テンプレタブ: シフト登録の挙動そのものを決める設定 (requirements section 4, 13). */
export default function TemplateTab() {
  const theme = useTheme();
  const user = useAppStore((state) => state.user);
  const setShiftName = useAppStore((state) => state.setShiftName);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const settings = user?.settings ?? DEFAULT_USER_SETTINGS;

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.background }];

  return (
    <Screen>
      <ThemedText type="subtitle">テンプレ</ThemedText>

      <Card>
        <ThemedText type="small">シフト表上の名前</ThemedText>
        <TextInput value={user?.shiftName ?? ''} onChangeText={setShiftName} style={inputStyle} />
      </Card>

      <Card>
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
                      : theme.background,
                },
              ]}
            >
              <ThemedText>
                {providerId === 'apple' ? 'Apple Calendar' : 'Google Calendar'}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <ThemedText type="small">
          イベントタイトル（{'{shiftType}'}が種別に置き換わります）
        </ThemedText>
        <TextInput
          value={settings.eventTitleTemplate}
          onChangeText={(value) => updateSettings({ eventTitleTemplate: value })}
          style={inputStyle}
        />
      </Card>

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
    marginTop: Spacing.two,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  choice: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
