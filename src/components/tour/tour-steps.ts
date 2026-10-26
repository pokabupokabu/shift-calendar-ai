import type { HakobuPose } from '@/components/hakobu-mascot';
import type { TourStep, TourTargetId } from '@/store/useTourStore';

export interface TourStepConfig {
  /** 光らせる部品。無い手順は、はこブーの吹き出しだけを出す。 */
  target?: TourTargetId;
  /** true なら光らせた場所以外を押せなくする（途中でやめられない案内のため）。 */
  blocking: boolean;
  message: string;
  pose: HakobuPose;
  /** 重ね絵を出さない手順（ダイアログの中で案内するなど）。 */
  hidden?: boolean;
}

export const TOUR_STEPS: Record<TourStep, TourStepConfig> = {
  tabMyCustom: {
    target: 'tab-mycustom',
    blocking: true,
    message: 'まずは下の\n「マイカスタム」を押してね',
    pose: 'happy',
  },
  keywordRow: {
    target: 'keyword-row',
    blocking: true,
    message: '「登録者キーワード」を押して、\nキミの名前を入力してみよう',
    pose: 'happy',
  },
  keywordDialog: { blocking: false, message: '', pose: 'happy', hidden: true },
  tabScan: {
    target: 'tab-scan',
    blocking: true,
    message: 'ばっちり！次は真ん中の\n「スキャン」を押してね',
    pose: 'happy',
  },
  pickPhoto: {
    target: 'photo-buttons',
    blocking: true,
    message: 'シフト表を撮るか、\nライブラリから選んでね',
    pose: 'happy',
  },
  analyze: {
    target: 'analyze-button',
    blocking: true,
    message: '「スキャンする」を押してね。\n今回は回数を使わないよ',
    pose: 'happy',
  },
  // 初めてのスキャンの前の同意の小窓を開いているあいだ。重ね絵を隠して、小窓を押せるようにする
  consent: { blocking: false, message: '', pose: 'happy', hidden: true },
  analyzing: { blocking: false, message: '読み取り中…数秒待ってね', pose: 'running' },
  analyzeFailed: {
    blocking: false,
    message: 'うまく読めなかった…。\nお試しの1回は残っているから、\nもう一度試してみよう',
    pose: 'puzzled',
  },
  userMatch: {
    blocking: false,
    message: '表の中から、\nキミの行を選んでね',
    pose: 'puzzled',
  },
  confirm: {
    target: 'register-button',
    blocking: false,
    // 吹き出しの文字の幅は幅375で約239pt（15pt）。「「要確認」があれば押して確かめてね。」は収まらないため2行に分ける
    message:
      '内容を確かめて登録してね。\n「要確認」があれば\n押して確かめてね。\nカレンダーの許可を聞かれたら\n「許可」を押してね',
    pose: 'happy',
  },
  done: {
    blocking: false,
    message: 'カレンダーに届いたよ！\n次からは真ん中の\nスキャンを押すだけ',
    pose: 'happy',
  },
};
