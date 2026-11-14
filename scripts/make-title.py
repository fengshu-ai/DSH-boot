# assets/raw/logo5.png → assets/title-mask.b64（alpha 遮罩，宽 640）+ assets/title-side.b64（原色，宽 480）
from PIL import Image
import numpy as np, base64, io

src = Image.open("assets/raw/logo5.png").convert("RGBA")
a = np.asarray(src); ys, xs = np.nonzero(a[:, :, 3] > 8)
crop = src.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

def save(im, path):
    buf = io.BytesIO(); im.save(buf, "PNG", optimize=True)
    open(path, "w").write(base64.b64encode(buf.getvalue()).decode())

w = 640
h = round(crop.height * w / crop.width)
mask = Image.new("RGBA", (w, h), (255, 255, 255, 0))
mask.putalpha(crop.resize((w, h), Image.LANCZOS).split()[3])
save(mask, "assets/title-mask.b64")

w2 = 480
h2 = round(crop.height * w2 / crop.width)
save(crop.resize((w2, h2), Image.LANCZOS), "assets/title-side.b64")
print("title-mask/title-side ok")
