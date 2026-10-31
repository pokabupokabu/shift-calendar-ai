#!/usr/bin/env node
/**
 * 法務文書の静的サイト生成スクリプト
 *
 * 文言の出典は src/constants/legalContent.ts の LEGAL_PAGES のみ。
 * このスクリプトは本文を一切書き換えず、HTMLのタグで囲むだけを行う。
 *
 * 実行: npm run build:site  （出力先: web/）
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'web');

/** アプリの表示名（app.json の ios.infoPlist.CFBundleDisplayName と一致させる） */
const APP_NAME = 'シフToカレ';
/** トップページに出す1行説明 */
const APP_TAGLINE =
  'シフト表の写真をAIが読み取り、あなたのシフトだけをApple／Googleカレンダーへ登録するiPhone向けアプリです。';
/**
 * トップページに出す機能の説明。Google の OAuth 審査はホームページに「アプリの機能の説明」を求めるため、
 * App Store の説明文と同じ範囲で、実装済みの機能だけを書く
 */
const APP_FEATURES = [
  'シフト表の写真やスクリーンショットを選ぶと、AIが登録した名前の行を探し、あなたのシフトだけを読み取ります',
  '読み取った内容は、登録の前に確認・修正できます',
  'iPhoneのカレンダー、Google カレンダーにまとめて登録します（Google カレンダーは、予定を追加するために連携します）',
  '時給・休憩時間・深夜の割増から、その月の給料の見込みを計算します',
  'アカウントの作成やログインは不要です',
];
/**
 * Google Search Console の所有権の確認（HTMLタグの方法）に使う文字列（2026-10-31 発行）。
 * Google は確認後も定期的にタグを見に来るので、生成し直しても消えないよう既定値として持つ。
 * ページに埋め込んで公開する値なので秘密ではない。差し替えるときは環境変数で上書きできる
 */
const GOOGLE_SITE_VERIFICATION =
  process.env.GOOGLE_SITE_VERIFICATION ?? '3CykuQF6l5RH2U7EDJumJV8uw6evjH9lBHndh-tim_k';

/** ページの出力順。index のリンク集とフッターナビの並び順を兼ねる */
const PAGE_ORDER = ['privacy', 'terms', 'tokushoho', 'contact', 'faq'];

/** <meta name="description"> の文言。本文を切り出すと原文の改変になるため、ここで個別に持つ */
const DESCRIPTIONS = {
  privacy: `iPhone向けアプリ「${APP_NAME}」のプライバシーポリシーです。取得する情報、利用目的、外部送信先について記載しています。`,
  terms: `iPhone向けアプリ「${APP_NAME}」の利用規約です。サービス内容、PROプラン、禁止事項、免責事項について記載しています。`,
  tokushoho: `iPhone向けアプリ「${APP_NAME}」の特定商取引法に基づく表記です。販売価格、支払方法、解約方法について記載しています。`,
  contact: `iPhone向けアプリ「${APP_NAME}」のお問い合わせ窓口のご案内です。`,
  faq: `iPhone向けアプリ「${APP_NAME}」のヘルプ・よくある質問です。`,
};

// ---------------------------------------------------------------------------
// 本文の整形
// ---------------------------------------------------------------------------

/** HTMLエスケープ。本文をHTMLに埋め込む前に必ず通す */
function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** 本文中のメールアドレスを mailto: リンクにする（文字列そのものは変えない） */
function linkifyEmail(escaped) {
  return escaped.replace(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    (address) => `<a href="mailto:${address}">${address}</a>`,
  );
}

/** 「1. 取得する情報」「第3条（利用登録・保存データ）」のような見出し行か */
function isHeading2(line) {
  if (/^第\d+条（[^）]*）$/.test(line)) return true;
  // 番号付きの本文（長文・句点で終わる）を誤って見出しにしないよう、短い行だけに限定する
  return /^\d+\.\s/.test(line) && line.length <= 30 && !line.includes('。');
}

/** 「(1) Google AdMob」のような小見出し行か */
function isHeading3(line) {
  return /^\(\d+\)\s/.test(line) && line.length <= 40 && !line.includes('。');
}

