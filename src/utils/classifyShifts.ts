import type { CalendarEventRecord, Shift, ShiftRegistrationStatus } from '@/models';
import { needsReview } from '@/models';

/**
 * Classifies a shift for the confirmation screen (requirements section 11/12):
 * needs_review wins over overwrite, since an unreliable read shouldn't silently
 * replace a real existing event.
 */
export function classifyShift(
  shift: Shift,
  existingEvents: CalendarEventRecord[],
): ShiftRegistrationStatus {
  if (needsReview(shift)) return 'needs_review';
  const hasExisting = existingEvents.some((event) => event.date === shift.date);
  return hasExisting ? 'overwrite' : 'new';
}
