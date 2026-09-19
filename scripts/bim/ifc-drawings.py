#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ifc-drawings.py - project permit drawings directly out of an IFC model.

Plan, section and elevation sheets are produced by real orthographic
projection with element-level hidden-line removal and true plane cuts, so the
2D sheets cannot drift from the 3D model: there is one source of geometry.
Sheets are SVG sized in inches and print to a true architectural scale.

    pip install ifcopenshell shapely
    python3 ifc-drawings.py model.ifc --out sheets/
    python3 ifc-drawings.py model.ifc --out sheets/ --plan-cut 4 --section-at mid

Part of everything-claude-code. Used by the `bim-engineer` agent.
"""
import argparse, math, os, re, sys

try:
    import ifcopenshell
    import ifcopenshell.geom as GEOM
except ImportError:
    sys.exit("needs ifcopenshell:  pip install ifcopenshell")
try:
    from shapely.geometry import Polygon
    from shapely.ops import unary_union
    from shapely import make_valid, affinity
except ImportError:
    sys.exit("needs shapely:  pip install shapely")

M2FT = 1.0 / 0.3048
EPS = 1e-7
SHEET_W, SHEET_H = 17.0, 11.0
SCALES = [(1/16., '1/16"'), (3/32., '3/32"'), (1/8., '1/8"'), (3/16., '3/16"'),
          (1/4., '1/4"'), (3/8., '3/8"'), (1/2., '1/2"'), (3/4., '3/4"'), (1.0, '1"')]


# ------------------------------------------------------------------ geometry
def load(path):
    """IFC -> [{name, cls, tag, tris}] in feet, Z up."""
    f = ifcopenshell.open(path)
    s = GEOM.settings()
    s.set("use-world-coords", True)
    it = GEOM.iterator(s, f, 1)
    els, ok = [], it.initialize()
    while ok:
        sh = it.get()
        el = f.by_guid(sh.guid)
        if el.is_a("IfcOpeningElement") or el.is_a("IfcSpace"):
            ok = it.next()
            continue
        v, ix = sh.geometry.verts, sh.geometry.faces
        pts = [(v[i]*M2FT, v[i+1]*M2FT, v[i+2]*M2FT) for i in range(0, len(v), 3)]
        els.append({
            "name": sh.name or el.is_a(),
            "cls": el.is_a(),
            "tag": (getattr(el, "Tag", None) or "").lower(),
            "tris": [(pts[ix[i]], pts[ix[i+1]], pts[ix[i+2]])
                     for i in range(0, len(ix), 3)],
        })
        ok = it.next()
    if not els:
        sys.exit("no geometry found in " + path)
    return els


def bbox(els):
    xs = [p[0] for e in els for t in e["tris"] for p in t]
    ys = [p[1] for e in els for t in e["tris"] for p in t]
    zs = [p[2] for e in els for t in e["tris"] for p in t]
    return (min(xs), min(ys), min(zs), max(xs), max(ys), max(zs))


def clip_tris(tris, axis, val, keep):
    """Exact clip to the half space keep*(coord - val) >= 0."""
    out = []
    for t in tris:
        d = [keep * (p[axis] - val) for p in t]
        inside = [i for i in range(3) if d[i] >= -EPS]
        if len(inside) == 3:
            out.append(t)
            continue
        if not inside:
            continue

        def mix(a, b):
            u = d[a] / (d[a] - d[b])
            return tuple(t[a][k] + (t[b][k] - t[a][k]) * u for k in range(3))

        if len(inside) == 1:
            i = inside[0]
            out.append((t[i], mix(i, (i+1) % 3), mix(i, (i+2) % 3)))
        else:
            o = [i for i in range(3) if i not in inside][0]
            a, b = (o+1) % 3, (o+2) % 3
            pa, pb = mix(a, o), mix(b, o)
            out.append((t[a], t[b], pb))
            out.append((t[a], pb, pa))
    return out


def project(p, vw):
    (ua, us), (va, vs), (da, ds) = vw["u"], vw["v"], vw["dep"]
    return (p[ua]*us, p[va]*vs, p[da]*ds)


def silhouette(tris, vw):
    polys = []
    for t in tris:
        a, b, c = (project(t[i], vw) for i in range(3))
        if abs((b[0]-a[0])*(c[1]-a[1]) - (c[0]-a[0])*(b[1]-a[1])) < 1e-9:
            continue                     # edge-on to the view, no area
        polys.append(Polygon([(a[0], a[1]), (b[0], b[1]), (c[0], c[1])]))
    if not polys:
        return None
    u = unary_union([make_valid(p) for p in polys])
    return None if u.is_empty else u


def cross_section(tris, axis, val, vw):
    """True cut polygon: intersection of the projections from each side.

    A thin slab cannot be used - every face of it is parallel to the view
    direction and collapses to zero area. Chaining edge intersections cannot
    be used either - it fails to close whenever the plane grazes a
    triangulation diagonal. This is robust for both, and correctly returns
    nothing for a solid that does not reach the plane.
    """
    below = silhouette(clip_tris(tris, axis, val, -1), vw)
    above = silhouette(clip_tris(tris, axis, val, 1), vw)
    if below is None or above is None:
        return None
    r = below.intersection(above)
    return None if r.is_empty else r


def build_view(els, vw):
    """-> (cuts, visible): cut polygons and hidden-line-removed silhouettes."""
    work = []
    for e in els:
        tris = e["tris"]
        if vw["cut"]:
            ax, val, keep = vw["cut"]
            tris = clip_tris(tris, ax, val, keep)
            if not tris:
                continue
        work.append((e, tris))

    cuts = []
    if vw["cut"]:
        ax, val, _ = vw["cut"]
        for e, _t in work:
            cp = cross_section(e["tris"], ax, val, vw)
            if cp is not None:
                cuts.append((e, cp))

    order = sorted(((min(project(p, vw)[2] for t in tris for p in t), e, tris)
                    for e, tris in work), key=lambda r: r[0])
    covered, visible = None, []
    for _d, e, tris in order:
        sil = silhouette(tris, vw)
        if sil is None:
            continue
        vis = sil if covered is None else sil.difference(covered)
        if not vis.is_empty:
            visible.append((e, vis))
        covered = sil if covered is None else unary_union([covered, sil])
    return cuts, visible


def views_for(bb, plan_cut, section_at):
    x0, y0, z0, x1, y1, z1 = bb
    cut_z = z0 + plan_cut if plan_cut is not None else (z0 + z1) / 2.0
    cut_x = (x0 + x1) / 2.0 if section_at in (None, "mid") else float(section_at)
    return [
        ("A-1", "FOUNDATION / FLOOR PLAN",
         dict(u=(0, 1), v=(1, 1), dep=(2, -1), cut=(2, cut_z, -1)),
         'Section cut at %s above the lowest level.' % ftin(plan_cut or 0)),
        ("A-2", "BUILDING SECTION A-A",
         dict(u=(1, 1), v=(2, 1), dep=(0, 1), cut=(0, cut_x, 1)),
         'Cut looking toward increasing X.'),
        ("A-3", "ELEVATION - Y MIN",
         dict(u=(0, 1), v=(2, 1), dep=(1, 1), cut=None), ''),
        ("A-4", "ELEVATION - Y MAX",
         dict(u=(0, -1), v=(2, 1), dep=(1, -1), cut=None), ''),
    ]


# ----------------------------------------------------------------------- svg
def ftin(f):
    neg, f = f < 0, abs(f)
    ft = int(math.floor(f + 1e-9))
    i = int(round((f - ft) * 12))
    if i == 12:
        ft, i = ft + 1, 0
    s = "%d'-%d\"" % (ft, i) if i else "%d'-0\"" % ft
    return ("-" + s) if neg else s


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


DEFS = """<defs>
<pattern id="conc" patternUnits="userSpaceOnUse" width="0.10" height="0.10">
 <rect width="0.10" height="0.10" fill="#e8e6e1"/>
 <circle cx="0.022" cy="0.030" r="0.0055" fill="#9a968e"/>
 <circle cx="0.071" cy="0.067" r="0.0045" fill="#9a968e"/>
 <circle cx="0.050" cy="0.012" r="0.0035" fill="#9a968e"/>
 <path d="M0.012 0.078 l0.020 -0.010" stroke="#9a968e" stroke-width="0.0035"/>
