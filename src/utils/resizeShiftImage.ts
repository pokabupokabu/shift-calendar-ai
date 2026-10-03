import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

import type { ShiftImage } from '@/services/ai';

/**
 * Long-edge cap before an image is downscaled. High enough to keep shift-table text
 * legible to the AI, low enough to bound Gemini request size/cost for full-resolution
 * phone photos (README "8. 不明点・リスク" 4).
 */
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

/** Downscales an image only if it exceeds MAX_DIMENSION on its longer edge; otherwise passes it through as-is. */
export async function resizeShiftImage(asset: ImagePickerAsset): Promise<ShiftImage> {
  const longestEdge = Math.max(asset.width, asset.height);
  if (longestEdge === 0 || longestEdge <= MAX_DIMENSION) {
    return { uri: asset.uri, base64: asset.base64 ?? '', mimeType: asset.mimeType ?? 'image/jpeg' };
  }

  const resize = asset.width >= asset.height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION };
  const result = await manipulateAsync(asset.uri, [{ resize }], {
    base64: true,
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });

  return { uri: result.uri, base64: result.base64 ?? '', mimeType: 'image/jpeg' };
}
