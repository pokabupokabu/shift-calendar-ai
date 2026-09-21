import type { ShiftAnalysisResult, ShiftType } from '@/models';

export interface ShiftImage {
  uri: string;
  base64: string;
  mimeType: string;
}

export interface AnalyzeShiftImagesInput {
  images: ShiftImage[];
  /** The name the user registered as their own, to search for in the table (section 7). */
  shiftName: string;
  /** Learned shiftType -> time mappings, passed in as hints so a repeat "早番" needs no re-guessing (section 8). */
  knownShiftTypes: ShiftType[];
  /**
   * Set on a re-run after the user picked (or typed) which row is theirs from an
   * earlier `ambiguous`/`not_found` result (section 7 candidate confirmation UI).
   * When present, the provider must treat this exact row label as the confirmed
   * match instead of re-judging ambiguity.
   */
  confirmedRowLabel?: string;
}

/**
 * Adapter boundary between the app and whichever cloud AI model does the
 * image -> structured shift JSON work. Swapping models (Pro feature, or a
 * future on-device/hybrid OCR path) means adding a new implementation of
 * this interface, not touching call sites (requirements section 6, 24).
 */
export interface AIProvider {
  readonly id: string;
  analyzeShiftImages(input: AnalyzeShiftImagesInput): Promise<ShiftAnalysisResult>;
}
