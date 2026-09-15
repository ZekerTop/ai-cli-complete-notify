from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "desktop" / "assets"
TAURI_ICONS_DIR = ROOT / "src-tauri" / "icons"


def main() -> int:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    TAURI_ICONS_DIR.mkdir(parents=True, exist_ok=True)
    icon = Image.open(ASSETS_DIR / "logo-source.png").convert("RGBA")
    assert icon.width == icon.height, "Logo source must be square"
    assert icon.getpixel((0, 0))[3] == 0, "Logo corners must be transparent"
    icon_256 = icon.resize((256, 256), resample=Image.LANCZOS)
    icon_128 = icon.resize((128, 128), resample=Image.LANCZOS)
    icon_32 = icon.resize((32, 32), resample=Image.LANCZOS)

    outputs = [
        (ASSETS_DIR / "tray.png", icon_256, "PNG"),
        (TAURI_ICONS_DIR / "icon.png", icon_256, "PNG"),
        (TAURI_ICONS_DIR / "32x32.png", icon_32, "PNG"),
        (TAURI_ICONS_DIR / "128x128.png", icon_128, "PNG"),
        (TAURI_ICONS_DIR / "128x128@2x.png", icon_256, "PNG"),
    ]
    for path, image, fmt in outputs:
        image.save(path, fmt, optimize=True)
        print(f"wrote: {path}")

    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    for ico_path in (ASSETS_DIR / "tray.ico", TAURI_ICONS_DIR / "icon.ico"):
        icon.save(ico_path, "ICO", sizes=ico_sizes)
        print(f"wrote: {ico_path}")

    icns_path = TAURI_ICONS_DIR / "icon.icns"
    icon.resize((1024, 1024), resample=Image.LANCZOS).save(icns_path, "ICNS")
    print(f"wrote: {icns_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