</pattern></defs>
<style>
text{font-family:"IBM Plex Mono",ui-monospace,monospace;fill:#111}
.cut{fill:url(#conc);stroke:#0d0f11;stroke-width:0.0194;stroke-linejoin:round}
.vis{fill:#fbfaf8;stroke:#20242a;stroke-width:0.0083;stroke-linejoin:round}
.bey{fill:none;stroke:#8b9097;stroke-width:0.0049}
.dim{stroke:#2b3037;stroke-width:0.0062;fill:none}
.ext{stroke:#8b9097;stroke-width:0.0042;fill:none}
.dt{font-size:0.0868px;fill:#2b3037}
.vt{font-size:0.139px;font-weight:700;font-family:"Barlow Condensed",sans-serif}
.sb{font-size:0.0660px;fill:#555b61}
.sbA{fill:#0d0f11}.sbB{fill:#fff;stroke:#0d0f11;stroke-width:0.004}
</style>"""


class Sheet(object):
    """SVG sheet whose user unit is one inch of paper."""

    def __init__(self, scale, ox, oy):
        self.s, self.ox, self.oy, self.body = scale, ox, oy, []

    def X(self, x):
        return self.ox + x * self.s

    def Y(self, y):
        return self.oy - y * self.s

    def path(self, d, cls):
        # commands arrive glued to their first number ("M0.0000"); split first
        toks = re.sub(r"([MLZ])", r" \1 ", d.replace(",", " ")).split()
        out, i = [], 0
        while i < len(toks):
            if toks[i] in ("M", "L"):
                out.append("%s%.4f %.4f" % (toks[i], self.X(float(toks[i+1])),
                                            self.Y(float(toks[i+2]))))
                i += 3
            elif toks[i] == "Z":
                out.append("Z")
                i += 1
            else:
                i += 1
        self.body.append('<path class="%s" d="%s"/>' % (cls, " ".join(out)))

    def geom(self, g, cls, tol=0.02):
        for p in (g.geoms if hasattr(g, "geoms") else [g]):
            if p.is_empty or p.geom_type != "Polygon":
                continue
            p = p.simplify(tol, preserve_topology=True)
            if p.is_empty:
                continue
            d = ""
            for r in [p.exterior] + list(p.interiors):
                cs = list(r.coords)
                d += "M%.4f %.4f " % cs[0] + " ".join("L%.4f %.4f" % c for c in cs[1:]) + " Z "
            self.path(d.strip(), cls)

    def text(self, x, y, s, cls="dt", anchor="start"):
        self.body.append('<text class="%s" x="%.4f" y="%.4f" text-anchor="%s">%s</text>'
                         % (cls, self.X(x), self.Y(y), anchor, esc(s)))

    def dim_h(self, x1, x2, y, off, label=None):
        yy = self.Y(y) + off
        for x in (x1, x2):
            self.body.append('<line class="ext" x1="%.4f" y1="%.4f" x2="%.4f" y2="%.4f"/>'
                             % (self.X(x), self.Y(y), self.X(x), yy + 0.05))
            self.body.append('<line class="dim" x1="%.4f" y1="%.4f" x2="%.4f" y2="%.4f"/>'
                             % (self.X(x)-0.035, yy+0.035, self.X(x)+0.035, yy-0.035))
        self.body.append('<line class="dim" x1="%.4f" y1="%.4f" x2="%.4f" y2="%.4f"/>'
                         % (self.X(x1), yy, self.X(x2), yy))
        self.body.append('<text class="dt" x="%.4f" y="%.4f" text-anchor="middle">%s</text>'
                         % ((self.X(x1)+self.X(x2))/2.0, yy-0.045,
                            esc(label or ftin(abs(x2-x1)))))

    def scalebar(self, x_in, y_in, ft):
        seg = ft / 4.0
        for i in range(4):
            self.body.append('<rect class="%s" x="%.4f" y="%.4f" width="%.4f" height="0.055"/>'
                             % ("sbA" if i % 2 else "sbB", x_in + i*seg*self.s,
                                y_in, seg*self.s))
        for i in range(5):
            self.body.append('<text class="sb" x="%.4f" y="%.4f" text-anchor="middle">%d</text>'
                             % (x_in + i*seg*self.s, y_in+0.16, int(i*seg)))


def fit(w_ft, h_ft, avail_w=12.6, avail_h=8.4):
    """Snap DOWN to a real architectural scale that fits the drawing area."""
    raw = min(avail_w / max(w_ft, 1e-6), avail_h / max(h_ft, 1e-6))
    best = SCALES[0]
    for v, lab in SCALES:
        if v <= raw:
            best = (v, lab)
    return best


def render(els, sid, title, vw, note):
    cuts, vis = build_view(els, vw)
    geoms = [g for _e, g in vis] + [g for _e, g in cuts]
    if not geoms:
        return None
    b = unary_union(geoms).bounds
    w_ft, h_ft = b[2]-b[0], b[3]-b[1]
    s, lab = fit(w_ft + 6, h_ft + 5)
    ox = 1.6 + (12.6 - w_ft*s)/2.0 - b[0]*s
    oy = 1.5 + h_ft*s + (8.4 - h_ft*s)/2.0 + b[1]*s
    sh = Sheet(s, ox, oy)
    for e, g in vis:
        sh.geom(g, "bey" if e["tag"] in ("support", "beyond") else "vis")
    for _e, g in cuts:
        sh.geom(g, "cut")
    sh.dim_h(b[0], b[2], b[1], 0.62)
    sh.text((b[0]+b[2])/2.0, b[1] - 2.6/s if s else b[1], title, "vt", "middle")
    sh.scalebar(8.35, 10.30, 16 if s <= 0.25 else 8)
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="%gin" height="%gin" '
           'viewBox="0 0 %g %g">%s%s</svg>'
           % (SHEET_W, SHEET_H, SHEET_W, SHEET_H, DEFS, "".join(sh.body)))
    return dict(id=sid, title=title, scale='%s = 1\'-0"' % lab, note=note, svg=svg,
                cuts=len(cuts), visible=len(vis))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ifc")
    ap.add_argument("--out", default="sheets")
    ap.add_argument("--plan-cut", type=float, default=4.0,
                    help="plan cut height in feet above the lowest point (default 4)")
    ap.add_argument("--section-at", default="mid",
                    help='X position of section A-A in feet, or "mid"')
    a = ap.parse_args()

    els = load(a.ifc)
    bb = bbox(els)
    print("%d elements  |  extents %.1f x %.1f x %.1f ft"
          % (len(els), bb[3]-bb[0], bb[4]-bb[1], bb[5]-bb[2]))
    os.makedirs(a.out, exist_ok=True)
    for sid, title, vw, note in views_for(bb, a.plan_cut, a.section_at):
        r = render(els, sid, title, vw, note)
        if not r:
            print("  %-4s skipped (nothing visible)" % sid)
            continue
        p = os.path.join(a.out, "%s.svg" % sid)
        with open(p, "w") as fh:
            fh.write(r["svg"])
        print("  %-4s %-26s %-13s cuts=%-3d visible=%-3d -> %s"
              % (sid, title, r["scale"], r["cuts"], r["visible"], p))


if __name__ == "__main__":
    main()
