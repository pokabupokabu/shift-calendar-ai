// 課金画面の見出しに使うロゴ「シフToカレ」の画像（assets/images/logo-name.png）を作る台本。
// 起動画面（assets/images/splash.png）の名前と同じ見た目にする（docs/ui-review/group-e.md「コミット前の直し」）:
//   字体 Zen Maru Gothic 900（SIL OFL なので画像に焼き込める）／文字は顔のピンク #F8C8C8／
//   「To」だけ帽子の青 #2F7AE8／縁取りは splash.png の名前の縁の画素から読み取った紺 #1E2440。
//   縁の太さは splash.png の比率（名前の高さ114px に対して縁が約7.5px）に合わせる。
//
// 使い方（依存パッケージなし。Node 22 以上の組み込みの WebSocket・fetch を使う）:
//   1. Chrome を `--headless=new --remote-debugging-port=9333` で起動しておく（Google Fonts を読むのでネットが要る）
//   2. node scripts/make-logo-name.mjs [ポート番号=9333]
// 背景が透明の PNG を、画面での高さ LOGO_HEIGHT_PT の3倍の解像度で書き出す。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 画面での高さ（pt）。src/components/paywall/pro-title.tsx の LOGO_HEIGHT と同じ値にする。 */
const LOGO_HEIGHT_PT = 28;
const SCALE = 3;
const COLORS = { fill: '#F8C8C8', to: '#2F7AE8', outline: '#1E2440' };
/** splash.png の名前の「縁の見える太さ ÷ 名前全体の高さ」（7.5 ÷ 114） */
const OUTLINE_RATIO = 7.5 / 114;
/** 文字の間隔（em）。splash.png の名前の「幅 ÷ 高さ」（595 ÷ 114 ≒ 5.2）に近づける */
const LETTER_SPACING_EM = 0.05;

const port = Number(process.argv[2] ?? 9333);
const outFile = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../assets/images/logo-name.png',
);

const target = await (
  await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => (ws.onopen = resolve));
let nextId = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.result?.exceptionDetails) {
    throw new Error(JSON.stringify(result.result.exceptionDetails));
  }
  return result.result?.result?.value;
};

const drawInPage = `(async () => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@900&display=block';
  document.head.appendChild(link);
  await new Promise((resolve) => (link.onload = resolve));
  const FONT = (size) => '900 ' + size + 'px "Zen Maru Gothic"';
  await document.fonts.load(FONT(200), 'シフToカレ');
  if (!document.fonts.check(FONT(200), 'シフToカレ')) throw new Error('font not loaded');

  const parts = [['シフ', ${JSON.stringify(COLORS.fill)}], ['To', ${JSON.stringify(COLORS.to)}], ['カレ', ${JSON.stringify(COLORS.fill)}]];

  // 文字を描いて、色の付いた範囲（透明でない画素）を返す
  const draw = (fontSize, lineWidth, keep) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(fontSize * 7);
    canvas.height = Math.ceil(fontSize * 2);
    const ctx = canvas.getContext('2d');
    ctx.font = FONT(fontSize);
    ctx.letterSpacing = (${LETTER_SPACING_EM} * fontSize) + 'px';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    const x0 = fontSize * 0.5;
    const y0 = fontSize * 1.3;
    // 縁取りを先に全部描いてから中を塗る（隣の文字の縁が中に食い込まないように）
    const xs = [];
    let x = x0;
    for (const [text] of parts) {
      xs.push(x);
      x += ctx.measureText(text).width;
    }
    if (lineWidth > 0) {
      ctx.strokeStyle = ${JSON.stringify(COLORS.outline)};
      ctx.lineWidth = lineWidth;
      parts.forEach(([text], i) => ctx.strokeText(text, xs[i], y0));
    }
    parts.forEach(([text, color], i) => {
      ctx.fillStyle = color;
      ctx.fillText(text, xs[i], y0);
    });
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let top = height, bottom = -1, left = width, right = -1;
    for (let y = 0; y < height; y++) {
      for (let xx = 0; xx < width; xx++) {
        if (data[(y * width + xx) * 4 + 3] > 8) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (xx < left) left = xx;
          if (xx > right) right = xx;
        }
      }
    }
    const box = { top, bottom, left, right, w: right - left + 1, h: bottom - top + 1 };
    if (!keep) return box;
    const out = document.createElement('canvas');
    out.width = box.w + 2;
    out.height = box.h + 2;
    out.getContext('2d').drawImage(canvas, box.left - 1, box.top - 1, out.width, out.height, 0, 0, out.width, out.height);
    return { ...box, dataUrl: out.toDataURL('image/png'), outW: out.width, outH: out.height };
  };

  // 縁なしの文字の高さ g から、見える縁の太さ（線の半分）が全体の高さの OUTLINE_RATIO になる線の太さを決める
  const BIG = 400;
  const g = draw(BIG, 0, false).h;
  const lineWidthBig = (2 * ${OUTLINE_RATIO} * g) / (1 - 2 * ${OUTLINE_RATIO});
  const big = draw(BIG, lineWidthBig, false);
  // 仕上がりの高さに合わせて、字の大きさから描き直す（縮小ではなく描き直しで、にじみを防ぐ）
  const targetPx = ${LOGO_HEIGHT_PT * SCALE} - 2;
  const k = targetPx / big.h;
  const final = draw(BIG * k, lineWidthBig * k, true);
  return { ratio: big.w / big.h, final };
})()`;

await send('Page.enable');
await send('Runtime.enable');
const result = await evaluate(drawInPage);
const base64 = result.final.dataUrl.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync(outFile, Buffer.from(base64, 'base64'));
console.log(
  `saved ${outFile} (${result.final.outW}x${result.final.outH}px, 幅÷高さ ${result.ratio.toFixed(2)})`,
);
await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);
ws.close();
