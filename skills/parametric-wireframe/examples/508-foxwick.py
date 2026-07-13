#!/usr/bin/env python3
"""Worked example: 508 Foxwick Ct porch & deck addition (R4 geometry).

Run from the skill root:
    python3 examples/508-foxwick.py
Produces 508-foxwick-wireframe.html — publish it with the Artifact tool.

Existing-shell geometry is grounded in the HOVER capture (Property 22311873 /
Model 22357787): measured roof pitches 7:12 (58%) + 12:12 gable wing (39%) +
5:12 (3%), a 16-facet hip-and-valley roof, a brick chimney reaching ~31', and
two one-story bay projections at the rear wall. The bays REMAIN; only the low
5:12 roofs sitting on top of them are demolished so the new porch roof can run
clean to the main wall.

R3 porch roof is the confirmed design: a 2:12 standing-seam SHED over the
whole deck, ledger at +16'-6" on the main wall (below the measured +17'-5"
second-floor sills), passing over the bays — plus a 12:12 OPEN-CEILING cross
GABLE over the door bay. The gable works because its ridge is a STRUCTURAL
LVL beam: carried at the yard face by a structural king-post timber truss,
holding level, then saddling down to the wall tie below the sills. No rafter
ties → vaulted cedar T&G ceiling. Ridge beam, truss and point-load footings
are PE-design items.

Coordinates: X left->right from the yard, Y up, Z toward the yard; the house
MAIN rear wall is the z=0 plane and the house body runs into -Z. In a real
job the existing shell below would be baked to a locked JSON once approved
(see SKILL.md "Lock the as-built") — design layers only ever ADD below it."""
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
s.box("existing", HX0, 0, 0, HX1, EH, HZB)
for cz in (0.0, HZB):
    s.line("existing", (HX0, EH, cz), (RX0, RH, RZ))
    s.line("existing", (HX1, EH, cz), (RX1, RH, RZ))
s.line("existing", (RX0, RH, RZ), (RX1, RH, RZ))
s.line("existing", (HX0, EH, 0), (HX1, EH, 0))

# ---- 2nd-floor windows (preserved — porch tie-in stays BELOW their sills) --
for wx0 in (6.5, 16.5):
    s.rect("existing", (wx0,16.9,0),(wx0+4.0,16.9,0),(wx0+4.0,20.9,0),(wx0,20.9,0))
s.rect("existing", (27.0,5.2,0),(33.0,5.2,0),(33.0,11.87,0),(27.0,11.87,0))  # french doors (gable bay)

# ---- TWO existing one-story bays (WALLS REMAIN; roofs demo'd below) --------
s.box("existing", 7.5,0,0, 14.0,11.0,3.0)
s.box("existing", 20.0,0,0, 26.5,11.0,3.0)

# ---- existing BRICK chimney: right side, up to ~31' (HOVER) ----------------
s.box("existing", 25.5,EH-2.5,-7.0, 27.6,31.4,-5.0)

# ---- GARAGE WING on the LEFT: 12:12 GABLE, ridge in x, gable end to drive ---
GX0, GX1, GZB, EG = -28.0, -4.0, -24.0, 13.5
RG_G = EG + 12.0 * (12.0/12.0)           # 12:12 over half-depth (24/2) -> 25.5'
s.box("existing", GX0,2.0,0, GX1,EG,GZB)
s.line("existing", (GX0,RG_G,-12),(GX1,RG_G,-12))
for gx in (GX0, GX1):
    s.line("existing", (gx,EG,0),(gx,RG_G,-12)); s.line("existing", (gx,EG,GZB),(gx,RG_G,-12))
s.line("existing", (GX0,EG,0),(GX1,EG,0))
s.line("existing", (GX0,RG_G,-12),(GX0,EG,GZB))

# ---- grade (slopes up toward garage) --------------------------------------
s.line("grade", (GX0-6,2.0,0),(GX1,2.0,0)); s.line("grade", (GX1,2.0,0),(-2,0,4))
s.line("grade", (-2,0,4),(44,0,4))
for gz in (8,12,16,20,24):
    s.line("grade", (-30,2.0,gz),(GX1,2.0,gz)); s.line("grade", (GX1,2.0,gz),(-2,0,gz))
    s.line("grade", (-2,0,gz),(44,0,gz))

# ============================ DEMO =========================================
# existing elevated deck — remove entirely
s.rect("demo", (0,4.75,0),(26.5,4.75,0),(26.5,4.75,12.5),(0,4.75,12.5))
s.line("demo", (26.5,4.75,12.5),(31,0.3,16.5))
# low 5:12 roofs ON TOP of the two bays — remove (bay walls/windows remain)
for bx0, bx1 in ((7.5,14.0),(20.0,26.5)):
    s.rect("demo", (bx0,11.05,0),(bx1,11.05,0),(bx1,11.05,3.0),(bx0,11.05,3.0))
    s.line("demo", (bx0,11.05,0),(bx1,11.05,3.0)); s.line("demo", (bx1,11.05,0),(bx0,11.05,3.0))

