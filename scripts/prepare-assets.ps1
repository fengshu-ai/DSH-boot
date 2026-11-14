param(
  [string]$Game = "D:\SteamLibrary\steamapps\common\饲养染的 30 DAYS\game\assets.rpa",
  [string]$Out = "assets",
  [string]$Python = ""
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$py = if ($Python) { $Python } else { (Get-Command python -ErrorAction SilentlyContinue).Source }
if (-not $py) { throw "找不到 python（需 3.x + Pillow + fonttools + brotli）；可用 -Python <路径> 指定" }

Write-Host "==> 1/3 素材"
$haveRaw = (Test-Path "$Out/raw/logo5.png") -and (Test-Path "$Out/raw/main_menu.png") -and (Test-Path "$Out/raw/m3.webm")
if ($haveRaw) {
  Write-Host "    使用仓库自带 assets/raw（无需游戏本体）"
} else {
  Write-Host "    assets/raw 不全，从本地游戏包提取"
  & $py "tools/extract-game-sprites.py" menu "$Out/raw"
  & $py "tools/extract-game-sprites.py" get "images/m3.webm" "$Out/raw"
}

Write-Host "==> 2/3 标题字 / 底图"
& $py "scripts/make-title.py"
& $py "scripts/make-art.py"

Write-Host "==> 3/3 字体子集"
& $py "scripts/subset-font-12px.py"
& $py "scripts/subset-font-10px.py"

Write-Host "完成，接着跑：npm run build"
