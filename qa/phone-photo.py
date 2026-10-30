"""Turn the clean letter render into a plausible phone photo, then mimic the client-side
prep step (max 1600px edge, JPEG quality 0.8) so the server sees exactly what a real
upload would look like."""
import sys, os, random
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
import numpy as np

src = sys.argv[1]
out_photo = sys.argv[2]
out_client = sys.argv[3]
random.seed(7)
np.random.seed(7)

im = Image.open(src).convert('RGB')
w, h = im.size
# paper tint + uneven lighting (brighter top-left, darker bottom-right like a desk lamp)
arr = np.asarray(im).astype(np.float32)
yy, xx = np.mgrid[0:h, 0:w]
light = 1.0 - 0.22 * ((xx / w) * 0.6 + (yy / h) * 0.4)
arr *= light[..., None]
arr[..., 2] *= 0.96  # slightly warm
# sensor noise
arr += np.random.normal(0, 6, arr.shape)
arr = np.clip(arr, 0, 255).astype(np.uint8)
im = Image.fromarray(arr)
# slight blur then slight sharpen, like a phone camera pipeline
im = im.filter(ImageFilter.GaussianBlur(0.7)).filter(ImageFilter.UnsharpMask(radius=1.2, percent=60))
im = ImageEnhance.Contrast(im).enhance(0.93)
# tilt and set it on a dark desk background with a little margin
bg = Image.new('RGB', (int(w * 1.12), int(h * 1.10)), (58, 52, 48))
tilted = im.rotate(1.4, resample=Image.BICUBIC, expand=True, fillcolor=(58, 52, 48))
bg.paste(tilted, ((bg.width - tilted.width) // 2, (bg.height - tilted.height) // 2))
bg.save(out_photo, 'JPEG', quality=88)

# client prep: scale so the longest edge is <= 1600, JPEG 0.8
scale = min(1.0, 1600 / max(bg.size))
client = bg.resize((round(bg.width * scale), round(bg.height * scale)), Image.LANCZOS)
client.save(out_client, 'JPEG', quality=80)
print('photo', bg.size, os.path.getsize(out_photo), 'client', client.size, os.path.getsize(out_client))
