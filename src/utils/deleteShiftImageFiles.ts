import type { ShiftImage } from '@/services/ai';

/**
 * No-op on web: expo-file-system is native-only (Android / iOS / tvOS), and the browser
 * has no app cache directory of ours to clean up. Keep in sync with the .native.ts
 * signature — the two must match exactly.
 */
export function deleteShiftImageFiles(_images: ShiftImage[]): void {}
