#!/usr/bin/env python3
"""
blender-tow-shed.py - Towable shed + hitch + mower port on the real yard
========================================================================
Blender (bpy) model of the 6x8 mobile shed converted to a TOWABLE unit
(PT skids + trailer axle + A-frame tongue + dual truck/mower hitch head),
an open-front mower port that continues the shed ridge, and the fence
outline - all on real USGS 3DEP terrain from site-scout.js.

Run (Blender 3.6+ / 4.x):
    blender --background --python scripts/hover/blender-tow-shed.py
    blender --background --python scripts/hover/blender-tow-shed.py -- \
        --topo site/site-topo.json --out site/

Outputs tow-shed.blend + tow-shed.png. Units: 1 unit = 1 ft.
Everything you would change lives in PARAMS. Edit, re-run, done.

Tow rules baked into the geometry: axle sits BEHIND the balance point so
~10-15% of the weight rests on the tongue (never lets the coupler lift);
private-property, walking-speed moves only - this is not a road trailer.
"""
import bpy, math, json, os, sys

# ============================ PARAMS (feet) ================================
FENCE = [(-70, -100), (70, -100), (70, 30), (-70, 30)]  # EDIT: corners in order (x east, y north)
GATE = {"edge": 1, "y0": -44.5, "y1": -35.5}            # gap on FENCE edge index
SHED = {"x": 46, "y": -30, "w": 6.0, "d": 8.0, "wall": 6.5, "pitch_deg": 22}
HITCH = {
    "skid": (0.29, 0.46),         # PT 4x6 runner: 3.5" x 5.5"
    "axle_from_front": 0.60,      # axle at 60% of depth -> tongue weight ~10-15%
    "wheel_r": 0.54, "wheel_w": 0.35,   # 4.80-12 pneumatic, ~13" dia
    "tongue_len": 4.0, "tongue_spread": 2.4,  # A-frame: 2x2x3/16 steel angle
    "coupler_r": 0.11,            # 1-7/8" ball coupler (truck)
    "clevis_len": 0.5,            # stacked pin plate, 1/2" pin (riding mower)
    "jack_h": 1.6,                # swivel tongue jack, 1000 lb
}
PORT = {"w": 8.0, "d": 10.0, "eave": 7.0, "gap": 2.0}   # freestanding, continues ridge (+y)
FENCE_H = 6.0
STEP_FT = 20
TOPO = [
 [-2.46,-1.63,-1.80,-0.76, 0.29, 1.39, 1.57, 0.67,-1.50,-3.91,-4.55,-4.02],
 [-1.76,-2.03,-1.44,-0.19, 0.47, 1.01, 1.07, 0.26,-0.20,-0.96,-0.67,-0.51],
 [-1.00,-0.88,-1.01,-0.68,-0.22, 0.35, 0.17,-0.21, 0.71, 2.11, 1.86, 0.78],
 [-1.14,-0.48,-0.35,-0.55,-0.88,-1.10,-0.88,-0.74,-0.21, 0.53, 0.81, 0.32],
 [-0.27,-0.70,-0.52,-0.42,-0.55,-0.78,-1.02,-1.34,-1.32,-1.05,-0.64,-0.35],
 [ 2.80, 1.54, 0.23,-0.26,-0.66,-0.89,-0.90,-0.73,-0.67,-0.47,-0.17, 0.07],
 [ 4.27, 4.38, 4.54, 3.69, 1.91, 0.64, 0.00,-0.01, 0.29, 0.22, 0.25, 0.59],
 [ 5.09, 5.60, 5.97, 6.90, 5.65, 4.38, 5.05, 4.00, 4.03, 5.01, 2.55, 3.87],
 [ 5.28, 6.06, 6.43, 6.91, 6.31, 6.26, 6.92, 6.49, 6.89, 5.18, 4.03, 7.11],
 [ 5.15, 5.86, 6.83, 6.67, 6.93, 6.74, 7.02, 6.83, 7.78, 7.84, 7.26, 8.86],
 [ 5.23, 5.89, 6.63, 6.73, 6.90, 6.90, 7.02, 7.04, 8.65,10.35, 9.70, 9.33],
 [ 5.26, 5.87, 6.52, 7.11, 7.79, 7.79, 7.46, 7.50, 7.60, 9.70, 9.10, 9.13],
]
FOOTPRINT = [(21.4,-23.8),(10.5,-21.7),(7.6,-36.9),(-26.3,-30.4),(-20.7,-1.5),(-26.2,-0.5),
             (-21.1,26.1),(-0.9,22.3),(-1.1,21.3),(14.8,18.3),(14.2,14.9),(28.3,12.2)]  # OSM, unverified