/**
 * プレーンテキストの本文をHTMLに変換する。
 *
 * - 空行（\n\n）で段落を分け、段落ごとに <div class="blk"> で包む
 * - 段落内の単独の \n は <br>
 * - 「・」で始まる連続行は <ul><li>（「・」の記号だけを削る）
 * - 見出し行は <h2> / <h3>
 *
 * 文言は一切変更しない。検証スクリプトが blk / li / br から原文を復元できる構造にしてある。
 */
function renderBody(body) {
  const blocks = body.split('\n\n');
  const html = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    const parts = [];
    let buffer = []; // 通常行のバッファ
    let bullets = []; // 「・」行のバッファ

    const flushText = () => {
      if (buffer.length === 0) return;
      parts.push(`<p>${buffer.map((l) => linkifyEmail(escapeHtml(l))).join('<br>')}</p>`);
      buffer = [];
    };
    const flushBullets = () => {
      if (bullets.length === 0) return;
      const items = bullets
        .map((l) => `<li>${linkifyEmail(escapeHtml(l.slice(1)))}</li>`)
        .join('\n      ');
      parts.push(`<ul>\n      ${items}\n    </ul>`);
      bullets = [];
    };

    for (const line of lines) {
      if (line.startsWith('・')) {
        flushText();
        bullets.push(line);
        continue;
      }
      flushBullets();
      if (isHeading2(line)) {
        flushText();
        parts.push(`<h2>${escapeHtml(line)}</h2>`);
        continue;
      }
      if (isHeading3(line)) {
        flushText();
        parts.push(`<h3>${escapeHtml(line)}</h3>`);
        continue;
      }
      buffer.push(line);
    }
    flushText();
    flushBullets();

    html.push(`  <div class="blk">\n    ${parts.join('\n    ')}\n  </div>`);
  }

  return html.join('\n');
}

// ---------------------------------------------------------------------------
// ページの組み立て
// ---------------------------------------------------------------------------

/** 外部リソースを一切読み込まないインラインCSS */
const STYLE = `
  :root {
    color-scheme: light dark;
    --bg: #ffffff;
    --fg: #1a1a1a;
    --muted: #5c5c5c;
    --rule: #e2e2e2;
    --link: #0b5bcb;
    --card: #f7f7f8;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #16181c;
      --fg: #e8e8ea;
      --muted: #a2a4ab;
      --rule: #32353c;
      --link: #86b4ff;
      --card: #1e2127;
    }
  }
  * {
    box-sizing: border-box;
  }
  html {
    -webkit-text-size-adjust: 100%;
  }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family:
      system-ui,
      -apple-system,
      'Hiragino Kaku Gothic ProN',
      'Noto Sans JP',
      'Yu Gothic',
      sans-serif;
    font-size: 16px;
    line-height: 1.85;
    overflow-wrap: break-word;
    word-break: normal;
    line-break: strict;
  }
  main {
    max-width: 42em;
    margin: 0 auto;
    padding: 24px 20px 56px;
  }
  .home {
    margin: 0 0 20px;
    font-size: 0.875rem;
    color: var(--muted);
  }
  h1 {
    margin: 0 0 4px;
    font-size: 1.5rem;
    line-height: 1.5;
  }
  .lead {
    margin: 0 0 28px;
    color: var(--muted);
    font-size: 0.9375rem;
  }
  h2 {
    margin: 0;
    font-size: 1.0625rem;
    line-height: 1.6;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
    line-height: 1.6;
  }
  article .blk + .blk {
    margin-top: 1.5em;
  }
  article p {
    margin: 0;
  }
  article * + p,
  article * + ul,
  article * + h2,
  article * + h3 {
    margin-top: 0.5em;
  }
  article ul {
    margin: 0;
    padding-left: 1.3em;
  }
  article li {
    margin: 0.2em 0;
  }
  a {
    color: var(--link);
  }
  .toc {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .toc li + li {
    margin-top: 10px;
  }
  .toc a {
    display: block;
    padding: 14px 16px;
    border: 1px solid var(--rule);
    border-radius: 10px;
    background: var(--card);
    text-decoration: none;
    font-weight: 600;
  }
  nav.footer {
    margin-top: 48px;
    padding-top: 20px;
    border-top: 1px solid var(--rule);
    font-size: 0.875rem;
  }
  nav.footer ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  nav.footer li {
    margin: 6px 0;
  }
  footer.meta {
    margin-top: 28px;
    color: var(--muted);
    font-size: 0.8125rem;
  }
`;