# ============================ NEW DECK (R3) ================================
# 36'-7" total = 7'-0" grill bay (garage end) + 29'-7" living run, @ +5'-4"
DX0,DX1,DZ1,DY = 0.0,36.58,16.0,5.33
s.rect("deck", (DX0,DY,0),(DX1,DY,0),(DX1,DY,DZ1),(DX0,DY,DZ1))
s.rect("deck", (DX0+0.9,DY,0.9),(DX1-0.9,DY,0.9),(DX1-0.9,DY,DZ1-0.9),(DX0+0.9,DY,DZ1-0.9))
s.line("deck", (7.0,DY+0.02,0),(7.0,DY+0.02,DZ1))                     # grill-bay break

# ---- deck framing S-102: ledger, 2x12 joists @16, drop beam ----------------
JT = DY-0.1; JB = JT-0.94; SPACING = 16/12.0
for zc in (0.05, 15.0, DZ1):
    s.line("framing", (DX0,JB,zc),(DX1,JB,zc))
s.line("framing", (DX0,JT,0.05),(DX1,JT,0.05))
s.line("framing", (DX0,JB-0.94,15.0),(DX1,JB-0.94,15.0))
i = 0
while DX0 + i*SPACING <= DX1:
    x = DX0 + i*SPACING; s.line("framing", (x,JB,0.05),(x,JB,15.0)); i += 1

# ---- FIVE posts + footings (30" below grade); gable posts carry the truss --
POSTX = [0.5, 9.0, 19.0, 31.0, 36.1]
for x in POSTX:
    s.box("framing", x-0.25,0,14.75, x+0.25,JB-0.94,15.25)
    s.box("foundation", x-0.85,-2.5,14.4, x+0.85,-0.5,15.6)

# ---- stair 9R @ ~7-1/8", 8T @ 11", 8'-0" clear, centred on the doors -------
NR = 9; SX0,SX1 = 21.0,29.0; r = DY/NR; t = 11.0/12.0  # centered under gable
for k in range(NR):
    yT = DY - k*r; z0 = DZ1 + k*t
    s.line("stair", (SX0,yT,z0),(SX1,yT,z0))
    s.line("stair", (SX0,yT,z0),(SX0,yT-r,z0)); s.line("stair", (SX1,yT,z0),(SX1,yT-r,z0))
    if k < NR-1:
        s.line("stair", (SX0,yT-r,z0),(SX0,yT-r,z0+t)); s.line("stair", (SX1,yT-r,z0),(SX1,yT-r,z0+t))
s.rect("stair", (SX0-0.5,0.02,DZ1+(NR-1)*t),(SX1+0.5,0.02,DZ1+(NR-1)*t),
                (SX1+0.5,0.02,DZ1+(NR-1)*t+3),(SX0-0.5,0.02,DZ1+(NR-1)*t+3))

# ---- guard 36" black aluminum ---------------------------------------------
def rail(x0,z0,x1,z1):
    s.line("guard", (x0,DY+3,z0),(x1,DY+3,z1)); s.line("guard", (x0,DY+0.3,z0),(x1,DY+0.3,z1))
    k = max(1,int(math.hypot(x1-x0,z1-z0)/6.0))
    for j in range(k+1):
        f=j/float(k); s.line("guard", (x0+f*(x1-x0),DY,z0+f*(z1-z0)),(x0+f*(x1-x0),DY+3,z0+f*(z1-z0)))
rail(DX0,0,DX0,DZ1); rail(DX1,0,DX1,DZ1); rail(DX0,DZ1,SX0,DZ1)
rail(SX1,DZ1,31.55,DZ1); rail(35.55,DZ1,DX1,DZ1)   # guard dies into chimney

# ============================ NEW PORCH ROOF (R3) ===========================
# Whole-deck 2:12 shed from the MAIN-wall ledger (+16'-6", under the sills),
# passing over the bays, + 12:12 open-ceiling gable on a structural ridge.
TIE, SLP = 16.5, 2.0/12.0
ZC, ZE = 15.5, 17.0                       # post/beam line; eave w/ 18" overhang
def shedY(z): return TIE - z*SLP
EY, EE = shedY(ZC), shedY(ZE)             # 13.92 @ beam, 13.67 @ eave edge

