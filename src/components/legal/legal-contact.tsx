import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Check, Copy, Mail } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import { parseContact } from '@/utils/legalBlocks';

import { legalTextStyles } from './legal-text';

/** 設定タブのいちばん下に出しているバージョンと同じ値（src/app/(tabs)/settings.tsx）。 */
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const MAIL_SUBJECT = 'シフToカレのお問い合わせ';
/** コピーしたあと、コピーの絵をチェックの絵に変えておく時間（プロモーション特典の画面と同じ）。 */
const COPIED_FEEDBACK_MS = 2000;

/** 「メールを作成」で最初から入れておく本文。調べるときに要る機種・iOS・アプリの版。 */
function buildMailBody(): string {
  const model = Device.modelName ?? '不明';
  const osVersion = Device.osVersion ?? String(Platform.Version);
  return [
    `機種: ${model}`,
    `iOS: ${osVersion}`,
    `アプリのバージョン: ${APP_VERSION}`,
    '',
    '（ここにお問い合わせ内容をご記入ください）',
  ].join('\n');
}

/**
 * お問い合わせ（docs/ui-review/group-d.md「D3 決定事項」4）。
 * 上から 案内文 → メールアドレスの行（押すとコピー）→「メールを作成」→ 知らせてほしいことの一覧 → 注記。
 * 文言は src/constants/legalContent.ts のまま。「メールアドレス: 」の見出しだけは行の形にしたので出さない。
 */
export function LegalContact({ body }: { body: string }) {
  const theme = useTheme();
  const blueBadge = useIconBadgeColors('blue');
  const layout = useMemo(() => parseContact(body), [body]);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const address = layout.email?.address;

  const copyAddress = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  };

  const composeMail = async () => {
    if (!address) return;
    const url =
      `mailto:${address}?subject=${encodeURIComponent(MAIL_SUBJECT)}` +
      `&body=${encodeURIComponent(buildMailBody())}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'メールアプリを開けませんでした',
        `メールアドレス（${address}）をコピーして、お使いのメールアプリからお送りください。`,
        [
          { text: '閉じる', style: 'cancel' },
          { text: 'アドレスをコピー', onPress: () => void copyAddress() },
        ],
      );
    }
  };

  const CopyIcon = copied ? Check : Copy;

  return (
    <View style={styles.sections}>
      <View style={styles.mailGroup}>
        {layout.lead.map((line, index) => (
          <ThemedText key={index} type="subheadline" style={legalTextStyles.body}>
            {line}
          </ThemedText>
        ))}

        {layout.email && (
          <>
            <Card style={styles.flushCard}>
              <Pressable
                onPress={() => void copyAddress()}
                accessibilityRole="button"
                accessibilityLabel={`${layout.email.label} ${layout.email.address}。押すとコピーします`}
                accessibilityHint={copied ? 'コピーしました' : undefined}
                style={({ pressed }) => [styles.emailRow, pressed && { opacity: 0.6 }]}
              >
                <IconBadge tone="blue">
                  <Mail size={18} color={blueBadge.icon} />
                </IconBadge>
                <ThemedText
                  type="subheadline"
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  style={styles.flexText}
                >
                  {layout.email.address}
                </ThemedText>
                <CopyIcon
                  size={IconSize.small + 4}
                  color={copied ? theme.success : theme.textSecondary}
                />
              </Pressable>
            </Card>
            <PrimaryButton label="メールを作成" onPress={() => void composeMail()} />
          </>
        )}
      </View>

      {layout.checklist && (
        <View style={styles.checklistGroup}>
          <ThemedText
            type="caption1"
            themeColor="textSecondary"
            style={legalTextStyles.outsideCaption}
          >
            {layout.checklist.intro}
          </ThemedText>
          <Card style={styles.flushCard}>
            {layout.checklist.items.map((item, index) => (
              <View key={index}>
                {index > 0 && (
                  <View style={[styles.separator, { backgroundColor: theme.border }]} />
                )}
                <View style={styles.checklistRow}>
                  <View style={[styles.bulletDot, { backgroundColor: theme.textSecondary }]} />
                  <ThemedText type="subheadline" style={[legalTextStyles.body, styles.flexText]}>
                    {item.text}
                  </ThemedText>
                </View>
              </View>
            ))}
          </Card>
        </View>
      )}

      {layout.footnotes.length > 0 && (
        <View style={[styles.footnotes, legalTextStyles.outsideCaption]}>
          {layout.footnotes.map((line, index) => (
            <ThemedText key={index} type="footnote" themeColor="textSecondary">
              {line}
            </ThemedText>
          ))}
        </View>
      )}
    </View>
  );
}

const BULLET_DOT_SIZE = 5;
const ROW_PADDING = Spacing.three;
const DOT_GAP = Spacing.two + Spacing.one;

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.five,
  },
  mailGroup: {
    gap: Spacing.three,
  },
  checklistGroup: {
    gap: 6,
  },
  flushCard: {
    padding: 0,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    minHeight: 56,
    paddingHorizontal: ROW_PADDING,
    paddingVertical: Spacing.two + Spacing.one,
  },
  flexText: {
    flex: 1,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DOT_GAP,
    paddingHorizontal: ROW_PADDING,
    paddingVertical: Spacing.two + Spacing.one,
  },
  // 行の高さ24ptの1行目の真ん中にそろえる
  bulletDot: {
    width: BULLET_DOT_SIZE,
    height: BULLET_DOT_SIZE,
    borderRadius: BULLET_DOT_SIZE / 2,
    marginTop: (24 - BULLET_DOT_SIZE) / 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: ROW_PADDING + BULLET_DOT_SIZE + DOT_GAP,
  },
  footnotes: {
    gap: Spacing.two,
  },
});
