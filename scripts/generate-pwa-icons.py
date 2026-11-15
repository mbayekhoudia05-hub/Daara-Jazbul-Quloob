from pathlib import Path
import cairosvg

source = Path("pwa-icon.svg")
if not source.exists():
    raise SystemExit("pwa-icon.svg is missing")

for size in (180, 192, 512):
    target = Path(f"pwa-icon-{size}.png")
    cairosvg.svg2png(
        url=str(source),
        write_to=str(target),
        output_width=size,
        output_height=size,
    )
    print(f"Generated {target} ({size}x{size})")
