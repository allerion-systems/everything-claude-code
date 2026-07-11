#!/usr/bin/env python3
"""Worked example: 508 Foxwick Ct porch & deck addition (R1 geometry).

Run from the skill root:
    python3 examples/508-foxwick.py
Produces 508-foxwick-wireframe.html — publish it with the Artifact tool.

Existing-shell geometry is grounded in the HOVER capture (Property 22311873 /
Model 22357787): measured roof pitches 7:12 (58%) + 12:12 gable wing (39%) +
5:12 (3%), a 16-facet hip-and-valley roof, and a brick chimney reaching ~31'.
New-work dimensions come from plan set R1 (A-101/S-101..103/A-201/A-301): deck
36'x16' @ +4'-9", 8-riser stair, standing-seam HIP porch roof tied in at
+16'-6" (just under the measured 2nd-floor sills), freestanding stone chimney
at the right end. Coordinates: X left->right from the yard, Y up, Z toward the
yard; the house rear wall is the z=0 plane and the house body runs into -Z."""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "templates"))
from wireframe import Scene, build  # noqa: E402

s = Scene()

# ============================ EXISTING SHELL (HOVER) ========================
# ---- main house: 7:12 HIP, two storeys, eave +23', ridge +31' -------------
HX0, HX1, HZB, EH = -4.0, 30.0, -28.0, 23.0
RH = EH + 14.0 * (7.0 / 12.0)            # 7:12 over half-depth (28/2) -> ~31.2'
RX0, RX1, RZ = 10.0, 16.0, -14.0         # short hip ridge, centred in x & z
s.box("existing", HX0, 0, 0, HX1, EH, HZB)           # 2-storey wall mass
for cz in (0.0, HZB):                                # 4 hip rafters to ridge
    s.line("existing", (HX0, EH, cz), (RX0, RH, RZ))
    s.line("existing", (HX1, EH, cz), (RX1, RH, RZ))
s.line("existing", (RX0, RH, RZ), (RX1, RH, RZ))     # ridge
s.line("existing", (HX0, EH, 0), (HX1, EH, 0))       # rear eave

# ---- 2nd-floor windows (preserved) + rear openings ------------------------
for wx0 in (6.5, 16.5):
    s.rect("existing", (wx0,16.9,0),(wx0+4.0,16.9,0),(wx0+4.0,20.9,0),(wx0,20.9,0))
for dx0,w in ((9.0,6.0),(20.0,3.0)):                 # french doors + rear door
    s.rect("existing", (dx0,4.9,0),(dx0+w,4.9,0),(dx0+w,11.57,0),(dx0,11.57,0))

# ---- existing bay (breakfast nook, to integrate under new porch roof) ------
s.box("existing", 8.0,0,0, 15.5,11.0,3.2)

# ---- existing BRICK chimney: right side, up to ~31' (HOVER) ----------------
s.box("existing", 25.5,EH-2.5,-7.0, 27.6,31.4,-5.0)

# ---- GARAGE WING on the LEFT: 12:12 GABLE, ridge in x, gable end to drive ---
GX0, GX1, GZB, EG = -28.0, -4.0, -24.0, 13.5
RG = EG + 12.0 * (12.0/12.0)             # 12:12 over half-depth (24/2) -> 25.5'
s.box("existing", GX0,2.0,0, GX1,EG,GZB)             # garage walls (floor +2')
s.line("existing", (GX0,RG,-12),(GX1,RG,-12))        # ridge (runs in x)
for gx in (GX0, GX1):                                # rear + front rake at ends
    s.line("existing", (gx,EG,0),(gx,RG,-12)); s.line("existing", (gx,EG,GZB),(gx,RG,-12))
s.line("existing", (GX0,EG,0),(GX1,EG,0))            # rear eave
s.line("existing", (GX0,RG,-12),(GX0,EG,GZB))        # west gable-end slope (to drive)

# ---- grade (slopes up toward garage) --------------------------------------
s.line("grade", (GX0-6,2.0,0),(GX1,2.0,0)); s.line("grade", (GX1,2.0,0),(-2,0,4))
s.line("grade", (-2,0,4),(44,0,4))
for gz in (8,12,16,20,24):
    s.line("grade", (-30,2.0,gz),(GX1,2.0,gz)); s.line("grade", (GX1,2.0,gz),(-2,0,gz))
    s.line("grade", (-2,0,gz),(44,0,gz))

# ============================ DEMO =========================================
s.rect("demo", (0,4.75,0),(26.5,4.75,0),(26.5,4.75,12.5),(0,4.75,12.5))
s.line("demo", (26.5,4.75,12.5),(31,0.3,16.5))

# ============================ NEW DECK (R1) ================================
DX0,DX1,DZ1,DY = 0.0,36.0,16.0,4.75
s.rect("deck", (DX0,DY,0),(DX1,DY,0),(DX1,DY,DZ1),(DX0,DY,DZ1))
s.rect("deck", (DX0+0.9,DY,0.9),(DX1-0.9,DY,0.9),(DX1-0.9,DY,DZ1-0.9),(DX0+0.9,DY,DZ1-0.9))

