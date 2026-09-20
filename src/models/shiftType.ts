/**
 * User-editable master mapping a shift type name (e.g. "早番") to its default
 * time range, so the AI's per-shift confidence can improve after a user
 * correction is fed back in (section 8).
 */
export interface ShiftType {
  id: string;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm", may be earlier than startTime for overnight shifts
}
