#!/usr/bin/env python3
"""
mason_howard_gen.py
Permit drawings – Howard & Gwen Mason, 1225 Bates Ct, Louisville KY 40204
5-sheet set: Framing Plan / Elevations / Foundation Plan / Details / Notes
IRC 2021 | Jefferson County KY | Contractor: R&B Roofing & Remodeling

Usage:
    python3 mason_howard_gen.py
Output:
    mason_howard_permit_drawings.html  (open in any browser, print as 11x17)
"""

# ── Scale & sheet ──────────────────────────────────────────────
S      = 24          # px per foot  (1/4"=1' @ 96 dpi)
W, H   = 1632, 1056  # 11×17 landscape

# ── Deck geometry ──────────────────────────────────────────────────
DW     = 408   # 17'-0"  deck width
DD     = 372   # 15'-6"  deck depth  (15×24 + 12)
DH     = 156   # 6'-6"   height above grade
SW     = 96    # 4'-0"   stair width
SD     = 180   # 7'-6"   stair plan depth (9 treads × 10")
RH     = 72    # 36"     rail height
BY     = 192   # 8'-0"   mid-span beam from ledger
FD_PX  = 48    # 24"     frost / footing depth
FDIA   = 36    # 18"     footing diameter in px (1.5' × 24)
POST_W = 8     # 4×4 post ≈ 3.5" → ~7 px; drawn at 8 for visibility

