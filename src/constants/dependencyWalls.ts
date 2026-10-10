/**
 * 「年収の壁」の判定ロジック。
 *
 * 出すのは「本人の手取りに影響する壁」だけに絞っている。
 * - 社会保険の扶養（130万 / 19〜22歳は150万）… 超えると自分で保険料を払う。実損が出る「崖」
 * - 本人の所得税（年分により160万〜178万）… 超えた分にだけ課税される「坂」。手取りは減らない
 *
 * 親側の壁（扶養控除・特定親族特別控除）は意図的に出していない。本人の手取りが1円も変わらず、
 * 本数が増えるだけで「どれが本当にまずいのか」が伝わらなくなるため。調べた内容は下に残す。
 *
 * 一次情報（いずれも2026-10-10時点で原文を確認）:
 * - 国税庁 No.1199 基礎控除
 *   https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1199.htm
 *   「控除額」は colspan=4 で、列は [令和6年分以前=48万][令和7年分=95万]
 *   [令和8年分・令和9年分=104万][令和10年分以後=99万]（合計所得132万円以下の場合）。
 *   令和9年分も104万であって99万ではない点に注意。
 * - 国税庁 No.1410 給与所得控除
 *   https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm
 *   令和7年分: 収入190万円まで 65万円 / 令和8年分・令和9年分: 収入220万円まで 74万円。
 *   基礎控除と同じく令和8年分・令和9年分の2年セットの経過措置。
 * - 日本年金機構「19歳以上23歳未満の方の被扶養者認定における年間収入要件が変わります」
 *   https://www.nenkin.go.jp/oshirase/taisetu/2025/202508/0819.html
 *   令和7年10月1日以降、19歳以上23歳未満は「年間収入130万円未満」→「150万円未満」。
 *   年齢は扶養認定日が属する年の12月31日時点で判定。
 * - 日本年金機構「2026（令和8）年10月に社会保険の短時間労働者に係る賃金要件が撤廃されました」
 *   https://www.nenkin.go.jp/oshirase/taisetu/jigyosho/2026/202610/100104.html
 *   月額8.8万円の賃金要件は撤廃済み（＝いわゆる106万円の壁は年収の壁としては消滅）。
 *   残る要件は「週20時間以上」「従業員51人以上」「学生ではないこと」。
 *
 * 表示していない親側の壁（復活させるときはここを参照すること）:
 * - 特定親族特別控除（19歳以上23歳未満）… 国税庁 No.1177。合計所得85万円以下で満額63万円、
 *   123万円で0円。給与収入換算で令和7年分 150万〜188万、令和8年分・令和9年分 159万〜197万。
 * - 扶養控除（19歳以上23歳未満以外）… 国税庁 No.1180。給与収入で令和7年分 123万円以下、
 *   令和8年分以後は合計所得62万円以下（令和8年分・令和9年分の給与収入換算で136万円以下）。
 */

/** 壁の種類。 */
export type DependencyWallKind = 'socialInsurance' | 'incomeTax';

/**
 * 壁の深刻度。表示の強さを変えるために使う。
 * - cliff: 超えた瞬間に実損が出る。警告色で出す
 * - info:  超えた分にだけ段階的にかかる。手取りは減らないので警告色にしない
 */
export type DependencyWallSeverity = 'cliff' | 'info';

export interface DependencyWall {
  /** React の key 用の安定した識別子。 */
  id: string;
  kind: DependencyWallKind;
  severity: DependencyWallSeverity;
  /** 年収の壁となる金額（円）。 */
  threshold: number;
  /** 壁の呼び名、例: 「150万円の壁」。 */
  label: string;
  /** 壁の内容を一言で説明する注記。条件は働き方や勤務先で変わるため、あくまで目安として示す。 */
  description: string;
}

export interface DependencyWallInput {
  /** 集計対象の暦年（西暦）。 */
  year: number;
  /** 生まれ年（西暦）。未設定なら年齢による出し分けができない。 */
  birthYear?: number;
  /** 昼間部の学生か。しきい値には影響せず、社会保険の注意書きの出し分けだけに使う。 */
  isDaytimeStudent?: boolean;
}

export interface DependencyWallSet {
  walls: DependencyWall[];
  /** 生まれ年が未設定で、年齢によらない一般的な目安にフォールバックしているか。 */
  isGeneric: boolean;
  /** その年の12月31日時点の年齢（生まれ年が未設定なら undefined）。 */
  ageAtYearEnd?: number;
  /** 12月31日時点で19歳以上23歳未満か（＝被扶養者認定の年齢要件に当たるか）。 */
  isSpecificRelativeAge: boolean;
  /** カードの下に添える補足。断定を避けた定性的な表現のみ。 */
  notes: string[];
}

