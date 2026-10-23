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
 *
 * 「高度なスキャン」（PROだけ・精度の高いモデルで読む）の回数も同じ時計で回復する。
 * ふつうの回数とは別枠で、高度なスキャンを使ってもふつうの回数は減らない（逆も同じ）。
 * 時計が止まっているときに高度なスキャンを使った場合も、そこで時計が動き出す。
 */

/** 回復の間隔。 */
const CYCLE_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;
const CYCLE_MS = CYCLE_DAYS * DAY_MS;

/** 無料プランが1サイクルに使える基本回数。 */
export const FREE_SCAN_LIMIT = 4;

/** PROプランが1サイクルに使える基本回数（月あたり実質30回）。 */
export const PRO_SCAN_LIMIT = 15;

/** 広告視聴で追加できる回数の上限（無料プランのみ）。 */
export const MAX_BONUS_SCANS = 5;

/** 1サイクル経過ごとに戻るボーナス枠の数。上限は MAX_BONUS_SCANS。 */
export const BONUS_RECOVERY_PER_CYCLE = 3;

/** 高度なスキャンの上限（PROのみ）。最初は満タンから始まる。 */
export const MAX_ADVANCED_SCANS = 5;

/** 1サイクル経過ごとに戻る高度なスキャンの数。上限は MAX_ADVANCED_SCANS。 */
export const ADVANCED_RECOVERY_PER_CYCLE = 3;

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
  /**
   * 高度なスキャンの残り回数（0〜MAX_ADVANCED_SCANS）。ボーナス枠と同じく、満タンへ戻るたびに
   * ADVANCED_RECOVERY_PER_CYCLE ずつ戻る（使い切った次のサイクルでいきなり満タンにはならない）。
   * persist version 19 で追加。それより前の保存データには無いので、読むときは満タン扱いにする。
   */
  advancedRemaining: number;
}

export const DEFAULT_SCAN_USAGE: ScanUsage = {
  cycleStartedAt: null,
  used: 0,
  earnedBonus: 0,
  bonusRemaining: MAX_BONUS_SCANS,
  advancedRemaining: MAX_ADVANCED_SCANS,
};

/** 保存データに高度なスキャンの欄が無い（壊れている）ときは満タンとみなす。 */
function storedAdvancedRemaining(usage: ScanUsage): number {
  const value = (usage as Partial<ScanUsage>).advancedRemaining;
  if (typeof value !== 'number' || !Number.isFinite(value)) return MAX_ADVANCED_SCANS;
  return Math.max(0, Math.min(MAX_ADVANCED_SCANS, Math.floor(value)));
}

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
  const advancedRemaining = storedAdvancedRemaining(usage);
  const unchanged =
    advancedRemaining === usage.advancedRemaining ? usage : { ...usage, advancedRemaining };
  if (!usage.cycleStartedAt) return unchanged;

  const startedAt = Date.parse(usage.cycleStartedAt);
  // 壊れた値や未来の日時が入っていた場合は、回復させずそのまま返す（時間を巻き戻さない）。
  if (!Number.isFinite(startedAt)) return unchanged;

  const elapsedCycles = Math.floor((now.getTime() - startedAt) / CYCLE_MS);
  if (elapsedCycles < 1) return unchanged;

  return {
    cycleStartedAt: null,
    used: 0,
    earnedBonus: 0,
    bonusRemaining: Math.min(
      MAX_BONUS_SCANS,
      usage.bonusRemaining + BONUS_RECOVERY_PER_CYCLE * elapsedCycles,
    ),
    advancedRemaining: Math.min(
      MAX_ADVANCED_SCANS,
      advancedRemaining + ADVANCED_RECOVERY_PER_CYCLE * elapsedCycles,
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

/**
 * 高度なスキャンの残り回数。PROだけの機能なので、PROでなければ常に0。
 * ふつうの回数の残りとは関係しない。
 */
export function remainingAdvancedScans(
  usage: ScanUsage,
  isPro: boolean,
  now: Date = new Date(),
): number {
  if (!isPro) return 0;
  return resolveScanUsage(usage, now).advancedRemaining;
}

/**
 * 高度なスキャンを1回使ったあとの状態。ふつうの回数（used）は変えない。
 * 時計が止まっていた（満タンだった）ときは、ここで時計が動き出す。
 */
export function nextAdvancedScanUsage(usage: ScanUsage, now: Date = new Date()): ScanUsage {
  const current = resolveScanUsage(usage, now);
  if (current.advancedRemaining <= 0) return current;
  return {
    ...current,
    cycleStartedAt: current.cycleStartedAt ?? now.toISOString(),
    advancedRemaining: current.advancedRemaining - 1,
  };
}

/**
 * 次に回数が戻るまでの日数（切り上げ。あと半日なら「あと1日」）。
 * 時計が止まっている（満タンで、使い始めていない）ときは null。
 */
export function daysUntilNextRecovery(usage: ScanUsage, now: Date = new Date()): number | null {
  const recoveryAt = nextRecoveryAt(usage, now);
  if (!recoveryAt) return null;
  return Math.max(1, Math.ceil((recoveryAt.getTime() - now.getTime()) / DAY_MS));
}

/** 次の回復で高度なスキャンが何回戻るか（上限を超えるぶんは戻らない）。 */
export function advancedRecoveryAmount(remaining: number): number {
  return Math.max(0, Math.min(ADVANCED_RECOVERY_PER_CYCLE, MAX_ADVANCED_SCANS - remaining));
}
