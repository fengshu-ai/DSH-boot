# assets/raw/main_menu.png → assets/art.b64（静帧，1600px 宽 JPEG）
# assets/raw/m3.webm     → assets/scene.b64（动态底图，base64）
from PIL import Image
import base64, io

im = Image.open("assets/raw/main_menu.png").convert("RGB")
w = 1600
im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
buf = io.BytesIO(); im.save(buf, "JPEG", quality=88)
open("assets/art.b64", "w").write(base64.b64encode(buf.getvalue()).decode())
open("assets/scene.b64", "w").write(base64.b64encode(open("assets/raw/m3.webm", "rb").read()).decode())
print("art/scene ok")