/**
 * 本人に所得税がかかり始める給与収入（基礎控除＋給与所得控除）。令和N年分 = 西暦N+2018年分。
 *
 * 2025年分: 95万 + 65万 = 160万
 * 2026年分・2027年分: 104万 + 74万 = 178万（2年セットの経過措置）
 */
const INCOME_TAX_FREE_BY_YEAR: Record<number, number> = {
  2025: 1_600_000,
  2026: 1_780_000,
  2027: 1_780_000,
};

/**
 * 令和10年分（2028年分）以後。基礎控除は No.1199 の表の第4列により99万円（95万円ではない）。
 * 給与所得控除は令和10年分以後の表が国税庁からまだ公表されていないため、本則の65万円に戻る
 * 前提で算出している。令和10年分の表が出たら必ず再確認すること。
 */
const INCOME_TAX_FREE_FALLBACK = 1_640_000;

/** 社会保険の被扶養者認定（19歳以上23歳未満、令和7年10月1日〜）。「150万円未満」が要件。 */
const SOCIAL_INSURANCE_LIMIT_YOUNG = 1_500_000;
/** 社会保険の被扶養者認定（上記以外）。「130万円未満」が要件。 */
const SOCIAL_INSURANCE_LIMIT_DEFAULT = 1_300_000;

function incomeTaxFreeFor(year: number): number {
  if (year <= 2025) return INCOME_TAX_FREE_BY_YEAR[2025];
  return INCOME_TAX_FREE_BY_YEAR[year] ?? INCOME_TAX_FREE_FALLBACK;
}

/** 「150万円の壁」のように、万円単位の端数が出ない金額を前提にしたラベル生成。 */
function wallLabel(threshold: number): string {
  return `${Math.round(threshold / 10_000).toLocaleString('ja-JP')}万円の壁`;
}

/**
 * その年の12月31日時点の年齢。
 *
 * 年齢計算ニ関スル法律では誕生日の前日に加齢するため、1月1日生まれの人だけは
 * この計算より1歳上になるが、UIは目安表示のため許容している。
 */
function ageAtYearEnd(year: number, birthYear: number): number {
  return year - birthYear;
}

/**
 * 条件から「年収の壁」の一覧を組み立てる。常に社会保険と所得税の2本を返す。
 *
 * 生まれ年が未設定のときは断定を避け、年齢によらない一般的な目安（社会保険130万円）を
 * `isGeneric: true` で返す。呼び出し側はこのフラグを見て、設定を促す導線を出すこと。
 */
export function resolveDependencyWalls({
  year,
  birthYear,
  isDaytimeStudent,
}: DependencyWallInput): DependencyWallSet {
  const age = birthYear !== undefined ? ageAtYearEnd(year, birthYear) : undefined;
  const isSpecificRelativeAge = age !== undefined && age >= 19 && age < 23;
  const notes: string[] = [];

  const socialInsuranceLimit = isSpecificRelativeAge
    ? SOCIAL_INSURANCE_LIMIT_YOUNG
    : SOCIAL_INSURANCE_LIMIT_DEFAULT;
  const incomeTaxFree = incomeTaxFreeFor(year);

  const walls: DependencyWall[] = [
    {
      id: 'socialInsurance',
      kind: 'socialInsurance',
      severity: 'cliff',
      threshold: socialInsuranceLimit,
      label: wallLabel(socialInsuranceLimit),
      description: isSpecificRelativeAge
        ? '超えると親の社会保険の扶養から外れ、自分で保険料を払う目安（19〜22歳は150万円未満が条件）'
        : '超えると扶養している人（親など）の社会保険の扶養から外れ、自分で保険料を払う目安（130万円未満が条件）',
    },
    {
      id: 'incomeTax',
      kind: 'incomeTax',
      severity: 'info',
      threshold: incomeTaxFree,
      label: wallLabel(incomeTaxFree),
      description: '自分に所得税がかかり始める目安。超えた分にだけかかります',
    },
  ];

  if (isDaytimeStudent === true) {
    notes.push(
      '昼間部の学生は、勤務時間による社会保険の加入（週20時間以上・従業員51人以上）の対象外とされています。',
    );
  } else if (isDaytimeStudent === false) {
    notes.push(
      '週20時間以上・従業員51人以上の勤務先では、年収に関わらず自分の社会保険に加入することがあります。',
    );
  }

  notes.push('住民税は自治体によって基準が異なるため、この表には含めていません。');

  return {
    walls: walls.sort((a, b) => a.threshold - b.threshold),
    isGeneric: birthYear === undefined,
    ageAtYearEnd: age,
    isSpecificRelativeAge,
    notes,
  };
}
