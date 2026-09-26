"""Crop figures out of a scanned manual PDF using a figure list (JSON).

  python scripts/manuals/extract_figures.py <manual.pdf> <figures.json> <out_dir>

Writes <out_dir>/<key>.png (grayscale, 150 dpi) for each figure plus a
contact sheet (_sheet.png) for checking crops. Needs PyMuPDF and Pillow.
Outputs go in data/, which is git-ignored: the manual pages are not ours
to redistribute.
"""
import json
import sys
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image, ImageDraw


def main(pdf_path: str, spec_path: str, out_dir: str) -> None:
    spec = json.loads(Path(spec_path).read_text())
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    thumbs = []
    for fig in spec["figures"]:
        page = doc[fig["page"] - 1]
        r = page.rect
        x0, y0, x1, y1 = fig["crop"]
        clip = fitz.Rect(r.x0 + x0 * r.width, r.y0 + y0 * r.height, r.x0 + x1 * r.width, r.y0 + y1 * r.height)
        pix = page.get_pixmap(dpi=150, clip=clip, colorspace=fitz.csGRAY)
        img = Image.frombytes("L", (pix.width, pix.height), pix.samples)
        path = out / f"{fig['key']}.png"
        img.save(path, optimize=True)
        thumbs.append((fig, img))
        print(f"{fig['key']}: page {fig['page']}, {path.stat().st_size // 1024} KB")

    # Contact sheet for eyeballing crops.
    w, h, cols = 300, 330, 6
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("L", (w * cols, h * rows), 255)
    draw = ImageDraw.Draw(sheet)
    for i, (fig, img) in enumerate(thumbs):
        t = img.copy()
        t.thumbnail((w - 10, h - 30))
        x, y = (i % cols) * w, (i // cols) * h
        sheet.paste(t, (x + 5, y + 25))
        draw.rectangle([x + 5, y + 25, x + 5 + t.width, y + 25 + t.height], outline=0)
        draw.text((x + 5, y + 5), f"p{fig['page']} {fig['key']}", fill=0)
    sheet.save(out / "_sheet.png")


if __name__ == "__main__":
    main(*sys.argv[1:4])
