export type WageType = 'hourly' | 'daily';

/**
 * User-editable master mapping a shift type name (e.g. "早番") to its default
 * time range, so the AI's per-shift confidence can improve after a user
 * correction is fed back in (section 8).
 *
 * 基本の3つ（早番・遅番・夜勤）は、本人が時刻を入れるまで `startTime` / `endTime` を持たない
 * （「未登録」。persist version 17 から。以前は仮の時刻が最初から入っていた）。
 * 時刻があるかどうかは `isShiftTypeRegistered` で判定する。
 */
export interface ShiftType {
  id: string;
  name: string;
  /** "HH:mm"。未登録なら undefined。 */
  startTime?: string;
  /** "HH:mm", may be earlier than startTime for overnight shifts。未登録なら undefined。 */
  endTime?: string;
  icon?: string;
}

/** 時刻が登録済みのシフト種別。 */
export type RegisteredShiftType = ShiftType & { startTime: string; endTime: string };

/** 開始・終了の両方の時刻が入っているか（「未登録」でないか）。 */
export function isShiftTypeRegistered(shiftType: ShiftType): shiftType is RegisteredShiftType {
  return Boolean(shiftType.startTime) && Boolean(shiftType.endTime);
}
