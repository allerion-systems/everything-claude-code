#!/usr/bin/env python3
"""Worked example: 508 Foxwick Ct porch & deck addition (R1 geometry).

Run from the skill root:
    python3 examples/508-foxwick.py
Produces 508-foxwick-wireframe.html — publish it with the Artifact tool.

Dimensions come straight from the plan set R1 (A-101/S-101/S-102/S-103/A-201/
A-301): deck 36'x16' at +4'-9", 8-riser stair, 2:12 metal roof, ledger +16'-0",
freestanding stone chimney in the right bay, garage on the LEFT as seen from
the yard. Coordinates: X left->right from the yard, Y up, Z toward the yard."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "templates"))
from wireframe import Scene, build, pitch_height  # noqa: E402

s = Scene()

# ---- existing house (corner at x=30; porch runs 6' past it, free-standing) ----
HX0, HX1, EAVE, RIDGE = -4.0, 30.0, 22.83, 28.5
s.box("existing", HX0,0,0, HX1,EAVE,-28)
for x0, xr in ((HX0, HX0+8), (HX1, HX1-8)):
    s.line("existing", (x0,EAVE,0), (xr,RIDGE,-14))
    s.line("existing", (x0,EAVE,-28), (xr,RIDGE,-14))
s.line("existing", (HX0+8,RIDGE,-14), (HX1-8,RIDGE,-14))
for wx0 in (7.0, 17.0):                                   # preserved 2nd-floor windows
    s.rect("existing", (wx0,16.83,0),(wx0+4.5,16.83,0),(wx0+4.5,20.8,0),(wx0,20.8,0))
for dx0,w in ((9.0,6.0),(20.0,3.0)):                      # french doors + rear door
    s.rect("existing", (dx0,4.9,0),(dx0+w,4.9,0),(dx0+w,11.57,0),(dx0,11.57,0))

# ---- GARAGE on the LEFT (eave +14'-3", driveway grade ~+2') ----
GX0, GX1 = -28.0, -4.0
s.box("existing", GX0,2.0,0, GX1,14.25,-24)
for x0, xr in ((GX0, GX0+7), (GX1, GX1-7)):
    s.line("existing", (x0,14.25,0),(xr,18.2,-12))
    s.line("existing", (x0,14.25,-24),(xr,18.2,-12))
s.line("existing", (GX0+7,18.2,-12),(GX1-7,18.2,-12))
s.rect("existing", (GX0+3.5,2.0,0),(GX0+20,2.0,0),(GX0+20,9.0,0),(GX0+3.5,9.0,0))  # O.H. door

# ---- grade (slopes up toward garage) ----
s.line("grade", (GX0-6,2.0,0),(GX1,2.0,0)); s.line("grade", (GX1,2.0,0),(-2,0,4))
s.line("grade", (-2,0,4),(44,0,4))
for gz in (8,12,16,20,24):
    s.line("grade", (-30,2.0,gz),(GX1,2.0,gz)); s.line("grade", (GX1,2.0,gz),(-2,0,gz))
    s.line("grade", (-2,0,gz),(44,0,gz))

# ---- demo: existing deck to remove ----
s.rect("demo", (0,4.75,0),(26.5,4.75,0),(26.5,4.75,12.5),(0,4.75,12.5))
s.line("demo", (26.5,4.75,12.5),(31,0.3,16.5))

# ---- new deck 36x16 @ +4'-9" with picture frame ----
DX0,DX1,DZ1,DY = 0.0,36.0,16.0,4.75
s.rect("deck", (DX0,DY,0),(DX1,DY,0),(DX1,DY,DZ1),(DX0,DY,DZ1))
s.rect("deck", (DX0+0.9,DY,0.9),(DX1-0.9,DY,0.9),(DX1-0.9,DY,DZ1-0.9),(DX0+0.9,DY,DZ1-0.9))

# ---- deck framing S-102: ledger, 2x12 joists @16, B1 drop beam, rim ----
JT = DY-0.1; JB = JT-0.94; SPACING = 16/12.0
for zc in (0.05, 15.67, DZ1):
    s.line("framing", (DX0,JB,zc),(DX1,JB,zc))
s.line("framing", (DX0,JT,0.05),(DX1,JT,0.05))
s.line("framing", (DX0,JB-0.94,15.67),(DX1,JB-0.94,15.67))       # B1 lower ply
i = 0
while DX0 + i*SPACING <= DX1:
    x = DX0 + i*SPACING; s.line("framing", (x,JB,0.05),(x,JB,15.67)); i += 1

# ---- posts + footings F1 (bottom 30" below grade) ----
COLX = [0.4, 6.75, 13.5, 22.5, 29.25, 35.6]
for x in COLX + [30.0]:
    z = 15.67 if x != 30.0 else 0.5
    s.box("framing", x-0.25,0,z-0.25, x+0.25,JB-0.94,z+0.25)
    s.box("foundation", x-0.85,-2.5,z-0.85, x+0.85,-0.5,z+0.85)

# ---- stair 8R @ 7-1/8", 7T @ 11", 8'-0" clear ----
SX0,SX1,r,t = 14.0,22.0,7.125/12.0,11.0/12.0
for k in range(8):
    yT = DY - k*r; z0 = DZ1 + k*t
    s.line("stair", (SX0,yT,z0),(SX1,yT,z0))
    s.line("stair", (SX0,yT,z0),(SX0,yT-r,z0)); s.line("stair", (SX1,yT,z0),(SX1,yT-r,z0))
    if k < 7:
        s.line("stair", (SX0,yT-r,z0),(SX0,yT-r,z0+t)); s.line("stair", (SX1,yT-r,z0),(SX1,yT-r,z0+t))
s.rect("stair", (SX0-0.5,0.02,DZ1+7*t),(SX1+0.5,0.02,DZ1+7*t),
                (SX1+0.5,0.02,DZ1+7*t+3),(SX0-0.5,0.02,DZ1+7*t+3))   # paver landing

# ---- guard 36" black aluminum ----
def rail(x0,z0,x1,z1):
    s.line("guard", (x0,DY+3,z0),(x1,DY+3,z1)); s.line("guard", (x0,DY+0.3,z0),(x1,DY+0.3,z1))
    import math
    k = max(1,int(math.hypot(x1-x0,z1-z0)/6.0))
    for j in range(k+1):
        f=j/float(k); s.line("guard", (x0+f*(x1-x0),DY,z0+f*(z1-z0)),(x0+f*(x1-x0),DY+3,z0+f*(z1-z0)))
rail(DX0,0,DX0,DZ1); rail(DX1,0,DX1,DZ1); rail(DX0,DZ1,SX0,DZ1); rail(SX1,DZ1,DX1,DZ1)

# ---- columns: stone base + 10" wrap up to roof ----
RLY = 16.0
def roof_y(z): return pitch_height(2, 12, RLY, -z) if False else RLY - z*(2.0/12.0)
for x in COLX:
    z = 15.67
    s.box("columns", x-0.85,DY,z-0.85, x+0.85,DY+3,z+0.85)                # stone base
    s.box("columns", x-0.42,DY+3,z-0.42, x+0.42,roof_y(z)-0.94,z+0.42)    # wrap

# ---- roof framing S-103: RB1 LVL + 2x10 rafters @16 ----
ZF = 17.0
s.line("roofframing", (DX0,RLY,0.05),(DX1,RLY,0.05))
yb = roof_y(15.67)
s.line("roofframing", (DX0,yb,15.67),(DX1,yb,15.67))
s.line("roofframing", (DX0,yb-0.94,15.67),(DX1,yb-0.94,15.67))
i = 0
while DX0 + i*SPACING <= DX1:
    x = DX0 + i*SPACING; s.line("roofframing", (x,RLY,0.0),(x,roof_y(ZF),ZF)); i += 1

# ---- roof plane: outline + standing-seam + fascia ----
s.rect("roof", (DX0,RLY+0.2,0),(DX1,RLY+0.2,0),(DX1,roof_y(ZF)+0.2,ZF),(DX0,roof_y(ZF)+0.2,ZF))
for i in range(1,18):
    x = DX0 + i*2.0; s.line("roof", (x,RLY+0.2,0),(x,roof_y(ZF)+0.2,ZF))
s.line("roof", (DX0,roof_y(ZF)+0.2,ZF),(DX0,roof_y(ZF)-0.7,ZF))
s.line("roof", (DX1,roof_y(ZF)+0.2,ZF),(DX1,roof_y(ZF)-0.7,ZF))
s.line("roof", (DX0,roof_y(ZF)-0.7,ZF),(DX1,roof_y(ZF)-0.7,ZF))

# ---- chimney: right bay, freestanding, clean stone to yard, firebox/TV to house ----
CX0,CX1,CZ0,CZ1 = 30.1,35.1,13.0,16.0
CTOP = roof_y(14.5) + 2.6
s.box("chimney", CX0,DY,CZ0, CX1,CTOP,CZ1)
s.rect("chimney", (31.6,DY+0.7,CZ0),(33.6,DY+0.7,CZ0),(33.6,DY+3.2,CZ0),(31.6,DY+3.2,CZ0))  # firebox
s.line("chimney", (31.3,DY+4.0,CZ0),(33.9,DY+4.0,CZ0))                                        # mantel
s.rect("chimney", (31.5,DY+4.6,CZ0),(33.7,DY+4.6,CZ0),(33.7,DY+6.2,CZ0),(31.5,DY+6.2,CZ0))   # TV
s.box("foundation", 29.6,-2.5,12.5, 35.6,-0.2,16.5)                                            # F3 pad

# ---- labels ----
for txt,x,y,z,ly in [
    ("GARAGE",-16,9,1.5,"existing"), ("RESIDENCE",13,21.5,-0.5,"existing"),
    ("STONE CHIMNEY",32.6,18.8,14.5,"chimney"), ("DECK 36' x 16'",18,5.6,8,"deck"),
    ("STAIR 8R",18,2.2,20.5,"stair"), ("B1 (3)2x12",2.5,2.6,15.67,"framing"),
    ("2:12 METAL",18,15.6,8.5,"roof")]:
    s.label(txt,x,y,z,ly)

res = build(
    scene=s,
    out=os.path.join(os.path.dirname(__file__), "508-foxwick-wireframe.html"),
    template=os.path.join(os.path.dirname(__file__), "..", "templates", "viewer.html"),
    title="508 FOXWICK — WIREFRAME",
    subtitle="HERNANDEZ RESIDENCE · PORCH & DECK ADDITION · LOUISVILLE KY",
    rev="R1 · 10 JUL 2026",
    stamp="PRELIMINARY — NOT FOR CONSTRUCTION — V.I.F.",
    units="FT", obj_name="508-foxwick-r1-wireframe",
    hud=["<b>DECK</b> 36'-0\" × 16'-0\" @ +4'-9\"",
         "<b>ROOF</b> 2:12 METAL · LEDGER +16'-0\"",
         "<b>STAIR</b> 8R @ 7-1/8\" · 8'-0\" CLR"],
    layers={
        "existing":    ["Existing house + garage", "#8B877B", "#6E7480", 1.0],
        "grade":       ["Grade / patio",           "#B9B4A5", "#3E434E", 0.7],
        "demo":        ["Demo — existing deck",     "#A65138", "#C96A47", 1.2, [6,4]],
        "foundation":  ["Footings F1/F3",           "#8C7B62", "#8A7355", 0.9, [4,3]],
        "framing":     ["Deck framing (S-102)",     "#B27B2E", "#E0A45C", 1.0],
        "deck":        ["Deck surface",             "#7A6A4C", "#A89468", 1.4],
        "stair":       ["Stair",                    "#C08A3E", "#E7B878", 1.1],
        "guard":       ["Guard 36\" alum.",         "#3A3833", "#C9C4B4", 0.8],
        "columns":     ["Columns + stone bases",    "#9C8F6F", "#CBBD97", 1.1],
        "roofframing": ["Roof framing (S-103)",     "#4E7D8C", "#6FA8BC", 0.9],
        "roof":        ["Roof 2:12 metal",          "#39616F", "#4E8496", 1.3],
        "chimney":     ["Stone chimney (right bay)","#87796A", "#A99A85", 1.3],
    },
    scenes={
        "Perspective":     dict(yaw=-0.55, pitch=0.32, dist=95,  fov=42, tgt=[6,9,2]),
        "Rear elevation":  dict(yaw=0.0,   pitch=0.03, dist=260, fov=14, tgt=[4,11,0]),
        "Chimney bay":     dict(yaw=1.05,  pitch=0.18, dist=80,  fov=38, tgt=[26,9,8]),
        "Framing plan":    dict(yaw=0.0,   pitch=1.45, dist=150, fov=26, tgt=[10,4,6]),
        "Section @ stair": dict(yaw=1.35,  pitch=0.10, dist=150, fov=18, tgt=[18,8,6]),
    },
    default_scene="Perspective",
)
print(res)
