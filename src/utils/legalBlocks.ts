/**
 * 文書（src/constants/legalContent.ts）の本文の文字列を、画面で形を変えて出すための部品に分ける。
 * docs/ui-review/group-d.md「D3 文書」。
 *
 * 文書の文字列は法務ページの静的サイト（feat/legal-site）でも同じものを使うため、
 * データの形も文言も変えず、見出し・番号付きの項目・Q&A・「項目: 内容」などは
 * ここで文字列から見つけ出す。分けた部品をつなぎ直すと元の行が1文字も欠けずに戻るように、
 * 行頭の印（「1. 」「・」「Q. 」など）は `prefix` に元のまま持つ（画面では丸や点に置き換える）。
 *
 * React Native に依存しない純粋な関数だけを置く（Node で検証できるように）。
 */

/** 本文の1行を分類したもの。 */
export type LegalLine =
  /** 見出し。level 1 =「第1条（適用）」「1. 取得する情報」、level 2 =「(1) Google AdMob」。 */
  | { type: 'heading'; level: 1 | 2; text: string }
  /** 行頭に印のある項目。印の種類は `marker`、元の印（空白を含む）は `prefix`。 */
  | {
      type: 'item';
      /** paren = 番号付きの項目の中の、字下げした「(1) …」（利用規約 第13条）。字下げして出す。 */
      marker: 'number' | 'bullet' | 'note' | 'paren';
      prefix: string;
      text: string;
    }
  /** ふつうの文。 */
  | { type: 'text'; text: string };

/** 空行で区切られたひとまとまり。 */
export type LegalChunk = LegalLine[];

const ARTICLE_HEADING = /^第\d+条（.+）$/;
const NUMBERED = /^(\d+\.\s*)(.*)$/;
const SUB_HEADING = /^\(\d+\)\s/;
const BULLET = /^(・)(.*)$/;
const NOTE = /^(※\s*)(.*)$/;
/** 行頭に字下げ（全角・半角の空白）がある「(1) …」。字下げの無い見出しの「(1) …」とは別に扱う。 */
const INDENTED_PAREN = /^([　 ]+\(\d+\)\s*)(.*)$/;

/** 空行で区切ったまとまりごとに、空でない行の配列にする。 */
function splitChunks(body: string): string[][] {
  return body
    .split(/\n{2,}/)
    .map((chunk) => chunk.split('\n').filter((line) => line.trim().length > 0))
    .filter((lines) => lines.length > 0);
}

function classifyLine(line: string, indexInChunk: number, chunkLength: number): LegalLine {
  if (ARTICLE_HEADING.test(line)) return { type: 'heading', level: 1, text: line };

  // 「1. 取得する情報」のように、まとまりの先頭にあって下に中身が続く番号の行は見出し
  // （プライバシーポリシー）。利用規約の「1. 本アプリは…」は条の見出しの下にあるので項目になる。
  const numbered = NUMBERED.exec(line);
  if (numbered) {
    if (indexInChunk === 0 && chunkLength > 1) return { type: 'heading', level: 1, text: line };
    return { type: 'item', marker: 'number', prefix: numbered[1], text: numbered[2] };
  }

  if (indexInChunk === 0 && chunkLength > 1 && SUB_HEADING.test(line)) {
    return { type: 'heading', level: 2, text: line };
  }

  const bullet = BULLET.exec(line);
  if (bullet) return { type: 'item', marker: 'bullet', prefix: bullet[1], text: bullet[2] };

  const note = NOTE.exec(line);
  if (note) return { type: 'item', marker: 'note', prefix: note[1], text: note[2] };

  const paren = INDENTED_PAREN.exec(line);
  if (paren) return { type: 'item', marker: 'paren', prefix: paren[1], text: paren[2] };

  return { type: 'text', text: line };
}

/** 利用規約・プライバシーポリシーのような、見出しと本文の続く文書を分ける。 */
export function parseArticle(body: string): LegalChunk[] {
  return splitChunks(body).map((lines) => {
    const classified = lines.map((line, index) => classifyLine(line, index, lines.length));
    // 「2. 取得する情報」のすぐ下の行が「(1) …」で、その下に中身が続くときは、(1) も小見出しにする
    // （2026-10-25 のプライバシーポリシー。(2) 以降は空行のあとのまとまりの先頭なので、もともと小見出しになる）。
    const [first, second] = classified;
    if (
      first?.type === 'heading' &&
      first.level === 1 &&
      second?.type === 'text' &&
      lines.length > 2 &&
      SUB_HEADING.test(lines[1])
    ) {
      classified[1] = { type: 'heading', level: 2, text: lines[1] };
    }
    return classified;
  });
}