# ── Post locations (relative to deck origin) ──────────────────────────────
# 5 deck posts: 3 on outer beam, 2 on mid-beam
POSTS = [
    (0,   DD),       # P1 outer left
    (DW//2, DD),     # P2 outer center
    (DW,  DD),       # P3 outer right
    (DW//3, BY),     # P4 mid left
    (2*DW//3, BY),   # P5 mid right
]

# ── SVG helpers ─────────────────────────────────────────────────────
DEFS = """
<defs>
  <marker id="arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
    <path d="M0,0 L8,3 L0,6 Z" fill="black"/>
  </marker>
  <marker id="arrl" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto">
    <path d="M8,0 L0,3 L8,6 Z" fill="black"/>
  </marker>
  <pattern id="hwood" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="#f5f0e8"/>
    <line x1="0" y1="0" x2="8" y2="8" stroke="#c8b89a" stroke-width="0.6"/>
  </pattern>
  <pattern id="hconc" x="0" y="0" width="7" height="7" patternUnits="userSpaceOnUse">
    <rect width="7" height="7" fill="#e5e5e5"/>
    <circle cx="2" cy="2" r="0.8" fill="#999"/>
    <circle cx="5.5" cy="5.5" r="0.8" fill="#999"/>
    <circle cx="5.5" cy="1.5" r="0.5" fill="#bbb"/>
  </pattern>
  <pattern id="hearth" x="0" y="0" width="10" height="6" patternUnits="userSpaceOnUse">
    <rect width="10" height="6" fill="#c8b88a"/>
    <line x1="0" y1="5" x2="10" y2="5" stroke="#9a8060" stroke-width="0.7"/>
    <line x1="1" y1="3" x2="3"  y2="5" stroke="#9a8060" stroke-width="0.5"/>
    <line x1="5" y1="2" x2="7"  y2="5" stroke="#9a8060" stroke-width="0.5"/>
  </pattern>
  <pattern id="hcomp" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
    <rect width="6" height="6" fill="#d0d0d0"/>
    <rect x="0" y="0" width="6" height="5.2" fill="#bebebe"/>
    <rect x="0" y="5.2" width="6" height="0.8" fill="#888"/>
  </pattern>
  <pattern id="hlatt" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
    <rect width="12" height="12" fill="white"/>
    <line x1="0" y1="0" x2="12" y2="12" stroke="#bbb" stroke-width="1.4"/>
    <line x1="12" y1="0" x2="0" y2="12" stroke="#bbb" stroke-width="1.4"/>
  </pattern>
  <pattern id="hsbs" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="#444"/>
    <line x1="0" y1="4" x2="8" y2="4" stroke="#222" stroke-width="0.8"/>
  </pattern>
  <pattern id="hmesh" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
    <rect width="6" height="6" fill="none" stroke="#aaa" stroke-width="0.4"/>
    <line x1="3" y1="0" x2="3" y2="6" stroke="#aaa" stroke-width="0.4"/>
    <line x1="0" y1="3" x2="6" y2="3" stroke="#aaa" stroke-width="0.4"/>
  </pattern>
</defs>
"""

def svg(content, sheet_num):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'style="background:white;border:1px solid #ccc;display:block;margin:20px auto">\n'
            f'{DEFS}\n{content}\n</svg>')

def tb(sheet, title):
    """Title block – bottom right"""
    x, y, bw, bh = W-440, H-68, 436, 64
    rows = [
        ("PROJECT",   "MASON RESIDENCE DECK",        "SHEET", f"{sheet} OF 5"),
        ("ADDRESS",   "1225 BATES CT  LOUISVILLE KY 40204",  "DATE",  "2025"),
        ("OWNER",     "HOWARD & GWEN MASON",          "SCALE", '1/4"=1\'-0"'),
        ("CONTRACTOR","R&B ROOFING & REMODELING",     "DWG",   title.upper()),
    ]
    r = f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" fill="white" stroke="black" stroke-width="1.2"/>'
    r += f'<line x1="{x}" y1="{y+16}" x2="{x+bw}" y2="{y+16}" stroke="black" stroke-width="0.5"/>'
    r += f'<line x1="{x}" y1="{y+32}" x2="{x+bw}" y2="{y+32}" stroke="black" stroke-width="0.5"/>'
    r += f'<line x1="{x}" y1="{y+48}" x2="{x+bw}" y2="{y+48}" stroke="black" stroke-width="0.5"/>'
    r += f'<line x1="{x+260}" y1="{y}" x2="{x+260}" y2="{y+bh}" stroke="black" stroke-width="0.5"/>'
    for i,(la,va,lb,vb) in enumerate(rows):
        yy = y + i*16 + 5
        r += f'<text x="{x+4}" y="{yy+6}" font-family="Arial" font-size="5.5" fill="#555">{la}</text>'
        r += f'<text x="{x+50}" y="{yy+6}" font-family="Arial" font-size="7" font-weight="bold" fill="black">{va}</text>'
        r += f'<text x="{x+264}" y="{yy+6}" font-family="Arial" font-size="5.5" fill="#555">{lb}</text>'
        r += f'<text x="{x+310}" y="{yy+6}" font-family="Arial" font-size="7" font-weight="bold" fill="black">{vb}</text>'
    r += f'<rect x="10" y="10" width="{W-20}" height="{H-20}" fill="none" stroke="black" stroke-width="1.5"/>'
    r += f'<rect x="14" y="14" width="{W-28}" height="{H-28}" fill="none" stroke="black" stroke-width="0.5"/>'
    return r

def dim_h(x1, y, x2, txt, off=22, above=True):
    yt = y - off if above else y + off
    return (f'<line x1="{x1}" y1="{y}" x2="{x1}" y2="{yt}" stroke="black" stroke-width="0.7"/>'
            f'<line x1="{x2}" y1="{y}" x2="{x2}" y2="{yt}" stroke="black" stroke-width="0.7"/>'
            f'<line x1="{x1}" y1="{yt}" x2="{x2}" y2="{yt}" stroke="black" stroke-width="0.8"'
            f' marker-start="url(#arrl)" marker-end="url(#arr)"/>'
            f'<text x="{(x1+x2)//2}" y="{yt-(5 if above else -12)}" font-family="Arial" font-size="9"'
            f' text-anchor="middle" fill="black">{txt}</text>')

def dim_v(x, y1, y2, txt, off=22, left=True):
    xt = x - off if left else x + off
    return (f'<line x1="{x}" y1="{y1}" x2="{xt}" y2="{y1}" stroke="black" stroke-width="0.7"/>'
            f'<line x1="{x}" y1="{y2}" x2="{xt}" y2="{y2}" stroke="black" stroke-width="0.7"/>'
            f'<line x1="{xt}" y1="{y1}" x2="{xt}" y2="{y2}" stroke="black" stroke-width="0.8"'
            f' marker-start="url(#arrl)" marker-end="url(#arr)"/>'
            f'<text x="{xt-(6 if left else -6)}" y="{(y1+y2)//2}" font-family="Arial" font-size="9"'
            f' text-anchor="middle" fill="black" transform="rotate(-90 {xt-(6 if left else -6)} {(y1+y2)//2})">{txt}</text>')

def lbl(x, y, txt, fs=8, bold=False, anchor="middle", color="black"):
    fw = "bold" if bold else "normal"
    return f'<text x="{x}" y="{y}" font-family="Arial" font-size="{fs}" font-weight="{fw}" text-anchor="{anchor}" fill="{color}">{txt}</text>'

def leader(x1, y1, x2, y2, txt, fs=7.5):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="black" stroke-width="0.6"/>'
            f'<circle cx="{x1}" cy="{y1}" r="2" fill="black"/>'
            f'<text x="{x2+3}" y="{y2+3}" font-family="Arial" font-size="{fs}" fill="black">{txt}</text>')

def cloud_note(x, y, w, h, lines):
    r = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fffde7" stroke="#f57f17" stroke-width="1" stroke-dasharray="4,2" rx="4"/>'
    for i, line in enumerate(lines):
        r += f'<text x="{x+6}" y="{y+14+i*11}" font-family="Arial" font-size="7" fill="#b71c1c">{line}</text>'
    return r

def title_bar(x, y, w, txt, sub=""):
    r = f'<rect x="{x}" y="{y}" width="{w}" height="16" fill="#1a3a5c"/>'
    r += f'<text x="{x+8}" y="{y+11}" font-family="Arial" font-size="9" font-weight="bold" fill="white">{txt}</text>'
    if sub:
        r += f'<text x="{x+w-6}" y="{y+11}" font-family="Arial" font-size="7.5" fill="#aec6e8" text-anchor="end">{sub}</text>'
    return r


def sheet1():
    ox, oy = 260, 130
    c = ""
    c += title_bar(20, 20, W-30, 'SHEET 1 OF 5 — FRAMING PLAN', 'SCALE: 1/4"=1\'-0"')
    c += lbl(W//2, 44, "MASON RESIDENCE DECK  |  1225 BATES CT, LOUISVILLE KY 40204  |  IRC 2021", 9, True)
    c += f'<rect x="{ox-30}" y="{oy-22}" width="{DW+60}" height="22" fill="#b0b0b0" stroke="black" stroke-width="1.2"/>'
    c += lbl(ox + DW//2, oy-8, "EXISTING HOUSE WALL (BRICK VENEER)", 7.5, False)
    c += f'<rect x="{ox}" y="{oy}" width="{DW}" height="10" fill="url(#hwood)" stroke="black" stroke-width="1.2"/>'
    c += lbl(ox + DW//2, oy+7, '2×8 PT SYP LEDGER  (LB BOLTS @ 16" O.C.)', 7)
    rim_t = 10
    c += f'<rect x="{ox}" y="{oy}" width="{rim_t}" height="{DD}" fill="url(#hwood)" stroke="black" stroke-width="1"/>'
    c += f'<rect x="{ox+DW-rim_t}" y="{oy}" width="{rim_t}" height="{DD}" fill="url(#hwood)" stroke="black" stroke-width="1"/>'
    c += f'<rect x="{ox}" y="{oy+DD-rim_t}" width="{DW}" height="{rim_t}" fill="url(#hwood)" stroke="black" stroke-width="1.2"/>'
    beam_y = oy + BY
    c += f'<rect x="{ox}" y="{beam_y}" width="{DW}" height="12" fill="url(#hwood)" stroke="black" stroke-width="1.2"/>'
    c += lbl(ox+DW+8, beam_y+8, "2-2×8 PT MID-SPAN BEAM", 7.5, False, "start")
    joist_spacing_px = int(16/12 * S)
    jx = ox + joist_spacing_px
    while jx < ox + DW - rim_t:
        c += f'<line x1="{jx}" y1="{oy+10}" x2="{jx}" y2="{oy+BY}" stroke="#888" stroke-width="5" stroke-linecap="round" opacity="0.35"/>'
        c += f'<line x1="{jx}" y1="{oy+BY+12}" x2="{jx}" y2="{oy+DD-rim_t}" stroke="#888" stroke-width="5" stroke-linecap="round" opacity="0.35"/>'
        jx += joist_spacing_px
    c += lbl(ox + DW//4, beam_y - 40, '2×8 PT SYP JOISTS @ 16" O.C. (TYP.)', 7.5, True)
    block_y = oy + BY//2
    c += f'<line x1="{ox+10}" y1="{block_y}" x2="{ox+DW-10}" y2="{block_y}" stroke="#888" stroke-width="4" stroke-dasharray="16,8" opacity="0.5"/>'
    c += lbl(ox - 6, block_y + 4, "BLOCKING", 6.5, False, "end")
    for i,(px,py) in enumerate(POSTS):
        ppx, ppy = ox+px, oy+py
        c += f'<rect x="{ppx-POST_W//2}" y="{ppy-POST_W//2}" width="{POST_W}" height="{POST_W}" fill="#fff" stroke="black" stroke-width="1.4"/>'
        c += f'<line x1="{ppx-POST_W//2-2}" y1="{ppy-POST_W//2-2}" x2="{ppx+POST_W//2+2}" y2="{ppy+POST_W//2+2}" stroke="black" stroke-width="0.7"/>'
        c += f'<line x1="{ppx+POST_W//2+2}" y1="{ppy-POST_W//2-2}" x2="{ppx-POST_W//2-2}" y2="{ppy+POST_W//2+2}" stroke="black" stroke-width="0.7"/>'
        c += lbl(ppx, ppy-POST_W//2-4, f"P{i+1}", 6, False)
    sx = ox + DW - SW
    sy = oy + DD - rim_t
    c += f'<rect x="{sx}" y="{sy}" width="{SW}" height="{SD}" fill="#e8f4e8" stroke="#2a7a2a" stroke-width="1.2" stroke-dasharray="5,3"/>'
    c += lbl(sx+SW//2, sy+SD//2, "STAIR", 8, True)
    c += lbl(sx+SW//2, sy+SD//2+12, '4\'-0" W × 10 RISERS', 6.5)
    na_x, na_y = ox + DW + 80, oy + 60
    c += f'<circle cx="{na_x}" cy="{na_y}" r="22" fill="none" stroke="black" stroke-width="1"/>'
    c += f'<polygon points="{na_x},{na_y-22} {na_x-8},{na_y+10} {na_x},{na_y+4} {na_x+8},{na_y+10}" fill="black"/>'
    c += lbl(na_x, na_y-28, "N", 11, True)
    c += dim_h(ox, oy-32, ox+DW, "17'-0\"", 22, True)
    c += dim_v(ox-36, oy, oy+DD, "15'-6\"", 30, True)
    c += dim_v(ox-58, oy, oy+BY, "8'-0\"", 50, True)
    c += dim_v(ox-58, oy+BY, oy+DD, "7'-6\"", 50, True)
    c += dim_h(sx, oy+DD+SD+12, ox+DW, "4'-0\"", 18, False)
    c += dim_v(ox+DW+28, oy+DD, oy+DD+SD, "7'-6\"", 22, False)
    c += leader(ox+10, oy+DD-rim_t//2, ox-30, oy+DD+20, "2×8 PT RIM JOIST (TYP.)")
    c += leader(ox+DW-10, beam_y+6, ox+DW+5, beam_y+30, "2-2×8 PT BEAM (TYP.)")
    lx, ly = ox+DW+60, oy+200
    c += f'<rect x="{lx}" y="{ly}" width="190" height="180" fill="white" stroke="black" stroke-width="0.8"/>'
    c += title_bar(lx, ly, 190, "LEGEND")
    items = [("━━━━  THICK","STRUCTURAL BEAM"),("─────  THIN","FLOOR JOIST"),("- - - -","BLOCKING @ MIDSPAN"),("▪","4×4 STEEL POST BASE"),("□","4×4×12 PT POST"),("","STAIR (4' WIDE / 10R)")]
    for i,(sym,desc) in enumerate(items):
        c += lbl(lx+8, ly+30+i*22, sym, 7.5, False, "start", "#1a3a5c")
        c += lbl(lx+60, ly+30+i*22, desc, 7, False, "start")
    notes = ['1. ALL LUMBER: PT SYP #2 OR BETTER','2. JOISTS: 2×8 @ 16" O.C. (MAX SPAN 14\'-2" IRC T.R507.6)','3. MID-BEAM: 2-2×8 PT @ 8\'-0" FROM LEDGER','4. OUTER BEAM: 2-2×8 PT ON 4×4×12 POSTS','5. JOIST HANGERS: SIMPSON LUS28 OR EQUAL','6. LEDGER: 1/2" GALV. THRU-BOLTS @ 16" O.C.']
    ny = oy + DD + SD + 36
    c += title_bar(ox, ny, 520, "FRAMING NOTES")
    for i, n in enumerate(notes):
        c += lbl(ox+6, ny+24+i*13, n, 7.5, False, "start")
    c += tb(1, "FRAMING PLAN")
    return c


def sheet2():
    c = ""
    c += title_bar(20, 20, W-30, 'SHEET 2 OF 5 — ELEVATIONS', 'SCALE: 1/4"=1\'-0"')
    c += lbl(W//2, 44, "MASON RESIDENCE DECK  |  1225 BATES CT, LOUISVILLE KY 40204  |  IRC 2021", 9, True)
    ex, ey = 60, 80
    EW = DW
    EH = DH
    grade_y = ey + EH + 16
    c += title_bar(ex, ey-24, EW+20, "FRONT ELEVATION (SOUTH FACE)")
    c += f'<line x1="{ex-20}" y1="{grade_y}" x2="{ex+EW+40}" y2="{grade_y}" stroke="black" stroke-width="2"/>'
    c += f'<rect x="{ex-20}" y="{grade_y}" width="{EW+60}" height="18" fill="url(#hearth)"/>'
    c += lbl(ex+EW+44, grade_y+5, "F.G.", 8, True)
    sbs_y = grade_y - 4
    sbs_h = 14
    c += f'<rect x="{ex}" y="{sbs_y-sbs_h}" width="{EW}" height="{sbs_h}" fill="url(#hsbs)" stroke="#222" stroke-width="1"/>'
    c += leader(ex+EW//3, sbs_y-sbs_h//2, ex+EW+16, sbs_y-32, "SBS 2-PLY MOD. BITUMEN FLAT ROOF (300 SF)")
    mesh_h = EH - sbs_h - 8
    c += f'<rect x="{ex}" y="{grade_y - EH + 8}" width="{EW}" height="{mesh_h - 20}" fill="url(#hmesh)" stroke="#777" stroke-width="0.5" stroke-dasharray="3,3"/>'
    c += leader(ex+EW//2+20, grade_y - EH//2, ex+EW+16, grade_y - 90, "ANIMAL MESH BARRIER (GALV.)")
    deck_top = grade_y - EH
    c += f'<rect x="{ex}" y="{deck_top-8}" width="{EW}" height="8" fill="url(#hcomp)" stroke="black" stroke-width="1.2"/>'
    c += leader(ex+EW//4, deck_top-4, ex-20, deck_top-30, "MOISTURESHIELD ELEVATE 1×6 ALPINE GRAY")
    fascia_h = 12
    c += f'<rect x="{ex}" y="{deck_top}" width="{EW}" height="{fascia_h}" fill="#c0c0c0" stroke="black" stroke-width="1"/>'
    c += leader(ex+EW//2-20, deck_top+6, ex+EW+16, deck_top+16, "MOISTURESHIELD VISION SMOKE GRAY FASCIA")
    rail_top = deck_top - RH
    c += f'<rect x="{ex}" y="{rail_top-8}" width="{EW}" height="8" fill="#ccc" stroke="black" stroke-width="1"/>'
    num_rail_posts = 6
    for i in range(num_rail_posts+1):
        rpx = ex + int(EW * i / num_rail_posts)
        c += f'<rect x="{rpx-5}" y="{rail_top-8}" width="10" height="{RH+8}" fill="#b0b0b0" stroke="black" stroke-width="0.8"/>'
    c += f'<rect x="{ex+6}" y="{rail_top+8}" width="{EW-12}" height="6" fill="#ccc" stroke="black" stroke-width="0.7"/>'
    c += f'<rect x="{ex+6}" y="{deck_top-24}" width="{EW-12}" height="6" fill="#ccc" stroke="black" stroke-width="0.7"/>'
    c += f'<rect x="{ex}" y="{rail_top-14}" width="{EW}" height="6" fill="#aaa" stroke="black" stroke-width="1"/>'
    c += leader(ex+EW//2, rail_top-11, ex+EW//2+60, rail_top-40, "MOISTURESHIELD DISCOVERY COCKTAIL RAIL - GRAY")
    for bx in range(ex+16, ex+EW-16, 8):
        c += f'<line x1="{bx}" y1="{rail_top+14}" x2="{bx}" y2="{deck_top-20}" stroke="#bbb" stroke-width="2"/>'
    lattice_h = int(3.5 * S)
    c += f'<rect x="{ex}" y="{grade_y-lattice_h}" width="{EW}" height="{lattice_h}" fill="url(#hlatt)" stroke="black" stroke-width="1"/>'
    c += leader(ex+EW//4, grade_y-lattice_h//2, ex-30, grade_y-lattice_h-10, "MOISTURESHIELD FREE STYLE CLASSIC DIAMOND CLAY LATTICE")
    for px in [ex, ex+EW-POST_W]:
        c += f'<rect x="{px}" y="{grade_y-EH+fascia_h}" width="{POST_W}" height="{EH-fascia_h}" fill="url(#hwood)" stroke="black" stroke-width="1"/>'
    c += leader(ex-12, grade_y-EH//2, ex-50, grade_y-EH//2-20, "4×4×12 PT POST (TYP.)")
    c += lbl(ex+EW//2, deck_top+fascia_h+18, "WHITE COMPOSITE POST SLEEVE (OUTER POSTS)", 7, False)
    c += dim_v(ex-48, deck_top-8, grade_y, "6'-6\"", 42, True)
    c += dim_v(ex-66, deck_top-8-RH, deck_top-8, "3'-0\" RAIL", 60, True)
    c += dim_h(ex, grade_y+28, ex+EW, "17'-0\"", 22, False)
    c += dim_v(ex+EW+32, grade_y-lattice_h, grade_y, "3'-6\" SKIRT", 26, False)
    ex2 = ex + EW + 120
    ED = DD
    c += title_bar(ex2, ey-24, ED+20, "SIDE ELEVATION (EAST FACE / STAIR SIDE)")
    grade2_y = grade_y
    c += f'<line x1="{ex2-20}" y1="{grade2_y}" x2="{ex2+ED+30}" y2="{grade2_y}" stroke="black" stroke-width="2"/>'
    c += f'<rect x="{ex2-20}" y="{grade2_y}" width="{ED+50}" height="18" fill="url(#hearth)"/>'
    c += f'<rect x="{ex2-16}" y="{deck_top-RH-20}" width="16" height="{grade2_y-deck_top+RH+20}" fill="#b0b0b0" stroke="black" stroke-width="1.2"/>'
    c += lbl(ex2-18, deck_top-RH-10, "HOUSE WALL", 6, False, "end")
    c += f'<rect x="{ex2}" y="{grade2_y-sbs_h}" width="{ED}" height="{sbs_h}" fill="url(#hsbs)" stroke="#222" stroke-width="1"/>'
    c += f'<rect x="{ex2}" y="{deck_top-8}" width="{ED}" height="8" fill="url(#hcomp)" stroke="black" stroke-width="1.2"/>'
    c += f'<rect x="{ex2+ED-12}" y="{deck_top}" width="12" height="{fascia_h}" fill="#c0c0c0" stroke="black" stroke-width="1"/>'
    c += f'<rect x="{ex2+4}" y="{rail_top-14}" width="6" height="{RH+14}" fill="#b0b0b0" stroke="black" stroke-width="0.8"/>'
    c += f'<rect x="{ex2}" y="{rail_top-14}" width="{ED-SW}" height="6" fill="#aaa" stroke="black" stroke-width="1"/>'
    c += f'<rect x="{ex2}" y="{grade2_y-lattice_h}" width="{ED}" height="{lattice_h}" fill="url(#hlatt)" stroke="black" stroke-width="1"/>'
    for ppx in [ex2, ex2+BY, ex2+ED-POST_W]:
        c += f'<rect x="{ppx}" y="{grade_y-EH+fascia_h}" width="{POST_W}" height="{EH-fascia_h}" fill="url(#hwood)" stroke="black" stroke-width="1"/>'
    c += f'<rect x="{ex2+BY}" y="{deck_top-8}" width="12" height="{EH}" fill="url(#hwood)" stroke="black" stroke-width="1"/>'
    stair_x = ex2 + ED
    riser_h  = EH / 10
    tread_d  = int(10/12 * S)
    for step in range(10):
        sx_ = stair_x + step * tread_d
        sy_ = grade2_y - (10-step) * riser_h
        c += f'<line x1="{sx_}" y1="{sy_}" x2="{sx_+tread_d}" y2="{sy_}" stroke="black" stroke-width="1.4"/>'
        c += f'<line x1="{sx_+tread_d}" y1="{sy_}" x2="{sx_+tread_d}" y2="{sy_+riser_h}" stroke="black" stroke-width="1.4"/>'
    c += lbl(stair_x + SD//2, grade2_y+14, '10 RISERS @ 7-13/16"  /  9 TREADS @ 10"', 6.5, False)
    c += dim_h(ex2, grade2_y+28, ex2+ED, "15'-6\"", 22, False)
    c += dim_h(ex2, grade2_y+50, ex2+BY, "8'-0\"", 18, False)
    c += dim_v(ex2-32, deck_top-8, grade2_y, "6'-6\"", 26, True)
    c += dim_h(stair_x, grade2_y+52, stair_x+SD, "7'-6\" STAIR RUN", 18, False)
    c += tb(2, "ELEVATIONS")
    return c


def sheet3():
    ox, oy = 240, 130
    c = ""
    c += title_bar(20, 20, W-30, 'SHEET 3 OF 5 — FOUNDATION PLAN', 'SCALE: 1/4"=1\'-0"')
    c += lbl(W//2, 44, "MASON RESIDENCE DECK  |  1225 BATES CT, LOUISVILLE KY 40204  |  IRC 2021", 9, True)
    c += f'<rect x="{ox}" y="{oy}" width="{DW}" height="{DD}" fill="none" stroke="#aaa" stroke-width="1" stroke-dasharray="6,4"/>'
    c += f'<rect x="{ox-30}" y="{oy-22}" width="{DW+60}" height="22" fill="#b0b0b0" stroke="black" stroke-width="1.2"/>'
    c += lbl(ox+DW//2, oy-8, "EXISTING HOUSE WALL", 7.5, False)
    bolt_sp = int(16/12 * S)
    bx = ox + bolt_sp//2
    while bx < ox + DW:
        c += f'<circle cx="{bx}" cy="{oy+5}" r="3" fill="white" stroke="black" stroke-width="1"/>'
        c += f'<line x1="{bx-2}" y1="{oy+3}" x2="{bx+2}" y2="{oy+7}" stroke="black" stroke-width="0.8"/>'
        c += f'<line x1="{bx-2}" y1="{oy+7}" x2="{bx+2}" y2="{oy+3}" stroke="black" stroke-width="0.8"/>'
        bx += bolt_sp
    c += lbl(ox+DW+8, oy+5, '1/2" GALV. LAG BOLTS @ 16" O.C.', 7, False, "start")
    beam_y = oy + BY
    c += f'<rect x="{ox}" y="{beam_y-6}" width="{DW}" height="12" fill="url(#hwood)" stroke="black" stroke-width="1.2" opacity="0.6"/>'
    c += lbl(ox+DW+8, beam_y+4, "2-2×8 PT MID-SPAN BEAM", 7, False, "start")
    for lname,(px,py) in zip(["P1","P2","P3","P4","P5"], POSTS):
        cx_, cy_ = ox+px, oy+py
        c += f'<circle cx="{cx_}" cy="{cy_}" r="{FDIA//2}" fill="url(#hconc)" stroke="black" stroke-width="1.4"/>'
        c += f'<rect x="{cx_-POST_W//2}" y="{cy_-POST_W//2}" width="{POST_W}" height="{POST_W}" fill="white" stroke="black" stroke-width="1.4"/>'
        c += f'<line x1="{cx_-POST_W//2}" y1="{cy_-POST_W//2}" x2="{cx_+POST_W//2}" y2="{cy_+POST_W//2}" stroke="black" stroke-width="0.8"/>'
        c += f'<line x1="{cx_+POST_W//2}" y1="{cy_-POST_W//2}" x2="{cx_-POST_W//2}" y2="{cy_+POST_W//2}" stroke="black" stroke-width="0.8"/>'
        c += f'<text x="{cx_+FDIA//2+4}" y="{cy_+4}" font-family="Arial" font-size="7" fill="black">{lname}</text>'
    c += cloud_note(ox+DW+60, oy+90, 230, 80, ["PERGOLA: 5 POSTS (EXISTING)","WHITE COMPOSITE POST SLEEVES","5 GALV. POST BASES (MATCH TYPE)","COORD. LOCATION W/ OWNER"])
    sf_x = ox + DW - SW//2
    sf_y = oy + DD + 60
    c += f'<circle cx="{sf_x}" cy="{sf_y}" r="{FDIA//2}" fill="url(#hconc)" stroke="black" stroke-width="1.4"/>'
    c += lbl(sf_x+FDIA//2+4, sf_y+4, '18" STAIR LANDING PAD', 7, False, "start")
    px_list = sorted([ox+px for px,py in POSTS if py==DD])
    c += dim_h(px_list[0], oy+DD+30, px_list[1], "8'-6\"", 20, False)
    c += dim_h(px_list[1], oy+DD+30, px_list[2], "8'-6\"", 20, False)
    c += dim_h(ox, oy+DD+50, ox+DW, "17'-0\"", 18, False)
    c += dim_v(ox-38, oy, oy+BY, "8'-0\"", 32, True)
    c += dim_v(ox-38, oy+BY, oy+DD, "7'-6\"", 32, True)
    c += dim_v(ox-58, oy, oy+DD, "15'-6\"", 52, True)
    tx, ty = 60, oy + DD + 100
    c += title_bar(tx, ty, 500, "FOOTING SCHEDULE — IRC 2021 TABLE R507.3.1")
    cols=["MARK","QTY","DIAMETER","DEPTH","CONCRETE","POST BASE","LOAD"]
    widths=[40,28,60,52,68,100,80]
    data=[["P1–P5","5",'18" DIA.',"24\" BELOW GRADE (FROST)","3000 PSI","SIMPSON ABA44Z GAL.","DECK POSTS"],["PP1–PP5","5",'18" DIA.',"24\" BELOW GRADE","3000 PSI","SIMPSON ABA44Z GAL.","PERGOLA POSTS"],["SP-1","1",'18" DIA.',"12\" BELOW GRADE","3000 PSI","N/A (PAD)","STAIR LANDING"]]
    xoffs=[tx]
    for w in widths[:-1]: xoffs.append(xoffs[-1]+w)
    c += f'<rect x="{tx}" y="{ty+16}" width="{sum(widths)}" height="{16+len(data)*18}" fill="white" stroke="black" stroke-width="0.8"/>'
    for j,(col,xo) in enumerate(zip(cols,xoffs)):
        c += f'<rect x="{xo}" y="{ty+16}" width="{widths[j]}" height="16" fill="#d0dae8"/>'
        c += lbl(xo+widths[j]//2, ty+27, col, 6.5, True)
    for i,row in enumerate(data):
        ry=ty+32+i*18
        bg="white" if i%2==0 else "#f5f8ff"
        c += f'<rect x="{tx}" y="{ry}" width="{sum(widths)}" height="18" fill="{bg}" stroke="#ccc" stroke-width="0.4"/>'
        for j,(cell,xo) in enumerate(zip(row,xoffs)): c += lbl(xo+widths[j]//2, ry+12, cell, 6.5)
    for xo in xoffs[1:]: c += f'<line x1="{xo}" y1="{ty+16}" x2="{xo}" y2="{ty+16+16+len(data)*18}" stroke="black" stroke-width="0.4"/>'
    notes=['1. FROST DEPTH: 24" (LOUISVILLE / JEFFERSON COUNTY KY)','2. ALL FOOTINGS: 3000 PSI CONCRETE, MIN. 18" DIAMETER','3. POST BASES: GALVANIZED SIMPSON ABA44Z OR APPROVED EQUAL','4. VERIFY FOOTING LOCATIONS IN FIELD BEFORE CONCRETE POUR','5. 10 POST BASES TOTAL: 5 DECK + 5 PERGOLA (SEE CLOUD NOTE)']
    ny = ty + 16 + 16 + len(data)*18 + 14
    c += title_bar(tx, ny, 500, "FOUNDATION NOTES")
    for i, n in enumerate(notes): c += lbl(tx+6, ny+22+i*13, n, 7.5, False, "start")
    c += tb(3, "FOUNDATION PLAN")
    return c


def sheet4():
    c = ""
    c += title_bar(20, 20, W-30, "SHEET 4 OF 5 — CONSTRUCTION DETAILS", "SCALE: AS NOTED")
    c += lbl(W//2, 44, "MASON RESIDENCE DECK  |  1225 BATES CT, LOUISVILLE KY 40204  |  IRC 2021", 9, True)
    ax, ay = 60, 70
    dw_a, dh_a = 200, 360
    c += title_bar(ax, ay, dw_a, 'DET. A — FOOTING / POST BASE', 'SCALE: 3/4"=1\'-0"')
    DS = 18
    gly = ay + 16 + 180
    c += f'<line x1="{ax}" y1="{gly}" x2="{ax+dw_a}" y2="{gly}" stroke="black" stroke-width="2"/>'
    c += f'<rect x="{ax}" y="{gly}" width="{dw_a}" height="40" fill="url(#hearth)"/>'
    c += lbl(ax+dw_a-4, gly+5, "GRADE", 7, True, "end")
    fcia = int(1.5*DS)
    fdpa = int(2*DS)
    fcx, fcy = ax + dw_a//2, gly + fdpa
    c += f'<ellipse cx="{fcx}" cy="{fcy}" rx="{fcia}" ry="8" fill="url(#hconc)" stroke="black" stroke-width="1"/>'
    c += f'<rect x="{fcx-fcia}" y="{gly}" width="{fcia*2}" height="{fdpa}" fill="url(#hconc)" stroke="black" stroke-width="1"/>'
    c += f'<ellipse cx="{fcx}" cy="{gly}" rx="{fcia}" ry="8" fill="url(#hconc)" stroke="black" stroke-width="1"/>'
    for rb in [-8, 0, 8]: c += f'<line x1="{fcx+rb}" y1="{gly+4}" x2="{fcx+rb}" y2="{fcy+8}" stroke="#c00" stroke-width="1.5"/>'
    c += lbl(ax+dw_a-4, gly+fdpa//2, "#4 REBAR (3 EA.)", 6.5, False, "end", "#c00")
    c += dim_h(fcx-fcia, gly+fdpa+12, fcx+fcia, '18" DIA.', 14, False)
    c += dim_v(ax+dw_a-16, gly, gly+fdpa, '24" DEPTH', 10, False)
    c += f'<rect x="{fcx-8}" y="{gly-8}" width="16" height="12" fill="#999" stroke="black" stroke-width="1"/>'
    c += lbl(fcx+22, gly-2, "GALV. POST BASE\nSIMPSON ABA44Z", 6.5, False, "start")
    post_h_a = int(6.5*DS)
    c += f'<rect x="{fcx-9}" y="{gly-8-post_h_a}" width="18" height="{post_h_a}" fill="url(#hwood)" stroke="black" stroke-width="1.2"/>'
    c += lbl(fcx+14, gly-8-post_h_a//2, "4×4×12 PT POST", 7, False, "start")
    c += lbl(fcx, gly+fdpa+32, '18" Ø × 24" CONC. FOOTING / 3000 PSI / #4 REBAR', 7, False)
    c += lbl(ax+dw_a//2, ay+16+dh_a-10, 'FROST DEPTH: 24" (LOUISVILLE KY)', 7, True)
    bx, by = 290, 70
    dw_b, dh_b = 230, 200
    c += title_bar(bx, by, dw_b, 'DET. B — LEDGER ATTACHMENT', 'SCALE: 3/4"=1\'-0"')
    c += f'<rect x="{bx+20}" y="{by+20}" width="50" height="{dh_b-30}" fill="#c0c0c0" stroke="black" stroke-width="1.2"/>'
    c += lbl(bx+45, by+38, "HOUSE WALL", 7, True)
    c += f'<rect x="{bx+70}" y="{by+28}" width="{dw_b-90}" height="6" fill="#aaa" stroke="black" stroke-width="1"/>'
    c += lbl(bx+dw_b-4, by+33, "LEDGER FLASHING", 6.5, False, "end")
    c += f'<rect x="{bx+70}" y="{by+34}" width="{dw_b-90}" height="18" fill="url(#hwood)" stroke="black" stroke-width="1.2"/>'
    c += lbl(bx+dw_b-4, by+46, "2×8 PT SYP LEDGER", 7, False, "end")
    for bolt_y in [by+43, by+43+48, by+43+96]:
        c += f'<circle cx="{bx+90}" cy="{bolt_y}" r="4" fill="white" stroke="black" stroke-width="1.2"/>'
        c += f'<line x1="{bx+40}" y1="{bolt_y}" x2="{bx+70}" y2="{bolt_y}" stroke="black" stroke-width="1.8"/>'
        c += lbl(bx+60, bolt_y-5, '1/2" LAG BOLT', 6, False, "start")
    c += lbl(bx+dw_b//2, by+dh_b-8, 'STAGGER BOLTS / 2 ROWS @ 16" O.C.', 7, False)
    cx_, cy_ = 550, 70
    dw_c, dh_c = 200, 200
    c += title_bar(cx_, cy_, dw_c, 'DET. C — JOIST HANGER', 'SCALE: 1.5"=1\'-0"')
    c += f'<rect x="{cx_+20}" y="{cy_+28}" width="{dw_c-40}" height="40" fill="url(#hwood)" stroke="black" stroke-width="1.2"/>'
    c += lbl(cx_+dw_c//2, cy_+52, "2-2×8 BEAM", 7, True)
    c += f'<rect x="{cx_+80}" y="{cy_+48}" width="18" height="50" fill="#999" stroke="black" stroke-width="1.2"/>'
    c += lbl(cx_+80, cy_+68, "JOIST HANGER", 6, True)
    c += f'<rect x="{cx_+98}" y="{cy_+50}" width="60" height="16" fill="url(#hwood)" stroke="black" stroke-width="1"/>'
    c += lbl(cx_+140, cy_+62, "2×8 JOIST", 7, False, "start")
    for ny_ in [cy_+55, cy_+70, cy_+85]: c += f'<circle cx="{cx_+82}" cy="{ny_}" r="2" fill="black"/>'
    c += lbl(cx_+20, cy_+dh_c-8, "SIMPSON LUS28 JOIST HANGER / APPROVED EQUAL", 7, False)
    dx_, dy_ = 780, 70
    dw_d, dh_d = 220, 280
    c += title_bar(dx_, dy_, dw_d, 'DET. D — RAIL POST / COCKTAIL RAIL', 'SCALE: 3/4"=1\'-0"')
    DS2 = 18
    c += f'<rect x="{dx_+40}" y="{dy_+100}" width="{dw_d-80}" height="18" fill="url(#hcomp)" stroke="black" stroke-width="1.2"/>'
    c += lbl(dx_+dw_d//2, dy_+113, "COMPOSITE DECKING", 6.5, True)
    c += f'<rect x="{dx_+40}" y="{dy_+118}" width="{dw_d-80}" height="14" fill="url(#hwood)" stroke="black" stroke-width="1"/>'
    c += lbl(dx_+dw_d//2, dy_+129, "RIM JOIST (2×8)", 6.5, True)
    rp_h = int(3.5*DS2)
    rp_x = dx_ + dw_d//2 - 10
    c += f'<rect x="{rp_x}" y="{dy_+118-rp_h}" width="20" height="{rp_h}" fill="#b0b0b0" stroke="black" stroke-width="1.2"/>'
    c += lbl(rp_x-4, dy_+118-rp_h//2, "COMPOSITE SLEEVED POST", 6, False, "end")
    cap_y = dy_+118-rp_h-8
    c += f'<rect x="{dx_+20}" y="{cap_y-6}" width="{dw_d-40}" height="6" fill="#aaa" stroke="black" stroke-width="1"/>'
    c += f'<rect x="{dx_+20}" y="{cap_y-14}" width="{dw_d-40}" height="8" fill="#b8b8b8" stroke="black" stroke-width="0.8"/>'
    c += lbl(dx_+dw_d-4, cap_y-10, "COCKTAIL RAIL CAP", 6.5, False, "end")
    c += f'<rect x="{dx_+24}" y="{dy_+118-rp_h+12}" width="{dw_d-48}" height="6" fill="#ccc" stroke="black" stroke-width="0.7"/>'
    for bi in range(6):
        bx_ = dx_+34 + bi*18
        c += f'<line x1="{bx_}" y1="{dy_+118-rp_h+18}" x2="{bx_}" y2="{dy_+118-18}" stroke="#ccc" stroke-width="2.5"/>'
    c += f'<rect x="{dx_+24}" y="{dy_+118-18}" width="{dw_d-48}" height="6" fill="#ccc" stroke="black" stroke-width="0.7"/>'
    c += dim_v(dx_+dw_d-4, cap_y-14, dy_+118, '42" RAIL HT.', 16, False)
    c += lbl(dx_+dw_d//2, dy_+dh_d, 'MOISTURESHIELD DISCOVERY 1-3/8" RAIL SYSTEM', 6.5, False)
    ex_, ey_ = 60, 460
    dw_e, dh_e = 380, 250
    c += title_bar(ex_, ey_, dw_e, 'DET. E — UNDER-DECK SBS ROOF SECTION', 'SCALE: 3/4"=1\'-0"')
    for ji in range(5):
        jx_ = ex_+30 + ji*60
        c += f'<rect x="{jx_}" y="{ey_+50}" width="16" height="50" fill="url(#hwood)" stroke="black" stroke-width="1"/>'
    c += lbl(ex_+dw_e//2, ey_+80, '2×8 PT JOISTS @ 16" O.C.', 7, True)
    c += f'<rect x="{ex_+20}" y="{ey_+100}" width="{dw_e-40}" height="14" fill="url(#hsbs)" stroke="#222" stroke-width="1.2"/>'
    c += lbl(ex_+dw_e-4, ey_+111, "SBS 2-PLY MOD. BITUMEN MEMBRANE", 6.5, False, "end")
    c += f'<rect x="{ex_+20}" y="{ey_+114}" width="{dw_e-40}" height="20" fill="#fffde7" stroke="#f9a825" stroke-width="0.8"/>'
    c += lbl(ex_+dw_e//2, ey_+128, 'ISO BOARD (2")', 7, True)
    c += f'<rect x="{ex_+20}" y="{ey_+30}" width="{dw_e-40}" height="8" fill="url(#hcomp)" stroke="black" stroke-width="1"/>'
    c += lbl(ex_+dw_e//2, ey_+38, "COMPOSITE DECK BOARDS (1×6)", 6.5, True)
    c += f'<rect x="{ex_+46}" y="{ey_+95}" width="{dw_e-92}" height="6" fill="url(#hwood)" stroke="#888" stroke-width="0.7"/>'
    c += lbl(ex_+20, ey_+99, "CONT. BLOCKING", 6, False, "start")
    c += f'<rect x="{ex_+20}" y="{ey_+134}" width="{dw_e-40}" height="10" fill="url(#hmesh)" stroke="#888" stroke-width="0.8"/>'
    c += lbl(ex_+dw_e//2, ey_+143, "GALV. ANIMAL MESH BARRIER", 7, True)
    c += f'<rect x="{ex_+20}" y="{ey_+144}" width="{dw_e-40}" height="40" fill="url(#hlatt)" stroke="black" stroke-width="1"/>'
    c += lbl(ex_+dw_e//2, ey_+168, "MOISTURESHIELD CLASSIC DIAMOND CLAY LATTICE PANEL", 6.5, True)
    c += f'<rect x="{ex_+20}" y="{ey_+184}" width="{dw_e-40}" height="8" fill="url(#hwood)" stroke="black" stroke-width="1"/>'
    c += lbl(ex_+dw_e//2, ey_+191, "PT FRAME (2×4)", 6.5, True)
    c += lbl(ex_+dw_e//2, ey_+dh_e-24, 'SBS: 300 SF (3 SQUARES). VERIFY DRAINAGE SLOPE MIN. 1/4"/FT.', 7, False)
    fx_, fy_ = 470, 460
    dw_f, dh_f = 300, 250
    c += title_bar(fx_, fy_, dw_f, 'DET. F — STAIR SECTION', 'SCALE: 3/4"=1\'-0"')
    DS3 = 18
    gg_y = fy_ + dh_f - 30
    st_h = int(6.5 * DS3)
    st_d = int(7.5 * DS3)
    for si in [fx_+40, fx_+40+40]: c += f'<line x1="{si}" y1="{gg_y-st_h}" x2="{si+st_d}" y2="{gg_y}" stroke="black" stroke-width="3"/>'
    riser_h3 = st_h / 10
    tread_d3 = st_d / 9
    for step in range(10):
        sx_ = fx_+80 + step * tread_d3
        sy_ = gg_y - (10-step) * riser_h3
        c += f'<line x1="{sx_}" y1="{sy_}" x2="{sx_+tread_d3}" y2="{sy_}" stroke="black" stroke-width="2"/>'
        c += f'<line x1="{sx_+tread_d3}" y1="{sy_}" x2="{sx_+tread_d3}" y2="{sy_+riser_h3}" stroke="black" stroke-width="2"/>'
    c += dim_v(fx_+40-14, gg_y-st_h, gg_y, "6'-6\"", 10, True)
    c += dim_h(fx_+80, gg_y+16, fx_+80+st_d, "7'-6\"", 14, False)
    c += lbl(fx_+80+st_d+4, gg_y-st_h+30, '10 RISERS @ 7-13/16"', 6.5, False, "start")
    c += lbl(fx_+80+st_d+4, gg_y-st_h+42, '9 TREADS @ 10"', 6.5, False, "start")
    c += lbl(fx_+80+st_d+4, gg_y-st_h+54, "4'-0\" WIDE", 6.5, False, "start")
    c += f'<line x1="{fx_+20}" y1="{gg_y}" x2="{fx_+dw_f-10}" y2="{gg_y}" stroke="black" stroke-width="2"/>'
    c += f'<rect x="{fx_+20}" y="{gg_y}" width="{dw_f-30}" height="16" fill="url(#hearth)"/>'
    c += f'<rect x="{fx_+80}" y="{gg_y}" width="{int(3*DS3)}" height="8" fill="url(#hconc)" stroke="black" stroke-width="1"/>'
    c += lbl(fx_+80+int(1.5*DS3), gg_y+14, '18" CONC. LANDING PAD', 6.5, False)
    c += tb(4, "CONSTRUCTION DETAILS")
    return c


def sheet5():
    c = ""
    c += title_bar(20, 20, W-30, "SHEET 5 OF 5 — NOTES, SPECS & MATERIAL SCHEDULE", "IRC 2021 | JEFFERSON COUNTY KY")
    c += lbl(W//2, 44, "MASON RESIDENCE DECK  |  1225 BATES CT, LOUISVILLE KY 40204", 9, True)
    gx, gy = 30, 60
    c += title_bar(gx, gy, 490, "GENERAL NOTES — IRC 2021 / JEFFERSON COUNTY KY")
    gen_notes = [
        "1.  ALL WORK SHALL CONFORM TO IRC 2021 AND JEFFERSON COUNTY KY AMENDMENTS.",
        "2.  CONTRACTOR SHALL OBTAIN ALL REQUIRED PERMITS PRIOR TO CONSTRUCTION.",
        "3.  ALL LUMBER IN CONTACT WITH CONCRETE OR WITHIN 6\" OF GRADE: PT SYP #2.",
        "4.  MINIMUM FROST DEPTH: 24\" BELOW FINISH GRADE (LOUISVILLE, KY – ZONE 5A).",
        "5.  ALL FASTENERS, CONNECTORS, HANGERS: HOT-DIP GALVANIZED OR STAINLESS.",
        "6.  LEDGER: ATTACH TO STRUCTURAL RIM JOIST OR BLOCKING PER IRC R507.9.",
        "    REMOVE SIDING BEHIND LEDGER; INSTALL APPROVED FLASHING.",
        "7.  JOISTS: CROWN UP; BLOCK AT BEARING AND MID-SPAN OVER 8'-0\".",
        "8.  DIAGONAL BRACING: REQUIRED AT ALL POSTS >8'-0\" HEIGHT (SEE ELEV.).",
        "9.  STAIR GUARDRAIL: 36\" MIN. HEIGHT PER IRC R311.7.8.",
        "10. DECK GUARDRAIL: 36\" MIN. (DECK <30\" ABOVE GRADE); 42\" IF ≥30\" ABOVE GRADE.",
        "    THIS DECK IS 6'-6\" ABOVE GRADE → 42\" RAIL REQUIRED.",
        "11. BALUSTER SPACING: MAX. 4\" CLEAR BETWEEN BALUSTERS (IRC R312.1.3).",
        "12. CONCRETE: MIN. 3000 PSI @ 28 DAYS. CURE 7 DAYS BEFORE LOADING.",
        "13. COMPOSITE DECKING (MOISTURESHIELD): INSTALL PER MFR. SPECIFICATIONS.",
        "14. SBS FLAT ROOF (UNDER DECK): 2-PLY MOD. BITUMEN, MIN. 1/4\"/FT SLOPE.",
        "    COORDINATE DRAINAGE WITH DOWNSPOUT EXTENSIONS OR COLLECTION SYSTEM.",
        "15. PERGOLA: EXISTING STRUCTURE. RELOCATE AS REQUIRED; RETAIN WHITE SLEEVE.",
        "16. DEMO: REMOVE EXISTING DECK SYSTEM; DISPOSE OF PER LOCAL ORDINANCE.",
        "17. ANIMAL BARRIER MESH: GALVANIZED HARDWARE CLOTH, MIN. 1/2\" OPENINGS.",
        "18. VERIFY ALL DIMENSIONS IN FIELD. NOTIFY ENGINEER OF ANY DISCREPANCIES.",
        "19. ELECTRICAL: NOT IN SCOPE. OWNER TO COORDINATE SEPARATELY.",
        "20. OWNER / GENERAL CONTRACTOR RESPONSIBLE FOR UTILITY LOCATES.",
    ]
    c += f'<rect x="{gx}" y="{gy+16}" width="490" height="{len(gen_notes)*13+10}" fill="white" stroke="black" stroke-width="0.7"/>'
    for i, note in enumerate(gen_notes): c += lbl(gx+6, gy+26+i*13, note, 6.8, False, "start")
    mx, my = 30, gy + 16 + len(gen_notes)*13 + 30
    c += title_bar(mx, my, 790, "MATERIAL SCHEDULE — MASON RESIDENCE DECK")
    widths = [28, 220, 160, 100, 180]
    cols = ["ITEM", "DESCRIPTION", "SIZE/SPEC", "QTY / LENGTH", "NOTES"]
    materials = [
        ("S-1","LEDGER BOARD","2×8 PT SYP #2","38 LF","ATTACH TO RIM; FLASH PER IRC R507.9"),
        ("S-2","FLOOR JOISTS","2×8 PT SYP #2 @ 16\" OC","310 LF","MAX. SPAN 14'-2\"; CROWN UP"),
        ("S-3","RIM JOIST","2×8 PT SYP #2","38 LF (PERIM.)","DOUBLE AT STAIR OPENING"),
        ("S-4","DOUBLE BEAM","2-2×8 PT SYP (BOTH)","2 × 17 LF","MID-SPAN + OUTER; NAILED 16\" O.C."),
        ("S-5","POSTS","4×4×12 PT SYP #2","5 EA.","BRACE IF >8' HEIGHT"),
        ("S-6","BLOCKING","2×8 PT SYP","AS REQ'D","MID-SPAN ROWS; SOLID"),
        ("S-7","JOIST HANGERS","SIMPSON LUS28 GAL.","14 EA. (TYP.)","EACH JOIST END AT BEAM"),
        ("S-8","POST BASE","SIMPSON ABA44Z GAL.","10 EA.","5 DECK + 5 PERGOLA"),
        ("S-9","CONCRETE FOOTINGS","3000 PSI / #4 REBAR","10+1 EA.","18\" Ø × 24\" DEEP; 1 STAIR PAD"),
        ("D-1","DECK SURFACE","MOISTURESHIELD ELEVATE","263 SF","1×6 ALPINE GRAY COMPOSITE"),
        ("D-2","PICTURE-FRAME BORDER","MOISTURESHIELD ELEVATE","42 LF","PERPENDICULAR BORDER COURSE"),
        ("D-3","FASCIA","MOISTURESHIELD VISION","38 LF","SMOKE GRAY; UNDER DECKING EDGE"),
        ("R-1","RAIL TOP CAP","DISCOVERY 1-3/8\" GRAY","50 LF","COCKTAIL RAIL SYSTEM"),
        ("R-2","RAIL BOTTOM RAIL","DISCOVERY 1-3/8\" GRAY","50 LF",""),
        ("R-3","COCKTAIL RAIL CAP","ALPINE GRAY","50 LF","WIDER TOP CAP; FLAT SURFACE"),
        ("R-4","RAIL POSTS","SLEEVED COMPOSITE","10 EA.","WHITE OUTER SLEEVE"),
        ("R-5","BALUSTERS","COMPOSITE 3/4\" SQ.","95 EA.","4\" MAX CLEAR; IRC R312"),
        ("U-1","LATTICE PANELS","MS FREE STYLE CLASSIC DIA","80 SF","CLAY COLOR; PT FRAME 2×4"),
        ("U-2","LATTICE FRAME","2×4 PT SYP","36 LF","PERIMETER + INTERMEDIATE"),
        ("U-3","FLAT ROOF MEMBRANE","SBS 2-PLY MOD. BITUMEN","300 SF / 3 SQ","BLACK; UNDER-DECK; SLOPE 1/4\"/FT"),
        ("U-4","ANIMAL MESH","GALV. HW CLOTH 1/2\"","AS REQ'D","CONTINUOUS AT PERIMETER"),
        ("T-1","STAIR STRINGERS","2×12 PT SYP","2 EA.","10 RISERS; CUT STRINGER"),
        ("T-2","STAIR TREADS","COMPOSITE 1× (MATCH DECK)","9 EA. × 48\"","10\" TREAD DEPTH; GROOVED"),
        ("T-3","STAIR RAILING","MATCH DECK RAIL SYSTEM","1 RUN","36\" HT. STAIR RAIL; PER IRC"),
        ("M-1","PERGOLA RELOCATION","EXISTING / WHITE SLEEVE","5 POSTS","OWNER TO CONFIRM POSITION"),
        ("M-2","DEMOLITION","EXISTING DECK SYSTEM","1 LOT","REMOVE & DISPOSE OFF-SITE"),
        ("M-3","MISC. HARDWARE","GAL. SCREWS, NAILS, TAPE","1 LOT","SEE MFR SPECS"),
    ]
    col_x = [mx]
    for w in widths[:-1]: col_x.append(col_x[-1]+w)
    row_h = 14
    tbl_h = row_h + len(materials)*row_h
    c += f'<rect x="{mx}" y="{my+16}" width="{sum(widths)}" height="{tbl_h+8}" fill="white" stroke="black" stroke-width="0.8"/>'
    for j,(col,xo) in enumerate(zip(cols,col_x)):
        c += f'<rect x="{xo}" y="{my+16}" width="{widths[j]}" height="{row_h}" fill="#1a3a5c"/>'
        c += lbl(xo+widths[j]//2, my+27, col, 6.5, True, "middle", "white")
    for i, mat in enumerate(materials):
        ry = my+16+row_h+i*row_h
        bg = "#f0f4f8" if i%2==0 else "white"
        c += f'<rect x="{mx}" y="{ry}" width="{sum(widths)}" height="{row_h}" fill="{bg}"/>'
        for j,(cell,xo) in enumerate(zip(mat,col_x)):
            c += lbl(xo+(3 if j>0 else 0), ry+10, cell, 6.2, False, "start" if j>0 else "middle")
        c += f'<line x1="{mx}" y1="{ry}" x2="{mx+sum(widths)}" y2="{ry}" stroke="#ccc" stroke-width="0.3"/>'
    for xo in col_x[1:]: c += f'<line x1="{xo}" y1="{my+16}" x2="{xo}" y2="{my+16+tbl_h+8}" stroke="#aaa" stroke-width="0.4"/>'
    crx = mx + sum(widths) + 20
    cry = my
    c += title_bar(crx, cry, 260, "CODE REFERENCES")
    refs = ["IRC 2021 SECTION R507 — DECKS","R507.2  MATERIALS","R507.3  FOOTINGS","R507.5  BEAM SPANS","R507.6  JOIST SPANS","R507.9  LEDGER ATTACHMENT","R311.7  STAIRWAYS","R312    GUARDS (RAILING)","TABLE R301.2(1) LOUISVILLE KY:","  GROUND SNOW LOAD: 15 PSF","  WIND SPEED: 115 MPH (EXP. B)","  SEISMIC DESIGN CAT.: C","  FROST DEPTH: 24\"","  TERMITE: MODERATE-HEAVY","  DECAY: SLIGHT"]
    c += f'<rect x="{crx}" y="{cry+16}" width="260" height="{len(refs)*13+10}" fill="white" stroke="black" stroke-width="0.7"/>'
    for i, ref in enumerate(refs): c += lbl(crx+6, cry+26+i*13, ref, 6.8, i==0, "start")
    sx_, sy_ = W-320, H-130
    c += f'<rect x="{sx_}" y="{sy_}" width="290" height="56" fill="white" stroke="black" stroke-width="1"/>'
    c += f'<line x1="{sx_}" y1="{sy_+28}" x2="{sx_+290}" y2="{sy_+28}" stroke="black" stroke-width="0.5"/>'
    for i, s in enumerate(["PREPARED BY:", "REVIEWED / APPROVED:"]):
        c += lbl(sx_+6, sy_+i*28+14, s, 7, False, "start", "#555")
        c += f'<line x1="{sx_+80}" y1="{sy_+i*28+24}" x2="{sx_+280}" y2="{sy_+i*28+24}" stroke="#aaa" stroke-width="0.8"/>'
    c += lbl(W//2, H-82, "THESE DRAWINGS ARE FOR PERMIT APPLICATION PURPOSES ONLY. CONTRACTOR SHALL VERIFY ALL CONDITIONS IN FIELD.", 7, False)
    c += lbl(W//2, H-70, "REFER TO MANUFACTURER INSTALLATION GUIDES FOR MOISTURESHIELD COMPOSITE PRODUCTS AND SBS ROOFING SYSTEM.", 7, False)
    c += tb(5, "NOTES & SCHEDULE")
    return c


def main():
    sheets = [(sheet1(), "FRAMING PLAN"),(sheet2(), "ELEVATIONS"),(sheet3(), "FOUNDATION PLAN"),(sheet4(), "CONSTRUCTION DETAILS"),(sheet5(), "NOTES & SCHEDULE")]
    html_parts = [
        "<!DOCTYPE html>", '<html lang="en">', "<head>",
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        "<title>Mason Howard Deck Permit Drawings — 1225 Bates Ct, Louisville KY 40204</title>",
        "<style>",
        "  body { font-family: Arial, sans-serif; background: #555; margin: 0; padding: 20px; }",
        "  h1 { color: white; text-align: center; font-size: 18px; margin-bottom: 8px; }",
        "  h2 { color: #ccc; text-align: center; font-size: 13px; margin: 0 0 16px; }",
        "  .sheet-title { color: #aed4f0; text-align: center; font-size: 12px; margin: 24px 0 4px; letter-spacing: 2px; }",
        "  svg { box-shadow: 0 4px 24px rgba(0,0,0,0.6); }",
        "  @media print { body { background: white; } svg { page-break-after: always; } }",
        "</style>", "</head>", "<body>",
        "<h1>PERMIT DRAWINGS — MASON RESIDENCE DECK</h1>",
        "<h2>1225 Bates Ct &nbsp;|&nbsp; Louisville, KY 40204 &nbsp;|&nbsp; IRC 2021 &nbsp;|&nbsp; Jefferson County KY</h2>",
        "<h2>Owner: Howard &amp; Gwen Mason &nbsp;|&nbsp; Contractor: R&amp;B Roofing &amp; Remodeling</h2>",
    ]
    for i, (content, title) in enumerate(sheets, 1):
        html_parts.append(f'<p class="sheet-title">Sheet {i} of 5 — {title}</p>')
        html_parts.append(svg(content, i))
    html_parts += ["</body>", "</html>"]
    out = "\n".join(html_parts)
    with open("mason_howard_permit_drawings.html", "w") as f:
        f.write(out)
    print(f"Written: {len(out):,} bytes  →  mason_howard_permit_drawings.html")


if __name__ == "__main__":
    main()
