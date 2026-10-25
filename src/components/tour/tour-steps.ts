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
    message: 'まずは下の「マイカスタム」を押してね',
    pose: 'happy',
  },
  keywordRow: {
    target: 'keyword-row',
    blocking: true,
    message: '「登録者キーワード」を押して、シフト表に書かれているあなたの名前を入れてね',
    pose: 'happy',
  },
  keywordDialog: { blocking: false, message: '', pose: 'happy', hidden: true },
  tabScan: {
    target: 'tab-scan',
    blocking: true,
    message: 'ばっちり！次は真ん中の「スキャン」を押してね',
    pose: 'happy',
  },
  pickPhoto: {
    target: 'photo-buttons',
    blocking: true,
    message: 'シフト表を撮るか、ライブラリから選んでね',
    pose: 'happy',
  },
  analyze: {
    target: 'analyze-button',
    blocking: true,
    message: '「スキャンする」を押してね。今回は回数を使わないよ',
    pose: 'happy',
  },
  // 初めてのスキャンの前の同意の小窓を開いているあいだ。重ね絵を隠して、小窓を押せるようにする
  consent: { blocking: false, message: '', pose: 'happy', hidden: true },
  analyzing: { blocking: false, message: '読み取り中…数秒待ってね', pose: 'running' },
  analyzeFailed: {
    blocking: false,
    message: 'うまく読めなかった…。お試しの1回は残っているから、もう一度試してみよう',
    pose: 'puzzled',
  },
  userMatch: {
    blocking: false,
    message: '表の中から、あなたの行を選んでね',
    pose: 'puzzled',
  },
  confirm: {
    target: 'register-button',
    blocking: false,
    message:
      '内容を確かめて登録してね。「要確認」があれば押して確かめてね。カレンダーの許可を聞かれたら「許可」を押してね',
    pose: 'happy',
  },
  done: {
    blocking: false,
    message: 'カレンダーに届いたよ！次からは真ん中のスキャンを押すだけ',
    pose: 'happy',
  },
};
