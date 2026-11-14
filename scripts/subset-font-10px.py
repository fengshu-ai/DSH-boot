# assets/fonts/dsh-pixel-10.woff2 已是 GB2312 子集（并改名为 DSH Pixel 10，避免 OFL 保留字体名）
# 这里只做 base64 → assets/capsfont.b64
import base64, os

SRC = r"assets/fonts/dsh-pixel-10.woff2"
OUT = r"assets/capsfont.b64"
open(OUT, "w").write(base64.b64encode(open(SRC, "rb").read()).decode())
print("capsfont.b64:", os.path.getsize(SRC), "bytes ->", os.path.getsize(OUT), "b64 chars")
