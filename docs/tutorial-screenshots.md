# チュートリアル用スクリーンショットの撮り直し手順

チュートリアル（`src/app/tutorial.tsx`）の2〜5枚目は、アプリの実際の画面を架空のデータで撮った画像を使っている。画面のデザインを変えたら、この手順で撮り直す。

| ファイル                                      | 撮る画面                                    |
| --------------------------------------------- | ------------------------------------------- |
| `assets/images/tutorial/screen-mycustom.jpg`  | マイカスタム（`/template`）                 |
| `assets/images/tutorial/screen-photo.jpg`     | 写真選択（`/photo-select`）でサンプル選択後 |
| `assets/images/tutorial/screen-analyzing.jpg` | 解析中（`/analyzing`）                      |
| `assets/images/tutorial/screen-complete.jpg`  | 登録完了（`/complete?count=10`）            |

サンプルのシフト表は `assets/images/tutorial/sample-shift-table.png`（登場人物はすべて架空）。登録者キーワードは表の1行目の **佐藤 ひなた** にする。

## 手順（Expo Web・ブラウザの開発者ツールのコンソールで実行）

ブラウザの表示幅を **375×812（iPhone相当）** にしてから行う。

### 1. 自分のデータを退避して、架空のデータに差し替える

```js
const KEY = 'shift-calendar-ai-store';
sessionStorage.setItem('__store_backup', localStorage.getItem(KEY));
const v = JSON.parse(localStorage.getItem(KEY));
v.state.user.shiftName = '佐藤 ひなた';
v.state.user.displayName = '佐藤 ひなた';
v.state.user.settings.isPro = true; // 広告の枠を出さないため
localStorage.setItem(KEY, JSON.stringify(v));
location.href = '/template';
```

### 2. スクロールバーを消す（ページを開くたびに実行）

```js
const st = document.createElement('style');
st.textContent = '*::-webkit-scrollbar{display:none!important} *{scrollbar-width:none!important}';
document.head.appendChild(st);
```

### 3. 写真選択でサンプルを選ぶ（`/photo-select` を開いた状態で実行してから「ライブラリから選ぶ」を押す）

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

### 4. 解析中の画面で止める（「解析する」を押す前に実行）

AIへの通信を返さないようにして、解析中の画面のまま止める。実際の解析は行われず、回数も減らない。

```js
const of = window.fetch;
window.fetch = (u, ...a) =>
  String(u).includes('generateContent') ? new Promise(() => {}) : of(u, ...a);
```

### 5. 撮影と切り出し

各画面を等倍（750×1624）で撮り、アプリの描画範囲 **幅726・高さ1300** に切り出して、上の表のファイル名で JPEG（品質88）保存する。

```python
from PIL import Image
Image.open('raw.jpg').convert('RGB').crop((0, 0, 726, 1300)).save('screen-xxx.jpg', quality=88)
```

### 6. 自分のデータに戻す（必ず行う）

```js
localStorage.setItem('shift-calendar-ai-store', sessionStorage.getItem('__store_backup'));
location.href = '/template';
```
