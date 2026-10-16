"""生成站点图标与社交分享卡片。

为什么需要:
  - 之前 /favicon.ico 是 404, 浏览器标签页上是一片空白 —— 对一个要发布出去的
    网站来说这是最显眼的"没做完"的信号。
  - metadata 里的 openGraph 没有 images, 链接被分享到任何平台都没有预览卡片。

两者都是静态资源, 没有运行时开销。
运行: /opt/anaconda3/bin/python scripts/make_brand_assets.py
"""

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
APP = ROOT / "src" / "app"

VOID = (4, 6, 15)
TEXT = (232, 238, 252)
TEXT_DIM = (154, 171, 199)
ACCENT = (77, 163, 255)
GOLD = (255, 183, 3)

BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"

SS = 2  # 超采样倍数, 画完再缩回去做抗锯齿


def draw_ring(d: ImageDraw.ImageDraw, cx: float, cy: float, r: float, scale: float):
    """爱因斯坦环: 中心一个源, 外面一圈被弯折的光。"""
    for i in range(7):  # 由外向内渐亮的光晕
        rr = r + (6 - i) * 2.4 * scale
        alpha = 22 + i * 13
        d.ellipse(
            [cx - rr, cy - rr, cx + rr, cy + rr],
            outline=(77, 163, 255, min(alpha, 150)),
            width=max(1, int(1.5 * scale)),
        )
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ACCENT, width=int(5 * scale))
    d.ellipse(
        [cx - r * 0.62, cy - r * 0.62, cx + r * 0.62, cy + r * 0.62],
        outline=(255, 183, 3, 170),
        width=int(2.2 * scale),
    )
    inner = r * 0.17
    d.ellipse([cx - inner, cy - inner, cx + inner, cy + inner], fill=(255, 209, 102))


def star_field(d: ImageDraw.ImageDraw, w: int, h: int, count: int, seed: int = 7):
    rnd = random.Random(seed)
    for _ in range(count):
        x, y = rnd.uniform(0, w), rnd.uniform(0, h)
        r = rnd.choice([0.6, 0.8, 1.0, 1.3, 1.7])
        a = rnd.randint(40, 190)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(200, 216, 245, a))


def make_og() -> Path:
    W, H = 1200, 630
    w, h = W * SS, H * SS
    img = Image.new("RGBA", (w, h), VOID + (255,))

    # 背景的柔和光晕
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-w * 0.25, -h * 0.55, w * 0.75, h * 0.75], fill=(45, 111, 191, 46))
    gd.ellipse([w * 0.45, -h * 0.35, w * 1.25, h * 0.6], fill=(155, 123, 255, 26))
    glow = glow.filter(ImageFilter.GaussianBlur(60 * SS))
    img = Image.alpha_composite(img, glow)

    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    star_field(d, w, h, 260)
    draw_ring(d, w * 0.735, h * 0.47, 118 * SS, SS)
    img = Image.alpha_composite(img, layer)

    d = ImageDraw.Draw(img)
    left = 88 * SS

    f_badge = ImageFont.truetype(BOLD, 21 * SS)
    f_title = ImageFont.truetype(BOLD, 78 * SS)
    f_quote = ImageFont.truetype(REGULAR, 29 * SS)
    f_sub = ImageFont.truetype(REGULAR, 23 * SS)

    d.text((left, 150 * SS), "A SERIOUS GAME", font=f_badge, fill=GOLD)

    d.text((left, 190 * SS), "Being Seen", font=f_title, fill=TEXT)

    d.text(
        (left, 318 * SS),
        "The universe has its own telescope.",
        font=f_quote,
        fill=(200, 216, 245),
    )
    d.text(
        (left, 356 * SS),
        "We just need to learn how to look.",
        font=f_quote,
        fill=(200, 216, 245),
    )

    d.text(
        (left, 432 * SS),
        "How gravitational lensing reveals what would stay invisible —",
        font=f_sub,
        fill=TEXT_DIM,
    )
    d.text(
        (left, 464 * SS),
        "supernovae, fast radio bursts, and gravitational waves.",
        font=f_sub,
        fill=TEXT_DIM,
    )

    # 底部一线 + 事实
    d.line([(left, 545 * SS), (w - 88 * SS, 545 * SS)], fill=(30, 43, 71), width=SS)
    f_fact = ImageFont.truetype(BOLD, 22 * SS)
    facts = [("32,838", "lenses"), ("536", "bursts"), ("161", "GW events"), ("5", "lensed SNe")]
    x = left
    for value, label in facts:
        d.text((x, 566 * SS), value, font=f_fact, fill=TEXT)
        vw = d.textlength(value, font=f_fact)
        d.text((x + vw + 8 * SS, 568 * SS), label, font=f_sub, fill=TEXT_DIM)
        lw = d.textlength(label, font=f_sub)
        x += vw + 8 * SS + lw + 42 * SS

    out = img.convert("RGB").resize((W, H), Image.LANCZOS)
    path = PUBLIC / "og.png"
    out.save(path, "PNG", optimize=True)
    return path


def make_icon() -> tuple[Path, Path]:
    size = 256
    w = size * SS
    img = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 圆角方形底
    d.rounded_rectangle([0, 0, w, w], radius=int(w * 0.22), fill=(7, 12, 26, 255))
    draw_ring(d, w / 2, w / 2, w * 0.265, SS * 1.15)
    icon = img.resize((size, size), Image.LANCZOS)

    svg = APP / "icon.svg"
    svg.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">\n'
        '  <rect width="32" height="32" rx="7" fill="#070c1a"/>\n'
        '  <circle cx="16" cy="16" r="8.6" fill="none" stroke="#4da3ff" stroke-width="2.4" opacity="0.55"/>\n'
        '  <circle cx="16" cy="16" r="7.2" fill="none" stroke="#4da3ff" stroke-width="2.6"/>\n'
        '  <circle cx="16" cy="16" r="4.4" fill="none" stroke="#ffb703" stroke-width="1.3" opacity="0.75"/>\n'
        '  <circle cx="16" cy="16" r="1.5" fill="#ffd166"/>\n'
        '</svg>\n',
        encoding="utf-8",
    )

    ico = APP / "favicon.ico"
    icon.save(ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    return svg, ico


if __name__ == "__main__":
    og = make_og()
    svg, ico = make_icon()
    for p in (og, svg, ico):
        print(f"{p.relative_to(ROOT)}  {p.stat().st_size} bytes")
