/**
 * 時刻文字列が勤務時間として使えるか（"9:00" のような1桁時も許容する）。
 * AIの応答と画面での手入力を同じ基準で判定するために両方からここを使う。
 */
export function isValidTimeString(value: string | undefined | null): boolean {
  return !!value && /^([01]?\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

/** 開始・終了の両方が時刻として読める場合のみ、通常の（終日ではない）シフトとして扱える。 */
export function hasUsableTimeRange(startTime: string, endTime: string): boolean {
  return isValidTimeString(startTime) && isValidTimeString(endTime);
}
