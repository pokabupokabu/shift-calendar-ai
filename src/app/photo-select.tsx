import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ShiftImage } from '@/services/ai';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';

async function toShiftImages(result: ImagePicker.ImagePickerResult): Promise<ShiftImage[]> {
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    uri: asset.uri,
    base64: asset.base64 ?? '',
    mimeType: asset.mimeType ?? 'image/jpeg',
  }));
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  base64: true,
  quality: 0.8,
};

/** 写真選択画面 (requirements section 5): camera, library, or multiple screenshots at once. */
export default function PhotoSelectScreen() {
  const [images, setImages] = useState<ShiftImage[]>([]);
  const setSessionImages = useShiftSessionStore((state) => state.setImages);

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      ...PICKER_OPTIONS,
      allowsMultipleSelection: true,
    });
    setImages(await toShiftImages(result));
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    setImages(await toShiftImages(result));
  };

  const handleNext = () => {
    setSessionImages(images);
    router.push('/analyzing');
  };

  return (
    <Screen>
      <ThemedText type="subtitle">シフト表の写真を選んでください</ThemedText>
      <ThemedText themeColor="textSecondary">
        複数のスクリーンショットをまとめて選択できます。
      </ThemedText>

      <View style={styles.buttonRow}>
        <PrimaryButton label="写真を撮る" onPress={pickFromCamera} />
        <PrimaryButton label="ライブラリから選ぶ" onPress={pickFromLibrary} />
      </View>

      {images.length > 0 && (
        <>
          <ThemedText>{images.length}枚選択中</ThemedText>
          <View style={styles.thumbnailRow}>
            {images.map((image) => (
              <Image key={image.uri} source={{ uri: image.uri }} style={styles.thumbnail} />
            ))}
          </View>
        </>
      )}

      <PrimaryButton label="解析する" onPress={handleNext} disabled={images.length === 0} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    gap: Spacing.two,
  },
  thumbnailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: Spacing.two,
  },
});
