/**
 * AI解析回数の管理。
 *
 * 暦月ではなく「使い始めてから15日」で回復する方式を採っている。シフト表が公開される
 * タイミングは勤務先ごとにバラバラで、毎月1日に一律付与すると「公開された直後に枠が無い」
 * という人が必ず出るため。
 *
 * サイクルの考え方:
 *   満タンの状態では時計が止まっている（cycleStartedAt が null）。
 *   最初に1回使った時点で時計が動き出し、そこから15日経つと満タンに戻る。
 *   戻ったあとはまた時計が止まり、次に使った日から数え直す。
 */

/** 回復の間隔。 */
const CYCLE_DAYS = 15;
const CYCLE_MS = CYCLE_DAYS * 24 * 60 * 60 * 1000;

/** 無料プランが1サイクルに使える基本回数。 */
export const FREE_SCAN_LIMIT = 4;

/** PROプランが1サイクルに使える基本回数（月あたり実質30回）。 */
export const PRO_SCAN_LIMIT = 15;

/** 広告視聴で追加できる回数の上限（無料プランのみ）。 */
export const MAX_BONUS_SCANS = 5;

/** 1サイクル経過ごとに戻るボーナス枠の数。上限は MAX_BONUS_SCANS。 */
export const BONUS_RECOVERY_PER_CYCLE = 3;

export interface ScanUsage {
  /**
   * 満タンに戻ってから最初に解析した時刻（ISO文字列）。
   * null は「満タンのまま、まだ使っていない」状態で、このとき時計は動かない。
   */
  cycleStartedAt: string | null;
  /** このサイクルで使った解析回数。 */
  used: number;
  /** このサイクルで広告視聴によって追加した回数。 */
  earnedBonus: number;
  /** あと何回広告で追加できるか（0〜MAX_BONUS_SCANS）。 */
  bonusRemaining: number;
}

export const DEFAULT_SCAN_USAGE: ScanUsage = {
  cycleStartedAt: null,
  used: 0,
  earnedBonus: 0,
  bonusRemaining: MAX_BONUS_SCANS,
};

/** プランごとの基本回数。 */
export function scanLimitFor(isPro: boolean): number {
  return isPro ? PRO_SCAN_LIMIT : FREE_SCAN_LIMIT;
}

/**
 * 経過したサイクル数ぶんの回復を適用した、現時点の実際の状態を返す。
 *
 * 保存されている値をその場で書き換えるのではなく、読むたびに計算し直す形にしている。
 * アプリを開いていない間も時間は進むため、「保存時点の値」をそのまま信じると回復が止まる。
 */
export function resolveScanUsage(usage: ScanUsage, now: Date = new Date()): ScanUsage {
  if (!usage.cycleStartedAt) return usage;

  const startedAt = Date.parse(usage.cycleStartedAt);
  // 壊れた値や未来の日時が入っていた場合は、回復させずそのまま返す（時間を巻き戻さない）。
  if (!Number.isFinite(startedAt)) return usage;

  const elapsedCycles = Math.floor((now.getTime() - startedAt) / CYCLE_MS);
  if (elapsedCycles < 1) return usage;

  return {
    cycleStartedAt: null,
    used: 0,
    earnedBonus: 0,
    bonusRemaining: Math.min(
      MAX_BONUS_SCANS,
      usage.bonusRemaining + BONUS_RECOVERY_PER_CYCLE * elapsedCycles,
    ),
  };
}

/** 残りの解析回数（基本枠＋広告で追加したぶん − 使用済み）。 */
export function remainingScans(usage: ScanUsage, isPro: boolean, now: Date = new Date()): number {
  const current = resolveScanUsage(usage, now);
  const limit = scanLimitFor(isPro) + current.earnedBonus;
  return Math.max(0, limit - current.used);
}

/**
 * 広告を見て回数を追加できるか。
 * PROは広告を出さないので、追加の仕組みも持たない。
 */
export function canEarnBonusScan(
  usage: ScanUsage,
  isPro: boolean,
  now: Date = new Date(),
): boolean {
  if (isPro) return false;
  return resolveScanUsage(usage, now).bonusRemaining > 0;
}

/** 次に満タンへ戻る時刻。まだ使っていない（満タンの）ときは null。 */
export function nextRecoveryAt(usage: ScanUsage, now: Date = new Date()): Date | null {
  const current = resolveScanUsage(usage, now);
  if (!current.cycleStartedAt) return null;
  const startedAt = Date.parse(current.cycleStartedAt);
  if (!Number.isFinite(startedAt)) return null;
  return new Date(startedAt + CYCLE_MS);
}

/** 1回使ったあとの状態。満タンから使い始めたときは、ここで時計が動き出す。 */
export function nextScanUsage(usage: ScanUsage, now: Date = new Date()): ScanUsage {
  const current = resolveScanUsage(usage, now);
  return {
    ...current,
    cycleStartedAt: current.cycleStartedAt ?? now.toISOString(),
    used: current.used + 1,
  };
}

/**
 * 広告を1回見て回数を1つ増やしたあとの状態。
 * 広告視聴そのものは解析ではないので、時計は動かさない（使った時点で動き出す）。
 */
export function grantBonusScan(usage: ScanUsage, now: Date = new Date()): ScanUsage {
  const current = resolveScanUsage(usage, now);
  if (current.bonusRemaining <= 0) return current;
  return {
    ...current,
    earnedBonus: current.earnedBonus + 1,
    bonusRemaining: current.bonusRemaining - 1,
  };
}
