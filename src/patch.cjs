// 仓库版构建脚本：把 src/skin.tpl.js 注入 src/client.base.js，生成 ./client.js
// 素材从 ../assets 读（不入库，由 scripts/prepare-assets.ps1 生成），主题包从 ../packs 读。
const fs = require('fs');
const path = require('path');

const here = __dirname;                       // .../src
const root = path.join(here, '..');           // 包根
const assets = path.join(root, 'assets');
const outFile = path.join(root, 'client.js');

const lf = (s) => s.replace(/\r\n/g, '\n');
const readAsset = (name) => fs.readFileSync(path.join(assets, name), 'utf8').trim();

const PACKS_JSON = JSON.stringify({
  dark: require(path.join(root, 'packs', 'dark.json')),
  light: require(path.join(root, 'packs', 'light.json')),
});

let src = lf(fs.readFileSync(path.join(here, 'client.base.js'), 'utf8'));
const art = readAsset('art.b64');
const scene = readAsset('scene.b64');
const textFont = readAsset('textfont.b64');
const capsFont = readAsset('capsfont.b64');
const titleMask = readAsset('title-mask.b64');
const titleSide = readAsset('title-side.b64');

// ── 皮肤块（tpl）里的占位符 ──
let tpl = lf(fs.readFileSync(path.join(here, 'skin.tpl.js'), 'utf8'))
  .split('__SCENE_SRC__').join('data:image/jpeg;base64,' + art)
  .split('__SCENE_WEBM__').join('data:video/webm;base64,' + scene)
  .split('__TEXT_FONT__').join('data:font/woff2;base64,' + textFont)
  .split('__CAPS_FONT__').join('data:font/woff2;base64,' + capsFont)
  .split('__TITLE_MASK__').join('data:image/png;base64,' + titleMask)
  .split('__TITLE_SIDE__').join('data:image/png;base64,' + titleSide);
tpl = '    /* dshb-skin:begin */\n' + tpl + '    /* dshb-skin:end */\n';

// ── 注入点 ──
const head = '        // 常驻：把窗口标题栏从默认中性灰换成启动界面的深蓝黑\n';
const tails = [
  '        setCaption(captionRest(), captionSymbol());\n',
  '        setCaption(CAPTION_REST, CAPTION_SYMBOL);\n',
];
const a1 = tails.map((t) => head + t).find((cand) => src.split(cand).length - 1 === 1);
if (a1 === undefined) {
  console.error('anchor mismatch: setCaption call not found');
  process.exit(1);
}
const a2 = "    return {\n      inject: ['slots'],\n";

// base 里的启动幕占位符
src = src.split('__SCENE_SRC__').join('data:image/jpeg;base64,' + art);
src = src.split('__TITLE_MASK__').join('data:image/png;base64,' + titleMask);
src = src.split('__TITLE_SIDE__').join('data:image/png;base64,' + titleSide);

src = src.replace(a1, a1 + '        // 常驻：主界面底图（雪景 + 叠底黑），侧栏与各面板不受影响\n        installShellSkin();\n');
{ // 重复执行时别叠第二份 installShellSkin
  const call = '        installShellSkin();\n';
  while (src.split(call).length - 1 > 1) src = src.replace(call, '', 1);
}
src = src.replace(a2, 'const PACKS = ' + PACKS_JSON + ';\n' + tpl + a2);

fs.writeFileSync(outFile, src, 'utf8');
console.log('patched', outFile, 'bytes', Buffer.byteLength(src));
