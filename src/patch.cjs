// 把 skin.tpl.js 注入 .tmp-skin/client.base.js，生成 dsh-boot/client.js
// base 是"启动幕改好、还没贴主界面皮肤"的那一版；每次只重贴皮肤块，保证可重复执行。
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');          // 包根目录
const dir = path.join(root, 'assets');            // 素材目录（不入库，由 scripts/prepare-assets 生成）
const file = path.join(root, 'client.js');
const baseFile = path.join(__dirname, 'client.base.js');
const tplFile = path.join(__dirname, 'skin.tpl.js');

const lf = (s) => s.replace(/\r\n/g, '\n');

let src = lf(fs.readFileSync(baseFile, 'utf8'));
const webm = fs.readFileSync(path.join(dir, 'scene.b64'), 'utf8').trim();
const art = fs.readFileSync(path.join(dir, 'art.b64'), 'utf8').trim();
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
  .split('__TEXT_FONT__').join('data:font/woff2;base64,' + textFont)
  .split('__CAPS_FONT__').join('data:font/woff2;base64,' + capsFont)
  .split('__TITLE_MASK__').join('data:image/png;base64,' + titleMask)
  .split('__TITLE_SIDE__').join('data:image/png;base64,' + titleSide);
tpl = '    /* dshb-skin:begin */\n' + tpl + '    /* dshb-skin:end */\n';

const a1 = '        // 常驻：把窗口标题栏从默认中性灰换成启动界面的深蓝黑\n        setCaption(captionRest(), captionSymbol());\n';
const a2 = "    return {\n      inject: ['slots'],\n";

const c1 = src.split(a1).length - 1;
const c2 = src.split(a2).length - 1;
if (c1 !== 1 || c2 !== 1) {
  console.error('anchor mismatch', { c1, c2 });
  process.exit(1);
}

// 启动幕里的占位符也要换成真图
src = src.split('__SCENE_SRC__').join('data:image/jpeg;base64,' + art);
src = src.split('__TITLE_MASK__').join('data:image/png;base64,' + titleMask);
src = src.split('__TITLE_SIDE__').join('data:image/png;base64,' + titleSide);
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