/** よくある質問の1問。`questionPrefix` / `answerPrefix` は元の「Q. 」「A. 」。 */
export interface FaqItem {
  questionPrefix: string;
  question: string;
  answerPrefix: string;
  answer: string;
}

export interface FaqLayout {
  items: FaqItem[];
  /** Q&A の形になっていない段落（今のダミーの但し書きなど）。カードの下に注記として出す。 */
  footnotes: string[];
}

const QUESTION = /^(Q\.\s*)(.*)$/;
const ANSWER = /^(A\.\s*)(.*)$/;

export function parseFaq(body: string): FaqLayout {
  const items: FaqItem[] = [];
  const footnotes: string[] = [];

  for (const lines of splitChunks(body)) {
    const question = lines.length >= 2 ? QUESTION.exec(lines[0]) : null;
    const answer = question ? ANSWER.exec(lines[1]) : null;
    if (question && answer) {
      items.push({
        questionPrefix: question[1],
        question: question[2],
        answerPrefix: answer[1],
        // 答えが2行以上に分かれていても落とさない
        answer: [answer[2], ...lines.slice(2)].join('\n'),
      });
    } else {
      footnotes.push(...lines);
    }
  }

  return { items, footnotes };
}

/** お問い合わせの画面に置く部品。 */
export interface ContactLayout {
  /** いちばん上の案内文。 */
  lead: string[];
  /** 「メールアドレス: xxx」の行。見つからなければ null（そのときは本文のまま出す）。 */
  email: { label: string; separator: string; address: string } | null;
  /** 「お問い合わせの際は、以下を…」と、その下の「・」の行。 */
  checklist: { intro: string; items: { prefix: string; text: string }[] } | null;
  /** そのほかの段落。画面のいちばん下に注記として出す。 */
  footnotes: string[];
}

const EMAIL_FIELD = /^(.+?)(:\s*)([^\s@]+@[^\s@]+\.[^\s@]+)$/;

export function parseContact(body: string): ContactLayout {
  const layout: ContactLayout = { lead: [], email: null, checklist: null, footnotes: [] };

  splitChunks(body).forEach((lines, chunkIndex) => {
    const email = lines.length === 1 ? EMAIL_FIELD.exec(lines[0]) : null;
    if (email && !layout.email) {
      layout.email = { label: email[1], separator: email[2], address: email[3] };
      return;
    }

    const bullets = lines.slice(1).map((line) => BULLET.exec(line));
    if (!layout.checklist && lines.length >= 2 && bullets.every((match) => match !== null)) {
      layout.checklist = {
        intro: lines[0],
        items: bullets.map((match) => ({ prefix: match![1], text: match![2] })),
      };
      return;
    }

    if (chunkIndex === 0) {
      layout.lead.push(...lines);
    } else {
      layout.footnotes.push(...lines);
    }
  });

  return layout;
}

/** 特定商取引法に基づく表記の1行（「項目: 内容」を最初の「: 」で分けたもの）。 */
export interface FieldRow {
  /** 項目名。「: 」の無い行では null（内容だけを出す）。 */
  label: string | null;
  separator: string;
  value: string;
}

export function parseFields(body: string): FieldRow[] {
  return splitChunks(body)
    .flat()
    .map((line) => {
      const index = line.indexOf(': ');
      if (index <= 0) return { label: null, separator: '', value: line };
      return { label: line.slice(0, index), separator: ': ', value: line.slice(index + 2) };
    });
}

/**
 * 検証用: 分けた部品から元の行を組み立て直す（画面では印を丸や点に置き換えるが、
 * 文字としては prefix に元のまま残っていることを確かめる）。順番は部品の並びのまま。
 */
export function articleLines(chunks: LegalChunk[]): string[] {
  return chunks.flat().map((line) => (line.type === 'item' ? line.prefix + line.text : line.text));
}

export function faqLines(layout: FaqLayout): string[] {
  return [
    ...layout.items.flatMap((item) => [
      item.questionPrefix + item.question,
      ...(item.answerPrefix + item.answer).split('\n'),
    ]),
    ...layout.footnotes,
  ];
}

export function contactLines(layout: ContactLayout): string[] {
  return [
    ...layout.lead,
    ...(layout.email ? [layout.email.label + layout.email.separator + layout.email.address] : []),
    ...(layout.checklist
      ? [layout.checklist.intro, ...layout.checklist.items.map((item) => item.prefix + item.text)]
      : []),
    ...layout.footnotes,
  ];
}

export function fieldLines(rows: FieldRow[]): string[] {
  return rows.map((row) => (row.label ?? '') + row.separator + row.value);
}
