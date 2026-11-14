# -*- coding: utf-8 -*-
"""从《饲养染的30 DAYS》的 assets.rpa 里取素材。

用法（用 DSH 自带 python）：
  python tools/extract-game-sprites.py list                    # 列条目
  python tools/extract-game-sprites.py all                     # 列全部条目（含脚本/字体）
  python tools/extract-game-sprites.py get images/n2.png out/  # 导出单个文件
  python tools/extract-game-sprites.py sprites out/            # 导出 12 张立绘（裁 alpha、560px WebP + base64）
  python tools/extract-game-sprites.py menu out/               # 导出主界面相关素材（见 MENU）

RPA-3.0 布局：首行 "RPA-3.0 <offset_hex> <key_hex>"；
seek(offset) 后 zlib.decompress + pickle.loads 得到索引。
**索引里的 offset 和 length 都跟 key 异或过**，取值时两个都要 ^ key：
  entry = (offset ^ key, length ^ key, prefix)
以前的版本只对 offset 做了异或、还用 80MB 当上限读，能出图纯属 PIL 容错，
遇到 .rpyc 就会读出垃圾——这里已经改对了。
"""
import base64
import io
import os
import pickle
import sys
import zlib

GAME = r"D:\\SteamLibrary\\steamapps\\common\\饲养染的30 DAYS\\game\\assets.rpa"

# 立绘 id → 角色（染猫猫=猫耳+发花+透明伞；阿染=眼镜便装；塔斯=白发橘背心那组）
SPRITES = [
    ("n2", "染猫猫"), ("n9", "染猫猫"), ("n13", "染猫猫"), ("n16", "染猫猫"),
    ("br1", "染猫猫"), ("M2", "阿染"), ("T1", "塔斯"), ("TL1", "塔斯"),
    ("PLT1", "塔斯"), ("BL1", "塔斯"), ("RBC1", "塔斯"), ("WBC1", "塔斯"),
]

# 主界面相关素材（启动界面 / 主界面底图用的就是这些）
MENU = [
    ("gui/main_menu.png", "主菜单整张底：左边米色纸 + 右边雪街 + 染猫猫（1920×1080）"),
    ("images/logo5.png", "标题字「饲养染的 30 DAYS」蓝色像素版（1586×711，透明）"),
    ("images/snow_large.png", "雪片贴图（8×12，SnowBlossom 用的就是它）"),
    ("images/fac1.jpg", "雪街背景之一（无人，2.6MB 原图）"),
    ("images/fac2.jpg", "雪街背景之二"),
    ("images/fac3.jpg", "雪街背景之三"),
]


def open_index(path=GAME):
    f = open(path, "rb")
    head = f.readline().decode().split()
    if not head or not head[0].startswith("RPA-3"):
        raise SystemExit("不是 RPA-3 归档：%r" % head[:1])
    offset, key = int(head[1], 16), int(head[2], 16)
    f.seek(offset)
    idx = pickle.loads(zlib.decompress(f.read()))
    return f, key, idx


def read_entry(f, key, idx, name):
    """按索引读一条：offset 和 length 都要跟 key 异或。"""
    if name not in idx:
        raise SystemExit("归档里没有 %s" % name)
    off, dlen, _prefix = idx[name][0]
    f.seek(off ^ key)
    return f.read(dlen ^ key)


def write_out(data, out_dir, name, rename=None):
    os.makedirs(out_dir, exist_ok=True)
    base = rename or os.path.basename(name)
    path = os.path.join(out_dir, base)
    open(path, "wb").write(data)
    print("%-26s %8d bytes -> %s" % (name, len(data), path))
    return path


def cmd_sprites(f, key, idx, out_dir):
    from PIL import Image
    manifest = []
    for name, who in SPRITES:
        im = Image.open(io.BytesIO(read_entry(f, key, idx, "images/%s.png" % name))).convert("RGBA")
        im = im.crop(im.split()[3].getbbox())          # 裁掉透明边
        h = 560
        w = round(im.width * h / im.height)
        im = im.resize((w, h), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=76, method=6)     # 带 alpha 的 WebP，浏览器原生支持
        data = buf.getvalue()
        open(os.path.join(out_dir, name + ".webp"), "wb").write(data)
        manifest.append({
            "id": name, "who": who, "w": w, "h": h,
            "src": "data:image/webp;base64," + base64.b64encode(data).decode(),
        })
        print("%-6s %s %dx%d %d bytes" % (name, who, w, h, len(data)))
    import json
    json.dump(manifest, open(os.path.join(out_dir, "heroes.json"), "w"), ensure_ascii=False)
    print("manifest ->", os.path.join(out_dir, "heroes.json"))


def cmd_menu(f, key, idx, out_dir):
    for name, note in MENU:
        print("#", note)
        data = read_entry(f, key, idx, name)
        write_out(data, out_dir, name)


def main(argv):
    if not argv:
        print(__doc__)
        return 1
    cmd = argv[0]
    f, key, idx = open_index()

    if cmd in ("list", "all"):
        skip = None if cmd == "all" else (".png", ".jpg", ".webp")
        for name in sorted(idx):
            if skip is None or name.lower().endswith(skip):
                print(name)
        return 0

    if cmd == "get":
        if len(argv) < 2:
            raise SystemExit("用法: get <归档内路径> [输出目录]")
        out_dir = argv[2] if len(argv) > 2 else "."
        write_out(read_entry(f, key, idx, argv[1]), out_dir, argv[1])
        return 0

    if cmd == "sprites":
        cmd_sprites(f, key, idx, argv[1] if len(argv) > 1 else ".")
        return 0

    if cmd == "menu":
        cmd_menu(f, key, idx, argv[1] if len(argv) > 1 else ".")
        return 0

    print("unknown command", cmd)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
