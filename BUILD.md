# 构建说明

产物是 `client.js`（一个内嵌素材的 Client 半边）。仓库里**不含**任何原作素材，构建前必须自己准备 `assets/`。

## 前置

- Node.js ≥ 20
- Python 3 + Pillow（生成标题字/底图用）
- 本机安装过《饲养染的 30 DAYS》（Steam 版即可，路径见 `tools/extract-game-sprites.py` 顶部的 `GAME`）
- Fusion Pixel 字体（两个尺寸的 woff2，见下）

## 一、从游戏包提取素材

```bash
python tools/extract-game-sprites.py menu assets/raw
```

会导出 `logo5.png`（标题字）、`main_menu.png`（主界面整图）、`snow_large.png`、`fac*.jpg`。

## 二、生成 `assets/*.b64`

| 文件 | 来源 | 说明 |
|---|---|---|
| `scene.b64` | `game/images/m3.webm`（主菜单循环） | 动态底图；用 `get` 单独导出后 base64 |
| `art.b64` | `gui/main_menu.png` | 静帧底图；建议等比缩到 ~1600px 宽再转 JPEG |
| `title-mask.b64` | `images/logo5.png` | 取 alpha 通道，宽 640，作启动幕的遮罩 |
| `title-side.b64` | `images/logo5.png` | 原色版，宽 480，用做侧栏落款 |
| `textfont.b64` | Fusion Pixel **12px** 子集 | 正文/列表 |
| `capsfont.b64` | Fusion Pixel **10px** 子集 | 胶囊（20px = 2×10 才锐） |

前四项 `scripts/prepare-assets.ps1` 会自动做完（含 `m3.webm`）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-assets.ps1
```

## 三、字体（需手动下载一次）

1. 从 TakWolf/fusion-pixel-font 的 release 里取 **12px proportional zh_hans** 与 **10px proportional zh_hans** 的 woff2；
2. 放进 `assets/`，分别跑：

```bash
python scripts/subset-font-12px.py     # → assets/textfont.b64
python scripts/subset-font-10px.py     # → assets/capsfont.b64
```

脚本只保留 GB2312 + ASCII 的字符，产物约 190KB。字体是 SIL OFL-1.1，分发子集请带上 `licenses/Fusion-Pixel-OFL-1.1.txt`。

## 四、构建

```bash
npm run build     # node src/patch.cjs → client.js
npm run check     # 语法检查
```

## 安装到 DSH

把本目录软链到 profile：

```powershell
mklink /D "%USERPROFILE%\.dsh\profiles\desktop\node_modules\@local\dsh-boot" "<本目录>"
```

并在 `cordis.patch.yml` 已被 profile 引用的前提下重启 profile（或热重载）。

## 已知事项

- `src/patch.cjs` 是 CommonJS（因为 `package.json` 是 `type: module`，所以用 `.cjs`）。
- 素材里曾经误用 `scene.b64`（webm）当静态 JPEG，本仓库已改为 `art.b64`；静态底图这条路才真正可用。
- `star` / `edge` / 雪片纹理等旧占位符已从构建里移除（当前皮肤不再使用）。
