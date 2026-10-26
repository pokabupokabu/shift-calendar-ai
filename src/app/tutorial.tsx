import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HakobuMascot } from '@/components/hakobu-mascot';
import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TutorialSlide, type TutorialSlideProps } from '@/components/tutorial/tutorial-slide';
import { Radius, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import { useTourStore } from '@/store/useTourStore';

/** 5枚目に重ねる、カレンダーに予定が入った様子の絵（Appleの画面そのものは使わない）。 */
function CalendarCard() {
  const theme = useTheme();
  const blue = useIconBadgeColors('blue');
  const orange = useIconBadgeColors('orange');
  const events = [
    { day: '1', label: '早番 9:00', colors: orange },
    { day: '2', label: '遅番 15:00', colors: blue },
    { day: '4', label: '早番 9:00', colors: orange },
  ];
  return (
    <View
      style={[
        styles.calendarCard,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
    >
      <ThemedText type="caption1" themeColor="textSecondary">
        10月のカレンダー
      </ThemedText>
      {events.map((event) => (
        <View key={event.day} style={styles.calendarRow}>
          <ThemedText type="headline" style={styles.calendarDay}>
            {event.day}
          </ThemedText>
          <View style={[styles.calendarEvent, { backgroundColor: event.colors.background }]}>
            <ThemedText type="caption1" style={{ color: event.colors.icon }}>
              {event.label}
            </ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

const SLIDES: TutorialSlideProps[] = [
  {
    title: 'シフToカレへようこそ',
    description:
      'シフト表の写真から、あなたのシフトだけを\n読み取ってカレンダーに登録するアプリです。',
    visual: { kind: 'appIcon' },
  },
  {
    title: '名前とカレンダーを設定',
    description: 'シフト表に書かれているあなたの名前と、\n登録先のカレンダーを選びます。',
    visual: { kind: 'screen', source: require('@/assets/images/tutorial/screen-mycustom.jpg') },
  },
  {
    title: 'シフト表を撮るか選ぶだけ',
    description: '配られた表を撮影するか、\nLINEで届いたスクショを選ぶだけでOK。',
    visual: { kind: 'screen', source: require('@/assets/images/tutorial/screen-photo.jpg') },
  },
  {
    title: 'はこブーが読み取るよ',
    description: 'AIがあなたの名前の行だけを見つけて、\n日付と時間を読み取ります。',
    visual: { kind: 'screen', source: require('@/assets/images/tutorial/screen-analyzing.jpg') },
  },
  {
    title: 'カレンダーに届いた！',
    description: '内容を確認したら、Apple カレンダーや Google カレンダーにまとめて登録。',
    visual: { kind: 'screen', source: require('@/assets/images/tutorial/screen-complete.jpg') },
    overlay: <CalendarCard />,
  },
];

type Step = 'slides' | 'choice' | 'declined';

/** 初回起動時のチュートリアル: 説明5枚 → 「実際にやってみよう」の分岐 → （やらない場合）補足1枚。 */
export default function TutorialScreen() {
  const theme = useTheme();
  const limitedTagColors = useIconBadgeColors('blue');
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  // 横スクロールの中では子が縦に伸びないため、表示領域の高さを測って各ページに渡す
  const [slideHeight, setSlideHeight] = useState(0);
  const [step, setStep] = useState<Step>('slides');
  const tutorialFreeScan = useAppStore((state) => state.tutorialFreeScan);
  const setHasSeenTutorial = useAppStore((state) => state.setHasSeenTutorial);
  const chooseTutorialFreeScan = useAppStore((state) => state.chooseTutorialFreeScan);
  const startTour = useTourStore((state) => state.start);

  // 「今だけ」の枠は、まだ分岐で選んでいない人にだけ見せる（データ初期化でのやり直しを除き一度きり）
  const canOfferFreeScan = tutorialFreeScan === 'unoffered';
  const isLastSlide = page === SLIDES.length - 1;

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const handleNext = () => {
    if (isLastSlide) {
      setStep('choice');
      return;
    }
    scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
    setPage(page + 1);
  };

  const handleTry = () => {
    chooseTutorialFreeScan(true);
    setHasSeenTutorial();
    // ここから案内付きの操作: カレンダー画面 → マイカスタム → 名前 → スキャン → 解析 → 登録完了
    startTour();
    router.replace('/(tabs)/calendar-view');
  };

  const handleDecline = () => {
    chooseTutorialFreeScan(false);
    setStep('declined');
  };

  const handleFinish = () => {
    setHasSeenTutorial();
    // トップ（index）がカレンダーの画面へ送る。名前が空なら、スキャンするときに写真選択の画面で小窓を出す
    router.replace('/');
  };

  if (step === 'choice') {
    return (
      <ThemedView style={styles.fill}>
        <SafeAreaView style={[styles.fill, styles.centerScreen]}>
          <View style={styles.centerBody}>
            <HakobuMascot pose="happy" size={120} />
            <ThemedText type="title2" style={styles.centerText}>
              実際にやってみよう！
            </ThemedText>
            {canOfferFreeScan && (
              <View style={[styles.limitedTag, { backgroundColor: limitedTagColors.background }]}>
                <ThemedText type="footnote" themeColor="primary" style={styles.limitedTagText}>
                  回数制限なしで試せるのは今だけ！
                </ThemedText>
              </View>
            )}
            <ThemedText type="subheadline" themeColor="textSecondary" style={styles.centerText}>
              {'名前を入れて、\nシフト表を1枚読み取るところまで進めます。'}
            </ThemedText>
          </View>

          <View style={styles.footer}>
            {/* 2つのボタンのどちらを押しても同意になるため、押す前に読めるようボタンの真上に置く */}
            <ThemedText type="footnote" themeColor="textSecondary" style={styles.centerText}>
              「やってみる」「やらない」のどちらかを押すと、{'\n'}
              <ThemedText
                type="footnote"
                themeColor="primary"
                onPress={() => router.push('/settings/legal/terms')}
              >
                利用規約
              </ThemedText>
              と
              <ThemedText
                type="footnote"
                themeColor="primary"
                onPress={() => router.push('/settings/legal/privacy')}
              >
                プライバシーポリシー
              </ThemedText>
              に{'\n'}同意したことになります。
            </ThemedText>
            <PrimaryButton label="やってみる" onPress={handleTry} variant="bluePill" />
            <SecondaryButton label="やらない" onPress={handleDecline} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (step === 'declined') {
    return (
      <ThemedView style={styles.fill}>
        <SafeAreaView style={[styles.fill, styles.centerScreen]}>
          <View style={styles.centerBody}>
            <HakobuMascot pose="happy" size={120} />
            <ThemedText type="title2" style={styles.centerText}>
              いつでも呼んでね
            </ThemedText>
            <ThemedText type="subheadline" themeColor="textSecondary" style={styles.centerText}>
              シフト表が配られたら、画面の真ん中にある「スキャン」から読み取れます。探す名前は「マイカスタム」でいつでも変えられます。
            </ThemedText>
          </View>
          <View style={styles.footer}>
            <PrimaryButton label="はじめる" onPress={handleFinish} variant="bluePill" />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.fill}>
      {/* 上の安全領域は各ページの薄い青の地の中で取る（TutorialSlide）ので、ここでは下と左右だけ */}
      <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          onLayout={(event) => setSlideHeight(event.nativeEvent.layout.height)}
          style={styles.fill}
        >
          {SLIDES.map((slide) => (
            <View key={slide.title} style={{ width, height: slideHeight }}>
              <TutorialSlide {...slide} />
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((slide, index) => (
            <View
              key={slide.title}
              style={[
                styles.dot,
                { backgroundColor: index === page ? theme.primary : theme.disabled },
              ]}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label={isLastSlide ? 'はじめる' : '次へ'}
            onPress={handleNext}
            variant="bluePill"
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  dot: {
    width: Spacing.two,
    height: Spacing.two,
    borderRadius: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  centerScreen: {
    justifyContent: 'space-between',
  },
  centerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  limitedTag: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  limitedTagText: {
    fontWeight: '700',
  },
  calendarCard: {
    position: 'absolute',
    top: '50%',
    right: '-14%',
    width: '68%',
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  calendarDay: {
    width: 20,
    textAlign: 'center',
  },
  calendarEvent: {
    flex: 1,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
