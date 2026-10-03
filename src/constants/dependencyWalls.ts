export interface DependencyWall {
  /** 年収の壁となる金額（円）。 */
  threshold: number;
  /** 壁の呼び名、例: 「103万円の壁」。 */
  label: string;
  /** 壁の内容を一言で説明する注記。条件は働き方や企業規模で変わるため、あくまで目安として示す。 */
  description: string;
}

export const DEPENDENCY_WALLS: DependencyWall[] = [
  { threshold: 1_030_000, label: '103万円の壁', description: '所得税がかかり始める目安' },
  {
    threshold: 1_060_000,
    label: '106万円の壁',
    description: '条件次第で社会保険加入の対象になる目安',
  },
  { threshold: 1_300_000, label: '130万円の壁', description: '扶養から外れる目安' },
];
