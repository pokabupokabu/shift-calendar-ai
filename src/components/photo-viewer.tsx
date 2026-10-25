import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';
import { Image, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

/**
 * 写真の拡大表示は、写真そのものを見せるための画面なので、アプリの外観（ライト・ダーク）によらず
 * 黒い背景・白い×にする（iPhoneの写真アプリと同じ）。テーマのトークンは使わない。
 */
const VIEWER_BACKGROUND = '#000000';
const CLOSE_ICON = '#FFFFFF';
const CLOSE_BACKGROUND = 'rgba(255,255,255,0.2)';
/** 指で広げたときの最大倍率（iOS の ScrollView の拡大）。 */
const MAX_ZOOM = 5;
/** ×の丸の大きさ。指で押しやすい最小の44pt。 */
const CLOSE_SIZE = 44;

interface PhotoViewerProps {
  /** 表示する写真。null なら閉じている。 */
  uri: string | null;
  onClose: () => void;
}

/**
 * 選んだ写真の全画面の拡大表示（docs/ui-review/group-b.md の決定3）。写真全体を切らずに画面に合わせて出し、
 * 指で広げて拡大できる（iOS は ScrollView の拡大機能。Webでは拡大しない）。右上の×で閉じる。
 * 題名・枚数・共有などは出さない。
 */
export function PhotoViewer({ uri, onClose }: PhotoViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={uri !== null}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait']}
    >
      <StatusBar style="light" />
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.center}
        maximumZoomScale={MAX_ZOOM}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bouncesZoom
      >
        {uri && (
          <Image
            source={{ uri }}
            resizeMode="contain"
            style={{ width, height }}
            accessibilityLabel="選んだシフト表の写真"
          />
        )}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="閉じる"
        onPress={onClose}
        style={({ pressed }) => [
          styles.close,
          { top: insets.top + Spacing.two, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <X size={24} color={CLOSE_ICON} strokeWidth={2.4} />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: VIEWER_BACKGROUND,
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    right: Spacing.three,
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    borderRadius: CLOSE_SIZE / 2,
    backgroundColor: CLOSE_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