# ---- deck framing S-102: ledger, 2x12 joists @16, B1 drop beam ------------
JT = DY-0.1; JB = JT-0.94; SPACING = 16/12.0
for zc in (0.05, 15.67, DZ1):
    s.line("framing", (DX0,JB,zc),(DX1,JB,zc))
s.line("framing", (DX0,JT,0.05),(DX1,JT,0.05))
s.line("framing", (DX0,JB-0.94,15.67),(DX1,JB-0.94,15.67))       # B1 lower ply
i = 0
while DX0 + i*SPACING <= DX1:
    x = DX0 + i*SPACING; s.line("framing", (x,JB,0.05),(x,JB,15.67)); i += 1

# ---- posts + footings F1 (30" below grade) --------------------------------
COLX = [0.4, 6.75, 13.5, 22.5, 29.25, 35.6]
for x in COLX + [30.0]:
    z = 15.67 if x != 30.0 else 0.5
    s.box("framing", x-0.25,0,z-0.25, x+0.25,JB-0.94,z+0.25)
    s.box("foundation", x-0.85,-2.5,z-0.85, x+0.85,-0.5,z+0.85)

# ---- stair 8R @ 7-1/8", 7T @ 11", 8'-0" clear -----------------------------
SX0,SX1,r,t = 14.0,22.0,7.125/12.0,11.0/12.0
for k in range(8):
    yT = DY - k*r; z0 = DZ1 + k*t
    s.line("stair", (SX0,yT,z0),(SX1,yT,z0))
    s.line("stair", (SX0,yT,z0),(SX0,yT-r,z0)); s.line("stair", (SX1,yT,z0),(SX1,yT-r,z0))
    if k < 7:
        s.line("stair", (SX0,yT-r,z0),(SX0,yT-r,z0+t)); s.line("stair", (SX1,yT-r,z0),(SX1,yT-r,z0+t))
s.rect("stair", (SX0-0.5,0.02,DZ1+7*t),(SX1+0.5,0.02,DZ1+7*t),
                (SX1+0.5,0.02,DZ1+7*t+3),(SX0-0.5,0.02,DZ1+7*t+3))   # paver landing

# ---- guard 36" black aluminum ---------------------------------------------
def rail(x0,z0,x1,z1):
    s.line("guard", (x0,DY+3,z0),(x1,DY+3,z1)); s.line("guard", (x0,DY+0.3,z0),(x1,DY+0.3,z1))
    k = max(1,int(math.hypot(x1-x0,z1-z0)/6.0))
    for j in range(k+1):
        f=j/float(k); s.line("guard", (x0+f*(x1-x0),DY,z0+f*(z1-z0)),(x0+f*(x1-x0),DY+3,z0+f*(z1-z0)))
rail(DX0,0,DX0,DZ1); rail(DX1,0,DX1,DZ1); rail(DX0,DZ1,SX0,DZ1); rail(SX1,DZ1,DX1,DZ1)

# ============================ NEW COVERED PORCH ROOF =======================
# Standing-seam HIP roof: rises from outer eave (+13'-3") to a +16'-6" tie-in
# just below the measured 2nd-floor sills. Hipped both ends, per North Star.
PEY, PWY, HI = 13.25, 16.5, 6.0
def py(z): return PWY - (PWY-PEY)*(z/DZ1)            # porch-roof height at depth z
ZC = 15.5                                            # eave line (over columns)

# columns: stone base + square wrap up to the eave
for x in COLX:
    s.box("columns", x-0.85,DY,ZC-0.85, x+0.85,DY+3,ZC+0.85)          # stone base
    s.box("columns", x-0.42,DY+3,ZC-0.42, x+0.42,py(ZC)-0.4,ZC+0.42)  # wrapped post

# roof framing S-103: ledger at wall, beam at eave, 2x10 rafters @16 up-slope
s.line("roofframing", (DX0,PWY,0.05),(DX1,PWY,0.05))
s.line("roofframing", (DX0,PEY,ZC),(DX1,PEY,ZC))
i = 0
while DX0 + i*SPACING <= DX1:
    x = DX0 + i*SPACING; s.line("roofframing", (x,PWY,0.05),(x,PEY,ZC)); i += 1

# roof surface: high edge at wall (inset = hip), front eave, hips, end returns
s.line("roof", (HI,PWY,0),(DX1-HI,PWY,0))            # ridge against wall
s.line("roof", (DX0,PEY,DZ1),(DX1,PEY,DZ1))          # front eave
s.line("roof", (DX0,PEY,DZ1),(HI,PWY,0))             # front-left hip
s.line("roof", (DX1,PEY,DZ1),(DX1-HI,PWY,0))         # front-right hip
s.line("roof", (DX0,PEY,DZ1),(DX0,PEY,0)); s.line("roof", (DX0,PEY,0),(HI,PWY,0))    # L end
s.line("roof", (DX1,PEY,DZ1),(DX1,PEY,0)); s.line("roof", (DX1,PEY,0),(DX1-HI,PWY,0))# R end
for x in (8,12,16,20,24,28):                         # standing-seam battens
    s.line("roof", (x,PEY,DZ1),(x,PWY,0))
