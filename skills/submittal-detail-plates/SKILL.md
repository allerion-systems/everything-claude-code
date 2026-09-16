---
name: submittal-detail-plates
description: >-
  Crop details out of controlled construction drawing sheets and emit labeled
  detail plates for a submittal binder, using the scripts/submittal/ pipeline
  (PyMuPDF raster + Chromium plate render). Every plate carries sheet number,
  detail number, drawing set, set date and revision in a title block so a
  reviewer can trace each image to its source sheet. TRIGGER when: user asks to
  pull details from drawings into a submittal, add drawing clips or callouts to
  a binder, screenshot or zoom drawing details, or build a submittal detail
  appendix. DO NOT TRIGGER for generating new drawings (see
  hover-construction-drawings), takeoff quantities, or pay applications.
origin: community
---

# Submittal Detail Plates

Turn sheets from an issued drawing set into labeled detail plates that can be
bound into a product-data submittal, without hand-cropping in Bluebeam.

## When to Use

- User wants drawing details clipped into a submittal or binder
- User asks to "zoom in on" or "screenshot" conditions from a drawing set
- Building a detail appendix behind a submittal cover sheet
- Assembling callouts that a reviewer must be able to trace to a sheet

**Do not use** for producing new drawings (that is
`hover-construction-drawings`), quantity takeoff, or pay applications
(`aia-pay-app`).

## The controlling-set rule — read before cropping

A detail in a submittal is a representation that the condition shown is the
condition the Contract Documents require. Clip from a superseded or
unverified set and you have formally submitted against a drawing that no
longer governs — which invites rejection and undercuts the contractor
certification required by 01 33 00 §1.1.D.

So, before any crop:

1. Identify the controlling set from the project's document register — the
   current issued set (IFC, Permit, Bulletin), not a vendor copy, not a
   takeoff working file, not a dated zip someone emailed.
2. Confirm the file in hand matches it sheet-by-sheet by revision, not by
   filename. A file called `UPDATED_DRAWINGS` is a claim, not evidence.
3. Only then set `project.uncontrolled` to `false` in the manifest.

While `uncontrolled` is `true`, every plate renders with an
`UNCONTROLLED SOURCE — do not submit` warning and the script prints the same
warning to the console. That default is deliberate: the burden is on
verification, not on remembering to add a caveat.

## How It Works

Three steps, driven by a JSON manifest.

1. **Inventory** — `node scripts/submittal/extract-details.js sheets
   <drawings.pdf>` lists every page with its size and a sheet number read out
   of the title-block corner, so you can map page numbers to sheet numbers.
   `text <drawings.pdf> <page>` dumps text blocks with bounding boxes, which is
   how you locate a named detail on a large sheet.
2. **Manifest** — `init <manifest.json>` writes a starter file. Each entry names
   the source page, the crop rectangle, the title, and the provenance fields.
   Rectangles are either fractions of the sheet (`0.05,0.10,0.48,0.55`) or PDF
   points as `x0,y0,x1,y1`, origin top-left. Fractions are easier to iterate on;
   points are exact.
3. **Plates** — `plates <manifest.json> --out <dir>` crops each region at the
   requested DPI, renders a landscape-letter plate with the artwork above a
   provenance title block, and merges them into `detail-plates.pdf` ready to
   bind behind a submittal cover.

Rasterization runs through `scripts/submittal/raster.py` (PyMuPDF) because PDF
rendering has no dependency-free Node equivalent; plate layout and merging are
driven from Node. Set `CHROME_BIN` if Chromium is not autodetected.

Drafting and citation conventions live in
`references/submittal-standards.md`.

## Examples

Inventory a set and find which page carries A3.1:

```bash
node scripts/submittal/extract-details.js sheets IFC-set.pdf
```

Locate a detail's coordinates on that page:

```bash
node scripts/submittal/extract-details.js text IFC-set.pdf 12
```

Build the plates:

```bash
node scripts/submittal/extract-details.js init details.json
# edit details.json — set rects, titles, sheet/detail numbers,
# and uncontrolled:false once the set is verified
node scripts/submittal/extract-details.js plates details.json --out plates/
```

Manifest shape:

```json
{
  "project": {
    "name": "Wawa #7613 Simpsonville",
    "submittal": "A03 - 07 72 00 - Roof Materials (Metal)",
    "set": "IFC Set",
    "setDate": "5/26/2026",
    "revision": "Rev. 0",
    "source": "IFC-set.pdf",
    "uncontrolled": false
  },
  "details": [
    {
      "title": "Parapet coping at typical condition",
      "caption": "Coping profile, cleat anchorage, membrane termination",
      "sheet": "A3.1",
      "detail": "3",
      "page": 12,
      "rect": "0.05,0.10,0.48,0.55",
      "dpi": 300,
      "note": "Coping gauge per Clarification B."
    }
  ]
}
```

## Requirements

- Node 18+
- Python 3 with PyMuPDF — `pip install pymupdf`
- A Chromium binary (autodetected; override with `CHROME_BIN`)

## Limits

- Reads only what is in the PDF. A scanned or flattened sheet still crops, but
  `sheets` cannot read a sheet number off it — supply `sheet` manually.
- Sheet-number detection is a title-block heuristic. Always spot-check the
  inventory against the drawing index before trusting the mapping.
- Does not fetch drawings. Source files must already be on disk; large sets
  exceed most connector transfer limits and need to be exported per-sheet.
