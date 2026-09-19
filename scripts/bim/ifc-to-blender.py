#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ifc-to-blender.py - build a .blend from an IFC, keeping the BIM data.

Objects are grouped into collections by storey and each one carries its
GlobalId, IfcClass, Tag and property sets across as Blender custom
properties, so the .blend is still a model and not a mesh dump. Optionally
renders Freestyle line art and a shaded view.

    pip install bpy ifcopenshell          # bpy needs CPython 3.11
    python3 ifc-to-blender.py model.ifc --out blender/ --render

This is the same IfcOpenShell kernel Bonsai (the official Blender BIM
add-on) runs on. On a workstation prefer Bonsai, which adds the authoring
UI; this script exists for headless machines where there is no UI at all.

Part of everything-claude-code. Used by the `bim-engineer` agent.
"""
import argparse, math, os, sys

try:
    import bpy
except ImportError:
    sys.exit("needs Blender as a module:  pip install bpy   (CPython 3.11)")
try:
    import ifcopenshell
    import ifcopenshell.geom as GEOM
    import ifcopenshell.util.element as UE
except ImportError:
    sys.exit("needs ifcopenshell:  pip install ifcopenshell")
import mathutils

COLORS = {
    "IfcFooting": (0.55, 0.57, 0.60, 1),
    "IfcWall":    (0.74, 0.76, 0.78, 1),
    "IfcSlab":    (0.82, 0.83, 0.84, 1),
    "IfcBeam":    (0.67, 0.47, 0.25, 1),
    "IfcColumn":  (0.26, 0.31, 0.35, 1),
    "IfcMember":  (0.40, 0.44, 0.48, 1),
    "IfcReinforcingBar": (0.18, 0.31, 0.54, 1),
}
FLAG = (0.69, 0.13, 0.09, 1)      # anything whose name shouts about an issue


def build(path, flag_words):
    f = ifcopenshell.open(path)
    s = GEOM.settings()
    s.set("use-world-coords", True)
    it = GEOM.iterator(s, f, 1)
    colls, n, ok = {}, 0, it.initialize()
    while ok:
        sh = it.get()
        el = f.by_guid(sh.guid)
        if el.is_a("IfcOpeningElement") or el.is_a("IfcSpace"):
            ok = it.next()
            continue
        g = sh.geometry
        name = (sh.name or el.is_a())[:60]
        me = bpy.data.meshes.new(name)
        me.from_pydata(
            [(g.verts[i], g.verts[i+1], g.verts[i+2]) for i in range(0, len(g.verts), 3)],
            [],
            [(g.faces[i], g.faces[i+1], g.faces[i+2]) for i in range(0, len(g.faces), 3)])
        me.validate()
        me.update()
        ob = bpy.data.objects.new(name, me)

        # --- the BIM data rides along on the Blender object ------------------
        ob["GlobalId"] = el.GlobalId
        ob["IfcClass"] = el.is_a()
        ob["IfcName"] = el.Name or ""
        ob["Tag"] = getattr(el, "Tag", None) or ""
        st = UE.get_container(el)
        ob["Storey"] = st.Name if st else ""
        for pset, props in (UE.get_psets(el) or {}).items():
            for k, v in props.items():
                if isinstance(v, (str, int, float)):
                    ob["%s.%s" % (pset, k)] = v

        key = ob["Storey"] or "Model"
        if key not in colls:
            c = bpy.data.collections.new(key)
            bpy.context.scene.collection.children.link(c)
            colls[key] = c
        colls[key].objects.link(ob)

        flagged = any(w.lower() in name.lower() for w in flag_words)
        m = bpy.data.materials.new(name[:40])
        m.use_nodes = False
        m.diffuse_color = FLAG if flagged else COLORS.get(el.is_a(), (.7, .7, .7, 1))
        ob.data.materials.append(m)
        n += 1
        ok = it.next()
    return n, len(colls)


def frame_camera():
    xs, ys, zs = [], [], []
    for ob in bpy.context.scene.objects:
        if ob.type != "MESH":
            continue
        for c in ob.bound_box:
            p = ob.matrix_world @ mathutils.Vector(c)
            xs.append(p.x); ys.append(p.y); zs.append(p.z)
    cx, cy, cz = (min(xs)+max(xs))/2, (min(ys)+max(ys))/2, (min(zs)+max(zs))/2
    r = max(max(xs)-min(xs), max(ys)-min(ys), max(zs)-min(zs))
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    bpy.context.scene.collection.objects.link(cam)
    d = r * 1.9
    cam.location = (cx + d*0.78, cy - d*0.86, cz + d*0.62)
    cam.rotation_euler = mathutils.Vector(
        (cx - cam.location[0], cy - cam.location[1], cz - cam.location[2])
    ).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam

    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", type="SUN"))
    sun.data.energy = 3.0
    sun.location = (-r, -r, r*2)
    sun.rotation_euler = (math.radians(50), 0, math.radians(35))
    bpy.context.scene.collection.objects.link(sun)


def render(path, lines):
    """Cycles on CPU. Workbench and EEVEE both need OpenGL/EGL, which a
    headless container usually has not got; Cycles CPU plus Freestyle needs
    no GPU and gives a truer line drawing than a viewport wireframe."""
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 12 if lines else 48
    sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
    sc.render.image_settings.file_format = "PNG"

    if bpy.data.worlds:
        w = bpy.data.worlds[0]
        sc.world = w
        w.use_nodes = True
        bg = w.node_tree.nodes.get("Background")
        if bg:
            bg.inputs[0].default_value = (1, 1, 1, 1)
            bg.inputs[1].default_value = 1.0 if lines else 0.65

    sc.render.use_freestyle = lines
    if lines:
        vl = bpy.context.view_layer
        vl.use_freestyle = True
        fs = vl.freestyle_settings
        if not fs.linesets:
            fs.linesets.new("lines")
        ls = fs.linesets[0]
        if ls.linestyle is None:           # a fresh lineset carries no style
            ls.linestyle = bpy.data.linestyles.new("arch")
        ls.select_silhouette = ls.select_border = ls.select_crease = True
        ls.linestyle.color = (0.05, 0.06, 0.07)
        sc.render.line_thickness_mode = "ABSOLUTE"
        sc.render.line_thickness = 1.2

    for m in bpy.data.materials:
        m.use_nodes = True
        b = m.node_tree.nodes.get("Principled BSDF")
        if b:
            b.inputs["Base Color"].default_value = (1, 1, 1, 1) if lines else m.diffuse_color
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ifc")
    ap.add_argument("--out", default="blender")
    ap.add_argument("--render", action="store_true", help="also render line art + shaded")
    ap.add_argument("--flag", default="NOT IN RFQ,TBD,NOT DESIGNED",
                    help="comma-separated name fragments to colour red")
    a = ap.parse_args()

    os.makedirs(a.out, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    n, storeys = build(a.ifc, [w.strip() for w in a.flag.split(",") if w.strip()])
    print("built %d objects across %d storey collection(s)" % (n, storeys))
    frame_camera()

    blend = os.path.join(a.out, "model.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend)   # save first: a render
    print("saved", blend)                          # failure must not cost the model

    if a.render:
        for name, lines in (("wireframe", True), ("shaded", False)):
            try:
                render(os.path.join(a.out, name), lines)
                print("rendered", name)
            except Exception as ex:
                print("%s FAILED: %s" % (name, ex))


if __name__ == "__main__":
    main()
