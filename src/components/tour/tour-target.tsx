import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { type TourTargetId, useTourStore } from '@/store/useTourStore';

import { TOUR_STEPS } from './tour-steps';

interface TourTargetProps {
  id: TourTargetId;
  style?: StyleProp<ViewStyle>;
  /**
   * 画面のフォーカスに合わせて位置を消すか。タブバーは画面の外（ナビゲーターの部品）にあり
   * フォーカスを追えないため、タブバーに置くときは false にする。
   */
  followsScreenFocus?: boolean;
  children: React.ReactNode;
}

/**
 * 案内で光らせたい部品を包む。今の手順がこの部品を指しているあいだだけ、
 * 画面上の位置を測って案内の重ね絵に渡す（スクロールなどで動くので定期的に測り直す）。
 */
export function TourTarget({ id, style, followsScreenFocus = true, children }: TourTargetProps) {
  const ref = useRef<View>(null);
  const isActive = useTourStore(
    (state) => state.step !== null && TOUR_STEPS[state.step].target === id,
  );
  const setTarget = useTourStore((state) => state.setTarget);
  const clearTarget = useTourStore((state) => state.clearTarget);
  // 別の画面に移ったら位置を消す（裏に残った画面の位置で光らせないため）
  const [isFocused, setFocused] = useState(!followsScreenFocus);
  useFocusEffect(
    useCallback(() => {
      if (!followsScreenFocus) return undefined;
      setFocused(true);
      return () => {
        setFocused(false);
        clearTarget(id);
      };
    }, [clearTarget, followsScreenFocus, id]),
  );

  useEffect(() => {
    if (!isActive || !isFocused) return undefined;
    const measure = () =>
      ref.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) setTarget(id, { x, y, width, height });
      });
    measure();
    const timer = setInterval(measure, 400);
    return () => clearInterval(timer);
  }, [id, isActive, isFocused, setTarget]);

  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