/** ページ下部の他ページへのナビゲーション */
function footerNav(pages, currentSlug) {
  const items = pages
    .filter(([slug]) => slug !== currentSlug)
    .map(([slug, page]) => `      <li><a href="./${slug}.html">${escapeHtml(page.title)}</a></li>`)
    .join('\n');
  return [
    '  <nav class="footer">',
    `    <p>${escapeHtml(APP_NAME)}の他のページ</p>`,
    '    <ul>',
    items,
    '      <li><a href="./">トップ</a></li>',
    '    </ul>',
    '  </nav>',
  ].join('\n');
}

function document_({ title, description, inner, extraHead = '' }) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">${extraHead}
<style>${STYLE}</style>
</head>
<body>
<main>
${inner}
</main>
</body>
</html>
`;
}

function renderLegalPage(slug, page, pages) {
  const inner = [
    `  <p class="home"><a href="./">${escapeHtml(APP_NAME)}</a></p>`,
    `  <h1>${escapeHtml(page.title)}</h1>`,
    '  <article>',
    renderBody(page.body)
      .split('\n')
      .map((l) => `  ${l}`)
      .join('\n'),
    '  </article>',
    footerNav(pages, slug),
  ].join('\n');

  return document_({
    title: `${page.title} | ${APP_NAME}`,
    description: DESCRIPTIONS[slug],
    inner,
  });
}

function renderIndexPage(pages) {
  const items = pages
    .map(([slug, page]) => `      <li><a href="./${slug}.html">${escapeHtml(page.title)}</a></li>`)
    .join('\n');

  const features = APP_FEATURES.map((f) => `      <li>${escapeHtml(f)}</li>`).join('\n');

  const inner = [
    `  <h1>${escapeHtml(APP_NAME)}</h1>`,
    `  <p class="lead">${escapeHtml(APP_TAGLINE)}</p>`,
    '  <section class="features">',
    '    <h2>できること</h2>',
    '    <ul>',
    features,
    '    </ul>',
    '  </section>',
    '  <h2>ご案内</h2>',
    '  <ul class="toc">',
    items,
    '  </ul>',
    '  <footer class="meta">',
    `    <p>お問い合わせ: <a href="mailto:shiftokare.support@gmail.com">shiftokare.support@gmail.com</a></p>`,
    '  </footer>',
  ].join('\n');

  return document_({
    title: `${APP_NAME} - 各種ご案内`,
    description: `${APP_TAGLINE}プライバシーポリシー・利用規約・特定商取引法に基づく表記・お問い合わせ・よくある質問をご案内しています。`,
    inner,
    extraHead: GOOGLE_SITE_VERIFICATION
      ? `\n<meta name="google-site-verification" content="${escapeHtml(GOOGLE_SITE_VERIFICATION)}">`
      : '',
  });
}

// ---------------------------------------------------------------------------
// 実行
// ---------------------------------------------------------------------------

async function main() {
  // Node のネイティブな型除去でTypeScriptのまま読み込む（外部依存ゼロの自己完結ファイル）
  const { LEGAL_PAGES } = await import('../src/constants/legalContent.ts');

  const pages = PAGE_ORDER.map((slug) => {
    const page = LEGAL_PAGES[slug];
    if (!page) throw new Error(`LEGAL_PAGES に "${slug}" が見つかりません`);
    return [slug, page];
  });

  const unknown = Object.keys(LEGAL_PAGES).filter((slug) => !PAGE_ORDER.includes(slug));
  if (unknown.length > 0) {
    throw new Error(
      `LEGAL_PAGES に未対応のページがあります: ${unknown.join(', ')}（PAGE_ORDER に追加してください）`,
    );
  }

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const written = [];
  for (const [slug, page] of pages) {
    const file = join(OUT_DIR, `${slug}.html`);
    await writeFile(file, renderLegalPage(slug, page, pages), 'utf8');
    written.push(`web/${slug}.html`);
  }
  await writeFile(join(OUT_DIR, 'index.html'), renderIndexPage(pages), 'utf8');
  written.push('web/index.html');

  console.log('生成しました:');
  for (const f of written) console.log(`  ${f}`);
}

await main();
