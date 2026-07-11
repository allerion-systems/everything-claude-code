#!/usr/bin/env python3
"""Parametric wireframe library — build an interactive, dependency-free 3D
wireframe artifact from measured dimensions.

Coordinate convention (recommended, not enforced):
    X = left -> right as seen by the primary viewer
    Y = up (height)
    Z = depth (toward the viewer / out of the primary face)
All values in real units (feet, metres, mm) — pick one and stay on it.

Geometry is a dict: layer_name -> list of polylines; each polyline is a list
of [x, y, z] points. Draw order follows insertion order of layers.

Usage
-----
    from wireframe import Scene, build

    s = Scene()
    s.box("existing", 0,0,0, 34,22.8,-28)          # a wire box
    s.poly("deck", (0,4.75,0), (36,4.75,0), (36,4.75,16), (0,4.75,16), (0,4.75,0))
    s.label("STONE CHIMNEY", 32.6, 18.8, 14.5, "chimney")

    build(
        scene=s,
        out="my-design.html",
        template="viewer.html",
        title="MY PROJECT — WIREFRAME",
        subtitle="CLIENT · SCOPE · LOCATION",
        rev="R1 · 2026",
        stamp="PRELIMINARY — NOT FOR CONSTRUCTION — V.I.F.",
        units="FT",
        obj_name="my-design",
        hud=["<b>DECK</b> 36'-0\" × 16'-0\""],
        # layer -> [label, color-light, color-dark, width, dash?]
        layers={
            "existing": ["Existing", "#8B877B", "#6E7480", 1.0],
            "deck":     ["Deck",     "#7A6A4C", "#A89468", 1.4],
            "chimney":  ["Chimney",  "#87796A", "#A99A85", 1.3, [6,4]],
        },
        scenes={
            "Perspective":    dict(yaw=-0.55, pitch=0.32, dist=95,  fov=42, tgt=[6,9,2]),
            "Rear elevation": dict(yaw=0.0,   pitch=0.03, dist=260, fov=14, tgt=[4,11,0]),
        },
        default_scene="Perspective",
    )

Then publish the emitted HTML file with the Artifact tool.
"""
import json
import math
import os

_EDGES = [(0,1),(1,2),(2,3),(3,0),(4,5),(5,6),(6,7),(7,4),(0,4),(1,5),(2,6),(3,7)]


class Scene:
    """Accumulates layered polyline geometry plus 3D text labels."""

    def __init__(self):
        self.layers = {}          # name -> [ [ [x,y,z], ... ], ... ]
        self.labels = []          # [text, x, y, z, layer_key]

    # --- primitives ---
    def poly(self, layer, *pts):
        """Add one polyline (2+ points) to a layer."""
        self.layers.setdefault(layer, []).append([list(p) for p in pts])
        return self

    def line(self, layer, a, b):
        return self.poly(layer, a, b)

    def box(self, layer, x0, y0, z0, x1, y1, z1):
        """Add the 12 edges of an axis-aligned box."""
        c = [(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),
             (x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)]
        for a, b in _EDGES:
            self.poly(layer, c[a], c[b])
        return self

    def rect(self, layer, p0, p1, p2, p3):
        """Add a closed quad from four corner points."""
        return self.poly(layer, p0, p1, p2, p3, p0)

    def grid(self, layer, p0, p1, p2, p3, nu=1, nv=1):
        """Ruled surface between edges p0->p1 and p3->p2 as nu x nv lines."""
        def lerp(a, b, t): return [a[i]+t*(b[i]-a[i]) for i in range(3)]
        for i in range(nu+1):
            t = i/float(nu)
            self.poly(layer, lerp(p0,p1,t), lerp(p3,p2,t))
        for j in range(nv+1):
            t = j/float(nv)
            self.poly(layer, lerp(p0,p3,t), lerp(p1,p2,t))
        return self

    def repeat(self, layer, a, b, axis, start, count, step):
        """Copy edge a->b `count` times, translating along axis (0=x,1=y,2=z)."""
        for k in range(count):
            off = start + k*step
            aa = list(a); bb = list(b); aa[axis]+=off; bb[axis]+=off
            self.poly(layer, aa, bb)
        return self

    def label(self, text, x, y, z, layer):
        self.labels.append([text, x, y, z, layer])
        return self

    # --- output ---
    def counts(self):
        return {k: len(v) for k, v in self.layers.items()}


def _pick_theme_colors(layers, dark):
    """layers value = [label, light, dark, width, dash?] -> css color for theme."""
    idx = 2 if dark else 1
    return {k: v[idx] for k, v in layers.items()}


def build(scene, out, template, *, title, subtitle="", rev="", stamp="",
          units="FT", obj_name="wireframe", hud=None, layers, scenes,
          default_scene=None):
    """Inject geometry + config into the viewer template; write `out`.

    `layers` maps each geometry key to [label, light_hex, dark_hex, width, dash?].
    The viewer uses one CSS color per layer; light/dark are blended so the same
    line reads on both grounds. We emit the light color and rely on the viewer's
    tokens for chrome; per-layer colors are passed through as-is (they are chosen
    to work on both grounds — keep them mid-value).
    """
    if default_scene is None:
        default_scene = next(iter(scenes))

    # viewer expects layers as [key, label, color, width, dash?]
    layer_cfg = []
    for key in scene.layers.keys():
        if key not in layers:
            raise KeyError(f"layer '{key}' has geometry but no entry in `layers=`")
        label, light, dark, *rest = layers[key]
        width = rest[0] if rest else 1.0
        dash = rest[1] if len(rest) > 1 else None
        # emit a mid color that reads on both themes: use light by default
        entry = [key, label, light, width]
        if dash:
            entry.append(dash)
        layer_cfg.append(entry)

    cfg = {
        "title": title, "subtitle": subtitle, "rev": rev, "stamp": stamp,
        "units": units, "objName": obj_name, "hud": hud or [],
        "layers": layer_cfg, "labels": scene.labels,
        "scenes": scenes, "defaultScene": default_scene,
    }

    with open(template, encoding="utf-8") as f:
        html = f.read()
    model_json = json.dumps(scene.layers, separators=(",", ":"))
    cfg_json = json.dumps(cfg, separators=(",", ":"))
    html = html.replace("__TITLE__", title)
    html = html.replace("__MODEL__", model_json)
    html = html.replace("__CONFIG__", cfg_json)
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    return {"out": out, "bytes": len(html), "layers": scene.counts()}


# convenience: rise/run pitch helper for roofs (returns height at depth z)
def pitch_height(rise, run, base_y, z):
    return base_y + (rise/float(run)) * z
