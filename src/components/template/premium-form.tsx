import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TimeFieldButton } from '@/components/calendar/time-field-button';
import { TimePickerPanel } from '@/components/calendar/time-picker-panel';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { PremiumRule } from '@/models';

import { DialogBody } from './dialog-body';
import { DialogTextInput, DialogTitle, FieldLabel } from './dialog-parts';

type TimeField = 'start' | 'end';

export interface PremiumFormProps {
  title: string;
  rule: PremiumRule;
  onChange: (patch: Partial<PremiumRule>) => void;
  onClose: () => void;
}

/** 深夜・早朝の割増の小窓の中身（時間帯は回して選ぶ形・15分刻み、割増率は数字の入力）。 */
export function PremiumForm({ title, rule, onChange, onClose }: PremiumFormProps) {
  const [activeTimeField, setActiveTimeField] = useState<TimeField>();
  const fieldLabel = activeTimeField === 'end' ? '終了時刻' : '開始時刻';

  return (
    <DialogBody>
      <DialogTitle>{title}</DialogTitle>
      <View style={styles.timeRow}>
        <TimeFieldButton
          label="開始時刻"
          value={rule.startTime}
          active={activeTimeField === 'start'}
          onPress={() => setActiveTimeField((c) => (c === 'start' ? undefined : 'start'))}
          surface="backgroundElement"
        />
        <TimeFieldButton
          label="終了時刻"
          value={rule.endTime}
          active={activeTimeField === 'end'}
          onPress={() => setActiveTimeField((c) => (c === 'end' ? undefined : 'end'))}
          surface="backgroundElement"
        />
      </View>
      {activeTimeField && (
        <TimePickerPanel
          key={activeTimeField}
          caption={`${fieldLabel}を選択（15分刻み）`}
          value={activeTimeField === 'start' ? rule.startTime : rule.endTime}
          onChange={(value) =>
            onChange(activeTimeField === 'start' ? { startTime: value } : { endTime: value })
          }
        />
      )}
      <View style={styles.field}>
        <FieldLabel>割増率</FieldLabel>
        <View style={styles.rateRow}>
          <ThemedText type="body" themeColor="textSecondary">
            時給に+
          </ThemedText>
          <DialogTextInput
            value={String(rule.ratePercent)}
            onChangeText={(value) => onChange({ ratePercent: Number(value) || 0 })}
            keyboardType="number-pad"
            accessibilityLabel="割増率（%）"
            style={styles.rateInput}
          />
          <ThemedText type="body" themeColor="textSecondary">
            %
          </ThemedText>
        </View>
      </View>
      <SecondaryButton label="閉じる" onPress={onClose} />
    </DialogBody>
  );
}

const styles = StyleSheet.create({
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rateInput: {
    width: 72,
    textAlign: 'right',
  },
});
