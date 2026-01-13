from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "desktop" / "assets"


def clamp_int(value: float) -> int:
    return int(max(0, min(255, round(value))))


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_color(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        clamp_int(lerp(c1[0], c2[0], t)),
        clamp_int(lerp(c1[1], c2[1], t)),
        clamp_int(lerp(c1[2], c2[2], t)),
    )


def diagonal_gradient_mask(size: int) -> Image.Image:
    vertical = Image.linear_gradient("L").resize((size, size))
    horizontal = vertical.rotate(90, expand=False)
    # Average => top-left darker, bottom-right lighter.
    return ImageChops.add(vertical, horizontal, scale=2.0)


def color_gradient(size: int, c_top: tuple[int, int, int], c_bottom: tuple[int, int, int]) -> Image.Image:
    g = Image.linear_gradient("L").resize((size, size))
    top = Image.new("RGB", (size, size), c_top)
    bottom = Image.new("RGB", (size, size), c_bottom)
    # Mask is darker at top; composite picks image1 where mask is 255.
    return Image.composite(bottom, top, g).convert("RGBA")


def radial_glow_layer(
    size: int,
    color: tuple[int, int, int],
    intensity: float,
    gamma: float = 1.8,
) -> Image.Image:
    rad = Image.radial_gradient("L").resize((size, size))
    rad = ImageChops.invert(rad)  # bright center
    rad = rad.point(lambda p: clamp_int(((p / 255.0) ** gamma) * 255.0))
    rad = rad.point(lambda p: clamp_int(p * intensity))
    layer = Image.new("RGBA", (size, size), (*color, 0))
    layer.putalpha(rad)
    return layer


def rounded_rect_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def clip_to_mask(layer: Image.Image, mask: Image.Image) -> Image.Image:
    if layer.mode != "RGBA":
        layer = layer.convert("RGBA")
    alpha = layer.getchannel("A")
    layer.putalpha(ImageChops.multiply(alpha, mask))
    return layer


