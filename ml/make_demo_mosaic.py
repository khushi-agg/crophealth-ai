"""Build a simulated 'low-altitude drone' photo for demoing Drone mode.

Tiles held-out test leaves (healthy plus a diseased patch) over a soil-colored
background and writes demo/simulated_drone_frame.jpg. This is a synthetic
stand-in for a real flight; label it as simulated in any demo.
"""
import hashlib
import random
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
VAL = ROOT / "dataset" / "val"
random.seed(7)


def test_half(cls):
    files = sorted(p for p in (VAL / cls).iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    return [p for p in files if int(hashlib.md5(p.name.encode()).hexdigest(), 16) % 2 == 1]


def main():
    cols, rows, cell = 8, 5, 300
    healthy, sick = test_half("tomato-healthy"), test_half("tomato-diseased")
    canvas = Image.new("RGB", (cols * cell, rows * cell), (122, 92, 62))
    soil = Image.effect_noise((cols * cell, rows * cell), 40).convert("RGB")
    canvas = Image.blend(canvas, soil, 0.18)
    hotspot = {(5, 1), (6, 1), (5, 2), (6, 2), (7, 2)}
    for r in range(rows):
        for c in range(cols):
            if r == 4 and c in (0, 1):
                continue  # bare row end
            src = random.choice(sick if (c, r) in hotspot else healthy)
            leaf = Image.open(src).convert("RGB").resize((cell - 16, cell - 16)).rotate(random.uniform(-12, 12), fillcolor=(122, 92, 62))
            canvas.paste(leaf, (c * cell + 8, r * cell + 8))
    out = ROOT / "demo" / "simulated_drone_frame.jpg"
    out.parent.mkdir(exist_ok=True)
    canvas.filter(ImageFilter.GaussianBlur(0.6)).save(out, quality=88)
    print("wrote", out)


if __name__ == "__main__":
    main()
