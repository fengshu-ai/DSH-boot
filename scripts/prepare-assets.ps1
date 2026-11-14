param(
  [string]$Game = "D:\SteamLibrary\steamapps\common\饲养染的 30 DAYS\game\assets.rpa",
  [string]$Out = "assets"
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$py = (Get-Command python -ErrorAction SilentlyContinue)
if (-not $py) { throw "找不到 python（需要 3.x + Pillow）" }
Write-Host "==> 1/4 提取游戏素材"
& $py.Source "tools/extract-game-sprites.py" menu "$Out/raw"
& $py.Source "tools/extract-game-sprites.py" get "images/m3.webm" "$Out/raw"

Write-Host "==> 2/4 生成标题字 b64"
& $py.Source @"
from PIL import Image
import numpy as np, base64, os
src = Image.open(r'$Out/raw/logo5.png').convert('RGBA')
a = np.asarray(src); ys, xs = np.nonzero(a[:,:,3] > 8)
crop = src.crop((xs.min(), ys.min(), xs.max()+1, ys.max()+1))
def save(im, path):
    import io
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    open(path, 'w').write(base64.b64encode(buf.getvalue()).decode())
w = 640; h = round(crop.height * w / crop.width)
mask = Image.new('RGBA', (w, h), (255,255,255,0))
mask.putalpha(crop.resize((w, h), Image.LANCZOS).split()[3])
save(mask, r'$Out/title-mask.b64')
w2 = 480; h2 = round(crop.height * w2 / crop.width)
save(crop.resize((w2, h2), Image.LANCZOS), r'$Out/title-side.b64')
print('title ok')
"@

Write-Host "==> 3/4 生成静帧 / 动态底图 b64"
& $py.Source @"
from PIL import Image
import base64, io
im = Image.open(r'$Out/raw/main_menu.png').convert('RGB')
w = 1600; im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
buf = io.BytesIO(); im.save(buf, 'JPEG', quality=88)
open(r'$Out/art.b64','w').write(base64.b64encode(buf.getvalue()).decode())
open(r'$Out/scene.b64','w').write(base64.b64encode(open(r'$Out/raw/m3.webm','rb').read()).decode())
print('art/scene ok')
"@

Write-Host "==> 4/4 字体"
if ((Test-Path "$Out/fusion-pixel-12px.woff2") -and (Test-Path "$Out/fusion-pixel-10px.woff2")) {
  & $py.Source "scripts/subset-font-12px.py"
  & $py.Source "scripts/subset-font-10px.py"
} else {
  Write-Warning "缺字体：把 Fusion Pixel 12px / 10px proportional zh_hans 的 woff2 放到 $Out/ 并命名 fusion-pixel-12px.woff2 / fusion-pixel-10px.woff2，再重跑本脚本"
}

Write-Host "完成。接着跑：npm run build"
