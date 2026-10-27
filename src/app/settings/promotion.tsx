import * as Clipboard from 'expo-clipboard';
import { Check, Copy, Tag } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { env } from '@/config/env';
import { Fonts, IconSize, Radius, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import { getCustomerId, presentCodeRedemptionSheet } from '@/utils/purchases';

/** コピーしたあと、コピーの絵をチェックの絵に変えておく時間。 */
const COPIED_FEEDBACK_MS = 2000;

/**
 * プロモーション特典の画面（docs/ui-review/group-d.md 構成②・構成⑤）。提出用の版でも出す。
 * 上から 説明 → 「コードを入力」（Appleのオファーコードの入力画面）→ お客様ID（押すとコピー）。
 * 開発用ビルドだけ、旧アカウント設定にあった DEVPRO / DEVFREE の欄をいちばん下に出す。
 * 題名は上のバーだけに出し、画面の中に大見出しは置かない（決定1）。
 */
export default function PromotionScreen() {
  const theme = useTheme();
  // undefined = 取得中、null = 取れない（Web・RevenueCat 未設定・失敗）
  const [customerId, setCustomerId] = useState<string | null>();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void getCustomerId().then((id) => {
      if (active) setCustomerId(id);
    });
    return () => {
      active = false;
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const handleRedeemPress = async () => {
    const result = await presentCodeRedemptionSheet();
    if (!result.success && result.error) {
      Alert.alert(result.error);
    }
  };

  const handleCopyPress = async () => {
    if (!customerId) return;
    await Clipboard.setStringAsync(customerId);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  };

  const CopyIcon = copied ? Check : Copy;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="subheadline" themeColor="textSecondary" style={styles.lead}>
          キャンペーンなどで受け取ったコードを入力すると、特典を受け取れます。
        </ThemedText>

        <PrimaryButton label="コードを入力" onPress={() => void handleRedeemPress()} />

        <View style={styles.group}>
          <ThemedText type="caption1" themeColor="textSecondary" style={styles.caption}>
            お客様ID
          </ThemedText>
          <Card style={styles.idCard}>
            <Pressable
              onPress={() => void handleCopyPress()}
              disabled={!customerId}
              accessibilityRole="button"
              accessibilityLabel={
                customerId ? `お客様ID ${customerId}。押すとコピーします` : 'お客様IDはありません'
              }
              accessibilityHint={copied ? 'コピーしました' : undefined}
              style={({ pressed }) => [styles.idRow, pressed && { opacity: 0.6 }]}
            >
              <ThemedText
                type="body"
                selectable
                numberOfLines={1}
                ellipsizeMode="middle"
                themeColor={customerId ? 'text' : 'textSecondary'}
                style={styles.idText}
              >
                {customerId ?? '—'}
              </ThemedText>
              {customerId ? (
                <CopyIcon
                  size={IconSize.small + 4}
                  color={copied ? theme.success : theme.primary}
                />
              ) : null}
            </Pressable>
          </Card>
          <ThemedText type="footnote" themeColor="textSecondary" style={styles.caption}>
            {copied ? 'コピーしました。' : '特典についてお問い合わせいただくときにお伝えください。'}
          </ThemedText>
        </View>

        {env.enableDevPromoCode && <DevPromoCodeCard />}
      </ScrollView>
    </Screen>
  );
}

/**
 * 開発用のプロモーションコード（DEVPRO / DEVFREE）。本物の課金が動くまでの検証用で、
 * `EXPO_PUBLIC_ENABLE_DEV_PROMO` が無い提出用ビルドでは出ない（旧アカウント設定から移した）。
 */
function DevPromoCodeCard() {
  const theme = useTheme();
  const neutralBadge = useIconBadgeColors('neutral');
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [promoCode, setPromoCode] = useState('');

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

  return (
    <Card style={styles.devCard}>
      <View style={styles.devHeading}>
        <IconBadge tone="neutral">
          <Tag size={17} color={neutralBadge.icon} />
        </IconBadge>
        <ThemedText type="headline">開発用コード</ThemedText>
      </View>
      <ThemedText type="footnote" themeColor="textSecondary">
        開発・検証用です。提出用ビルドでは表示されません。
      </ThemedText>
      <TextInput
        value={promoCode}
        onChangeText={setPromoCode}
        placeholder="コードを入力"
        autoCapitalize="characters"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, backgroundColor: theme.fill }]}
      />
      <SecondaryButton
        label="適用する"
        onPress={handleApplyPromoCode}
        disabled={promoCode.trim().length === 0}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  lead: {
    paddingHorizontal: Spacing.one,
  },
  group: {
    gap: 6,
  },
  caption: {
    paddingHorizontal: Spacing.one,
  },
  idCard: {
    padding: 0,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
  },
  idText: {
    flex: 1,
    fontFamily: Fonts?.mono,
    letterSpacing: 0.5,
  },
  devCard: {
    gap: Spacing.two,
  },
  devHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    borderRadius: Radius.smallLarge,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
});
