"""Grade AI frames toward the site palette (chalk / ink / green):
calmer saturation, warm highlights pulled toward neutral, shadows nudged
toward the ink-green, slight lift so overlays on chalk panels sit naturally."""
import sys, numpy as np
from PIL import Image
def grade(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32) / 255
    lum = (a @ np.array([.2126, .7152, .0722]))[..., None]
    a = lum + (a - lum) * 0.80                       # saturation
    hi = np.clip((lum - .45) / .55, 0, 1)            # highlight mask
    a = a * (1 - hi * np.array([.045, .015, -.02]))  # cool the orange highlights
    lo = np.clip(1 - lum / .35, 0, 1)
    ink = np.array([32, 37, 34]) / 255               # --ink #202522
    a = a * (1 - lo * .18) + ink * lo * .18          # shadows toward ink
    a = .03 + a * .955                               # gentle lift, no pure black
    a = np.clip(a, 0, 1) ** 0.98
    return Image.fromarray((a * 255 + .5).astype(np.uint8))
if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    grade(Image.open(src)).save(out, quality=92)