s.line("roof", (DX0,PEY,DZ1),(DX1,PEY,DZ1))          # (fascia doubled below)
s.line("roof", (DX0,PEY-0.6,DZ1),(DX1,PEY-0.6,DZ1))  # fascia

# ---- NEW freestanding stone chimney: right end, clean stone to yard --------
CX0,CX1,CZ0,CZ1 = 30.1,35.1,13.0,16.0
CTOP = 19.6                                          # rises above the porch roof
s.box("chimney", CX0,DY,CZ0, CX1,CTOP,CZ1)
s.rect("chimney", (31.6,DY+0.7,CZ0),(33.6,DY+0.7,CZ0),(33.6,DY+3.2,CZ0),(31.6,DY+3.2,CZ0))  # firebox
s.line("chimney", (31.3,DY+4.0,CZ0),(33.9,DY+4.0,CZ0))                                        # mantel
s.rect("chimney", (31.5,DY+4.6,CZ0),(33.7,DY+4.6,CZ0),(33.7,DY+6.2,CZ0),(31.5,DY+6.2,CZ0))   # TV
s.box("foundation", 29.6,-2.5,12.5, 35.6,-0.2,16.5)                                            # F3 pad

# ============================ LABELS =======================================
for txt,x,y,z,ly in [
    ("GARAGE 12:12 GABLE",-16,20,-6,"existing"), ("RESIDENCE 7:12 HIP",13,25.5,-8,"existing"),
    ("EXIST. BRICK CHIMNEY",26.5,29,-6,"existing"), ("NEW STONE CHIMNEY",32.6,17.5,14.5,"chimney"),
    ("DECK 36' x 16'",18,5.6,8,"deck"), ("STAIR 8R",18,2.2,20.5,"stair"),
    ("B1 (3)2x12",2.5,2.6,15.67,"framing"), ("STANDING-SEAM HIP 2½:12",18,15.4,9,"roof")]:
    s.label(txt,x,y,z,ly)

res = build(
    scene=s,
    out=os.path.join(os.path.dirname(__file__), "508-foxwick-wireframe.html"),
    template=os.path.join(os.path.dirname(__file__), "..", "templates", "viewer.html"),
    title="508 FOXWICK — WIREFRAME",
    subtitle="HERNANDEZ RESIDENCE · PORCH & DECK · LOUISVILLE KY · HOVER 22357787",
    rev="R1 · 11 JUL 2026",
    stamp="PRELIMINARY — NOT FOR CONSTRUCTION — V.I.F.",
    units="FT", obj_name="508-foxwick-r1-wireframe",
    hud=["<b>EXIST. ROOF</b> 7:12 HIP + 12:12 GABLE WING (HOVER)",
         "<b>PORCH ROOF</b> 2½:12 std-seam HIP → +16'-6\" tie-in",
         "<b>DECK</b> 36'×16' @ +4'-9\" · <b>STAIR</b> 8R @ 7-1/8\""],
    layers={
        "existing":    ["Existing shell (HOVER)",   "#8B877B", "#6E7480", 1.0],
        "grade":       ["Grade / patio",            "#B9B4A5", "#3E434E", 0.7],
        "demo":        ["Demo — existing deck",      "#A65138", "#C96A47", 1.2, [6,4]],
        "foundation":  ["Footings F1/F3",            "#8C7B62", "#8A7355", 0.9, [4,3]],
        "framing":     ["Deck framing (S-102)",      "#B27B2E", "#E0A45C", 1.0],
        "deck":        ["Deck surface",              "#7A6A4C", "#A89468", 1.4],
        "stair":       ["Stair",                     "#C08A3E", "#E7B878", 1.1],
        "guard":       ["Guard 36\" alum.",          "#3A3833", "#C9C4B4", 0.8],
        "columns":     ["Columns + stone bases",     "#9C8F6F", "#CBBD97", 1.1],
        "roofframing": ["Porch roof framing (S-103)","#4E7D8C", "#6FA8BC", 0.9],
        "roof":        ["Porch roof — std-seam hip", "#39616F", "#4E8496", 1.3],
        "chimney":     ["New stone chimney",         "#87796A", "#A99A85", 1.3],
    },
    scenes={
        "Perspective":     dict(yaw=-0.55, pitch=0.30, dist=105, fov=42, tgt=[6,11,2]),
        "Rear elevation":  dict(yaw=0.0,   pitch=0.03, dist=290, fov=14, tgt=[4,14,0]),
        "Chimney bay":     dict(yaw=1.05,  pitch=0.16, dist=85,  fov=38, tgt=[26,11,8]),
        "Framing plan":    dict(yaw=0.0,   pitch=1.45, dist=150, fov=26, tgt=[10,4,6]),
        "Section @ stair": dict(yaw=1.35,  pitch=0.10, dist=150, fov=18, tgt=[18,9,6]),
    },
    default_scene="Perspective",
)
print(res)
