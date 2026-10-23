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

/**
 * そのままAIへ送ってよい形式。これ以外（iPhoneのHEICなど）は、大きさに関係なくJPEGに変換する
 * （Anthropic の画像の受け付けはJPEG・PNG・GIF・WebPだけで、HEICは400で弾かれるため）。
 */
const PASSTHROUGH_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

/**
 * Downscales an image only if it exceeds MAX_DIMENSION on its longer edge; otherwise passes it
 * through as-is (unless its format is one the AI cannot read, in which case it is re-encoded as JPEG).
 */
export async function resizeShiftImage(asset: ImagePickerAsset): Promise<ShiftImage> {
  const longestEdge = Math.max(asset.width, asset.height);
  const mimeType = asset.mimeType ?? 'image/jpeg';
  const fitsAlready = longestEdge === 0 || longestEdge <= MAX_DIMENSION;
  if (fitsAlready && PASSTHROUGH_MIME_TYPES.has(mimeType)) {
    return { uri: asset.uri, base64: asset.base64 ?? '', mimeType };
  }

  const actions = fitsAlready
    ? []
    : [
        asset.width >= asset.height
          ? { resize: { width: MAX_DIMENSION } }
          : { resize: { height: MAX_DIMENSION } },
      ];
  const result = await manipulateAsync(asset.uri, actions, {
    base64: true,
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });

  return { uri: result.uri, base64: result.base64 ?? '', mimeType: 'image/jpeg' };
}