# ===========================================================================

def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = {"topo": None, "out": os.path.dirname(os.path.abspath(__file__))}
    for i, a in enumerate(argv):
        if a == "--topo": out["topo"] = argv[i + 1]
        if a == "--out": out["out"] = argv[i + 1]
    return out

ARGS = parse_args()
if ARGS["topo"] and os.path.exists(ARGS["topo"]):
    with open(ARGS["topo"]) as fh:
        t = json.load(fh)
    TOPO, STEP_FT = t["grid"], t.get("stepFt", STEP_FT)

def reset():
    bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
    for blk in (bpy.data.meshes, bpy.data.materials):
        for b in list(blk): blk.remove(b)

def mat(name, rgba, rough=0.85, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    n = m.node_tree.nodes["Principled BSDF"]
    n.inputs["Base Color"].default_value = rgba
    n.inputs["Roughness"].default_value = rough
    try: n.inputs["Metallic"].default_value = metal
    except Exception: pass
    return m

def newmesh(name, verts, faces, material):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material); return ob

def box(name, size, loc, material, rot_z=0.0, rot_y=0.0, rot_x=0.0):
    sx, sy, sz = (s / 2 for s in size); x, y, z = loc
    v = [(-sx,-sy,-sz),(sx,-sy,-sz),(sx,sy,-sz),(-sx,sy,-sz),(-sx,-sy,sz),(sx,-sy,sz),(sx,sy,sz),(-sx,sy,sz)]
    f = [(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    ob = newmesh(name, v, f, material)
    ob.rotation_euler = (rot_x, rot_y, rot_z); ob.location = (x, y, z); return ob

def cyl(name, r, depth, loc, material, axis="Z", seg=24):
    ring = [(r*math.cos(2*math.pi*i/seg), r*math.sin(2*math.pi*i/seg)) for i in range(seg)]
    h = depth / 2
    verts = [(a, b, -h) for a, b in ring] + [(a, b, h) for a, b in ring]
    faces = [[i, (i+1)%seg, (i+1)%seg+seg, i+seg] for i in range(seg)]
    faces += [list(range(seg, 2*seg)), list(range(seg-1, -1, -1))]
    if axis == "X": verts = [(z, y, -x) for x, y, z in verts]
    elif axis == "Y": verts = [(x, z, -y) for x, y, z in verts]
    return newmesh(name, [(x+loc[0], y+loc[1], z+loc[2]) for x, y, z in verts], faces, material)

def ground_z(x, y):
    rows, cols = len(TOPO), len(TOPO[0])
    gc = min(max(x / STEP_FT + (cols-1)/2, 0), cols-1)
    gr = min(max((rows-1)/2 - y / STEP_FT, 0), rows-1)
    c0, r0 = int(gc), int(gr); c1, r1 = min(c0+1, cols-1), min(r0+1, rows-1)
    fc, fr = gc-c0, gr-r0
    top = TOPO[r0][c0]*(1-fc) + TOPO[r0][c1]*fc
    bot = TOPO[r1][c0]*(1-fc) + TOPO[r1][c1]*fc
    return top*(1-fr) + bot*fr

# ---------------------------------------------------------------------------
reset()
C = {"grass": mat("Grass",(0.20,0.38,0.14,1),1.0), "house": mat("House",(0.72,0.33,0.25,1)),
     "roof": mat("Roof",(0.26,0.26,0.28,1)), "shed": mat("Shed",(0.90,0.83,0.66,1),0.7),
     "trim": mat("Trim",(0.96,0.96,0.94,1),0.6), "steel": mat("Steel",(0.30,0.33,0.38,1),0.4,0.9),
     "red": mat("Coupler",(0.62,0.16,0.12,1),0.5,0.6), "tire": mat("Tire",(0.06,0.06,0.07,1)),
     "wood": mat("PTWood",(0.55,0.42,0.22,1)), "fence": mat("Fence",(0.44,0.38,0.27,1)),
     "block": mat("Block",(0.62,0.62,0.58,1))}

# --- terrain (real USGS 3DEP) ---
rows, cols = len(TOPO), len(TOPO[0]); verts = []; faces = []
for r in range(rows):
    for c in range(cols):
        verts.append(((c-(cols-1)/2)*STEP_FT, ((rows-1)/2-r)*STEP_FT, TOPO[r][c]))
for r in range(rows-1):
    for c in range(cols-1):
        i = r*cols+c; faces.append((i, i+1, i+cols+1, i+cols))
newmesh("Terrain_USGS_3DEP", verts, faces, C["grass"])

# --- house (OSM footprint, unverified) ---
base = ground_z(0, 0); n = len(FOOTPRINT)
hv = [(x, y, base-1) for x, y in FOOTPRINT] + [(x, y, base+9) for x, y in FOOTPRINT]
hf = [(i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n)] + [tuple(range(n, 2*n)), tuple(range(n-1, -1, -1))]
newmesh("House_OSM_unverified", hv, hf, C["house"])

# --- fence polygon + posts @ 8 ft, gate gap ---
for i, a in enumerate(FENCE):
    b = FENCE[(i+1) % len(FENCE)]; dx, dy = b[0]-a[0], b[1]-a[1]
    L = math.hypot(dx, dy); ang = math.atan2(dy, dx); segs = [(0, 1)]
    if i == GATE["edge"] and dy:
        t0, t1 = sorted(((GATE["y0"]-a[1])/dy, (GATE["y1"]-a[1])/dy)); segs = [(0, t0), (t1, 1)]
    for t0, t1 in segs:
        mx, my = a[0]+dx*(t0+t1)/2, a[1]+dy*(t0+t1)/2
        box(f"Fence{i}", (L*(t1-t0), 0.25, FENCE_H), (mx, my, ground_z(mx, my)+FENCE_H/2), C["fence"], rot_z=ang)
    k = max(1, round(L/8))
    for j in range(k+1):
        px, py = a[0]+dx*j/k, a[1]+dy*j/k
        box(f"Post{i}_{j}", (0.45, 0.45, FENCE_H+0.6), (px, py, ground_z(px, py)+(FENCE_H+0.6)/2), C["fence"])

# --- TOWABLE SHED ------------------------------------------------------------
X, Y, W, D, WH = SHED["x"], SHED["y"], SHED["w"], SHED["d"], SHED["wall"]
g0 = ground_z(X, Y); WR = HITCH["wheel_r"]
sk_w, sk_h = HITCH["skid"]
floor_z = g0 + WR + sk_h + 0.1                 # skid tops = floor underside
# skids (PT 4x6) - through-bolt to the floor joists
for s in (1, -1):
    box(f"Skid{s}", (sk_w, D+1.0, sk_h), (X+s*(W/2-0.6), Y, floor_z-sk_h/2), C["wood"])
box("Floor", (W, D, 0.12), (X, Y, floor_z+0.06), C["wood"])
box("Shed_body", (W, D, WH), (X, Y, floor_z+0.12+WH/2), C["shed"])
pitch = math.radians(SHED["pitch_deg"]); rise = math.tan(pitch)*W/2
for s in (1, -1):
    box(f"Shed_roof{s}", (W/2/math.cos(pitch)*1.1, D+0.6, 0.15),
        (X+s*W/4, Y, floor_z+0.12+WH+rise/2), C["roof"], rot_y=-s*pitch)
box("Shed_door", (2.6, 0.1, 5.2), (X, Y-D/2-0.06, floor_z+0.12+2.7), C["trim"])
# axle behind the balance point (tongue weight stays positive)
ay = Y - D/2 + D*HITCH["axle_from_front"]
cyl("Axle_tube", 0.09, W+0.9, (X, ay, g0+WR), C["steel"], axis="X")
for s in (1, -1):
    cyl(f"Hub{s}", 0.2, 0.25, (X+s*(W/2+0.15), ay, g0+WR), C["steel"], axis="X")
    cyl(f"Wheel{s}", WR, HITCH["wheel_w"], (X+s*(W/2+0.45), ay, g0+WR), C["tire"], axis="X")
# hanger brackets tie axle to skids
for s in (1, -1):
    box(f"Hanger{s}", (0.15, 0.6, floor_z-sk_h-(g0+WR)), (X+s*(W/2-0.6), ay, (floor_z-sk_h+g0+WR)/2), C["steel"])
# A-frame tongue: two steel angles from the skid noses to the coupler
ty = Y - D/2 - 0.5; tl = HITCH["tongue_len"]; sp = HITCH["tongue_spread"]
tz = floor_z - sk_h/2
for s in (1, -1):
    ang = math.atan2(s*sp/2, tl)
    box(f"Tongue{s}", (0.17, math.hypot(tl, sp/2), 0.17), (X+s*sp/4, ty-tl/2, tz), C["steel"], rot_z=-ang)
box("Tongue_crossbar", (sp+0.4, 0.17, 0.17), (X, ty, tz), C["steel"])
box("Tongue_pin_plate", (0.5, 0.5, 0.05), (X, ty, tz+0.12), C["steel"])   # removable pin: detach when parked
# DUAL HITCH HEAD: 1-7/8" ball coupler (truck) + stacked clevis w/ 1/2" pin (mower)
hy = ty - tl
box("Coupler_body", (0.3, 0.55, 0.3), (X, hy+0.1, tz), C["red"])
cyl("Coupler_socket", HITCH["coupler_r"], 0.28, (X, hy-0.12, tz-0.05), C["red"])
box("Clevis_plate", (0.35, HITCH["clevis_len"], 0.06), (X, hy+0.05, tz+0.2), C["steel"])
cyl("Clevis_pin", 0.03, 0.5, (X, hy-0.05, tz+0.25), C["steel"])
# swivel tongue jack + foot
cyl("Jack_tube", 0.08, HITCH["jack_h"], (X+0.6, hy+0.7, g0+HITCH["jack_h"]/2), C["steel"])
cyl("Jack_foot", 0.25, 0.06, (X+0.6, hy+0.7, g0+0.03), C["steel"])
# 4 drop-leg stabilizers: park on these, not the tires
for s in (1, -1):
    for yy in (Y-D/2+0.8, Y+D/2-0.8):
        box(f"DropLeg{s}{int(yy)}", (0.12, 0.12, floor_z-sk_h-g0), (X+s*(W/2-0.3), yy, (floor_z-sk_h+g0)/2), C["steel"])
        box(f"DropFoot{s}{int(yy)}", (0.5, 0.5, 0.05), (X+s*(W/2-0.3), yy, g0+0.03), C["steel"])
# safety chains (crossed under the coupler)
for s in (1, -1):
    box(f"Chain{s}", (0.04, 1.2, 0.04), (X+s*0.35, hy+0.55, tz-0.25), C["steel"], rot_z=s*0.35)

# --- MOWER PORT: freestanding, continues the shed ridge (+y) ---
py0 = Y + D/2 + PORT["gap"]; PY = py0 + PORT["d"]/2; PW, PD, PE = PORT["w"], PORT["d"], PORT["eave"]
for dx, dy in ((-PW/2,-PD/2), (PW/2,-PD/2), (-PW/2,PD/2), (PW/2,PD/2)):
    gz = ground_z(X+dx, PY+dy)
    box("PortBlock", (1.5, 1.5, 0.35), (X+dx, PY+dy, gz+0.17), C["block"])
    box("PortPost", (0.33, 0.33, PE), (X+dx, PY+dy, gz+PE/2), C["wood"])
gz = ground_z(X, PY)
for dx in (-PW/2, PW/2): box("PortHeader", (0.15, PD, 0.5), (X+dx, PY, gz+PE-0.25), C["wood"])
for k in range(6): box("PortRafterTie", (PW+1, 0.15, 0.3), (X, py0+k*PD/5, gz+PE+0.05), C["wood"])
prise = math.tan(pitch)*PW/2
for s in (1, -1):
    box(f"PortRoof{s}", (PW/2/math.cos(pitch)*1.1, PD+1.2, 0.15), (X+s*PW/4, PY, gz+PE+prise/2), C["roof"], rot_y=-s*pitch)

# --- sun / camera / render ---
bpy.ops.object.light_add(type="SUN", location=(-60, -120, 160))
sun = bpy.context.active_object; sun.data.energy = 3.0
sun.rotation_euler = (math.radians(50), math.radians(-10), math.radians(-35))
bpy.ops.object.camera_add(location=(X+70, Y-75, g0+38))
cam = bpy.context.active_object
from mathutils import Vector
cam.rotation_euler = (Vector((X, Y+6, g0+4)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc = bpy.context.scene; sc.camera = cam
for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "CYCLES"):
    try: sc.render.engine = eng; break
    except Exception: continue
sc.render.resolution_x, sc.render.resolution_y = 1800, 1150
os.makedirs(ARGS["out"], exist_ok=True)
sc.render.filepath = os.path.join(ARGS["out"], "tow-shed.png")
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ARGS["out"], "tow-shed.blend"))
bpy.ops.render.render(write_still=True)
print("DONE ->", sc.render.filepath)
