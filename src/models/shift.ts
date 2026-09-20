export type ShiftSource = 'ai_extracted' | 'manual';

/**
 * A single day's shift, either freshly extracted by AI or hand-edited by the user.
 * confidence is kept internal only — the UI never shows the raw number (section 9).
 */
export interface Shift {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  shiftType: string;
  isOvernight: boolean;
  confidence: number; // 0..1, internal only
  source: ShiftSource;
}

/** Confidence below this is surfaced to the user as "要確認" (section 9). */
export const NEEDS_REVIEW_CONFIDENCE_THRESHOLD = 0.85;

export function needsReview(shift: Pick<Shift, 'confidence'>): boolean {
  return shift.confidence < NEEDS_REVIEW_CONFIDENCE_THRESHOLD;
}

/**
 * How a shift is classified on the confirmation screen (section 11/12):
 * new registration, overwrite of an app-created event on the same date,
 * or needing user review before either.
 */
export type ShiftRegistrationStatus = 'new' | 'overwrite' | 'needs_review';
