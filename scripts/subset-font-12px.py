# 从上游 Fusion Pixel 12px 切出 GB2312 子集 → assets/textfont.b64
# 需要：pip install fonttools brotli
from fontTools.ttLib import TTFont
from fontTools import subset
import base64, os, io

SRC = r"assets/fonts/fusion-pixel-12px.woff2"   # 上游完整字体（SIL OFL-1.1）
OUT = r"assets/textfont.b64"

chars = set(chr(c) for c in range(0x20, 0x7F))
for a in range(0xA1, 0xF8):
    for b in range(0xA1, 0xFF):
        try:
            chars.add(bytes([a, b]).decode("gb2312"))
        except Exception:
            pass
chars.update("·—…‘’“”《》〈〉【】（）「」『』～、。，！？：；０１２３４５６７８９%‰°′″±×÷≤≥≠∞√∑∏∫≈")

cm = TTFont(SRC).getBestCmap()
have = [c for c in chars if ord(c) in cm]
opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["*"]; opts.name_IDs = ["*"]
font = subset.load_font(SRC, opts)
s = subset.Subsetter(options=opts); s.populate(text="".join(have)); s.subset(font)
buf = io.BytesIO(); subset.save_font(font, buf, opts)
open(OUT, "w").write(base64.b64encode(buf.getvalue()).decode())
print("textfont.b64:", len(have), "chars,", os.path.getsize(OUT), "b64 chars")
