# BIM / IFC Modeling

Author real IFC4 models, grade them by LOD, and project the permit drawings
straight out of the model instead of drafting them a second time.

Driven by the [`bim-engineer`](../agents/bim-engineer.md) agent.

---

## Install

```bash
pip install ifcopenshell shapely     # authoring, geometry kernel, 2D booleans
pip install bpy                      # optional: Blender as a module (CPython 3.11)
```

`ifcopenshell` is the open-source IFC kernel ([IfcOpenShell/IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell),
LGPL). **Bonsai** — formerly BlenderBIM — is the Blender add-on built on the
same kernel. On a workstation, use Bonsai for authoring. Headless, use the
library directly.

---

## Why generate drawings from the model

A plan drawn by hand next to a 3D model built by hand is two sources of truth
that drift the moment anything changes. `scripts/bim/ifc-drawings.py` projects
the sheets out of the IFC:

- **True plane cuts.** A cut polygon is the intersection of the solid's
  projection from each side of the plane.
- **Element-level hidden-line removal.** Sort by depth, subtract what nearer
  elements already cover (Shapely booleans).
- **Print to scale.** Sheets are SVG sized in inches, snapped down to a real
  architectural scale.

```bash
python3 scripts/bim/ifc-drawings.py model.ifc --out sheets/ --plan-cut 4
```

The cut areas are arithmetically checkable, which is the point — if a rear
wall is 34' long with a 14' opening, its cut area must equal 20' × thickness.
If it doesn't, the void isn't real.

---

## LOD — grade elements, never the model

BIMForum LOD Spec / AIA G202.

| LOD | Means | Quantities? |
|-----|-------|-------------|
| 100 | Symbolic | No |
| 200 | Generic placeholder, approximate | Budget only |
| 300 | Specific assembly; accurate size, shape, location | Yes, measured |
| 350 | 300 **+ interfaces**: supports, connections, bearing, penetrations | Yes, + coordination |
| 400 | Fabrication and installation detail | Yes, for fabrication |
| 500 | Field-verified as-built | Yes, as-built |

**LOD 350 is about interfaces.** A wall at 300 is the right wall in the right
place. At 350 it also carries footing dowels, keyway, bearing pads, anchor
bolts, pilasters, and every sleeve punched through it.

Write the grade into the file, per element:

```python
pset = ifcopenshell.api.pset.add_pset(f, product=wall, name="Pset_LOD")
ifcopenshell.api.pset.edit_pset(f, pset=pset, properties={
    "LOD": "350",
    "LODBasis": "Dimensions from RFQ; interfaces per IRC R403/R404",
    "Verified": "NO - no survey, no geotechnical report",
})
```

Mixed grades in one file are normal and honest — concrete at 350 with
undesigned reinforcement tagged 200. Never average them up.

---

## Traps that cost real time

**Units.** `ifcopenshell.api.unit.assign_unit()` declares **millimetres** by
default. Author coordinates in metres against a millimetre project and you get
a model 1000× too small that opens without a single error. Always confirm:

```python
import ifcopenshell.util.unit as U
assert abs(U.calculate_unit_scale(f) - 0.001) < 1e-9   # mm project
```

**Verify by measuring, not by reading your own code.** Tessellate and assert a
known dimension:

```python
s = ifcopenshell.geom.settings(); s.set("use-world-coords", True)
it = ifcopenshell.geom.iterator(s, f, 1); it.initialize()
v = it.get().geometry.verts
span_ft = (max(v[0::3]) - min(v[0::3])) / 0.3048
```

**Openings must be real.** Use `IfcOpeningElement` related through
`ifcopenshell.api.feature.add_feature`, not a wall pre-split into two pieces.
A real void survives the round trip into Revit and ArchiCAD.

**Thin slabs do not give you a section.** Every face of a thin slab is
parallel to the view direction and projects to zero area. Chaining edge
intersections fails whenever the plane grazes a triangulation diagonal. Take
the intersection of the two half-space projections instead.

**Headless rendering.** Workbench and EEVEE need OpenGL/EGL. In a container
that usually isn't there. Cycles on CPU with Freestyle needs no GPU and gives
better line art anyway.

---

## Blender bridge

```bash
python3 scripts/bim/ifc-to-blender.py model.ifc --out blender/ --render
```

Objects land in collections by storey, each carrying `GlobalId`, `IfcClass`,
`Tag`, `Storey` and its property sets as Blender custom properties — so the
`.blend` is still a model, not a mesh dump.

---

## Hard rules

- Never model undesigned reinforcement as though it were designed. Rebar in a
  BIM gets built. No engineered design means leave it out, or tag it
  `LOD = "200"` with the missing input named.
- Never fabricate a dimension. Assumptions are fine; unflagged ones are not.
- One source of geometry. If a sheet disagrees with the model, regenerate the
  sheet — never hand-patch generated output.
- You do not seal drawings. A licensed professional in the jurisdiction must
  review and seal before permit submission.
