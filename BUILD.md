# 构建说明

产物是 `client.js`（一个内嵌素材的 Client 半边）。仓库自带 `assets/raw/` 与字体，克隆后即可构建；
若 `assets/raw/` 不全，脚本会回落到你本地的游戏包提取。

## 前置

- Node.js ≥ 20
- Python 3 + Pillow（生成标题字/底图用）
- 本机安装过《饲养染的 30 DAYS》（Steam 版即可，路径见 `tools/extract-game-sprites.py` 顶部的 `GAME`）
- Fusion Pixel 字体（两个尺寸的 woff2，见下）

## 一、素材

`assets/raw/` 已包含：`logo5.png`（标题字）、`main_menu.png`（主界面整图）、`m3.webm`（主菜单循环）。
需要重新提取时：

```bash
python tools/extract-game-sprites.py menu assets/raw
python tools/extract-game-sprites.py get images/m3.webm assets/raw
```

## 二、生成 `assets/*.b64`

| 文件 | 来源 | 说明 |
|---|---|---|
| `scene.b64` | `game/images/m3.webm`（主菜单循环） | 动态底图；用 `get` 单独导出后 base64 |
| `art.b64` | `gui/main_menu.png` | 静帧底图；建议等比缩到 ~1600px 宽再转 JPEG |
| `title-mask.b64` | `images/logo5.png` | 取 alpha 通道，宽 640，作启动幕的遮罩 |
| `title-side.b64` | `images/logo5.png` | 原色版，宽 480，用做侧栏落款 |
| `textfont.b64` | Fusion Pixel **12px** 子集 | 正文/列表 |
| `capsfont.b64` | Fusion Pixel **10px** 子集 | 胶囊（20px = 2×10 才锐） |

`npm run assets`（即 `scripts/prepare-assets.ps1`）会一次生成前四项和字体子集：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-assets.ps1
```

## 三、字体

`assets/fonts/` 里已带：

- `fusion-pixel-12px.woff2` —— 上游 **Fusion Pixel 12px proportional zh_hans**（SIL OFL-1.1，原样分发）；
- `dsh-pixel-10.woff2` —— 基于上游 10px 切的 GB2312 子集，**已改名 `DSH Pixel 10`**
  （OFL 规定修改版不得沿用保留字体名 `Fusion Pixel`）。

构建时脚本会把 12px 切成 GB2312 子集、把 10px 直接 base64，产物各约 190KB。

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
