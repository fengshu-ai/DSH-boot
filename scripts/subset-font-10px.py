# 把 Fusion Pixel 10px 的 woff2 切成 GB2312 子集，输出 assets/capsfont.b64
# 需要：pip install fonttools brotli
from fontTools.ttLib import TTFont
from fontTools import subset
import base64, os, io

SRC = r"assets/fusion-pixel-10px.woff2"
OUT = r"assets/capsfont.b64"

chars = set(chr(c) for c in range(0x20, 0x7F))
for a in range(0xA1, 0xF8):
    for b in range(0xA1, 0xFF):
        try:
            chars.add(bytes([a, b]).decode("gb2312"))
        except Exception:
            pass
chars.update("·—…‘’“”《》〈〉【】（）「」『』～、。，！？：；０１２３４５６７８９%‰°′″±×÷≤≥≠∞√∑∏∫≈")

f = TTFont(SRC)
cm = f.getBestCmap()
have = [c for c in chars if ord(c) in cm]
opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["*"]; opts.name_IDs = ["*"]
font = subset.load_font(SRC, opts)
s = subset.Subsetter(options=opts); s.populate(text="".join(have)); s.subset(font)
buf = io.BytesIO(); subset.save_font(font, buf, opts)
open(OUT, "w").write(base64.b64encode(buf.getvalue()).decode())
print("capsfont.b64", len(have), "chars,", os.path.getsize(OUT), "b64 chars")