def make_icon(size: int = 512) -> Image.Image:
    # Palette (aligned with the app UI).
    bg0 = (11, 16, 34)  # #0b1022
    bg1 = (15, 23, 51)  # #0f1733
    accent = (110, 123, 255)  # #6e7bff
    accent2 = (58, 108, 255)  # #3a6cff
    mint = (67, 243, 158)  # #43f39e
    mint2 = (46, 214, 130)  # #2ed682
    white = (234, 240, 255)  # #eaf0ff

    radius = int(size * 0.24)
    mask = rounded_rect_mask(size, radius)

    # Background base.
    diag = diagonal_gradient_mask(size)
    base = Image.composite(Image.new("RGB", (size, size), bg1), Image.new("RGB", (size, size), bg0), diag).convert("RGBA")
    base.putalpha(mask)

    canvas = base

    # Accent glows (subtle, "AI" vibe).
    glows = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    g1 = radial_glow_layer(int(size * 1.2), accent, intensity=0.34)
    glows.alpha_composite(g1, (int(-size * 0.25), int(-size * 0.30)))
    g2 = radial_glow_layer(int(size * 1.1), accent2, intensity=0.28)
    glows.alpha_composite(g2, (int(size * 0.35), int(-size * 0.15)))
    g3 = radial_glow_layer(int(size * 1.3), (123, 227, 255), intensity=0.16, gamma=2.2)
    glows.alpha_composite(g3, (int(-size * 0.10), int(size * 0.35)))
    canvas = Image.alpha_composite(canvas, clip_to_mask(glows, mask))

    # Circuit-ish background lines.
    pattern = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pattern)
    line_color = (*accent, 48)
    node_color = (*white, 40)
    nodes = [
        (int(size * 0.18), int(size * 0.30)),
        (int(size * 0.30), int(size * 0.22)),
        (int(size * 0.68), int(size * 0.26)),
        (int(size * 0.80), int(size * 0.38)),
        (int(size * 0.22), int(size * 0.72)),
        (int(size * 0.36), int(size * 0.62)),
    ]
    pd.line([nodes[0], nodes[1], (nodes[1][0], nodes[1][1] - int(size * 0.10))], fill=line_color, width=int(size * 0.012))
    pd.line([nodes[2], nodes[3], (nodes[3][0], nodes[3][1] + int(size * 0.12))], fill=line_color, width=int(size * 0.012))
    pd.line([nodes[4], nodes[5], (nodes[5][0] + int(size * 0.10), nodes[5][1])], fill=(*accent2, 42), width=int(size * 0.010))
    r = int(size * 0.018)
    for (x, y) in nodes:
        pd.ellipse((x - r, y - r, x + r, y + r), fill=node_color, outline=(*accent2, 70), width=max(1, int(size * 0.004)))
    pattern = pattern.filter(ImageFilter.GaussianBlur(radius=int(size * 0.004)))
    canvas = Image.alpha_composite(canvas, clip_to_mask(pattern, mask))

    # AI monogram (bold, clean for small sizes).
    glyph_mask = Image.new("L", (size, size), 0)
    gd = ImageDraw.Draw(glyph_mask)
    stroke = int(size * 0.115)
    a_left = int(size * 0.20)
    a_right = int(size * 0.56)
    a_top = int(size * 0.23)
    a_bottom = int(size * 0.72)
    a_mid_x = (a_left + a_right) // 2
    gd.line((a_left, a_bottom, a_mid_x, a_top), fill=255, width=stroke, joint="curve")
    gd.line((a_mid_x, a_top, a_right, a_bottom), fill=255, width=stroke, joint="curve")
    bar_y = int(size * 0.54)
    gd.line((a_left + int(size * 0.06), bar_y, a_right - int(size * 0.06), bar_y), fill=255, width=max(1, int(stroke * 0.70)), joint="curve")

    i_left = int(size * 0.63)
    i_top = int(size * 0.30)
    i_bottom = int(size * 0.72)
    i_w = int(size * 0.11)
    gd.rounded_rectangle((i_left, i_top, i_left + i_w, i_bottom), radius=i_w // 2, fill=255)

    glyph_fill = color_gradient(size, (255, 255, 255), (178, 206, 255))
    glyph = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glyph.paste(glyph_fill, (0, 0), glyph_mask)

    # Soft glow behind glyph.
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_mask = glyph_mask.filter(ImageFilter.GaussianBlur(radius=int(size * 0.030)))
    glow_color = Image.new("RGBA", (size, size), (*accent2, 0))
    glow_color.putalpha(glow_mask.point(lambda p: clamp_int(p * 0.38)))
    glow = Image.alpha_composite(glow, glow_color)
    canvas = Image.alpha_composite(canvas, clip_to_mask(glow, mask))
    canvas = Image.alpha_composite(canvas, glyph)

    # Completion badge (checkmark).
    badge_d = int(size * 0.34)
    badge_x = int(size * 0.58)
    badge_y = int(size * 0.58)
    badge = Image.new("RGBA", (badge_d, badge_d), (0, 0, 0, 0))
    bd = ImageDraw.Draw(badge)
    badge_mask = Image.new("L", (badge_d, badge_d), 0)
    bmd = ImageDraw.Draw(badge_mask)
    bmd.ellipse((0, 0, badge_d - 1, badge_d - 1), fill=255)

    # Badge fill gradient.
    rad = Image.radial_gradient("L").resize((badge_d, badge_d))
    rad = ImageChops.invert(rad)
    rad = rad.point(lambda p: clamp_int(((p / 255.0) ** 1.6) * 255.0))
    c_center = mint
    c_edge = mint2
    # Create a per-pixel blend using the radial mask.
    # Approximate by compositing two solid colors with the radial mask.
    badge_fill = Image.composite(
        Image.new("RGB", (badge_d, badge_d), c_center),
        Image.new("RGB", (badge_d, badge_d), c_edge),
        rad,
    ).convert("RGBA")
    badge.paste(badge_fill, (0, 0), badge_mask)

    # Badge outline + highlight.
    outline = (*white, 120)
    bd.ellipse((int(badge_d * 0.04), int(badge_d * 0.04), int(badge_d * 0.96), int(badge_d * 0.96)), outline=outline, width=max(1, int(badge_d * 0.04)))
    highlight = radial_glow_layer(badge_d, (255, 255, 255), intensity=0.18, gamma=2.2)
    badge = Image.alpha_composite(badge, highlight)

    # Check mark.
    check = Image.new("RGBA", (badge_d, badge_d), (0, 0, 0, 0))
    cd = ImageDraw.Draw(check)
    w = max(2, int(badge_d * 0.12))
    p1 = (int(badge_d * 0.28), int(badge_d * 0.54))
    p2 = (int(badge_d * 0.44), int(badge_d * 0.68))
    p3 = (int(badge_d * 0.74), int(badge_d * 0.36))
    cd.line([p1, p2, p3], fill=(255, 255, 255, 235), width=w, joint="curve")
    check = check.filter(ImageFilter.GaussianBlur(radius=int(badge_d * 0.006)))
    badge = Image.alpha_composite(badge, check)

    # Badge shadow.
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_mask = Image.new("L", (badge_d, badge_d), 0)
    smd = ImageDraw.Draw(shadow_mask)
    smd.ellipse((0, 0, badge_d - 1, badge_d - 1), fill=255)
    shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(radius=int(size * 0.02)))
    shadow_color = Image.new("RGBA", (badge_d, badge_d), (0, 0, 0, 120))
    shadow_color.putalpha(shadow_mask)
    shadow.alpha_composite(shadow_color, (badge_x + int(size * 0.01), badge_y + int(size * 0.015)))
    canvas = Image.alpha_composite(canvas, clip_to_mask(shadow, mask))

    # Composite badge.
    badge_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    badge_layer.alpha_composite(badge, (badge_x, badge_y))
    canvas = Image.alpha_composite(canvas, clip_to_mask(badge_layer, mask))

    # Border (subtle).
    border = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bd2 = ImageDraw.Draw(border)
    bd2.rounded_rectangle(
        (int(size * 0.02), int(size * 0.02), int(size * 0.98), int(size * 0.98)),
        radius=int(radius * 0.88),
        outline=(255, 255, 255, 38),
        width=max(1, int(size * 0.010)),
    )
    canvas = Image.alpha_composite(canvas, clip_to_mask(border, mask))

    # Ensure corners are transparent.
    return clip_to_mask(canvas, mask)


def main() -> int:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    icon = make_icon(512)

    png_path = ASSETS_DIR / "tray.png"
    ico_path = ASSETS_DIR / "tray.ico"

    icon.resize((256, 256), resample=Image.LANCZOS).save(png_path, "PNG", optimize=True)
    icon.save(
        ico_path,
        "ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    print(f"wrote: {png_path}")
    print(f"wrote: {ico_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
