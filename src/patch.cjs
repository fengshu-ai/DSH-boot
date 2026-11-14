// 把 skin.tpl.js 注入 .tmp-skin/client.base.js，生成 dsh-boot/client.js
// base 是"启动幕改好、还没贴主界面皮肤"的那一版；每次只重贴皮肤块，保证可重复执行。
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const file = path.join(dir, '..', 'dsh-boot', 'client.js');
const baseFile = path.join(dir, 'client.base.js');
const tplFile = path.join(dir, 'skin.tpl.js');

const lf = (s) => s.replace(/\r\n/g, '\n');

let src = lf(fs.readFileSync(baseFile, 'utf8'));
const b64 = fs.readFileSync(path.join(dir, 'scene.b64'), 'utf8').trim();
const snowA = fs.readFileSync(path.join(dir, 'snow-a.png.b64'), 'utf8').trim();
const snowB = fs.readFileSync(path.join(dir, 'snow-b.png.b64'), 'utf8').trim();
const star = fs.readFileSync(path.join(dir, 'star.b64'), 'utf8').trim();
const edge = fs.readFileSync(path.join(dir, 'edge.b64'), 'utf8').trim();
const webm = fs.readFileSync(path.join(dir, 'scene.b64'), 'utf8').trim();
const art = fs.readFileSync(path.join(dir, 'art.b64'), 'utf8').trim();
const pixelFont = fs.readFileSync(path.join(dir, 'font.b64'), 'utf8').trim();
const textFont = fs.readFileSync(path.join(dir, 'textfont.b64'), 'utf8').trim();
const capsFont = fs.readFileSync(path.join(dir, 'capsfont.b64'), 'utf8').trim();
const titleMask = fs.readFileSync(path.join(dir, 'title-mask.b64'), 'utf8').trim();
const titleSide = fs.readFileSync(path.join(dir, 'title-side.b64'), 'utf8').trim();

// base 里可能还留着上一次的皮肤尾注释（不含代码），统一清掉
const begin = '    /* dshb-skin:begin */';
const end = '    /* dshb-skin:end */';
if (src.includes(begin)) {
  const b = src.indexOf(begin);
  const e = src.indexOf(end);
  src = src.slice(0, b) + src.slice(e + end.length + 1);
}

let tpl = lf(fs.readFileSync(tplFile, 'utf8'))
  .split('__SCENE_SRC__').join('data:image/jpeg;base64,' + art)
  .split('__SCENE_WEBM__').join('data:video/webm;base64,' + webm)
  .split('__PIXEL_FONT__').join('data:font/woff;base64,' + pixelFont)
  .split('__TEXT_FONT__').join('data:font/woff2;base64,' + textFont)
  .split('__CAPS_FONT__').join('data:font/woff2;base64,' + capsFont)
  .split('__TITLE_MASK__').join('data:image/png;base64,' + titleMask)
  .split('__TITLE_SIDE__').join('data:image/png;base64,' + titleSide)
  .split('__SNOW_A__').join('data:image/png;base64,' + snowA)
  .split('__SNOW_B__').join('data:image/png;base64,' + snowB)
  .split('__STAR_SRC__').join('data:image/png;base64,' + star)
  .split('__EDGE_SRC__').join('data:image/png;base64,' + edge);
tpl = '    /* dshb-skin:begin */\n' + tpl + '    /* dshb-skin:end */\n';

const a1 = (function () {
  const head = '        // 常驻：把窗口标题栏从默认中性灰换成启动界面的深蓝黑\n';
  const tails = ['        setCaption(captionRest(), captionSymbol());\n',
                 '        setCaption(CAPTION_REST, CAPTION_SYMBOL);\n'];
  for (const t of tails) { const cand = head + t; if (src.split(cand).length - 1 > 0) return cand; }
  return head + tails[0];
})();
const a2 = "    return {\n      inject: ['slots'],\n";

const c1 = src.split(a1).length - 1;
const c2 = src.split(a2).length - 1;
if (c1 !== 1 || c2 !== 1) {
  console.error('anchor mismatch', { c1, c2 });
  process.exit(1);
}

// 启动幕里的占位符也要换成真图
src = src.split('__SCENE_SRC__').join('data:image/jpeg;base64,' + art);
src = src.split('__STAR_SRC__').join('data:image/png;base64,' + star)
  .split('__EDGE_SRC__').join('data:image/png;base64,' + edge);
src = src.split('__TITLE_MASK__').join('data:image/png;base64,' + titleMask);
src = src.split('__TITLE_SIDE__').join('data:image/png;base64,' + titleSide);
src = src.split('__SNOW_A__').join('data:image/png;base64,' + snowA);
src = src.split('__SNOW_B__').join('data:image/png;base64,' + snowB);
src = src.replace(a1, a1 + '        // 常驻：主界面底图（雪景 + 叠底黑），侧栏与各面板不受影响\n        installShellSkin();\n');
// base 是从旧 client.js 切回来的时候，这行可能已经有一份了，别再叠第二份：
// 叠一次就多一个 MutationObserver + 一个 1.2s 轮询，叠到 19 份直接卡成 PPT。
{
  const call = '        installShellSkin();\n';
  while (src.split(call).length - 1 > 1) src = src.replace(call, '', 1);
}
src = src.replace(a2, tpl + a2);

fs.writeFileSync(file, src, 'utf8');
console.log('patched', file, 'bytes', Buffer.byteLength(src));