# ---- columns: stone base + square wrap + knee braces ------------------------
for x in POSTX:
    s.box("columns", x-0.85,DY,ZC-0.85, x+0.85,DY+2.5,ZC+0.85)         # stone base
    s.box("columns", x-0.42,DY+2.5,ZC-0.42, x+0.42,EY-1.0,ZC+0.42)     # square post
    for dx in (-1.8, 1.8):
        s.line("roofframing", (x,EY-2.6,ZC),(x+dx,EY-1.05,ZC))
s.line("roofframing", (DX0,EY,ZC),(DX1,EY,ZC))                         # carrying beam
s.line("roofframing", (DX0,EY-1.0,ZC),(DX1,EY-1.0,ZC))
s.line("roofframing", (DX0,TIE,0),(DX1,TIE,0))                         # ledger @ main wall
i = 0
while DX0 + i*2.67 <= DX1:                                             # rafters (indicative)
    x = DX0 + i*2.67; s.line("roofframing", (x,TIE,0),(x,EE,ZE)); i += 1

# ---- shed plane + standing seams + fascia ----------------------------------
s.rect("roof", (DX0,TIE+0.15,0),(DX1,TIE+0.15,0),(DX1,EE+0.15,ZE),(DX0,EE+0.15,ZE))
for i2 in range(1,13):
    x = DX0 + i2*(DX1-DX0)/13.0
    s.line("roof", (x,TIE+0.15,0),(x,EE+0.15,ZE))
s.line("roof", (DX0,EE-0.55,ZE),(DX1,EE-0.55,ZE))
s.line("roof", (DX0,EE+0.15,ZE),(DX0,EE-0.55,ZE)); s.line("roof", (DX1,EE+0.15,ZE),(DX1,EE-0.55,ZE))

# ---- OPEN-CEILING cross gable over the door bay (12:12) --------------------
GB0, GB1 = 19.0, 31.0
GCg = (GB0+GB1)/2.0
APX = EE + (GB1-GB0)/2.0                  # 12:12 apex at the yard face
ZFo = 5.0                                 # ridge saddles down from here to the tie
s.line("roof", (GCg,APX,ZE),(GCg,APX,ZFo)); s.line("roof", (GCg,APX,ZFo),(GCg,TIE,0))
s.line("roof", (GB0,EE,ZE),(GCg,APX,ZE)); s.line("roof", (GB1,EE,ZE),(GCg,APX,ZE))
vp  = [(GB0+(shedY(z)-EE), shedY(z), z) for z in (11.0, ZFo)]          # left valley
s.poly("roof", (GB0,EE,ZE), *vp, (GB0+(TIE-EE), TIE, 0))
vp2 = [(GB1-(shedY(z)-EE), shedY(z), z) for z in (11.0, ZFo)]          # right valley
s.poly("roof", (GB1,EE,ZE), *vp2, (GB1-(TIE-EE), TIE, 0))
s.line("roof", (GB0+(shedY(ZFo)-EE),shedY(ZFo),ZFo),(GCg,APX,ZFo))     # fold creases
s.line("roof", (GB1-(shedY(ZFo)-EE),shedY(ZFo),ZFo),(GCg,APX,ZFo))
for tt in (0.33, 0.66):                                                # gable-plane seams
    yy = EE + tt*(APX-EE)
    s.line("roof", (GB0+tt*(GCg-GB0),yy,ZE),(GB0+tt*(GCg-GB0),yy,ZFo+(1-tt)*2))
    s.line("roof", (GB1-tt*(GB1-GCg),yy,ZE),(GB1-tt*(GB1-GCg),yy,ZFo+(1-tt)*2))

# ---- STRUCTURAL king-post truss @ yard face + LVL ridge beam (PE) ----------
TZ = ZE
s.line("truss", (GB0,EE,TZ),(GB1,EE,TZ))                               # bottom chord
s.line("truss", (GCg,EE,TZ),(GCg,APX,TZ))                              # king post
s.line("truss", (GB0,EE,TZ),(GCg,APX,TZ)); s.line("truss", (GB1,EE,TZ),(GCg,APX,TZ))
s.line("truss", (GCg,EE+0.3,TZ),((GB0+GCg)/2,(EE+APX)/2,TZ))           # struts
s.line("truss", (GCg,EE+0.3,TZ),((GB1+GCg)/2,(EE+APX)/2,TZ))
s.line("roofframing", (GCg,APX-0.1,ZE),(GCg,TIE-0.1,0))                # ridge BEAM

# ---- NEW freestanding stone chimney RIGHT of the gable (own footing) --------
CX0,CX1,CZ0,CZ1 = 31.55,35.55,12.0,16.0
CTOP = 21.5
s.box("chimney", CX0,-0.3,CZ0, CX1,CTOP,CZ1)
s.rect("chimney", (32.55,DY+0.7,CZ0),(34.55,DY+0.7,CZ0),(34.55,DY+3.2,CZ0),(32.55,DY+3.2,CZ0))  # firebox
s.line("chimney", (32.25,DY+4.0,CZ0),(34.85,DY+4.0,CZ0))                                     # mantel
s.rect("chimney", (32.65,DY+4.6,CZ0),(34.85,DY+4.6,CZ0),(34.85,DY+6.2,CZ0),(32.65,DY+6.2,CZ0)) # TV
s.box("foundation", 30.8,-2.5,11.5, 36.3,-0.2,16.5)                                          # pad below deck

