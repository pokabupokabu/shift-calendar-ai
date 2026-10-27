# チュートリアル用スクリーンショットの撮り直し手順

チュートリアル（`src/app/tutorial.tsx`）の2〜5枚目は、アプリの実際の画面を架空のデータで撮った画像を使っている。画面のデザインを変えたら、この手順で撮り直す。

| ファイル                                      | 撮る画面                                    |
| --------------------------------------------- | ------------------------------------------- |
| `assets/images/tutorial/screen-mycustom.jpg`  | マイカスタム（`/template`）                 |
| `assets/images/tutorial/screen-photo.jpg`     | 写真選択（`/photo-select`）でサンプル選択後 |
| `assets/images/tutorial/screen-analyzing.jpg` | 解析中（`/analyzing`）                      |
| `assets/images/tutorial/screen-complete.jpg`  | 登録完了（`/complete?count=10`）            |

サンプルのシフト表は `assets/images/tutorial/sample-shift-table.png`（登場人物はすべて架空）。登録者キーワードは表の1行目の **佐藤 ひなた** にする。

**撮る状態は「無料・広告の枠だけ隠す」**（2026-10-28 ユーザー決定）。チュートリアルを見るのは無料の人なので、見出しの右の札は「無料」、写真選択のボタンは青の「スキャンする」だけにする。広告の枠（Web では「広告」と書いた白い枠）は撮るときにブラウザの上で隠すだけで、アプリのコードは変えない。PRO で撮ると金の札と「高度なスキャンする」が写るので使わない。

## 手順（Expo Web・ブラウザの開発者ツールのコンソールで実行）

ブラウザの表示幅を **375×812（iPhone相当）** にしてから行う。本人の実データが入っていない 8082番（`expo-web-start`）で撮ると、退避の手間が要らない。

### 1. 自分のデータを退避して、架空のデータに差し替える

```js
const KEY = 'shift-calendar-ai-store';
sessionStorage.setItem('__store_backup', localStorage.getItem(KEY));
const v = JSON.parse(localStorage.getItem(KEY));
v.state.user.shiftName = '佐藤 ひなた';
v.state.user.displayName = '佐藤 ひなた';
v.state.user.settings.isPro = false; // 無料の人の画面で撮る
v.state.aiConsentAt = new Date().toISOString(); // 初めてのスキャンの前の同意の小窓を出さない
localStorage.setItem(KEY, JSON.stringify(v));
location.href = '/template';
```

架空データ一式（`.stitch-work/fixtures/store-fictional.json`。Git 対象外）があるときは、それを入れて一度開いてから（移行が走る）上の `isPro`・`aiConsentAt` だけ書き換えて開き直す。

### 2. スクロールバーと広告の枠を消す（ページを開くたびに実行）

```js
const st = document.createElement('style');
st.textContent = '*::-webkit-scrollbar{display:none!important} *{scrollbar-width:none!important}';
document.head.appendChild(st);
// 広告の枠（マイカスタム・写真選択）。下の中身との間の余白ごと消える
const ad = [...document.querySelectorAll('*')].find(
  (e) => e.children.length === 0 && e.textContent.trim() === '広告',
);
if (ad) ad.parentElement.style.display = 'none';
```

### 3. 写真選択でサンプルを選ぶ（`/photo-select` を開いた状態で実行してから「ライブラリ」を押す）

```js
const r = await fetch(
  '/assets/?unstable_path=.%2Fassets%2Fimages%2Ftutorial/sample-shift-table.png',
);
window.__file = new File([await r.blob()], 'sample.png', { type: 'image/png' });
const oc = Document.prototype.createElement;
document.createElement = function (t, ...a) {
  const el = oc.call(document, t, ...a);
  if (String(t).toLowerCase() === 'input') {
    const od = el.dispatchEvent.bind(el);
    el.dispatchEvent = (e) => {
      if (e.type === 'click' && el.type === 'file') {
        const dt = new DataTransfer();
        dt.items.add(window.__file);
        el.files = dt.files;
        setTimeout(() => od(new Event('change', { bubbles: true })), 50);
        return true;
      }
      return od(e);
    };
  }
  return el;
};
```

広告の枠は写真を選んだあとにもう一度隠す（2の後半を実行し直す）。

### 4. スキャン中の画面で止める（「スキャンする」を押す前に実行）

AIへの通信を返さないようにして、スキャン中の画面のまま止める。実際の読み取りは行われず、回数も減らない。

```js
const of = window.fetch;
window.fetch = (u, ...a) =>
  String(u).includes('/v1/messages') ? new Promise(() => {}) : of(u, ...a);
```

### 5. 撮影と切り出し

各画面を2倍（750×1624）で撮り、左上から **幅726・高さ1300** に切り出して、上の表のファイル名で JPEG（品質88）保存する。ヘッドレスChrome の DevTools Protocol で撮るときは、`Page.captureScreenshot` に `clip: { x: 0, y: 0, width: 363, height: 650, scale: 1 }`（2倍の画面なので726×1300になる）を渡すと切り出しまで一度に済む。

```python
from PIL import Image
Image.open('raw.jpg').convert('RGB').crop((0, 0, 726, 1300)).save('screen-xxx.jpg', quality=88)
```

登録完了は `/complete?count=10` を直接開いて撮る（Web ではカレンダーへの登録が通らないため）。

### 6. 自分のデータに戻す（必ず行う）

```js
localStorage.setItem('shift-calendar-ai-store', sessionStorage.getItem('__store_backup'));
location.href = '/template';
```
