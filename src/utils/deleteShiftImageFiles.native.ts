import { File } from 'expo-file-system';

import type { ShiftImage } from '@/services/ai';

/**
 * Removes the cached copies of shift-table photos once a scan run is over.
 *
 * Both paths through resizeShiftImage leave a file in the app's cache: expo-image-picker
 * copies the picked photo there, and expo-image-manipulator writes the downscaled JPEG
 * there. Neither is cleaned up automatically before iOS decides to reclaim the cache, so a
 * shift table — which typically shows co-workers' names, not just the user's — would sit on
 * the device indefinitely. Deleting them lets the privacy policy state that the images are
 * not kept after analysis.
 *
 * Keep in sync with deleteShiftImageFiles.ts (the web no-op).
 */
export function deleteShiftImageFiles(images: ShiftImage[]): void {
  for (const image of images) {
    // Remote or data URIs are not ours to delete; only the local cache copies are.
    if (!image.uri.startsWith('file://')) continue;

    try {
      const file = new File(image.uri);
      if (file.exists) file.delete();
    } catch {
      // Best effort. The OS reclaims the cache directory on its own, and failing to delete
      // a temp file must never break the scan flow the user is in the middle of.
    }
  }
}
