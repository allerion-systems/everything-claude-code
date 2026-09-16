#!/usr/bin/env python3
"""Raster/crop/merge helper for submittal detail plates.

Thin PyMuPDF wrapper driven by extract-details.js. Kept separate because PDF
rasterization has no dependency-free Node equivalent; everything above this
file is plain Node.

Commands
  list  <pdf>                                  -> JSON page inventory + sheet-number guess
  text  <pdf> <page>                           -> JSON text blocks with bboxes (in points)
  crop  <pdf> <page> <x0,y0,x1,y1> <dpi> <out> -> PNG of that region
  merge <out.pdf> <in.pdf>...                  -> concatenated PDF

Rects are PDF points (72/in), origin top-left, matching PyMuPDF page space.
Pass fractions (all four values <= 1.0) to crop by proportion instead.
"""
import json
import re
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("raster.py requires PyMuPDF: pip install pymupdf")

# MuPDF writes recoverable-error chatter to stdout, which would corrupt the JSON
# this script emits. Silence it; real failures still raise.
try:
    fitz.TOOLS.mupdf_display_errors(False)
    fitz.TOOLS.mupdf_display_warnings(False)
except AttributeError:
    pass

# Sheet numbers as they appear in a title block: A3.0, A-3.0, S1.2, M2.01, C-101
SHEET_RE = re.compile(r"\b([ACEFGLMPQRSTV])-?(\d{1,3}(?:\.\d{1,2})?)\b")


def _guess_sheet(page):
    """Sheet number lives in the title block — bottom-right eighth of the sheet."""
    r = page.rect
    corner = fitz.Rect(r.x0 + r.width * 0.72, r.y0 + r.height * 0.80, r.x1, r.y1)
    text = page.get_text("text", clip=corner) or ""
    hits = SHEET_RE.findall(text)
    if not hits:
        hits = SHEET_RE.findall(page.get_text("text") or "")
    return f"{hits[-1][0]}{hits[-1][1]}" if hits else None


def cmd_list(pdf):
    doc = fitz.open(pdf)
    out = []
    for i, page in enumerate(doc):
        r = page.rect
        out.append({
            "page": i + 1,
            "widthPt": round(r.width, 1),
            "heightPt": round(r.height, 1),
            "widthIn": round(r.width / 72, 2),
            "heightIn": round(r.height / 72, 2),
            "sheet": _guess_sheet(page),
            "snippet": " ".join((page.get_text("text") or "").split())[:180],
        })
    print(json.dumps({"file": pdf, "pages": len(out), "sheets": out}, indent=2))


def cmd_text(pdf, page_no):
    doc = fitz.open(pdf)
    page = doc[int(page_no) - 1]
    blocks = []
    for b in page.get_text("blocks"):
        body = " ".join(str(b[4]).split())
        if body:
            blocks.append({
                "x0": round(b[0], 1), "y0": round(b[1], 1),
                "x1": round(b[2], 1), "y1": round(b[3], 1),
                "text": body[:300],
            })
    print(json.dumps({"page": int(page_no), "blocks": blocks}, indent=2))


def cmd_crop(pdf, page_no, rect, dpi, out):
    doc = fitz.open(pdf)
    page = doc[int(page_no) - 1]
    vals = [float(v) for v in rect.split(",")]
    if len(vals) != 4:
        sys.exit("rect must be x0,y0,x1,y1")
    pr = page.rect
    # All four <= 1.0 means the caller gave proportions of the sheet.
    if all(v <= 1.0 for v in vals):
        vals = [pr.x0 + vals[0] * pr.width, pr.y0 + vals[1] * pr.height,
                pr.x0 + vals[2] * pr.width, pr.y0 + vals[3] * pr.height]
    clip = fitz.Rect(*vals) & pr
    if clip.is_empty:
        sys.exit(f"rect {rect} does not intersect page {page_no} ({pr})")
    pix = page.get_pixmap(matrix=fitz.Matrix(float(dpi) / 72, float(dpi) / 72),
                          clip=clip, alpha=False)
    pix.save(out)
    print(json.dumps({
        "out": out, "page": int(page_no), "dpi": float(dpi),
        "clipPt": [round(clip.x0, 1), round(clip.y0, 1), round(clip.x1, 1), round(clip.y1, 1)],
        "pixels": [pix.width, pix.height],
    }))


def cmd_merge(out, inputs):
    doc = fitz.open()
    for path in inputs:
        with fitz.open(path) as src:
            doc.insert_pdf(src)
    doc.save(out)
    print(json.dumps({"out": out, "pages": doc.page_count, "merged": len(inputs)}))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == "list" and len(args) == 1:
        cmd_list(*args)
    elif cmd == "text" and len(args) == 2:
        cmd_text(*args)
    elif cmd == "crop" and len(args) == 5:
        cmd_crop(*args)
    elif cmd == "merge" and len(args) >= 2:
        cmd_merge(args[0], args[1:])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