# ============================ LABELS =======================================
for txt,x,y,z,ly in [
    ("GARAGE 12:12 GABLE",-16,20,-6,"existing"), ("RESIDENCE 7:12 HIP",13,25.5,-8,"existing"),
    ("EXIST. BRICK CHIMNEY",26.5,29,-6,"existing"),
    ("DEMO BAY ROOFS — BAY WALLS REMAIN",13,12.3,2,"demo"),
    ("STONE CHIMNEY - RIGHT-SIDE BAY",33.55,22.4,14.5,"chimney"),
    ("DECK 36'-7\" (7' GRILL BAY + 29'-7\") @ +5'-4\"",25,DY+1.3,6,"deck"),
    ("STAIR 9R",30,2.2,22,"stair"),
    ("WHOLE SHED ROOF 2:12 · TIE +16'-6\"",8,13.9,9.5,"roof"),
    ("OPEN-CEILING TRUSS GABLE 12:12",25,20.8,15,"truss"),
    ("STRUCTURAL RIDGE BEAM (PE)",25,19.4,4,"roofframing")]:
    s.label(txt,x,y,z,ly)

res = build(
    scene=s,
    out=os.path.join(os.path.dirname(__file__), "508-foxwick-wireframe.html"),
    template=os.path.join(os.path.dirname(__file__), "..", "templates", "viewer.html"),
    title="508 FOXWICK — WIREFRAME",
    subtitle="HERNANDEZ RESIDENCE · PORCH & DECK · LOUISVILLE KY · HOVER 22357787",
    rev="R4 · 13 JUL 2026",
    stamp="PRELIMINARY — NOT FOR CONSTRUCTION — V.I.F.",
    units="FT", obj_name="508-foxwick-r4-wireframe",
    hud=["<b>ROOF</b> 2:12 shed over whole deck + OPEN-CEILING 12:12 truss gable",
         "<b>DEMO</b> bay roofs only — bay walls remain · <b>EXIST.</b> per HOVER",
         "<b>DECK</b> 36'-7\" (7' + 29'-7\") @ +5'-4\" · <b>STAIR</b> 9R · tie +16'-6\""],
    layers={
        "existing":    ["Existing shell (HOVER)",   "#8B877B", "#6E7480", 1.0],
        "grade":       ["Grade / patio",            "#B9B4A5", "#3E434E", 0.7],
        "demo":        ["Demo — deck + bay roofs",   "#A65138", "#C96A47", 1.2, [6,4]],
        "foundation":  ["Footings",                  "#8C7B62", "#8A7355", 0.9, [4,3]],
        "framing":     ["Deck framing (S-102)",      "#B27B2E", "#E0A45C", 1.0],
        "deck":        ["Deck surface",              "#7A6A4C", "#A89468", 1.4],
        "stair":       ["Stair",                     "#C08A3E", "#E7B878", 1.1],
        "guard":       ["Guard 36\" alum.",          "#3A3833", "#C9C4B4", 0.8],
        "columns":     ["Columns + stone bases",     "#9C8F6F", "#CBBD97", 1.1],
        "roofframing": ["Porch roof framing (S-103)","#4E7D8C", "#6FA8BC", 0.9],
        "roof":        ["Porch roof — shed + gable", "#39616F", "#4E8496", 1.3],
        "truss":       ["Structural timber truss",   "#8A5A2B", "#C08442", 1.6],
        "chimney":     ["New stone chimney",         "#87796A", "#A99A85", 1.3],
    },
    scenes={
        "Perspective":     dict(yaw=-0.55, pitch=0.28, dist=110, fov=42, tgt=[10,11,4]),
        "Rear elevation":  dict(yaw=0.0,   pitch=0.03, dist=300, fov=14, tgt=[8,14,0]),
        "Right side":      dict(yaw=1.5708,pitch=0.03, dist=300, fov=14, tgt=[10,13,8]),
        "Gable + truss":   dict(yaw=-0.15, pitch=0.14, dist=70,  fov=40, tgt=[25,15,12]),
        "Framing plan":    dict(yaw=0.0,   pitch=1.45, dist=150, fov=26, tgt=[12,4,7]),
        "Section @ stair": dict(yaw=1.35,  pitch=0.10, dist=150, fov=18, tgt=[25,9,7]),
    },
    default_scene="Perspective",
)
print(res)
